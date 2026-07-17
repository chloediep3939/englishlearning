# Read-Along · Karaoke TTS

> Feature doc. Built 2026-06-02. Prompts: `src/doc/prompts/read-along.md` +
> `read-along-ba-flow.md`. Result: `src/doc/results/read-along-result.md`.

## Purpose

The primary passage reader. The app reads an English passage aloud (Web Speech
API) and highlights each word karaoke-style. Tap a word → hear it, see VI
meaning + IPA + POS, save it to a deck. Optional parallel Vietnamese line under
each sentence (Microsoft Translator). Replaces the older `KaraokeReader`.

## Routes & entry points

- `/read/[id]` — the reader (server page → client `<ReadAlong>`).
- `/passage/[id]` — now **redirects** to `/read/[id]` (back-compat).
- Passage library rows (`PassageLibraryRow`) link to `/read/[id]`.

## File map

Logic (server-safe / pure, under `src/lib/reading/`):
- `tokenizer.ts` — `cleanWord`, `tokenize`, `splitPassage`, `contentWords`.
- `constants.ts` — `RA_SPEEDS`, `STOP_WORDS`, `BUN_BLUE`, `estimateSeconds`, keys.
- `db.ts` — `passageTranslationsDb`, `wordGlossaryDb`.
- `ai/ms-translator.ts` — `getMsCredentials`, `translateSentences`, `dictionaryLookup`.
- `ai/reading-ipa.ts` — `generateIPA` (Gemini, best-effort).
- `use-karaoke.ts` — the TTS engine hook (`'use client'`).
- `use-reduced-motion.ts` — `prefers-reduced-motion` hook.

UI (client, under `src/components/reading/`):
- `ReadAlong.tsx` — loader (fetch translations+glossary) + responsive orchestrator.
- `ReadingPassage.tsx` — word-level spans, inline vs parallel modes.
- `WordDetailCard.tsx` — meaning/IPA/POS/listen/save + on-demand lookup.
- `SpeedSelector.tsx`, `ReadingToggle.tsx` (parallel + auto), `TransportControls.tsx`, `SavedWordsTray.tsx`.

API:
- `GET /api/passages/[id]/translations` — cache-through sentence translation.
- `POST /api/words/glossary` — batch read glossary cache (+ `missing` list).
- `POST /api/words/lookup` — single-word MS Dictionary + Gemini IPA, cache.
- `POST /api/cards/from-passage` — extended with `prefilled {vi,pos,ipa}` + in-deck dedup.

## Data model (migration 0013)

- `passage_translations(passage_id, sentence_index, en_text, vn_text)` — UNIQUE
  `(passage_id, sentence_index)`. `en_text` stored so a passage edit invalidates
  stale rows (the route ignores a cached row whose `en_text` ≠ current sentence).
- `word_glossary(word UNIQUE, vn, pos, ipa, source)` — **global** (no `user_id`,
  like `flashcard_cloze_pool`). Cleaned-word key; vn/pos/ipa nullable.

Settings keys added to `user_settings` / `FlashcardSettings`:
`reading_speed` (1.0), `reading_auto_continue` (true), `reading_deck_id` (null →
last-used). Parallel-translation visibility is localStorage-only
(`reading_show_translation`).

## Environment

`MS_TRANSLATOR_KEY` + `MS_TRANSLATOR_REGION` (Azure Translator). Read via
`getMsCredentials()` from the Cloudflare env. **Absent → graceful degrade**:
translations route returns EN-only + `translationAvailable:false`, the parallel
toggle hides, word lookups still return Gemini IPA only.

## Engine notes (Web Speech API)

- boundary→token via char offsets; `e.name !== 'word'` filtered (Safari).
- stale closures avoided with `rateRef` / `autoRef` / `singleRef`.
- rate change restarts the current sentence (can't change mid-utterance).
- pause = `cancel()`; resume restarts the current sentence (cross-browser safe).
- `speechSynthesis.cancel()` on unmount.
- `supported = 'speechSynthesis' in window`; unsupported → banner + disabled controls, passage still readable.

## Gotchas / deferred

- **Session tracking deferred** — no `reading_sessions` table; "Ôn ngay →" links to `/study?deck_id=X`.
- No deck **picker** UI yet — deck is resolved server-side (last-used → first → auto-create "Từ vựng đọc bài"). Changing deck mid-session is a follow-up.
- Desktop + mobile layouts render both subtrees (`hidden md:block` / `md:hidden`) sharing one engine instance — the passage DOM exists twice (one hidden).
- Sentence splitting is regex-based; abbreviations ("Dr.", "U.S.") may mis-split.
- `KaraokeReader.tsx` is now orphaned (kept, per repo's no-delete-orphans convention).

## Aria voice (Edge TTS) — 2026-07-17

Sentence playback now prefers a server-synthesized **Edge TTS Aria** mp3 over
browser speechSynthesis:

- `POST /api/reading/tts` ({ text } ≤ 800 chars) → `{ audio: base64,
  boundaries: [{t, w}] }` via `src/lib/edge-tts/synthesize.ts` (restored from
  commit b2abfad and extended with `wordBoundaryEnabled` — the synthesizer
  reports each word's audio offset).
- `use-karaoke.ts`: `speakSentence` fetches + memoizes the mp3 per sentence
  (blob URL, sticky 'failed'), plays it with a rAF loop mapping
  `audio.currentTime` → i-th word boundary → i-th word token (karaoke
  highlight preserved). Prefetches the next sentence during playback so
  auto-continue has no synthesis gap. Rate chips adjust `playbackRate` live.
  Any failure (dev-mode Node runtime, MS DRM rotation, 503, autoplay block)
  falls back to the original speechSynthesis path per sentence.
- Unofficial-API caveat: constants in `synthesize.ts` must track a current
  Edge version (stale → 403). If MS breaks it, the reader silently reverts
  to browser TTS.
- Chunk practice (`use-chunk-practice`) still uses browser TTS — separate
  engine, candidate for the same treatment later.
