/**
 * MyMemory translation API (free, 5000 chars/day per IP).
 * Used for example sentence translations EN→VI.
 */

const API_URL = 'https://api.mymemory.translated.net/get';

export async function translateEnToVi(text: string): Promise<string | null> {
  if (!text || text.length === 0) return null;
  if (text.length > 500) return null; // avoid quota burn on huge inputs
  try {
    const url = `${API_URL}?q=${encodeURIComponent(text)}&langpair=en|vi`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { responseData?: { translatedText?: string } };
    const translated = data.responseData?.translatedText;
    if (!translated || typeof translated !== 'string') return null;
    return translated;
  } catch (err) {
    console.error('[translate] error:', err);
    return null;
  }
}
