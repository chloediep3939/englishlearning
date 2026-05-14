import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardReviewsDb, CardNotFoundError } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { flashcard_id?: unknown };
    const flashcardId = Number(body.flashcard_id);
    if (!Number.isInteger(flashcardId) || flashcardId <= 0) {
      return NextResponse.json({ error: 'Invalid flashcard_id.' }, { status: 400 });
    }

    // Treat timeout as quality 2 ("Khó") — the user couldn't finish in time, but
    // may still know the word. Bring it back sooner without fully resetting SRS.
    await flashcardReviewsDb.recordRating(userId, flashcardId, 2);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (err instanceof CardNotFoundError) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    console.error('[sentence timeout] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
