import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { getPexelsImage } from '@/lib/flashcards/pexels';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/images/pexels?q=<word>&skip=<n>
 * Lightweight alternative to re-running the full /api/cards/generate flow
 * just to swap the image. Used by the "reload image" button on /add preview.
 * Returns { image_url, image_attribution } or 404 if no result.
 */
export async function GET(req: Request) {
  try {
    await requireUserId();
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    const skip = Number(url.searchParams.get('skip')) || 0;
    if (!q) {
      return NextResponse.json({ error: 'Missing query.' }, { status: 400 });
    }
    const result = await getPexelsImage(q, skip);
    if (!result) {
      return NextResponse.json({ error: 'No image found.' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[images/pexels] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
