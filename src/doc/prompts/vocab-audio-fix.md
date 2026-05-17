# Fix vocab word audio — prefer real recordings over speechSynthesis

Date: 2026-05-17

## Goal

For vocabulary words, play the real recorded pronunciation file (`audio_url` from dictionary lookup) instead of synthesizing with `speechSynthesis`. Real human recordings sound far better than browser TTS. Fall back to `speechSynthesis` only when no audio file exists or playback fails.

## Doc workflow (CLAUDE.md §8)

- Save this prompt to `src/doc/prompts/vocab-audio-fix.md`.
- Write result to `src/doc/results/vocab-audio-fix-result.md`.

## Pre-reading

- `src/lib/tts.ts` — full file (current `speak()` is around line 50).
- `src/lib/types.ts` — the `Flashcard` type. Confirm it has `audio_url` (and `audio_url_alt`). Per the migrate-ai-leaks result, `lookupWord()` returns `audio_url`, `audio_url_alt`, `accent` — verify these are persisted on the card and present in the type.
- All call sites that "speak" a vocab word: `grep -rn "speak(" src/` — card detail, study session, review session, speed quiz, deck detail, etc.

## Implementation

### Step 1 — Add `speakWord()` to `src/lib/tts.ts`

```ts
/**
 * Play pronunciation for a vocabulary entry.
 * Prefers a real recorded audio file (from dictionary lookup) for SINGLE words;
 * falls back to speechSynthesis for multi-word entries, missing files, or
 * playback failure.
 */
export async function speakWord(
  word: string,
  opts?: { audioUrl?: string | null; rate?: number }
): Promise<void> {
  // Multi-word entries (phrasal verbs, collocations: "come in", "give up",
  // "look forward to") have NO single recorded file. Worse, the dictionary
  // API may return audio for just the first word ("come") — playing that
  // would be wrong. So for anything with whitespace, skip audio_url entirely
  // and let speechSynthesis say the whole phrase with correct linking.
  const url = isSingleWord(word) ? normalizeAudioUrl(opts?.audioUrl) : null;

  if (url) {
    try {
      await playAudioUrl(url, opts?.rate);
      return;
    } catch {
      // network error / 404 / decode failure → fall through to TTS
    }
  }
  // Fallback: existing speechSynthesis path (handles multi-word fine)
  speak(word, { rate: opts?.rate });
}

function isSingleWord(word: string): boolean {
  // True only if no internal whitespace. Hyphenated single words
  // ("well-known") count as single. "come in" does not.
  return !/\s/.test(word.trim());
}

function normalizeAudioUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Free Dictionary API sometimes returns protocol-relative URLs
  if (trimmed.startsWith('//')) return 'https:' + trimmed;
  return trimmed;
}

function playAudioUrl(url: string, rate?: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    if (rate && rate > 0) audio.playbackRate = rate;
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error('audio playback failed'));
    audio.play().catch(reject);
  });
}
```

⚠️ Match the exact signature of the existing `speak()` — if it takes a different options shape (e.g. voice, pitch), align `speakWord`'s fallback call accordingly. Read the file first.

### Step 2 — Update call sites

Wherever a vocab word is currently spoken via `speak(card.english)` (or similar), switch to:

```ts
speakWord(card.english, { audioUrl: card.audio_url, rate: ttsRate });
```

`ttsRate` = the user's stored TTS rate preference if the call site has it (from settings / `getStoredVoicePreference` or wherever rate lives). If a call site doesn't have rate handy, omit it.

Call sites likely include: card detail modal, study session card, review session card, speed quiz, deck detail word row. Grep + update each.

⚠️ Do NOT change places that read whole sentences / examples / articles aloud — those genuinely need `speak()` (no per-sentence recording exists). This fix is ONLY for single vocabulary words.

### Step 3 — Verify the card actually carries `audio_url`

If `Flashcard` type or the DB row doesn't include `audio_url`:
- Check the `flashcards` table schema — is there an `audio_url` column?
- Check `generateCardData()` / card creation — is `lookupWord()`'s `audio_url` being saved?
- If the column exists but isn't in the TS type → add it to the type + hydration.
- If the column doesn't exist → STOP and report to user. That's a bigger change (migration + backfill) and out of scope for this fix. Report it as a follow-up.

## Edge cases

- **Multi-word entries** ("come in", "give up", "look forward to") → `isSingleWord()` returns false → `audio_url` skipped → `speechSynthesis` says the whole phrase. Correct: no single recording exists for a phrase, and the dictionary's `audio_url` for a multi-word lookup may actually be the first word's audio (wrong). The whitespace guard prevents that bug.
- **Hyphenated single words** ("well-known", "state-of-the-art") → no internal whitespace → treated as single words → `audio_url` used if present. Correct.
- **No `audio_url`** (word not in dictionary, or dictionary had no audio) → falls back to `speechSynthesis`. Expected, fine.
- **Audio 404 / network down** → `onerror` fires → fallback. Handled.
- **Autoplay policy** → not an issue here; word audio always plays from a user tap (speaker icon), which counts as a user gesture.
- **Repeated plays** → browser caches the mp3 automatically; no manual caching needed.
- **`playbackRate` extremes** → recorded audio at 2x sounds chipmunk-y. Clamp `rate` to a sane range (e.g. 0.5–1.5) for recorded audio, even if TTS allows wider. Recorded audio at off-speeds degrades worse than synthesized.

## Optional (mention, don't auto-do)

- **Preload**: when a card becomes visible, `new Audio(url)` (don't play) so the first tap is instant. Minor UX win. Suggest to user, implement only if they want.
- **Accent toggle**: card has `audio_url_alt` (second accent). Could add a UK/US toggle later. Out of scope now — use `audio_url` (primary).

## Constraints

- No new packages — `Audio` is a browser built-in.
- `src/lib/tts.ts` is client-side (browser APIs) — keep it that way, no server imports.
- TypeScript strict.
- Don't touch the sentence/article TTS path.

## Verification

- Open a card whose word exists in the dictionary (e.g. "preferential") → tap speaker → hear a real human recording, not robotic TTS.
- Open a card whose word has no dictionary audio (rare/made-up word) → tap speaker → falls back to `speechSynthesis`, still speaks.
- Open a card whose headword is a phrase ("come in", "give up") → tap speaker → `speechSynthesis` says the FULL phrase (not just "come"). Confirm it does NOT play a single-word recording.
- Disconnect network, tap a word with `audio_url` → fails gracefully to TTS (or silent if TTS also unavailable) — no uncaught error in console.
- Sentence/example reading still uses `speak()` unchanged.
- `npm run build` passes.

## Out of scope

- Improving the `speechSynthesis` fallback quality (voice picking, Chrome 15s bug) — separate prompt if wanted.
- Server-side TTS for sentences/articles — separate prompt.
- Accent toggle (US/UK).
- Backfilling `audio_url` on old cards if the column was just added.
