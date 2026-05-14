import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardsDb, flashcardDecksDb } from '@/lib/db';
import type { FlashcardCollocation } from '@/lib/types';

// Mirrors src/app/api/cards/route.ts — accept either {phrase,word,position}
// from the Datamuse generator or {phrase} / plain string from the editable
// preview UI.
function normalizeCollocations(raw: unknown): FlashcardCollocation[] {
  if (!Array.isArray(raw)) return [];
  const out: FlashcardCollocation[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const phrase = item.trim();
      if (phrase) out.push({ phrase });
    } else if (item && typeof item === 'object' && typeof (item as { phrase?: unknown }).phrase === 'string') {
      const c = item as Partial<FlashcardCollocation>;
      const phrase = (c.phrase ?? '').trim();
      if (!phrase) continue;
      out.push({
        phrase,
        ...(typeof c.word === 'string' ? { word: c.word } : {}),
        ...(c.position === 'before' || c.position === 'after' ? { position: c.position } : {}),
      });
    }
  }
  return out;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });

    const card = await flashcardsDb.getById(userId, id);
    if (!card) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json(card);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[card GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });

    const existing = await flashcardsDb.getById(userId, id);
    if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const fields: Parameters<typeof flashcardsDb.update>[2] = {};

    if (typeof body.english === 'string') {
      const t = body.english.trim();
      if (t.length === 0 || t.length > 200)
        return NextResponse.json({ error: 'Từ tiếng Anh không hợp lệ.' }, { status: 400 });
      fields.english = t;
    }
    if (typeof body.vietnamese === 'string') {
      const t = body.vietnamese.trim();
      if (t.length === 0 || t.length > 500)
        return NextResponse.json({ error: 'Nghĩa tiếng Việt không hợp lệ.' }, { status: 400 });
      fields.vietnamese = t;
    }
    if (body.ipa === null) fields.ipa = null;
    else if (typeof body.ipa === 'string') fields.ipa = body.ipa;
    if (body.part_of_speech === null) fields.part_of_speech = null;
    else if (typeof body.part_of_speech === 'string') fields.part_of_speech = body.part_of_speech;
    if (body.audio_url === null) fields.audio_url = null;
    else if (typeof body.audio_url === 'string') fields.audio_url = body.audio_url;
    if (body.image_url === null) fields.image_url = null;
    else if (typeof body.image_url === 'string') fields.image_url = body.image_url;
    if (body.notes === null) fields.notes = null;
    else if (typeof body.notes === 'string') fields.notes = body.notes;
    if (Array.isArray(body.examples)) fields.examples = body.examples as never;
    if (Array.isArray(body.collocations)) fields.collocations = normalizeCollocations(body.collocations);
    if (body.image_attribution !== undefined) fields.image_attribution = body.image_attribution as never;
    if (body.deck_id !== undefined) {
      const n = Number(body.deck_id);
      if (!Number.isInteger(n) || n <= 0)
        return NextResponse.json({ error: 'Invalid deck_id.' }, { status: 400 });
      const deck = await flashcardDecksDb.getById(userId, n);
      if (!deck) return NextResponse.json({ error: 'Deck not found.' }, { status: 404 });
      fields.deck_id = n;
    }
    if (typeof body.status === 'string' && ['new', 'learning', 'review', 'mastered'].includes(body.status)) {
      fields.status = body.status as never;
    }

    await flashcardsDb.update(userId, id, fields);
    const updated = await flashcardsDb.getById(userId, id);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[card PUT] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });

    const existing = await flashcardsDb.getById(userId, id);
    if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    await flashcardsDb.delete(userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[card DELETE] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
