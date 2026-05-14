import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardClozePoolDb } from '@/lib/db';
import { ensureClozePool } from '@/lib/flashcards/cloze';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Read sentences from the shared cloze pool. Lazy-fills via AI if the pool
 * for a given word is empty (typical for cards added before the pool feature
 * landed). Word-keyed, not card-keyed — no ownership boundary on the rows
 * themselves; auth gates access to the endpoint.
 */
export async function GET(req: NextRequest) {
  try {
    await requireUserId();

    const url = new URL(req.url);
    const word = (url.searchParams.get('word') ?? '').trim().toLowerCase();
    const limitRaw = Number(url.searchParams.get('limit') ?? '3');
    const limit = Math.min(Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 3), 10);

    if (!word) {
      return NextResponse.json({ error: 'word required' }, { status: 400 });
    }

    let sentences = await flashcardClozePoolDb.getByWord(word, limit);
    if (sentences.length === 0) {
      await ensureClozePool(word, { minimum: limit });
      sentences = await flashcardClozePoolDb.getByWord(word, limit);
    }
    return NextResponse.json({ sentences });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[cloze pool GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
