// CMU Pronouncing Dictionary IPA lookup. The dictionary is shipped as a
// static asset (`public/cmu-ipa.json`, ~3.4MB, ~125K entries) and lazily
// loaded once per worker isolate. Lookups are O(1) Map.get after the first
// call; first call costs ~100–300ms while the JSON is fetched + parsed.
//
// Why not bundle the JSON directly: at 3.4MB it would push the worker
// bundle close to the Cloudflare 10MB limit. Keeping it as a static asset
// served via the ASSETS binding keeps the worker lean.

import { getCloudflareContext } from '@opennextjs/cloudflare';

let cached: Map<string, string> | null = null;
let inflight: Promise<Map<string, string>> | null = null;

/**
 * Load the dictionary once per isolate. Subsequent calls return the cached
 * Map without I/O. Concurrent calls share the same in-flight promise so we
 * never double-fetch.
 */
async function loadDict(): Promise<Map<string, string>> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    let raw: string | null = null;

    // Path 1 (Cloudflare Workers production + opennext dev): use the
    // ASSETS binding. The host part of the URL is arbitrary — only the
    // pathname matters for asset lookup.
    try {
      const cf = await getCloudflareContext({ async: true });
      const assets = (cf.env as Record<string, unknown>).ASSETS as
        | { fetch: (req: Request) => Promise<Response> }
        | undefined;
      if (assets) {
        const res = await assets.fetch(new Request('https://x/cmu-ipa.json'));
        if (res.ok) raw = await res.text();
      }
    } catch {
      /* fall through to fs path for plain-node environments */
    }

    // Path 2 (plain Node, e.g. `next dev` without the CF wrapper, or
    // unit tests): read the file from disk.
    if (raw === null) {
      try {
        const { readFile } = await import('node:fs/promises');
        const { join } = await import('node:path');
        const path = join(process.cwd(), 'public', 'cmu-ipa.json');
        raw = await readFile(path, 'utf-8');
      } catch (err) {
        console.error('[cmu-ipa] fs read failed:', err);
        throw err;
      }
    }

    const data = JSON.parse(raw) as Record<string, string>;
    cached = new Map(Object.entries(data));
    return cached;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/**
 * Look up an IPA transcription for a single word. Returns null when the
 * word isn't in the CMU dictionary (proper nouns, slang, multi-word
 * phrases, very new vocabulary). Caller should fall back to the network
 * dictionary in that case.
 *
 * Phrases / hyphens: CMU has many hyphenated compounds. We also try
 * splitting on whitespace and stitching syllable IPA per-word for short
 * multi-word entries — that helps with phrasal verbs like "give up".
 */
export async function lookupCmuIpa(word: string): Promise<string | null> {
  const cleaned = word?.trim().toLowerCase();
  if (!cleaned) return null;

  let dict: Map<string, string>;
  try {
    dict = await loadDict();
  } catch {
    return null;
  }

  const direct = dict.get(cleaned);
  if (direct) return direct;

  // Multi-word: stitch per-word IPA with a thin space between tokens.
  // Skip if any token misses — better to fall back to the network dict for
  // accurate phrase phonemics than to return a partial transcription.
  if (/\s/.test(cleaned)) {
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const pieces: string[] = [];
    for (const p of parts) {
      const ipa = dict.get(p);
      if (!ipa) return null;
      // Strip the wrapping slashes from each piece, join, re-wrap.
      pieces.push(ipa.replace(/^\/|\/$/g, ''));
    }
    return `/${pieces.join(' ')}/`;
  }

  return null;
}
