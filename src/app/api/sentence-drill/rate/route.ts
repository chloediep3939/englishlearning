import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { CardNotFoundError, sentenceDrillsDb } from '@/lib/db';
import type { SRSQuality } from '@/lib/flashcards/srs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_QUALITIES = new Set([0, 2, 4, 5]);

/**
 * POST /api/sentence-drill/rate — SM-2 rating for one sentence ("Học câu").
 * Body: { flashcard_id, example_index, quality, failed_this_session?, apply_srs? }
 * Mirrors /api/cards/[id]/rate but mutates sentence_drills, never the word.
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as {
      flashcard_id?: unknown;
      example_index?: unknown;
      quality?: unknown;
      failed_this_session?: unknown;
      apply_srs?: unknown;
    };

    const flashcardId = Number(body.flashcard_id);
    if (!Number.isInteger(flashcardId) || flashcardId <= 0) {
      return NextResponse.json({ error: 'Invalid flashcard_id.' }, { status: 400 });
    }
    const exampleIndex = Number(body.example_index);
    if (![0, 1, 2].includes(exampleIndex)) {
      return NextResponse.json({ error: 'Invalid example_index.' }, { status: 400 });
    }
    const quality = Number(body.quality);
    if (!VALID_QUALITIES.has(quality)) {
      return NextResponse.json({ error: 'Invalid quality.' }, { status: 400 });
    }

    const result = await sentenceDrillsDb.recordRating(
      userId,
      flashcardId,
      exampleIndex,
      quality as SRSQuality,
      {
        failedThisSession: body.failed_this_session === true,
        // Same protocol as the word session: only the first rating of a
        // sentence per session mutates its schedule; later ones are log-only.
        srsUpdate: body.apply_srs !== false,
      },
    );

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (err instanceof CardNotFoundError) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    console.error('[sentence-drill rate] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
