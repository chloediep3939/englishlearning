import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardsDb, flashcardTestAttemptsDb } from '@/lib/db';
import { evaluateSentence } from '@/lib/flashcards/sentence-eval';
import type { SentenceAttemptMeta } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();

    const body = (await req.json().catch(() => ({}))) as {
      flashcard_id?: unknown;
      sentence?: unknown;
      time_ms?: unknown;
      timed_out?: unknown;
    };

    const flashcardId = Number(body.flashcard_id);
    if (!Number.isInteger(flashcardId) || flashcardId <= 0) {
      return NextResponse.json({ error: 'Invalid flashcard_id.' }, { status: 400 });
    }
    if (typeof body.sentence !== 'string') {
      return NextResponse.json({ error: 'Invalid sentence.' }, { status: 400 });
    }
    const sentence = body.sentence.trim().slice(0, 1000);
    if (sentence.length < 5) {
      return NextResponse.json({ error: 'Câu quá ngắn' }, { status: 400 });
    }
    const timeMs =
      typeof body.time_ms === 'number' && Number.isFinite(body.time_ms) && body.time_ms >= 0
        ? Math.floor(body.time_ms)
        : null;
    const timedOut = body.timed_out === true;

    const card = await flashcardsDb.getById(userId, flashcardId);
    if (!card) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const evaluation = await evaluateSentence(
      {
        english: card.english,
        vietnamese: card.vietnamese,
        part_of_speech: card.part_of_speech,
      },
      sentence
    );

    if (!evaluation) {
      // Transient AI failure or malformed JSON — do NOT record a test_attempt
      return NextResponse.json(
        { error: 'AI tạm thời không phản hồi. Thử lại nhé.' },
        { status: 502 }
      );
    }

    const passed =
      !timedOut &&
      evaluation.used_correctly &&
      evaluation.grammar_ok &&
      evaluation.semantic_ok;

    const meta: SentenceAttemptMeta = {
      user_sentence: sentence,
      evaluation,
      timed_out: timedOut,
      time_ms: timeMs ?? 0,
    };
    await flashcardTestAttemptsDb.create(userId, {
      flashcard_id: card.id,
      mode: 'sentence',
      passed,
      time_ms: timeMs,
      metadata: meta as unknown as Record<string, unknown>,
    });

    // Pick the first example sentence from the card to show alongside feedback.
    // `card.examples` is hydrated to FlashcardExample[] by `hydrateCard`.
    let example_sentence: string | null = null;
    if (Array.isArray(card.examples) && card.examples.length > 0) {
      const first = card.examples[0];
      if (first && typeof first.en === 'string' && first.en.length > 0) {
        example_sentence = first.en;
      }
    }

    return NextResponse.json({ evaluation, passed, example_sentence });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[sentence evaluate] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
