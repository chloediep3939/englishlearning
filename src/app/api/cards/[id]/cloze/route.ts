import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardsDb, flashcardPracticeSentencesDb } from '@/lib/db';
import { generateClozeSentences, blankOutWord } from '@/lib/flashcards/cloze';
import type { ClozeChallenge } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const POOL_SIZE = 10;
const REGEN_AT_SHOWN_COUNT = 8;

function regenInBackground(cardId: number, english: string, partOfSpeech: string | null) {
  void (async () => {
    try {
      const fresh = await generateClozeSentences(english, partOfSpeech);
      if (fresh.length > 0) {
        await flashcardPracticeSentencesDb.createMany(cardId, fresh);
      }
    } catch (err) {
      console.error('[cloze bg regen] error:', err);
    }
  })();
}

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

    const totalInPool = await flashcardPracticeSentencesDb.countByCard(cardId);
    const shownCount = await flashcardPracticeSentencesDb.countShown(cardId);

    if (totalInPool === 0) {
      // Pool empty — must wait for AI (first cloze for this card)
      const fresh = await generateClozeSentences(card.english, card.part_of_speech);
      if (fresh.length > 0) {
        await flashcardPracticeSentencesDb.createMany(cardId, fresh);
      }
    } else if (totalInPool >= POOL_SIZE && shownCount >= REGEN_AT_SHOWN_COUNT) {
      // Pool depleted — fire-and-forget regen, serve cached now
      regenInBackground(cardId, card.english, card.part_of_speech);
    }

    const picked = await flashcardPracticeSentencesDb.pickLeastShown(cardId);

    if (picked) {
      await flashcardPracticeSentencesDb.markShown(picked.id);
      const challenge: ClozeChallenge = {
        card_id: cardId,
        english: card.english,
        vietnamese: card.vietnamese,
        ipa: card.ipa,
        audio_url: card.audio_url,
        blanked_sentence: blankOutWord(picked.sentence, card.english),
        full_sentence: picked.sentence,
        vi_sentence: picked.vi_translation,
        sentence_id: picked.id,
      };
      return NextResponse.json(challenge);
    }

    // Fallback: AI failed AND no examples cached — try dictionary example
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
      { error: 'Chưa có câu để luyện. Cần GEMINI_API_KEY hoặc example từ Dictionary API.' },
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
