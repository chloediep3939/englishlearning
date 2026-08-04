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
  examples: string[]; // example sentences from the same entry page
}

export const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Shared deadline across the page fetch + the mp3 fetch so a slow Oxford
// can't stall card creation (see Step 5 — best-effort, must never block).
const FETCH_TIMEOUT_MS = 6000;

export interface ParsedUsPronunciation {
  ipaUs: string | null;
  mp3SourceUrl: string | null;
  examples: string[];
}

/**
 * Pure HTML → US pronunciation parse. Exported for testing without a network
 * round-trip. Pronunciation scopes to the first `.webtop` entry (prefers the
 * American block, positional-2nd fallback); examples come from the whole
 * page's sense list (`<span class="x">`) — same fetched HTML, no extra
 * request.
 */
export function parseOxfordUsPronunciation(html: string): ParsedUsPronunciation {
  const block = firstWebtopBlock(html);
  return {
    ipaUs: extractUsIpa(block),
    mp3SourceUrl: extractUsMp3Url(block),
    examples: extractExamples(html),
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
    const { ipaUs, mp3SourceUrl, examples } = parseOxfordUsPronunciation(html);

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

    return { ipaUs, mp3, mp3SourceUrl, examples };
  } catch (err) {
    console.error('[oxford] page fetch error:', err);
    return emptyResult();
  } finally {
    clearTimeout(timer);
  }
}

function emptyResult(): OxfordPronunciation {
  return { ipaUs: null, mp3: null, mp3SourceUrl: null, examples: [] };
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
    if (!res.ok) return { ipaUs: null, mp3SourceUrl: null, examples: [] };
    const html = await res.text();
    return parseOxfordUsPronunciation(html);
  } catch (err) {
    console.error('[oxford] meta fetch error:', err);
    return { ipaUs: null, mp3SourceUrl: null, examples: [] };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch an Oxford entry page and return just its example sentences — for
 * callers outside the audio path (e.g. the card regenerate "examples" leg).
 * Never throws; returns [] on any miss.
 */
export async function fetchOxfordExamples(oxfordUrl: string): Promise<string[]> {
  const parsed = await fetchOxfordPronunciationMeta(oxfordUrl);
  return parsed.examples;
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

/**
 * Example sentences: every `<span class="x">…</span>` on the entry page
 * (Oxford's sense-list example markup). Nested spans (bold collocations,
 * glosses) are stripped to plain text; entities decoded; deduped; kept only
 * when they read like a sentence (letters, sane length). Capped at 8 —
 * downstream pickers take the top 3.
 */
const MAX_EXAMPLES = 8;

function extractExamples(html: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const open = /<span class="x"[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = open.exec(html)) !== null && out.length < MAX_EXAMPLES) {
    const start = m.index + m[0].length;
    // Examples nest spans (bold collocations, glosses) — walk span tags to
    // the balanced close instead of stopping at the first </span>.
    const tag = /<\/?span[^>]*>/g;
    tag.lastIndex = start;
    let depth = 1;
    let end = -1;
    let t: RegExpExecArray | null;
    while ((t = tag.exec(html)) !== null) {
      depth += t[0].startsWith('</') ? -1 : 1;
      if (depth === 0) {
        end = t.index;
        break;
      }
    }
    if (end < 0) break;
    open.lastIndex = end;

    const text = decodeEntities(html.slice(start, end).replace(/<[^>]+>/g, ''))
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length < 20 || text.length > 160) continue;
    if (!/[a-zA-Z]{3}/.test(text)) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/g, '’')
    .replace(/&lsquo;|&#8216;/g, '‘')
    .replace(/&ldquo;|&#8220;/g, '“')
    .replace(/&rdquo;|&#8221;/g, '”')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
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
