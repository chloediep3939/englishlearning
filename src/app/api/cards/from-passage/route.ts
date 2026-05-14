import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardsDb, flashcardDecksDb } from '@/lib/db';
import { passagesDb } from '@/lib/passages/db';
import { generateCardData } from '@/lib/flashcards/generate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_WORD_LEN = 60;
const MAX_CONTEXT_LEN = 1000;

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as {
      word?: unknown;
      deck_id?: unknown;
      passage_id?: unknown;
      source_context?: unknown;
    };

    const word = typeof body.word === 'string' ? body.word.trim() : '';
    if (!word || word.length > MAX_WORD_LEN) {
      return NextResponse.json({ error: 'Từ không hợp lệ.' }, { status: 400 });
    }
    const sourceContext =
      typeof body.source_context === 'string' ? body.source_context.trim() : '';
    if (!sourceContext || sourceContext.length > MAX_CONTEXT_LEN) {
      return NextResponse.json({ error: 'Thiếu câu gốc.' }, { status: 400 });
    }
    const deckId = Number(body.deck_id);
    if (!Number.isInteger(deckId) || deckId <= 0) {
      return NextResponse.json({ error: 'Invalid deck_id.' }, { status: 400 });
    }
    const passageId = Number(body.passage_id);
    if (!Number.isInteger(passageId) || passageId <= 0) {
      return NextResponse.json({ error: 'Invalid passage_id.' }, { status: 400 });
    }

    // Verify deck + passage ownership (also stops cross-user probing).
    const deck = await flashcardDecksDb.getById(userId, deckId);
    if (!deck) return NextResponse.json({ error: 'Deck not found.' }, { status: 404 });
    const passage = await passagesDb.getById(userId, passageId);
    if (!passage) return NextResponse.json({ error: 'Passage not found.' }, { status: 404 });

    // Auto-fill via the shared generate pipeline. Treat as best-effort — if it
    // throws we still create the card with just english + the in-context
    // Vietnamese the caller pre-filled via /define-word (passed in via word?
    // No — caller only passes the lemma). Leaving fields empty is fine; the
    // user can edit later. So we fall back to nulls but never block the save.
    const generated = await generateCardData(word).catch(() => null);

    const id = await flashcardsDb.create(userId, {
      deck_id: deckId,
      english: word,
      vietnamese: generated?.vietnamese ?? '',
      ipa: generated?.ipa ?? null,
      audio_url: generated?.audio_url ?? null,
      part_of_speech: generated?.part_of_speech ?? null,
      examples: generated?.examples ?? [],
      collocations: generated?.collocations ?? [],
      image_url: generated?.image_url ?? null,
      image_attribution: generated?.image_attribution ?? null,
      notes: null,
      source_passage_id: passageId,
      source_context: sourceContext,
    });
    const card = await flashcardsDb.getById(userId, id);
    return NextResponse.json({ card }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[cards/from-passage POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
