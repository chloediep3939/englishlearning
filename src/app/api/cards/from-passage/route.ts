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
      prefilled?: unknown;
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

    // Optional pre-filled gloss from the Read-Along reader (MS Dictionary +
    // Gemini IPA, already resolved client-side). When present we skip the
    // generateCardData pipeline entirely — no redundant dictionary / Datamuse /
    // Pexels / lemmatize-AI calls — and stamp the values verbatim. `vi` may be
    // an empty string for a proper noun with no meaning (E5.4); we still save.
    const pf = (typeof body.prefilled === 'object' && body.prefilled !== null
      ? body.prefilled
      : {}) as { vi?: unknown; pos?: unknown; ipa?: unknown };
    const hasPrefill =
      typeof pf.vi === 'string' || typeof pf.pos === 'string' || typeof pf.ipa === 'string';

    // Verify deck + passage ownership (also stops cross-user probing).
    const deck = await flashcardDecksDb.getById(userId, deckId);
    if (!deck) return NextResponse.json({ error: 'Deck not found.' }, { status: 404 });
    const passage = await passagesDb.getById(userId, passageId);
    if (!passage) return NextResponse.json({ error: 'Passage not found.' }, { status: 404 });

    // Dedup against the deck (E5.7): re-saving an existing word returns the
    // existing card instead of inserting a duplicate. Match the persisted
    // headword — prefilled saves use the cleaned word; pipeline saves use the
    // lemma, so check both.
    const existing = await flashcardsDb.findByEnglishInDeck(userId, deckId, word);
    if (existing) {
      return NextResponse.json({ card: existing, deduped: true }, { status: 200 });
    }

    if (hasPrefill) {
      const id = await flashcardsDb.create(userId, {
        deck_id: deckId,
        english: word,
        vietnamese: typeof pf.vi === 'string' ? pf.vi.slice(0, 500) : '',
        ipa: typeof pf.ipa === 'string' && pf.ipa ? pf.ipa : null,
        audio_url: null,
        part_of_speech: typeof pf.pos === 'string' && pf.pos ? pf.pos : null,
        examples: [],
        collocations: [],
        image_url: null,
        image_attribution: null,
        notes: null,
        source_passage_id: passageId,
        source_context: sourceContext,
      });
      const card = await flashcardsDb.getById(userId, id);
      return NextResponse.json({ card }, { status: 201 });
    }

    // No prefill — auto-fill via the shared generate pipeline. Treat as
    // best-effort — if it throws we still create the card with just english.
    // Leaving fields empty is fine; the user can edit later.
    const generated = await generateCardData(word).catch(() => null);

    const id = await flashcardsDb.create(userId, {
      deck_id: deckId,
      // Prefer the lemmatized headword from generateCardData so inflected
      // forms picked from a passage ("ran", "boxes") persist as the lemma.
      english: generated?.english ?? word,
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
