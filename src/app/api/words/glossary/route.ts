import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { wordGlossaryDb } from '@/lib/reading/db';
import { cleanWord } from '@/lib/reading/tokenizer';
import type { GlossaryEntry } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_WORDS = 400;

/**
 * POST /api/words/glossary
 * Body: { words: string[] }
 * Returns cached glossary entries + a `missing` list of words not yet cached.
 * Read-only against the cache (no MS calls) — the frontend looks up `missing`
 * words on demand via /api/words/lookup when the user taps one.
 */
export async function POST(req: Request) {
  try {
    await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { words?: unknown };
    const raw = Array.isArray(body.words) ? body.words : [];

    const cleaned = Array.from(
      new Set(
        raw
          .filter((w): w is string => typeof w === 'string')
          .map(cleanWord)
          .filter((w) => w.length >= 2),
      ),
    ).slice(0, MAX_WORDS);

    if (cleaned.length === 0) {
      return NextResponse.json({ entries: {}, missing: [] });
    }

    const entries: Record<string, GlossaryEntry> = await wordGlossaryDb.getMany(cleaned);
    const missing = cleaned.filter((w) => !(w in entries));

    return NextResponse.json({ entries, missing });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[words/glossary POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
