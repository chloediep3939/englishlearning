# Result: SRS Overhaul — fix mastered gate + loop integration + migration

> Date: 2026-06-02

## Scope

Fixes two production bugs (cards mastered after 2× "Tốt" in one session; `/review`
empty the next day) by tightening the mastery gate to genuine long-term retention,
decoupling review-logging from SRS state mutation (state mutates only on the first
rating per card per session), making `mastered` non-terminal, adding interval fuzz,
and strengthening the `Khó` ease penalty at reps=1. A data migration un-masters
prematurely-mastered cards.

## Files changed

- `src/lib/flashcards/srs.ts` — added `applyFuzz()`; rewrote `calculateNextReview`:
  new mastery gate (`status==='review' && interval>=60 && reps>=4`), Easy graduating
  interval = 4 days, Khó reps=1 ease penalty −0.25, ±15% fuzz on intervals ≥ 4 days.
  `previewIntervals` / `intervalLabel` untouched (inherit new behavior).
- `src/lib/db.ts`:
  - `flashcardReviewsDb.recordRating` — added `srsUpdate` opt; always logs the review,
    mutates card SRS state only when `srsUpdate !== false`; returns prior
    `next_review_at` / `status` when not updating.
  - `flashcardsDb.getDueForReview` — `exclude_mastered` default flipped `true → false`.
  - `userSettingsDb.getFlashcardSettings` — `mastered_hide_from_review` default flipped
    `'1' → '0'` (now defaults `false`).
- `src/app/api/cards/[id]/rate/route.ts` — accept `is_first_rating_this_session` from
  body (default true); pass through as `srsUpdate`.
- `src/components/flashcard-session/FlashcardSession.tsx` — added
  `srsUpdatedThisSessionRef`; first rate per card sends `is_first_rating_this_session:
  true`, subsequent rates send `false`; updated `shouldMaster` comment to clarify it is
  local queue eviction only.
- `migrations/0014_srs_fix.sql` — un-master cards with `interval_days < 60` to `review`
  with staggered `next_review_at`; safety net for any mastered card with NULL
  `next_review_at`.
- `src/doc/prompts/srs-overhaul.md` — saved prompt (per §8).

## Key decisions

- Reordered `recordRating` to log the review first, then conditionally apply SRS state,
  matching the prompt's intent.
- Step 2.4: verified the `due_count` SUM clause in `getAllWithCounts` does **not** filter
  `status != 'mastered'` — no change needed.
- `FlashcardSettings` interface already typed `mastered_hide_from_review: boolean` — only
  the default value changed, no interface edit.

## Deviations from prompt

None.

## Verification

- `npx tsc --noEmit` → clean (no errors).
- `npx wrangler d1 migrations apply english-learning-db --local` → succeeded (0014 applied,
  3 commands executed).
- Post-migration status counts: `new=67`, `review=9`, `mastered=0` — all previously
  mastered cards (all had `interval_days < 60`) were moved to `review`.
- NOT tested end-to-end in the running app: the in-session re-rate flag flow, day-2
  `/review` repopulation, the mastery threshold at `interval>=60 & reps>=4`, and the
  Khó reps=1 ease=2.25 path were not exercised through the live UI — verified by code
  inspection only. ⚠️ Recommend a manual smoke test of a study session per the prompt's
  Step 6 checklist before deploying.

## Follow-ups / known issues

- Migration NOT applied to remote/production (`--remote`) — left for the user to run when
  ready.
- Deferred (per prompt, intentional): day-boundary timezone handling, partial lapse
  penalty on "Lại", proper Anki-style relearn step for Khó, and renaming the `mastered`
  UI label ("thuộc") now that mastered cards re-appear in `/review`.
