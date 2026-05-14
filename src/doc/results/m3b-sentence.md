# M3b — F2 Đặt câu (sentence construction)

Phase 2 of 3 for the M3 practice modes. Adds an AI-graded sentence-writing
exercise: the user sees a Vietnamese gloss, has `f2_timer_seconds` to write
one English sentence using the target word, and Gemini grades it on three
axes (correct usage / grammar / semantics).

Status: **8 of 8 files done.** `tsc --noEmit` clean. No end-to-end browser
test was run; smoke tests deferred to the user.

## Purpose

- Ship F2 end-to-end: setup → timed writing → AI grading → per-card feedback
  → session summary.
- Extract the SM-2 rating logic out of the `/api/cards/[id]/rate` route into
  `flashcardReviewsDb.recordRating(userId, cardId, quality)` so both `/rate`
  and the new `/api/sentence/timeout` share one code path.
- Add the AI helper as a feature module (`sentence-eval.ts`) parallel to
  `cloze.ts` / `distractors.ts` rather than widening the `AIProvider`
  interface. The interface stays at one method (`generateText`); features
  own their prompts and parsers.
- Wire `/sentence` into the sidebar.

## File map

| Path | Role |
| --- | --- |
| `src/lib/flashcards/sentence-eval.ts` | `evaluateSentence(target, sentence)` — builds the prompt, calls `getAIProvider().generateText({ json: true, temperature: 0.3 })`, strips markdown fences, validates the JSON shape. Returns `null` on transient failure (caller → 502 + no DB write); returns a polite "AI chưa được cấu hình" `SentenceEvaluation` when the provider has no key. |
| `src/lib/db.ts` | Added `flashcardReviewsDb.recordRating(userId, cardId, quality)`. Loads the card (ownership-filtered), calls `calculateNextReview`, updates `flashcards` SRS columns, inserts a `flashcard_reviews` row, returns `{ prev_interval, new_interval, next_review_at, new_status }`. Also exports `CardNotFoundError`. Now imports `calculateNextReview`/`SRSQuality` from `./flashcards/srs`. |
| `src/app/api/cards/[id]/rate/route.ts` | Refactored to call `recordRating`. Behavior unchanged (same response shape). Translates `CardNotFoundError` → 404. |
| `src/app/api/sentence/evaluate/route.ts` | New. POST `{ flashcard_id, sentence, time_ms?, timed_out? }`. Validates, ownership-checks the card, calls `evaluateSentence`, returns 502 (no DB write) on null AI response, else inserts a `sentence`-mode test attempt via `flashcardTestAttemptsDb.create` and returns `{ evaluation, passed, example_sentence }`. `passed` is `true` iff not timed out AND `used_correctly && grammar_ok && semantic_ok`. |
| `src/app/api/sentence/timeout/route.ts` | New. POST `{ flashcard_id }`. Calls `recordRating(userId, cardId, 2)` ("Khó") — softer than "Lại" (0) so SRS brings the card back sooner without fully resetting. |
| `src/components/Sidebar.tsx` | One new nav entry: `PenLine` icon, label "Đặt câu", route `/sentence`, color `--v-orange`, inserted between `/pronounce` and `/dictionary`. |
| `src/app/sentence/page.tsx` | Client setup container — reads `f2_timer_seconds` from `/api/settings` (typed `FlashcardSettings`, not the spec's `{ settings: {} }`), fetches cards via `/api/cards?limit=N[&deck_id=…]`, shuffles, hands off to `<SentenceSession>`. Uses `QuizSetup` with a single dummy mode (`/pronounce` pattern — `QuizSetup` requires at least one mode entry). |
| `src/components/SentenceSession.tsx` | F2 session UI — state machine, 100ms timer, one-shot timeout dispatch, soft word-presence warning, submit-on-Enter (Shift+Enter for newline), feedback with 3 ✓/✗ chips and AI prose, error + summary screens. |

## Data flow

```
/sentence                    -> 'use client' (setup)
                                ├── GET  /api/settings           (read f2_timer_seconds)
                                └── GET  /api/cards?limit=…[&deck_id=…]

<SentenceSession>            -> 'use client' (per-card loop)
                                ├── POST /api/sentence/timeout   (one-shot when timer hits 0)
                                └── POST /api/sentence/evaluate  (on submit)
                                       │
                                       ├── flashcardsDb.getById            (ownership check)
                                       ├── evaluateSentence(target, text)  (Gemini)
                                       └── flashcardTestAttemptsDb.create  (only on AI success)

/api/sentence/timeout        -> flashcardReviewsDb.recordRating(userId, cardId, 2)
                                       │
                                       ├── flashcardsDb.getById            (ownership; throws CardNotFoundError)
                                       ├── calculateNextReview(card, 2)    (SM-2)
                                       ├── flashcardsDb.updateSRS          (writes SRS columns)
                                       └── flashcardReviewsDb.create       (writes review row)

/api/cards/[id]/rate         -> flashcardReviewsDb.recordRating(userId, cardId, quality)  (same path)
```

## Public API surface

Nothing new exported for general cross-module use. Internal contracts:

- `evaluateSentence(target, sentence) → Promise<SentenceEvaluation | null>` —
  `null` = transient failure (Gemini HTTP error, malformed JSON, empty body).
  A non-null result with `used_correctly: false / grammar_ok: false / …` is
  also returned when the provider has no API key, so callers can still record
  the attempt and show a clear "AI chưa được cấu hình" message.
- `flashcardReviewsDb.recordRating(userId, flashcardId, quality)` — throws
  `CardNotFoundError` when the card isn't owned by the user. Routes translate
  this to 404. Quality is the existing `SRSQuality` (`0 | 2 | 4 | 5`).
- `CardNotFoundError` (exported from `@/lib/db`) — explicit ownership-miss
  signal, distinct from a generic 500.
- `SentenceEvaluation`, `SentenceAttemptMeta` — already defined in
  `@/lib/types` since M3a. Wire shape from `/api/sentence/evaluate`:
  `{ evaluation: SentenceEvaluation, passed: boolean, example_sentence: string | null }`.

## Gotchas

- **AI provider interface stayed at one method.** The M3b spec wanted to add
  `evaluateSentence` to `AIProvider`. The actual interface is `generateText`
  only, and `cloze.ts` / `distractors.ts` already own their prompts. F2
  follows that pattern — if you later want to swap to a non-text-out provider
  (function-calling), you'll touch `sentence-eval.ts`, `cloze.ts`,
  `distractors.ts` together. That's a feature, not a bug — keeps the
  interface trivial.
- **Timeout treats card as "Khó" (quality 2), not "Lại" (0).** Intentional:
  the user couldn't construct a sentence in time, but may still recognize
  the word. Quality 0 resets reps; quality 2 keeps the streak going but
  shortens the next interval. If you ever decide timeouts should fully reset
  SRS, change the `2` literal in `src/app/api/sentence/timeout/route.ts`.
- **AI failure ≠ DB write.** `/api/sentence/evaluate` returns 502 and inserts
  nothing into `flashcard_test_attempts` when Gemini fails. The user can
  retry without polluting their stats. The `error` phase in `SentenceSession`
  surfaces this with "Thử lại" / "Bỏ qua thẻ này" buttons.
- **Soft word-presence check is naive.** `sentenceContainsTarget` is
  `s.includes(t) || tokens.some(w => w.startsWith(t))`. Accepts
  "running" for "run" but also "runner" / "runs over"; the AI is the
  source of truth — the warning is only a UX hint.
- **`flashcard_test_attempts` column is `metadata`, not `metadata_json`.**
  The spec's raw SQL used `metadata_json`, which doesn't exist. The route
  uses `flashcardTestAttemptsDb.create()` (which serializes via
  `JSON.stringify` to the `metadata` column).
- **`/api/settings` returns `FlashcardSettings`, not `{ settings: {…} }`.**
  The M3b spec's setup-page snippet assumed the latter wrapper shape; the
  page reads `s.f2_timer_seconds` directly.
- **`QuizSetup` requires ≥1 mode.** The component is generic over a mode
  value type and uses `defaultMode` as the initial state — `modes={[]}`
  would render nothing and leave start unparameterized. Like `/pronounce`,
  we declare a single dummy mode (`'all'` / "Viết 1 câu với từ").
- **Timer effect re-binds every render in `SentenceSession`.** The keyboard
  effect has a small dep array (`phase, advance, handleClose`); the 100ms
  tick interval only runs while `phase === 'writing'`. If you add a new
  phase that should freeze the timer, return early in that effect too.
- **`time_ms` can exceed `timerSeconds * 1000`.** When the user submits
  after the timer expired, the recorded `time_ms` is the full elapsed time.
  `timed_out: true` is the authoritative signal, not `time_ms < limit`.
- **Mascot pose on verdict.** `happy` on pass, `idle` on fail — explicitly
  *not* a sad pose. Matches the F1 convention (encouragement, not
  punishment).

## Spec deviations recorded

1. `evaluateSentence` is a feature-module function, not a method on
   `AIProvider`. Concrete reason in the gotcha above.
2. `recordRating` lives on `flashcardReviewsDb` in `src/lib/db.ts`
   (next to `create`), not a new file. The wrapper already lived there.
3. `metadata` column name (vs spec's `metadata_json`).
4. `/api/settings` typed shape (vs spec's untyped record).
5. Single dummy `QuizSetup` mode for `/sentence` (vs `modes={[]}`).
6. Sidebar entry placed between `/pronounce` and `/dictionary` directly,
   without introducing a "Luyện tập" section divider — sidebar in this
   project is a flat list (M3a didn't add a divider either).

## Open items

- **`/compose` (F3, M3c)** — not part of M3b. A sidebar entry for `/compose`
  has appeared (added separately, intentionally — kept).
- **`window.confirm("Thoát luôn?")` on Esc.** Same UX as F1. If F1/F2 grow
  a non-modal exit pattern later, both should change together.
- **Word-presence stem check.** If you want a real stemmer, swap
  `sentenceContainsTarget` for a small Porter-stemmer wrapper; current
  prefix check is intentionally cheap.

## Future maintainers

- **Adding F4+ modes.** The pattern is settled: write a feature module
  (`src/lib/flashcards/<mode>.ts`) that takes a target + user input and
  calls `getAIProvider().generateText(...)`. Add an enum value to
  `TestMode` in `@/lib/types`. Add the route. Add the setup page + session
  component. Don't try to unify the session components — F1/F2 already
  diverge significantly (ASR vs textarea vs option grid).
- **SRS-rating callers.** Anything that should affect the SRS schedule
  must go through `flashcardReviewsDb.recordRating`. Do **not** write to
  `flashcards.ease_factor / interval_days / repetitions / next_review_at`
  directly outside that function — `flashcards.updateSRS` is the
  low-level wrapper but `recordRating` is the contract that also writes
  the audit row and translates quality into next-interval.
- **Gemini grading is non-deterministic.** Two identical sentences can
  receive different chip results across calls. Temperature is set to
  `0.3` to keep variance low; lower further if you need stable acceptance
  tests, but you'll lose useful natural-language feedback.
- **Cost.** Each F2 submission is one Gemini call (~600 token cap). At
  10 cards/session, that's ~10 calls per session. If usage grows beyond
  single-user dev, consider caching `(card_id, sentence_hash) → evaluation`
  in a new D1 table, keyed on the sentence's normalized hash.
