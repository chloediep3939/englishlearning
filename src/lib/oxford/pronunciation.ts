// Scrapes the US pronunciation (IPA + mp3) from an Oxford Learner's
// Dictionaries entry page. Runs server-side (Workers runtime) — uses global
// `fetch` and a browser-like User-Agent (Oxford serves a bot page otherwise;
// see gotcha #1 in src/doc/prompts/oxford-audio.md).
//
// Parsing is a focused regex over the FIRST `.webtop` entry block, targeting
// the American phonetics container (`phons_n_am` / mp3 url containing
// `us_pron`). Positional "2nd .phon / 2nd mp3" is the fallback (1st = UK,
// 2nd = US). The structure was verified against the live `purchase` page:
//   ipaUs    = /ˈpɜːrtʃəs/
//   mp3 url  = .../media/english/us_pron/p/pur/purch/purchase__us_1.mp3
//
// HTMLRewriter was the prompt's suggested approach, but for pure extraction
// (no rewriting) its per-chunk text buffering is error-prone; the prompt
// explicitly permits a regex scoped to the American block, which is what
// `parseOxfordUsPronunciation` does.

export interface OxfordPronunciation {
  ipaUs: string | null; // e.g. "/ˈpɜːrtʃəs/"
  mp3: ArrayBuffer | null; // downloaded US mp3 bytes
  mp3SourceUrl: string | null; // the Oxford mp3 url we downloaded from
}

export const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Shared deadline across the page fetch + the mp3 fetch so a slow Oxford
// can't stall card creation (see Step 5 — best-effort, must never block).
const FETCH_TIMEOUT_MS = 6000;

export interface ParsedUsPronunciation {
  ipaUs: string | null;
  mp3SourceUrl: string | null;
}

/**
 * Pure HTML → US pronunciation parse. Exported for testing without a network
 * round-trip. Scopes to the first `.webtop` entry and prefers the American
 * block; falls back to positional-2nd.
 */
export function parseOxfordUsPronunciation(html: string): ParsedUsPronunciation {
  const block = firstWebtopBlock(html);
  return {
    ipaUs: extractUsIpa(block),
    mp3SourceUrl: extractUsMp3Url(block),
  };
}

/**
 * Fetch the Oxford page, parse the US pronunciation, and download the mp3.
 * Never throws — returns all-null on any network/parse failure so callers can
 * treat it as a best-effort miss.
 */
export async function fetchOxfordPronunciation(oxfordUrl: string): Promise<OxfordPronunciation> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(oxfordUrl, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en' },
    });
    if (!res.ok) return emptyResult();

    const html = await res.text();
    const { ipaUs, mp3SourceUrl } = parseOxfordUsPronunciation(html);

    let mp3: ArrayBuffer | null = null;
    if (mp3SourceUrl) {
      try {
        const audioRes = await fetch(mp3SourceUrl, {
          redirect: 'follow',
          signal: controller.signal,
          headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en' },
        });
        if (audioRes.ok) {
          const buf = await audioRes.arrayBuffer();
          if (buf.byteLength > 0) mp3 = buf;
        }
      } catch (err) {
        console.error('[oxford] mp3 fetch error:', err);
      }
    }

    return { ipaUs, mp3, mp3SourceUrl };
  } catch (err) {
    console.error('[oxford] page fetch error:', err);
    return emptyResult();
  } finally {
    clearTimeout(timer);
  }
}

function emptyResult(): OxfordPronunciation {
  return { ipaUs: null, mp3: null, mp3SourceUrl: null };
}

/**
 * Lightweight variant: fetch the Oxford page and parse the US IPA + mp3 URL
 * WITHOUT downloading the mp3 bytes. Used by the read-along word lookup, which
 * runs on the per-tap hot path and only needs `{ ipaUs, mp3SourceUrl }` — the
 * bytes are fetched lazily later by the audio-serving route. Never throws;
 * returns all-null on any network/parse failure.
 */
export async function fetchOxfordPronunciationMeta(
  oxfordUrl: string,
): Promise<ParsedUsPronunciation> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(oxfordUrl, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en' },
    });
    if (!res.ok) return { ipaUs: null, mp3SourceUrl: null };
    const html = await res.text();
    return parseOxfordUsPronunciation(html);
  } catch (err) {
    console.error('[oxford] meta fetch error:', err);
    return { ipaUs: null, mp3SourceUrl: null };
  } finally {
    clearTimeout(timer);
  }
}

// Slice out the first `.webtop` entry (the primary headword) so we don't pick
// up phonetics from later run-on entries / inflections on the same page.
function firstWebtopBlock(html: string): string {
  const start = html.indexOf('class="webtop"');
  if (start < 0) return html;
  const next = html.indexOf('class="webtop"', start + 'class="webtop"'.length);
  return next < 0 ? html.slice(start) : html.slice(start, next);
}

function extractUsIpa(block: string): string | null {
  // Primary: the `.phon` span inside the American phonetics container.
  const amIdx = block.indexOf('phons_n_am');
  if (amIdx >= 0) {
    const m = block.slice(amIdx).match(/class="phon">([^<]+)<\/span>/);
    if (m && m[1].trim()) return m[1].trim();
  }
  // Fallback: positional — 1st `.phon` = UK, 2nd = US.
  const phons = [...block.matchAll(/class="phon">([^<]+)<\/span>/g)].map((mm) => mm[1].trim());
  if (phons.length >= 2 && phons[1]) return phons[1];
  return null;
}

function extractUsMp3Url(block: string): string | null {
  const mp3s = [...block.matchAll(/data-src-mp3="([^"]+\.mp3)"/g)].map((mm) => mm[1]);
  if (mp3s.length === 0) return null;
  // Primary: the file Oxford marks American (path `us_pron/` or `__us_` suffix).
  // UK files use `uk_pron` / `__gb_`, so this never false-matches the UK clip.
  const us = mp3s.find((u) => /us_pron|__us_/.test(u));
  if (us) return us;
  // Fallback: positional — 1st mp3 = UK, 2nd = US.
  if (mp3s.length >= 2) return mp3s[1];
  return null;
}
