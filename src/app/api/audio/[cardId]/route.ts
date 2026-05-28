import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardsDb, getAudioBucket } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Serves a card's stored Oxford US pronunciation mp3 from R2.
 *
 * Ownership-scoped: the card is looked up by (userId, cardId), so a user can
 * only fetch audio for their own cards. `?v=<updated_at>` is accepted but
 * ignored — it exists purely to bust the browser/CDN cache after a re-fetch
 * (the R2 key is reused on overwrite, so without it the `immutable` cache
 * would replay the stale clip).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cardId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { cardId: raw } = await params;
    const cardId = Number(raw);
    if (!Number.isInteger(cardId) || cardId <= 0) {
      return new Response('Invalid id', { status: 400 });
    }

    const card = await flashcardsDb.getById(userId, cardId);
    if (!card || !card.audio_us_key) {
      return new Response('Not found', { status: 404 });
    }

    const bucket = await getAudioBucket();
    const object = await bucket.get(card.audio_us_key);
    if (!object) {
      return new Response('Not found', { status: 404 });
    }

    const buf = await object.arrayBuffer();
    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'audio/mpeg');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Content-Length', String(buf.byteLength));
    return new Response(buf, { status: 200, headers });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response('Unauthorized', { status: 401 });
    }
    console.error('[audio GET] error:', err);
    return new Response('Internal error', { status: 500 });
  }
}
