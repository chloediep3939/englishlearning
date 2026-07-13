# Thought-group (chunk) practice — PTE Read Aloud

Practice mode inside the karaoke reader for PTE-style phrase chunking
(shipped 2026-07-13). Works in both `/read/[id]` and `/read-once` (the user's
primary flow — paste & read, nothing persisted).

## What it does

- **Toggle "Ngắt cụm (PTE)"** in the reader aside: shows `/` between thought
  groups and `//` at sentence ends (standard PTE coaching notation).
- **Read whole passage with pauses** ("Nghe cả bài (có ngắt)"): auto-plays
  every chunk end to end, inserting a `CHUNK_PAUSE_MS` (550ms) thought-group
  gap between chunks, highlighting the current chunk. Does NOT wait for the
  learner (unlike echo). `autoRead` flag + `autoReadRef`; the inter-chunk gap
  is a `setTimeout` in the chunk's `onend`. Any echo action or edit calls
  `goManual()` to cancel it.
- **Echo practice** (self-paced, no timer): TTS reads ONE chunk → stops →
  learner repeats aloud → "Cụm tiếp" (button or Enter) plays the next chunk.
  Prev/replay/stop included. Designed for slow readers — nothing auto-advances.
- **Paste-with-slashes:** in `/read-once`, if the pasted text already contains
  `/` markers, `parseManualBreaks()` strips them to clean reading content and
  records chunk-start word indices; chunk mode turns on automatically seeded
  with exactly those breaks (`globalBreaksToMap` → `seedGlobalBreaks`).
- **No-reload "Đọc bài khác":** read-once passes `onBack` to `ReadAlong`, so
  the back arrow returns to the paste screen via state (no page navigation),
  keeping the textarea content for quick edits.
- **Chunk sources, hybrid:**
  1. **Rule-based default** (`chunkSentence`) — breaks after `,;:—–`, before
     conjunctions/relatives/subordinators, with min-chunk-size guards.
     Sentences under 5 words stay whole. Instant, offline.
  2. **AI upgrade** ("AI chia cụm chuẩn") — Gemini returns thought groups +
     stressed words per sentence. Stressed words render **bold**.
  3. **Manual editing** ("Tự chia cụm") — edit mode turns inter-word gaps into
     clickable `·`/`/` toggles so the learner can split chunks shorter (their
     request: they read slowly).

## Data model

No DB changes. Chunking is session state only:
`breaks: Record<gi, wordTokenIndex[]>` — token indices that *start* a new
chunk ("break before"). First word of a sentence is an implicit start.
`chunkRanges()` derives `{startTok, endTokEx, text}` for rendering + TTS.

## AI chunk alignment (the important trick)

The AI returns chunks as strings. We never trust its indices — 
`alignChunksToBreaks()` only uses per-chunk **word counts**, validated against
the tokenizer's word count for that sentence. Any mismatch → that sentence
keeps its rule/manual breaks. This makes AI output safe by construction.

## File map

| File | Role |
| --- | --- |
| `src/lib/reading/chunker.ts` | **new** — pure chunk logic (rules, ranges, AI alignment) |
| `src/lib/reading/use-chunk-practice.ts` | **new** — practice engine hook (echo playback, edits, AI call) |
| `src/app/api/reading/chunk-analyze/route.ts` | **new** — POST sentences → Gemini thought groups + stress (id-less, no cache) |
| `src/components/reading/ChunkPracticeControls.tsx` | **new** — transport + edit toggle + AI button card |
| `src/components/reading/ReadingPassage.tsx` | markers `/` `//`, purple current-chunk tint, clickable gaps, stress bold (token loop extracted to `SentenceTokens`) |
| `src/components/reading/ReadAlong.tsx` | `useChunkPractice` + toggle + controls, `cp` prop into passage |

## Gotchas

- Chunk TTS uses its own utterances (`u.lang='en-US'`, karaoke's rate). Any
  other play action (`speechSynthesis.cancel()`) simply cancels it; state
  recovers via `onend`.
- Editing breaks resets the practice cursor (chunk indices shift).
- Inline (non-VN) mode now renders a space between sentences — previously
  trimmed sentences were concatenated with no separator; needed so `//`
  markers don't glue to the next sentence.
- Enter-to-advance skips events targeting buttons/inputs/role=button to avoid
  double-firing with the word-tap handlers.
- No word-level highlight during chunk playback (whole chunk is tinted);
  boundary mapping inside chunks is a possible later upgrade.
