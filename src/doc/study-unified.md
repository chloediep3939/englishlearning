# Unified Study Flow + Flashcard SRS Scoring + Recognition-Only Decks

Feature doc for the `study-unified` change set (2026-07-29). Implementation
record with the full file-by-file diff lives in
`src/doc/results/study-unified-result.md`; the original spec in
`src/doc/prompts/study-unified.md`.

## Purpose

- One entry point for daily practice: `/study` merges the old Học (new cards)
  and Ôn tập (due cards) pages. `/review` is a permanent server-side redirect.
- No manual card picking. A setup screen chooses *what kind* of session
  (mode, deck scope, limits); the server picks and orders the cards.
- Timed "Flashcard nhanh" play now nudges SRS schedules (bounded, farm-proof).
- Decks can be flagged "Chỉ hiểu nghĩa" (recognition-only): sessions drop
  typing/production exercises and use EN→VI flip-and-self-grade instead.
  Scheduling math is identical for both deck types.

## File map

### Flow / UI
| File | Role |
| --- | --- |
| `src/app/study/page.tsx` | Server shell: loads settings + decks, renders StudyClient (or empty state when the user has 0 cards) |
| `src/app/review/page.tsx` | `redirect('/study')` |
| `src/components/study/StudyClient.tsx` | 2-step state machine: setup ↔ session; fetches the queue on "Bắt đầu" |
| `src/components/study/StudySetup.tsx` | Mode picker (Ôn / Học / Ôn + Học), live pool counts, per-session limit inputs, deck multi-select, deck-group segments |
| `src/components/flashcard-session/FlashcardSession.tsx` | Anki-loop orchestrator (queue, phases, keys, rating POST) |
| `src/components/flashcard-session/FlipStage.tsx` | Recognition prompt stage: English word + IPA + audio, flip to reveal |
| `src/components/flashcard-session/TypingStage.tsx` | Typed VI→EN recall (full decks only) |
| `src/components/flashcard-session/RevealStage.tsx` | Answer + rating row; `hideGuess` hides the char-diff for recognition |
| `src/components/flashcard-session/configs.ts` | `unifiedConfig` used by /study |

### API / data
| File | Role |
| --- | --- |
| `src/app/api/study/session/route.ts` | Counts + server-built queue (see API surface) |
| `src/app/api/cards/[id]/rate/route.ts` | Session rating → `recordRating` (`source='study'`) |
| `src/app/api/cards/[id]/flashcard-result/route.ts` | Timed-quiz answer → `recordFlashcardResult` |
| `src/lib/db.ts` | `countStudyPool` / `getDueInDecks` / `getNewRandomInDecks`; `recordRating` + `recordFlashcardResult`; deck `recognition_only` wiring; settings keys |
| `src/lib/flashcards/srs.ts` | `calculateNextReview` (unchanged math) + `calculateFlashcardBoost` |
| `migrations/0018_study_unified.sql` | Schema changes |

### Deck UI
`DeckEditor.tsx` (toggle), `DeckCard.tsx` (Eye badge), `DeckList.tsx`
(Học đầy đủ / Chỉ hiểu nghĩa tabs), deck POST/PUT routes accept
`recognition_only`.

## Data model

```
flashcard_decks.recognition_only  INTEGER NOT NULL DEFAULT 0
flashcard_reviews.source          TEXT    NOT NULL DEFAULT 'study'   -- 'study' | 'flashcard'
flashcard_reviews.srs_applied     INTEGER NOT NULL DEFAULT 1         -- 1 = mutated SRS state, 0 = log-only
```

Definitions used everywhere in this feature:
- **New** card: `status = 'new'` (never rated in a study session). A lapsed
  card has `repetitions = 0` but is *not* new.
- **Due** card: `status != 'new' AND next_review_at <= datetime('now')`,
  minus mastered when `mastered_hide_from_review` is on.

## Public API surface

`GET /api/study/session`
- Query: `mode=review|new|mix` (default `mix`), `group=full|recognition`
  (default `full`), `deckIds=1,2` (absent = all decks in group; **empty
  string = zero scope**), `reviewLimit`, `newLimit` (default from settings,
  clamped 1–200), `countsOnly=1`.
- Returns `{ due_count, new_count, cards? }`. Counts are always the full
  pool for the scope (independent of limits). `cards` is the final queue:
  due cards oldest-first, new cards randomly sampled, new interleaved evenly
  among due (proportional merge — first slot is always a due card).
- Deck ownership enforced by intersecting `deckIds` with the user's decks.

`POST /api/cards/:id/flashcard-result` — body `{ correct: boolean }`,
returns `{ ok, srs_applied }`. Called by `SpeedQuizSession` **only when
`speed_timer_seconds > 0`**; free play sends nothing.

Settings: `session_review_limit`, `session_new_limit` (default 20, range
1–200) on the standard `/api/settings` GET/PUT shape.

## Session semantics

- Queue loop: `Lại` reinserts at +2, `Khó` at +4, `Tốt`/`Dễ` remove the card.
- Every rating writes a `flashcard_reviews` row. Only the **first** rating of
  a card per session mutates SRS (`srs_applied=1`); later ratings are
  log-only. So a Lại-then-Tốt card keeps its lapse for the day (Anki relearn).
- Recognition sessions: FlipStage prompt (Enter flips), reveal defaults
  Enter → TỐT (self-grade), char-diff hidden.

## Timed-flashcard SRS rules (`recordFlashcardResult`)

| Case | Effect |
| --- | --- |
| Card is new | log-only |
| Correct + due | `interval = max(i+1, round(i×1.2))` + ±15% fuzz (≥4d); ease/reps/status untouched |
| Correct + not due | log-only (no interval farming) |
| Wrong | full lapse via `calculateNextReview(card, 0)` — shared path with study |
| Daily cap | max one `srs_applied=1` flashcard event per card per local day; a wrong answer may still lapse once after a same-day correct boost; after a lapse, log-only |

Review-row quality mapping: correct → 4, wrong → 0.

## Gotchas

- The spec said table `decks`; the real table is `flashcard_decks`.
- **Never** insert into `flashcard_decks` / `flashcard_reviews` without
  naming `recognition_only` / `source` / `srs_applied` explicitly (M4a
  column-trap rule). Grep before adding new INSERTs.
- Streak/stat queries intentionally count *all* review rows (both sources,
  both `srs_applied` values). `srs_applied` only gates state mutation.
- `getNewRandomInDecks` uses `ORDER BY RANDOM()` deliberately (spec: random
  sample) — study queues are not reproducible.
- Deck-group sessions never mix: the API filters decks by
  `recognition_only === (group === 'recognition')` before applying `deckIds`.
- Old components `SessionPicker` / `SessionFlow` / `DeckPickerStep` were
  deleted with the manual-selection step; don't resurrect them.
- Dashboard's hero "X từ cần ôn" still uses an older due predicate that
  counts never-reviewed cards — known drift, see result doc follow-ups.
