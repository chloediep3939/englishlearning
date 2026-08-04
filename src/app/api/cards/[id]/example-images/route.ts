import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardsDb } from '@/lib/db';
import { fillExampleImage } from '@/lib/flashcards/example-image';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/cards/[id]/example-images — fill Pexels illustrations for every
 * example on the card that doesn't have one yet. Sequential, best-effort
 * (a Pexels miss just leaves that example imageless). Used by the
 * deck-detail "Sửa từ thiếu info" sweep. Returns the refreshed card.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id: raw } = await params;
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
    }

    const existing = await flashcardsDb.getById(userId, id);
    if (!existing) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }

    let filled = 0;
    for (let i = 0; i < existing.examples.length; i++) {
      const ex = existing.examples[i];
      if (!ex.en.trim() || ex.image_url) continue;
      try {
        if (await fillExampleImage(userId, id, i)) filled++;
      } catch (err) {
        console.error('[example-images] error:', err);
      }
    }

    const card = await flashcardsDb.getById(userId, id);
    return NextResponse.json({ ok: filled > 0, filled, card });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[example-images] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
