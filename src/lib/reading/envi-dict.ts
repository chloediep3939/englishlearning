// Offline English→Vietnamese dictionary lookup. The data ships as a static
// asset (`public/envi-dict.json`, ~7MB, ~90K headwords — built by
// `scripts/build-envi-dict.mjs` from the Hồ Ngọc Đức Anh-Việt dictionary)
// and is lazily loaded once per worker isolate, exactly like the CMU IPA
// asset (`src/lib/flashcards/cmu-ipa.ts`). First call costs ~200-500ms for
// fetch + parse; afterwards lookups are O(1) Map.get with zero network,
// zero quota, zero API keys.

import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface EnViEntry {
  vn: string;
  pos: string | null;
}

type Tuple = [string, string];

let cached: Map<string, Tuple> | null = null;
let inflight: Promise<Map<string, Tuple>> | null = null;

async function loadDict(): Promise<Map<string, Tuple>> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    let raw: string | null = null;

    // Path 1 (Workers production + opennext dev): ASSETS binding — the URL
    // host is arbitrary, only the pathname selects the asset.
    try {
      const cf = await getCloudflareContext({ async: true });
      const assets = (cf.env as Record<string, unknown>).ASSETS as
        | { fetch: (req: Request) => Promise<Response> }
        | undefined;
      if (assets) {
        const res = await assets.fetch(new Request('https://x/envi-dict.json'));
        if (res.ok) raw = await res.text();
      }
    } catch {
      /* fall through to fs path */
    }

    // Path 2 (plain Node: `next dev` without the CF wrapper, unit tests).
    if (raw === null) {
      const { readFile } = await import('node:fs/promises');
      const { join } = await import('node:path');
      raw = await readFile(join(process.cwd(), 'public', 'envi-dict.json'), 'utf-8');
    }

    const data = JSON.parse(raw) as Record<string, Tuple>;
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
 * Direct headword lookup (no lemmatization here — callers thread their own
 * candidates). Returns null on a miss or when the asset can't be loaded.
 */
export async function lookupEnVi(word: string): Promise<EnViEntry | null> {
  const cleaned = word?.trim().toLowerCase();
  if (!cleaned) return null;
  let dict: Map<string, Tuple>;
  try {
    dict = await loadDict();
  } catch (err) {
    console.error('[envi-dict] load failed:', err);
    return null;
  }
  const hit = dict.get(cleaned);
  if (!hit) return null;
  return { vn: hit[0], pos: hit[1] || null };
}
