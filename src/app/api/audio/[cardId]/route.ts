import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardsDb, getAudioBucket } from '@/lib/db';
import { BROWSER_UA, isAllowedOxfordUrl } from '@/lib/oxford/pronunciation';
import { audioKey } from '@/lib/oxford/persist';

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
    if (!card) {
      return new Response('Not found', { status: 404 });
    }

    let buf: ArrayBuffer;
    if (card.audio_us_key) {
      const bucket = await getAudioBucket();
      const object = await bucket.get(card.audio_us_key);
      if (!object) {
        return new Response('Not found', { status: 404 });
      }
      buf = await object.arrayBuffer();
    } else if (card.audio_url && isAllowedOxfordUrl(card.audio_url)) {
      // Thẻ chép từ thư viện bộ từ: mới có URL mp3 Oxford, chưa có bản trong R2.
      // Proxy lần đầu rồi lưu R2 (best-effort — dev không có R2 vẫn phát được).
      const upstream = await fetch(card.audio_url, {
        redirect: 'follow',
        headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en' },
      });
      if (!upstream.ok) return new Response('Upstream error', { status: 502 });
      buf = await upstream.arrayBuffer();
      if (buf.byteLength === 0) return new Response('Empty', { status: 502 });
      try {
        const bucket = await getAudioBucket();
        await bucket.put(audioKey(cardId), buf, { httpMetadata: { contentType: 'audio/mpeg' } });
        await flashcardsDb.update(userId, cardId, { audio_us_key: audioKey(cardId), audio_us_status: 'ok' });
      } catch (err) {
        console.error('[audio GET] R2 cache of Oxford mp3 failed:', err);
      }
    } else {
      return new Response('Not found', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', 'audio/mpeg');
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
