import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Microsoft Translator (Azure Cognitive Services) wrapper. Server-only.
 *
 * Two capabilities:
 *   translateSentences — batch EN→VI sentence translation.
 *   dictionaryLookup   — single-word EN→VI with part-of-speech.
 *
 * Credentials come from the Cloudflare env (MS_TRANSLATOR_KEY +
 * MS_TRANSLATOR_REGION). When absent, callers should degrade to EN-only — use
 * `getMsCredentials()` which returns null rather than throwing.
 */

const MS_ENDPOINT = 'https://api.cognitive.microsofttranslator.com';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_BATCH = 100; // MS Translator caps at 100 array elements per request (E1.7).

export interface MsCredentials {
  key: string;
  region: string;
}

/** Read MS Translator credentials from the Cloudflare env. Null if unset. */
export async function getMsCredentials(): Promise<MsCredentials | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const e = env as Record<string, unknown>;
    const key = typeof e.MS_TRANSLATOR_KEY === 'string' ? e.MS_TRANSLATOR_KEY : '';
    const region = typeof e.MS_TRANSLATOR_REGION === 'string' ? e.MS_TRANSLATOR_REGION : '';
    if (!key || !region) return null;
    return { key, region };
  } catch {
    return null;
  }
}

function headers(creds: MsCredentials): Record<string, string> {
  return {
    'Ocp-Apim-Subscription-Key': creds.key,
    'Ocp-Apim-Subscription-Region': creds.region,
    'Content-Type': 'application/json',
  };
}

async function postJson(url: string, creds: MsCredentials, body: unknown): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: headers(creds),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

interface MsTranslateItem {
  translations: { text: string; to: string }[];
}

/**
 * Translate sentences EN→VI, preserving order. Chunks into ≤100-element
 * requests. Retries each chunk once on failure (E1.4). Throws on a final
 * failure so the route can fall back to EN-only.
 */
export async function translateSentences(
  sentences: string[],
  creds: MsCredentials,
): Promise<string[]> {
  if (sentences.length === 0) return [];
  const url = `${MS_ENDPOINT}/translate?api-version=3.0&from=en&to=vi`;
  const out: string[] = [];

  for (let i = 0; i < sentences.length; i += MAX_BATCH) {
    const chunk = sentences.slice(i, i + MAX_BATCH);
    const body = chunk.map((text) => ({ Text: text }));

    let lastErr: unknown = null;
    let done = false;
    for (let attempt = 0; attempt < 2 && !done; attempt++) {
      try {
        const res = await postJson(url, creds, body);
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`MS Translator error ${res.status}: ${errText}`);
        }
        const data = (await res.json()) as MsTranslateItem[];
        for (const item of data) out.push(item.translations[0]?.text ?? '');
        done = true;
      } catch (err) {
        lastErr = err;
      }
    }
    if (!done) throw lastErr ?? new Error('MS Translator failed');
  }

  return out;
}

interface MsDictTranslation {
  normalizedTarget: string;
  displayTarget: string;
  posTag: string;
  confidence: number;
}
interface MsDictItem {
  translations: MsDictTranslation[];
}

/**
 * Dictionary lookup for a single word EN→VI. Returns the highest-confidence
 * entry's display form + POS, or null on a miss / error (E4.3, E4.5). Never
 * throws — a null degrades to "Chưa có nghĩa sẵn".
 */
export async function dictionaryLookup(
  word: string,
  creds: MsCredentials,
): Promise<{ vn: string; pos: string } | null> {
  const url = `${MS_ENDPOINT}/dictionary/lookup?api-version=3.0&from=en&to=vi`;
  try {
    const res = await postJson(url, creds, [{ Text: word }]);
    if (!res.ok) return null;
    const data = (await res.json()) as MsDictItem[];
    const translations = data[0]?.translations ?? [];
    if (translations.length === 0) return null;
    const best = [...translations].sort((a, b) => b.confidence - a.confidence)[0];
    return {
      vn: best.displayTarget,
      pos: best.posTag ? best.posTag.toLowerCase() : '',
    };
  } catch {
    return null;
  }
}
