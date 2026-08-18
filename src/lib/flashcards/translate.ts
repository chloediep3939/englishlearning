/**
 * MyMemory translation API (free). Used for word/example EN→VI.
 *
 * The `de` (contact email) parameter lifts the free quota from 5,000 to
 * 50,000 chars/day (per MyMemory's published usage limits). Not a secret —
 * just an identification contact for their rate limiter.
 */

const API_URL = 'https://api.mymemory.translated.net/get';
const CONTACT_EMAIL = 'ddor8868@gmail.com';

export async function translateEnToVi(text: string): Promise<string | null> {
  if (!text || text.length === 0) return null;
  if (text.length > 500) return null; // avoid quota burn on huge inputs
  try {
    const url = `${API_URL}?q=${encodeURIComponent(text)}&langpair=en|vi&de=${encodeURIComponent(CONTACT_EMAIL)}`;
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
