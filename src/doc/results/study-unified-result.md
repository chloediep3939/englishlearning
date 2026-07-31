# study-unified — result

Prompt: `src/doc/prompts/study-unified.md` (2026-07-29)

## Scope

Merges Học (`/study`) + Ôn tập (`/review`) into one unified `/study` flow with an
automatic session-setup screen and an Anki-style queue loop; adds SRS scoring to
the **timed** Flashcard nhanh variant; adds recognition-only ("Chỉ hiểu nghĩa")
decks; adds `session_review_limit` / `session_new_limit` settings.

## Migration

**`migrations/0018_study_unified.sql`** — note: the spec's `decks` table is
named `flashcard_decks` in this schema.

```sql
ALTER TABLE flashcard_decks   ADD COLUMN recognition_only INTEGER NOT NULL DEFAULT 0;
ALTER TABLE flashcard_reviews ADD COLUMN source TEXT NOT NULL DEFAULT 'study';
ALTER TABLE flashcard_reviews ADD COLUMN srs_applied INTEGER NOT NULL DEFAULT 1;
```

Applied locally via `npx wrangler d1 migrations apply english-learning-db --local`.
**NOT applied to production** (user runs the same command without `--local`).

## "Flashcard flip game" mapping

The codebase has no literal flip game. The only flashcard game with a timed and
an untimed variant is **Flashcard nhanh** (`/speed`, `SpeedQuizSession`):
`speed_timer_seconds > 0` = timed variant, `0` ("Tắt") = free variant. Part B was
applied there: timed answers POST `/api/cards/:id/flashcard-result`; free play
posts nothing (its existing `flashcard_test_attempts` logging is untouched in
both variants — those are not review rows).

## Exercise-type inventory (study session code)

The unified study session (`src/components/flashcard-session/`) contains exactly
two exercise stages — there is no multiple choice / cloze / listening inside
study sessions (those live on separate pages: /speed, /cloze, /pronounce,
/sentence and are out of scope per spec):

| Exercise | Where | Classification for recognition decks |
| --- | --- | --- |
| Typed recall VI→EN (see Vietnamese, type the English word) | `TypingStage.tsx` | **REMOVE** — production/spelling |
| Reveal + self-grade (answer + char-diff + Lại/Khó/Tốt/Dễ) | `RevealStage.tsx` | **KEEP** (char-diff hidden when no guess) |
| EN→VI flip-and-self-grade (new) | `FlipStage.tsx` | **KEEP** — the fallback exercise; recognition sessions use it for every card |

## Files changed

### Created
- `migrations/0018_study_unified.sql` — 3 ALTERs above.
- `src/app/api/study/session/route.ts` — GET: pool counts + server-built queue
  (mode/group/deckIds/limits/countsOnly). Ownership enforced by intersecting
  requested deckIds with the user's decks; parameterized `IN (...)` queries;
  even Bresenham-style interleave of new among due.
- `src/app/api/cards/[id]/flashcard-result/route.ts` — POST `{correct}` from
  the timed quiz; delegates to `recordFlashcardResult`.
- `src/components/study/StudyClient.tsx` — setup ↔ session state machine.
- `src/components/study/StudySetup.tsx` — mode picker (Ôn/Học/Ôn+Học, default
  Ôn+Học), live counts, per-session limit inputs (not persisted), deck
  multi-select dropdown, deck-group segments (hidden when no recognition decks).
- `src/components/flashcard-session/FlipStage.tsx` — EN→VI flip prompt stage.

### Modified
- `src/lib/types.ts` — `FlashcardDeck.recognition_only`, `ReviewSource`,
  `FlashcardReview.source/srs_applied`, `FlashcardSettings.session_review_limit
  /session_new_limit`, `StudySessionMode`, `StudyDeckGroup`, `StudySessionResponse`.
- `src/lib/flashcards/srs.ts` — new `calculateFlashcardBoost` (×1.2 growth +
  existing fuzz; ease/reps untouched). Lapse path is shared via `calculateNextReview(card, 0)`.
- `src/lib/db.ts` —
  - deck INSERTs (`ensureDefault`, `create`) + `update` + hydration now carry
    `recognition_only` explicitly (M4a checklist);
  - `flashcardReviewsDb.create` INSERT now explicit `source` + `srs_applied`;
  - `recordRating` takes `source`, logs `srs_applied` = whether it mutated;
  - new `recordFlashcardResult` (Part B rules: new→log-only; correct+due→boost;
    correct+not-due→log-only; wrong→shared lapse; daily cap with
    wrong-overrides-correct exception, checked against today's
    `source='flashcard' AND srs_applied=1` rows on the localtime day boundary);
  - new `flashcardsDb.countStudyPool` / `getDueInDecks` / `getNewRandomInDecks`;
  - settings keys `session_review_limit` / `session_new_limit` (default 20).
- `src/app/api/settings/route.ts` — validation for the two new keys (1–200).
- `src/app/api/decks/route.ts` + `src/app/api/decks/[id]/route.ts` — accept
  `recognition_only` on create/update.
- `src/app/api/cards/[id]/rate/route.ts` — passes `source: 'study'` explicitly.
- `src/app/study/page.tsx` — rewritten as thin server shell → `StudyClient`.
- `src/app/review/page.tsx` — server-side `redirect('/study')`.
- `src/components/flashcard-session/FlashcardSession.tsx` — queue rules now
  Lại +2 / Khó +4 / Tốt-Dễ exit; first-rating-per-session SRS guard
  (`ratedOnceRef`); `recognition` prop swaps TypingStage→FlipStage, hides
  char-diff, Enter-to-flip handling.
