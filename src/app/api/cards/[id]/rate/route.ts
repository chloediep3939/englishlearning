import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardsDb, flashcardReviewsDb, CardNotFoundError } from '@/lib/db';
import type { SRSQuality } from '@/lib/flashcards/srs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_QUALITIES = new Set([0, 2, 4, 5]);

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

    const body = (await req.json().catch(() => ({}))) as { quality?: unknown };
    const quality = Number(body.quality);
    if (!VALID_QUALITIES.has(quality)) {
      return NextResponse.json(
        { error: 'Quality must be 0, 2, 4, or 5.' },
        { status: 400 }
      );
    }

    const result = await flashcardReviewsDb.recordRating(
      userId,
      cardId,
      quality as SRSQuality
    );

    const updated = await flashcardsDb.getById(userId, cardId);
    return NextResponse.json({
      card: updated,
      prev_interval: result.prev_interval,
      new_interval: result.new_interval,
      next_review_at: result.next_review_at,
      new_status: result.new_status,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (err instanceof CardNotFoundError) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    console.error('[card rate] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
