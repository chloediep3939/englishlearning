import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { getAudioBucket } from '@/lib/db';
import { wordGlossaryDb } from '@/lib/reading/db';
import { cleanWord } from '@/lib/reading/tokenizer';
import { BROWSER_UA } from '@/lib/oxford/pronunciation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Serves a read-along word's Oxford US pronunciation mp3.
 *
 *   1. If R2 has audio/words/<word>.mp3 → stream it (preview/prod cache).
 *   2. Else proxy the Oxford CDN url stored in word_glossary.audio_src (works
 *      under `npm run dev` where R2 is absent), and best-effort cache to R2.
 *
 * SSRF guard: the proxied url is ONLY ever the stored Oxford CDN url (written
 * by the lookup route from parsed Oxford HTML, never user input). We still
 * assert https + an Oxford/OUP host as defense in depth.
 */
const AUDIO_HEADERS: Record<string, string> = {
  'Content-Type': 'audio/mpeg',
  'Cache-Control': 'public, max-age=31536000, immutable',
};

function r2Key(word: string): string {
  return `audio/words/${word}.mp3`;
}

function isAllowedOxfordUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    return (
      u.hostname === 'oxfordlearnersdictionaries.com' ||
      u.hostname.endsWith('.oxfordlearnersdictionaries.com') ||
      u.hostname.endsWith('.oup.com')
    );
  } catch {
    return false;
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ word: string }> }) {
  try {
    await requireUserId();
    const { word: rawParam } = await ctx.params;
    const word = cleanWord(decodeURIComponent(rawParam));
    if (!word || word.length > 60) return new Response('Invalid word', { status: 400 });

    const row = await wordGlossaryDb.getOne(word);
    if (!row || !row.audio_src) return new Response('Not found', { status: 404 });

    const key = r2Key(word);

    // 1. R2 cache (absent under `npm run dev` — getAudioBucket throws → proxy).
    try {
      const bucket = await getAudioBucket();
      const object = await bucket.get(key);
      if (object) {
        const buf = await object.arrayBuffer();
        return new Response(buf, {
          status: 200,
          headers: { ...AUDIO_HEADERS, 'Content-Length': String(buf.byteLength) },
        });
      }
    } catch {
      /* no R2 binding (dev) — fall through to proxy */
    }

    // 2. Proxy the stored Oxford CDN url.
    if (!isAllowedOxfordUrl(row.audio_src)) {
      return new Response('Not found', { status: 404 });
    }
    const upstream = await fetch(row.audio_src, {
      redirect: 'follow',
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en' },
    });
    if (!upstream.ok) return new Response('Upstream error', { status: 502 });
    const buf = await upstream.arrayBuffer();
    if (buf.byteLength === 0) return new Response('Empty', { status: 502 });

    // Best-effort cache into R2 for next time (no-op under dev).
    try {
      const bucket = await getAudioBucket();
      await bucket.put(key, buf, { httpMetadata: { contentType: 'audio/mpeg' } });
    } catch {
      /* no R2 — skip caching */
    }

    return new Response(buf, {
      status: 200,
      headers: { ...AUDIO_HEADERS, 'Content-Length': String(buf.byteLength) },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return new Response('Unauthorized', { status: 401 });
    console.error('[words/audio GET] error:', err);
    return new Response('Internal error', { status: 500 });
  }
}