- `src/components/flashcard-session/RevealStage.tsx` — `hideGuess` prop.
- `src/components/flashcard-session/types.ts` — REQUEUE_OFFSET drops q=4; doc updates.
- `src/components/flashcard-session/configs.ts` — added `unifiedConfig`.
- `src/components/SpeedQuizSession.tsx` — timed variant reports each answer to
  `/api/cards/:id/flashcard-result`.
- `src/components/Sidebar.tsx` — removed "Ôn tập"; single "Học" → /study.
- `src/app/dashboard/page.tsx`, `src/components/ComposePoolPicker.tsx`,
  `src/components/app-mobile/screens/MDashboard.tsx`,
  `src/components/app-mobile/_shell/MTabBar.tsx` — `/review` links → `/study`.
- `src/components/DeckEditor.tsx` — "Chỉ hiểu nghĩa" toggle + helper line.
- `src/components/DeckCard.tsx` — Eye + "Hiểu nghĩa" badge.
- `src/components/DeckList.tsx` — 2 pill tabs (styling copied from /add tabs),
  recognition empty state.
- `src/app/settings/page.tsx` — two number inputs (`SessionLimitInput`, commit
  on blur/Enter, 1–200) in the "Mục tiêu hàng ngày" card.
- `src/lib/demo/seed-user.ts` — review INSERTs now explicit
  `source='study', srs_applied=1` (deck inserts flow through
  `flashcardDecksDb.create`, which now sets `recognition_only`).

### Deleted
- `src/components/flashcard-session/SessionFlow.tsx`,
  `SessionPicker.tsx`, `DeckPickerStep.tsx` — the manual word-selection step
  the spec explicitly replaces. Nothing else referenced them.

## Key decisions

- **Due definition**: `status != 'new' AND next_review_at <= datetime('now')`
  (+ `mastered_hide_from_review` exclusion) — the same predicate used elsewhere
  in the app, rather than an "end of local day" boundary. Day-granular
  scheduling already lands cards at 00:00 UTC (≈7:00 sáng VN) of their due
  date, so "due today" cards are due by morning; a literal end-of-day boundary
  would also pull in cards lapsed later today, which the +1-minute lapse
  reschedule already handles.
- **New pool** = `status = 'new'` (matches "never rated in a study session";
  a lapsed card has `repetitions = 0` but is not "new").
- `ORDER BY RANDOM()` for the new-card sample is intentional (spec: random
  sample) and documented in the wrapper per §6.8.
- Interleave: proportional (Bresenham-style) merge — first slot is always a due
  card; new cards spread evenly (verified: 10due+5new → `DDFDDF…`).
- Review-row quality mapping for the game: correct → 4, wrong → 0.
- Stats/streak (Part B4) needed **no query changes**: every streak/count query
  reads all `flashcard_reviews` rows regardless of source, and timed play now
  writes a row per answer. Free play writes nothing, so it (correctly) does not
  feed the streak.
- The old `/review` empty-state, deck picker, and `defaultPick` flows are gone
  with the merge; the setup screen's disabled CTA + hint replaces them.

## Deviations from prompt

- **Table name**: `decks` → `flashcard_decks` (actual schema).
- **"First-rating-per-session guard"**: the spec calls this "the existing
  guard", but the existing code actually applied SRS on a session-gate's final
  verdict + every LẠI. I implemented what the spec specifies (first rating
  applies, all later ratings log-only) since the spec supersedes; consequence:
  a LẠI-then-Tốt card keeps its lapse schedule for the day, which is standard
  Anki relearning behavior.
- `/api/sentence/timeout` still records with default `source='study'` — the
  spec defines only 'study' | 'flashcard' and sentence timeouts are closer to
  study events.
- Mobile mock `MTabBar` "Ôn tập" tab renamed "Học" → `/study` (its `key`
  string stays `'review'` to avoid touching every mock screen).

## Verification

- `npx tsc --noEmit` — clean.
- Migration 0017 applied to **local** D1; new columns verified with a SELECT.
- Interleave function unit-tested standalone in node (spread verified for
  8 size combinations, incl. empty lists).
- **Not tested end-to-end**: no dev server was run (per CLAUDE.md §10.11), so
  the setup screen, session loop, recognition flip, timed-quiz SRS calls, and
  settings inputs were not exercised in a browser. ⚠️ Please smoke-test:
  (1) /study setup → mix session; (2) a recognition deck session; (3) timed
  /speed answers writing `source='flashcard'` rows; (4) daily-cap behavior.

## Follow-ups / known issues

- `src/lib/db.ts` is now ~1360 lines (was already >500 before this feature) —
  splitting it was out of scope; flagged per §2.2.
- Dashboard's "X từ cần ôn" hero still uses its own older due predicate
  (includes never-reviewed cards); unifying it with `countStudyPool` would be a
  nice cleanup.
- `flashcardsDb.getDueForReview` / `getNewForToday` are still used by
  `/api/cards` (pronounce/compose pools) — left intact.
- The old typed-recall summary line ("từ thuộc") still counts unique cards that
  exited the queue; wording unchanged.
