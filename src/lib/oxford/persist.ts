// Best-effort: fetch a card's US pronunciation from Oxford, store the mp3 in
// R2, and overwrite the card's IPA with the US value. Shared by the two save
// paths (`/api/cards`, `/api/cards/generate`) and the per-deck refresh route
// (`/api/cards/[id]/refresh-audio`).
//
// Multi-word entries (collocations / phrasal verbs, e.g. "mobile commerce"):
// Oxford has no headword page for the phrase, so:
//   - IPA: split on whitespace, scrape each word's US IPA, join with spaces
//     (same convention as the CMU multi-word joiner in
//     `@/lib/flashcards/cmu-ipa`). All-or-nothing — any token missing IPA →
//     card IPA unchanged.
//   - Audio: synthesize the WHOLE phrase as one fluent utterance via Edge TTS
//     (neural voice — glued per-word clips sounded disjointed). Fallback
//     chain: Edge TTS → per-word Oxford mp3 byte-concat → status 'failed'
//     (browser TTS speaks the phrase). Either way ONE file lands at the
//     card's existing R2 key, so `/api/audio/[cardId]` needs no changes.
//
// NEVER throws — every failure (Oxford down, R2 binding absent under plain
// `next dev`, bad markup) resolves to `{ ok: false, failed: true }` so it can
// be awaited inline in card creation without risking the card itself.

import { lookupUrl } from '@/components/common/LookupPills';
import { flashcardsDb, getAudioBucket } from '@/lib/db';
import { synthesizeEdgeTts } from '@/lib/edge-tts/synthesize';
import { lemmaCandidates } from '@/lib/reading/lemma';
import type { Flashcard } from '@/lib/types';
import { fetchOxfordPronunciation } from './pronunciation';
import type { OxfordPronunciation } from './pronunciation';

/** R2 object key convention for a card's stored US mp3. */
export function audioKey(cardId: number): string {
  return `audio/cards/${cardId}.mp3`;
}

/** Phrases longer than this skip Oxford entirely (too many scrape requests,
 *  and entries that long are sentences, not collocations). */
const MAX_PHRASE_TOKENS = 4;

export interface OxfordAudioResult {
  ok: boolean; // mp3 fetched + stored in R2
  ipa: string | null; // US IPA written to the card (null if not found)
  failed: boolean; // no mp3 stored (Oxford miss / error)
}

/** Fetch one word's pronunciation, retrying lemma base forms on a miss —
 *  the same fallback pattern as /api/words/lookup. Never throws. */
async function fetchTokenPronunciation(token: string): Promise<OxfordPronunciation> {
  let p = await fetchOxfordPronunciation(lookupUrl('Oxford', token));
  if (p.ipaUs || p.mp3) return p;
  for (const lemma of lemmaCandidates(token.toLowerCase())) {
    p = await fetchOxfordPronunciation(lookupUrl('Oxford', lemma));
    if (p.ipaUs || p.mp3) return p;
  }
  return p;
}

/** Join per-word IPA: strip enclosing slashes, join with a space, re-wrap.
 *  `/ˈməʊbaɪl/` + `/ˈkɒmɜːs/` → `/ˈməʊbaɪl ˈkɒmɜːs/` (CMU convention). */
function joinIpa(ipas: string[]): string {
  const inner = ipas.map((i) => i.trim().replace(/^\/+|\/+$/g, '').trim()).join(' ');
  return `/${inner}/`;
}

function concatBuffers(bufs: ArrayBuffer[]): ArrayBuffer {
  const total = bufs.reduce((n, b) => n + b.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const b of bufs) {
    out.set(new Uint8Array(b), offset);
    offset += b.byteLength;
  }
  return out.buffer;
}

/** Resolve a card's pronunciation: single fetch for one word, split + fetch
 *  each token + combine for phrases. Returns the mp3 bytes to store (or null)
 *  and the IPA to write (or null = leave unchanged). */
async function resolvePronunciation(
  word: string,
): Promise<{ mp3: ArrayBuffer | null; ipa: string | null }> {
  const tokens = word.trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 1) {
    const p = await fetchTokenPronunciation(tokens[0]);
    return { mp3: p.mp3, ipa: p.ipaUs?.trim() || null };
  }

  if (tokens.length === 0 || tokens.length > MAX_PHRASE_TOKENS) {
    return { mp3: null, ipa: null };
  }

  // Sequential on purpose — polite to Oxford; a phrase is only 2–4 fetches.
  // These per-word fetches are needed for the joined IPA regardless of which
  // audio source wins below.
  const parts: OxfordPronunciation[] = [];
  for (const t of tokens) parts.push(await fetchTokenPronunciation(t));

  const ipas = parts.map((p) => p.ipaUs?.trim() || null);
  const mp3s = parts.map((p) => p.mp3);

  // Audio: one fluent Edge TTS utterance of the whole phrase. Glued per-word
  // clips sounded disjointed, so the byte-concat is only the fallback.
  let mp3 = await synthesizeEdgeTts(tokens.join(' '));
  if (!mp3) {
    console.warn('[edge-tts] synthesis failed — falling back to per-word concat:', word);
    mp3 = mp3s.every((m): m is ArrayBuffer => !!m) ? concatBuffers(mp3s) : null;
  }

  return {
    // All-or-nothing (same rule as CMU): a partial phrase transcription would
    // be worse than the fallback.
    ipa: ipas.every((i): i is string => !!i) ? joinIpa(ipas) : null,
    mp3,
  };
}

export async function fetchAndStoreOxfordAudio(
  userId: number,
  cardId: number,
  word: string,
): Promise<OxfordAudioResult> {
  const { mp3, ipa } = await resolvePronunciation(word); // never throws

  const update: Partial<Flashcard> = {};
  let ok = false;

  if (mp3) {
    try {
      const bucket = await getAudioBucket();
      await bucket.put(audioKey(cardId), mp3, {
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
  if (ipa) update.ipa = ipa;

  try {
    await flashcardsDb.update(userId, cardId, update);
  } catch (err) {
    console.error('[oxford audio] db update failed:', err);
  }

  return { ok, ipa, failed: !ok };
}
