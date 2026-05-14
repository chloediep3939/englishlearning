/**
 * Pexels image search. Returns a single best-match photo for a word,
 * formatted as our FlashcardImageAttribution + display URL.
 *
 * Docs: https://www.pexels.com/api/documentation/
 * Env:  PEXELS_API_KEY (required — if missing, this returns null silently
 *       so card generation still works without imagery)
 */

import type { FlashcardImageAttribution } from '@/lib/types';

const API_URL = 'https://api.pexels.com/v1/search';

interface PexelsPhoto {
  id: number;
  url: string;
  alt?: string;
  photographer?: string;
  photographer_url?: string;
  src?: {
    medium?: string;
    large?: string;
    landscape?: string;
  };
}

interface PexelsResponse {
  photos?: PexelsPhoto[];
}

export interface PexelsImage {
  image_url: string;
  image_attribution: FlashcardImageAttribution;
}

export async function getPexelsImage(query: string, skip: number = 0): Promise<PexelsImage | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key || !query.trim()) return null;

  // Pexels pages are 1-indexed; we always fetch 1 photo per page so `skip+1`
  // maps to "n-th photo for this query". Lets the reload button cycle through
  // alternate images without keeping a session pool.
  const page = Math.max(1, Math.floor(skip) + 1);

  try {
    const res = await fetch(
      `${API_URL}?query=${encodeURIComponent(query)}&per_page=1&page=${page}&orientation=landscape`,
      {
        headers: { Authorization: key },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!res.ok) {
      console.warn('[pexels] non-ok response:', res.status);
      return null;
    }
    const data = (await res.json()) as PexelsResponse;
    const photo = data.photos?.[0];
    if (!photo) return null;

    const url = photo.src?.landscape ?? photo.src?.large ?? photo.src?.medium;
    if (!url) return null;

    return {
      image_url: url,
      image_attribution: {
        source: 'pexels',
        author: photo.photographer ?? 'Unknown',
        author_url: photo.photographer_url ?? '',
        source_url: photo.url ?? '',
      },
    };
  } catch (err) {
    console.error('[pexels] error:', err);
    return null;
  }
}
