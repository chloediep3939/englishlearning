// Best-effort: fetch a card's US pronunciation from Oxford, store the mp3 in
// R2, and overwrite the card's IPA with the US value. Shared by the two save
// paths (`/api/cards`, `/api/cards/generate`) and the per-deck refresh route
// (`/api/cards/[id]/refresh-audio`).
//
// NEVER throws — every failure (Oxford down, R2 binding absent under plain
// `next dev`, bad markup) resolves to `{ ok: false, failed: true }` so it can
// be awaited inline in card creation without risking the card itself.

import { lookupUrl } from '@/components/common/LookupPills';
import { flashcardsDb, getAudioBucket } from '@/lib/db';
import type { Flashcard } from '@/lib/types';
import { fetchOxfordPronunciation } from './pronunciation';

/** R2 object key convention for a card's stored US mp3. */
export function audioKey(cardId: number): string {
  return `audio/cards/${cardId}.mp3`;
}

export interface OxfordAudioResult {
  ok: boolean; // mp3 fetched + stored in R2
  ipa: string | null; // US IPA written to the card (null if not found)
  failed: boolean; // no mp3 stored (Oxford miss / error)
}

export async function fetchAndStoreOxfordAudio(
  userId: number,
  cardId: number,
  word: string,
): Promise<OxfordAudioResult> {
  // Reuse the same Oxford URL the "open Oxford" lookup pill builds.
  const url = lookupUrl('Oxford', word);
  const p = await fetchOxfordPronunciation(url); // never throws

  const update: Partial<Flashcard> = {};
  let ok = false;

  if (p.mp3) {
    try {
      const bucket = await getAudioBucket();
      await bucket.put(audioKey(cardId), p.mp3, {
        httpMetadata: { contentType: 'audio/mpeg' },
      });
      update.audio_us_key = audioKey(cardId);
      update.audio_us_status = 'ok';
      ok = true;
    } catch (err) {
      // R2 binding missing (plain next dev) or put failed → degrade to TTS.
      console.error('[oxford audio] R2 put failed:', err);
      update.audio_us_status = 'failed';
    }
  } else {
    update.audio_us_status = 'failed';
  }

  // IPA overwrite is independent of mp3 success — a page can parse fine even
  // when the mp3 download fails.
  if (p.ipaUs && p.ipaUs.trim()) update.ipa = p.ipaUs.trim();

  try {
    await flashcardsDb.update(userId, cardId, update);
  } catch (err) {
    console.error('[oxford audio] db update failed:', err);
  }

  return { ok, ipa: p.ipaUs, failed: !ok };
}
