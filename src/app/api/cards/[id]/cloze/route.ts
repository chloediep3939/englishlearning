import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardsDb, flashcardClozePoolDb } from '@/lib/db';
import { ensureClozePool, blankOutWord } from '@/lib/flashcards/cloze';
import type { ClozeChallenge } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id: rawId } = await params;
    const cardId = Number(rawId);
    if (!Number.isInteger(cardId) || cardId <= 0) {
      return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
    }

    // Ownership check via wrapper
    const card = await flashcardsDb.getById(userId, cardId);
    if (!card) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const word = card.english.toLowerCase();

    // 1) Read the shared pool first — the happy path after Part 2's background
    //    trigger has populated 10 sentences per saved card.
    let sentences = await flashcardClozePoolDb.getByWord(word, 1);

    // 2) Pool empty (card pre-dates the pool, or background gen didn't finish
    //    before the user opened cloze quiz) → sync-generate now.
    if (sentences.length === 0) {
      await ensureClozePool(word, { minimum: 1 });
      sentences = await flashcardClozePoolDb.getByWord(word, 1);
    }

    if (sentences.length > 0) {
      const s = sentences[0];
      // Pool sentences already carry the `__` marker. Normalize to the wider
      // `_____` the UI used historically so the blank is visually obvious;
      // tolerate model output drift (3+ underscores) with `_{2,}`.
      const blankedSentence = s.sentence.replace(/_{2,}/, '_____');
      const fullSentence = s.sentence.replace(/_{2,}/, s.blank_word);
      const challenge: ClozeChallenge = {
        card_id: cardId,
        // `english` is the answer string the UI compares against typed input
        // (ClozeSession.tsx) and uses for hint / audio fallback. Pool sentences
        // may use inflected forms (e.g. "running" for headword "run"), so we
        // surface the actual `blank_word` here rather than the card lemma.
        english: s.blank_word,
        vietnamese: card.vietnamese,
        ipa: card.ipa,
        audio_url: card.audio_url,
        blanked_sentence: blankedSentence,
        full_sentence: fullSentence,
        // Pool sentences don't carry VI translations; the UI handles `null`.
        vi_sentence: null,
        sentence_id: s.id ?? null,
      };
      return NextResponse.json(challenge);
    }

    // 3) Pool still empty after lazy fill (AI failed, no key, etc.) → fall
    //    back to the dictionary example on the card. Preserves the old
    //    fallback behaviour for cards that have a dictionary example baked in.
    const fallbackEn = card.examples?.[0]?.en;
    if (fallbackEn) {
      const challenge: ClozeChallenge = {
        card_id: cardId,
        english: card.english,
        vietnamese: card.vietnamese,
        ipa: card.ipa,
        audio_url: card.audio_url,
        blanked_sentence: blankOutWord(fallbackEn, card.english),
        full_sentence: fallbackEn,
        vi_sentence: card.examples?.[0]?.vi ?? null,
        sentence_id: null,
      };
      return NextResponse.json(challenge);
    }

    return NextResponse.json(
      { error: 'Cloze chưa sẵn sàng, thử lại sau.' },
      { status: 503 }
    );
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[cloze GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
