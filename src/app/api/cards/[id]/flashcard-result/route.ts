import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardReviewsDb, CardNotFoundError } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/cards/:id/flashcard-result — timed Flashcard-nhanh answer.
 * Body: { correct: boolean }. Only the TIMED variant calls this; free play
 * (timer off) writes nothing. All SRS rules live in
 * flashcardReviewsDb.recordFlashcardResult (study-unified Part B).
 */
export async function POST(
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

    const body = (await req.json().catch(() => ({}))) as { correct?: unknown };
    if (typeof body.correct !== 'boolean') {
      return NextResponse.json({ error: '`correct` must be a boolean.' }, { status: 400 });
    }

    const result = await flashcardReviewsDb.recordFlashcardResult(userId, cardId, body.correct);
    return NextResponse.json({ ok: true, srs_applied: result.srs_applied });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (err instanceof CardNotFoundError) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    console.error('[flashcard-result] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
