# Result: sentence-study (2026-08-04)

## Scope

New "Học câu" module: SRS drill over a card's example sentences — the
session shows the sentence's Vietnamese translation (+ a per-sentence
Pexels image), the learner types the whole English sentence back, and each
sentence carries its own SM-2 schedule (independent of the word's). Also:
the /study reveal now shows all example sentences instead of only the
first.

## Files changed

Created:
- `migrations/0020_sentence_drill.sql` — `sentence_drills` table: SRS
  columns keyed `UNIQUE(user_id, flashcard_id, example_index)`; rows are
  created lazily on first rating (no row = "new" sentence).
- `src/lib/flashcards/progress.ts` untouched; new files below.
- `src/app/api/sentence-drill/session/route.ts` — GET queue builder
  (`exampleIndex/mode/deckIds/reviewLimit/newLimit/countsOnly`), same
  contract/interleave as `/api/study/session`. Eligibility = example at
  the chosen index with non-empty en AND vi. Background Pexels backfill
  (≤10/start, `ctx.waitUntil`) writes `examples[idx].image_url` back to
  the card; query = headword + 2 longest content words of the sentence.
- `src/app/api/sentence-drill/rate/route.ts` — POST rating endpoint,
  mirror of `/api/cards/[id]/rate`.
- `src/app/sentence-study/page.tsx` — server shell (decks + settings).
- `src/components/sentence-study/SentenceStudyClient.tsx` — setup↔session
  state machine (mirror StudyClient).
- `src/components/sentence-study/SentenceStudySetup.tsx` — mode / limits /
  deck multi-select / "Câu 1/2/3" segment, live counts via countsOnly.
- `src/components/sentence-study/SentenceStudySession.tsx` — queue
  orchestrator (REQUEUE_OFFSET/RATINGS reused from flashcard-session;
  first-rating-applies-SRS protocol; keys 1-4 + smart Enter; TTS reads the
  sentence on reveal).
- `src/components/sentence-study/SentencePrompt.tsx` — polaroid image +
  VI-sentence bubble + full-sentence input. No hints (per spec).
- `src/components/sentence-study/SentenceReveal.tsx` — word-diff of the
  guess, correct sentence with headword highlight + speaker, VI, image,
  4-button rating row with previewIntervals "ôn sau X" labels.
- `src/components/sentence-study/SentenceDiff.tsx` — word-level
  Wordle-style colorizer (green/orange/red + "…" for missing tail).
- `src/components/sentence-study/compare.ts` — normalize/tokenize/match
  (lowercase, punctuation → space, collapse whitespace).
- `src/doc/prompts/sentence-study.md` + this file.

Modified:
- `src/lib/types.ts` — `SentenceDrill`, `SentenceStudyItem`,
  `SentenceStudyResponse`; `FlashcardExample.image_url?`; `ReviewSource`
  gains `'sentence'`.
- `src/lib/flashcards/srs.ts` — `SRSCardState` structural type;
  `calculateNextReview`/`previewIntervals` params widened from `Flashcard`
  (non-breaking).
- `src/lib/db.ts` — `sentenceDrillsDb` (`getForCards`, `recordRating`
  upsert; every rating also logs a `flashcard_reviews` row with
  `source='sentence'`, `srs_applied=0` so sentence practice counts toward
  streak/activity without touching word SRS);
  `flashcardsDb.getWithExamplesInDecks`.
- `src/components/Sidebar.tsx` — "Học câu" entry (`/sentence-study`,
  NotebookPen, teal) after "Đặt câu"; active-check tightened to
  segment-boundary prefix so `/sentence` no longer lights up on
  `/sentence-study`.
- `src/components/flashcard-session/RevealStage.tsx` — examples block now
  maps over ALL examples (en highlighted + vi), not just `examples[0]`.

## Key decisions

- Sentence text stays in `flashcards.examples` JSON; `sentence_drills`
  stores scheduling only — no duplication to drift when a card is edited.
- Queue identity within a session is `card_id` (one example index per
  session ⇒ unique per item).
- The 350ms Enter-suppression guard and the "first rating applies SRS"
  protocol are copied from FlashcardSession verbatim.
- `getWithExamplesInDecks` caps at 2000 cards per scope (coarse SQL filter
  on the JSON column, exact filtering in JS).
- Reveal autoplays the sentence once via browser TTS (sentences have no
  Oxford mp3), cancellable on advance.

## Deviations from prompt

- None functional. The diff colors follow the existing char-diff
  convention (green/orange/red) at word granularity.

## Verification

- `npx tsc --noEmit` clean.
- `npx wrangler d1 migrations apply english-learning-db --local` — 0020
  applied (local DB has no data, so the flow wasn't exercised on real
  rows).
- NOT tested end-to-end (dev server not run per CLAUDE.md §10): session
  UI, rating persistence, due scheduling across days, Pexels backfill, and
  the /study all-examples reveal all need a manual smoke test.
- **Production deploy requires** `npx wrangler d1 migrations apply
  english-learning-db --remote` (0020) before/with the code deploy.

## Follow-ups / known issues

- Sentence stats are not surfaced anywhere yet (dashboard tiles are
  word-only by design); a "câu cần ôn hôm nay" chip could reuse the
  session countsOnly endpoint.
- Pexels image quality for abstract sentences varies; the reload-image
  affordance (skip param) exists in `getPexelsImage` but no UI uses it for
  sentences yet.
- Demo seed data has no examples, so demo users see an empty "Học câu"
  setup.
