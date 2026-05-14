# M4b — Passages: Step 2 (Độ khó) + Step 3 (Đọc karaoke)

Phase 2 of 3 for M4. Replaces the M4a placeholders on `/passage/[id]` with
real implementations of:

- **Step 2 — Độ khó.** One-shot Gemini call that estimates the CEFR level
  of the passage, decides whether it's appropriate for the learner, and
  persists the result to `passages.level_estimate / level_verdict /
  level_suggestion`. Re-runnable.
- **Step 3 — Đọc.** Karaoke-style TTS reader where every word in the
  passage is clickable. Clicking opens a popup with the in-context lemma
  + meaning (Gemini), and the learner can pick a deck to save the word
  to the Word Bank in one step.

Step 3 is also where the M4a Word Bank columns
(`flashcards.source_passage_id`, `flashcards.source_context`) finally
get populated.

`tsc --noEmit` clean. No tests (project has none). No migrations — all
required schema landed in `0006_passages.sql` during M4a.

## File map

| Path | Role |
| --- | --- |
| `src/lib/passages/ai/difficulty.ts` | Replaces the M4a stub. Builds the CEFR-analysis prompt, sends it to `getAIProvider().generateText(...)` with `json: true`, validates `level` / `verdict` against the spec enums, returns `null` on transient failure so the route can surface 502. Returns a safe `B1 / just_right` placeholder when AI is unavailable so the learner is never blocked. |
| `src/lib/passages/ai/define-word.ts` | Replaces the M4a stub. Prompts Gemini for the lemma, in-context Vietnamese meaning, POS, an alternate example, and IPA; returns a `WordDefinitionInContext` or `null`. Tolerant of `ipa: null`. When AI is unavailable returns the same minimal placeholder M4a used. |
| `src/lib/flashcards/generate.ts` | **New, extracted.** `generateCardData(english, imageSkip)` — the auto-fill pipeline that fans out to dictionary, datamuse, translation, Pexels in parallel and tops up examples via Gemini when the dictionary runs short. Lifted out of the old `/api/cards/generate/route.ts` body so both `/api/cards/generate` and `/api/cards/from-passage` share one implementation. See **Spec deviations**. |
| `src/app/api/cards/generate/route.ts` | Slimmed to a thin auth + validation wrapper around `generateCardData`. Output shape unchanged — the `/add` page consumers don't need to know. |
| `src/app/api/passages/[id]/analyze/route.ts` | **New.** POST. Verifies passage ownership, pulls `user_cefr_level` from settings, calls `analyzeDifficulty`, writes the 3 result fields back via `passagesDb.update`, and returns `{ passage, analysis }`. 502 on AI failure, 404 on cross-user / missing passage. |
| `src/app/api/passages/[id]/define-word/route.ts` | **New.** POST. Verifies passage ownership before calling AI (so we don't burn tokens on probes for other users' IDs). Validates `word ≤ 60 chars` and `sentence_context ≤ 1000 chars`. 502 on AI failure. |
| `src/app/api/cards/from-passage/route.ts` | **New.** POST. Validates `word` + `deck_id` + `passage_id` + `source_context`. Verifies deck ownership and passage ownership in parallel. Runs `generateCardData(word).catch(() => null)` so the save never blocks on a failed third-party lookup — fields degrade to nulls but the card lands. Finally stamps `source_passage_id` + `source_context` via the extended `flashcardsDb.create`. Returns the hydrated card. |
| `src/app/api/cards/route.ts` | Extended GET. New filter `?source_passage_id=<id>` routes through `flashcardsDb.listBySourcePassage`. Used by Step 3 on mount to paint "already saved" markers. |
| `src/lib/db.ts` | `flashcardsDb.create` now persists `source_passage_id` + `source_context` (previously the INSERT didn't list those columns even though `Flashcard` already had them in M4a — the values were being silently dropped). New `flashcardsDb.listBySourcePassage(userId, passageId)` wrapper, user-scoped via `WHERE user_id = ? AND source_passage_id = ?`. |
| `src/components/passage/PassageStep2Difficulty.tsx` | Replaces the placeholder. Auto-fires `/analyze` on first mount when `passage.level_estimate === null` (guarded by a ref so the re-render after the parent's `refreshPassage()` doesn't loop). On success calls `onAnalyzed()` (parent re-fetches the passage so the badge + verdict + suggestion render off fresh state). "Đánh giá lại" button re-runs unconditionally. Friendly error UI with a Thử lại button. Best-effort fetch of `/api/settings` for the inline "Trình độ của bạn: B1" label. |
| `src/components/passage/PassageStep3Reader.tsx` | Replaces the placeholder. Tokenises the passage (letters/apostrophes/hyphens = word, everything else = non-word) and remembers each word's `charStart` / `charEnd`. Karaoke playback via `SpeechSynthesisUtterance` with `onboundary` → highlights the active word in `--v-yellow` when Chrome fires the event. Click any word → pauses TTS, opens the centered modal, fires `/define-word`, and shows lemma + IPA + POS pill + VN meaning + alt example. "Lưu vào Word Bank" → deck picker → `/from-passage` → optimistic update of the local `savedWords` set so the saved-marker (`--v-primary-soft`) paints immediately. Esc / backdrop click both close. Cleans up `speechSynthesis` on unmount. |
| `src/app/passage/[id]/page.tsx` | One-line change: passes `onAnalyzed={refreshPassage}` to `PassageStep2Difficulty`. `refreshPassage` already existed for Step 1. |

## Data flow

```
Step 2 (Độ khó)
================
PassageStep2Difficulty (mount, level_estimate === null)
  ├── auto-fires runAnalyze()
  └── POST /api/passages/[id]/analyze
        ├── passagesDb.getById       (ownership)
        ├── userSettingsDb.getFlashcardSettings  (user_cefr_level)
        ├── analyzeDifficulty(passage.content, level)
        │     └── getAIProvider().generateText({ json: true })   ~5s
        └── passagesDb.update(level_estimate, level_verdict, level_suggestion)
            → { passage, analysis }
  └── onAnalyzed()  → parent re-fetches /api/passages/[id] and re-renders the
                       badge + verdict + suggestion.

Step 3 (Đọc)
============
PassageStep3Reader (mount)
  ├── GET /api/cards?source_passage_id=<id>   → saved-word markers
  ├── GET /api/decks                          → deck picker
  └── GET /api/settings                       → initial ttsRate

User presses Play
  └── new SpeechSynthesisUtterance(content)
       ├── .onboundary(e)  → setCurrentCharIndex(e.charIndex)  (Chrome only)
       ├── .onend          → reset playing state
       └── .onerror        → reset playing state

User clicks a word
  ├── speechSynthesis.cancel()
  └── POST /api/passages/[id]/define-word
        ├── passagesDb.getById                (ownership)
        └── defineWordInContext(word, sentence)
              └── getAIProvider().generateText({ json: true })   ~3s
       → { definition }
  → popup transitions: loading → definition

User picks a deck
  └── POST /api/cards/from-passage
        ├── passagesDb.getById                (ownership)
        ├── flashcardDecksDb.getById          (ownership)
        ├── generateCardData(lemma).catch(() => null)
        └── flashcardsDb.create({ ..., source_passage_id, source_context })
       → { card }
  → savedWords.add(card.english.toLowerCase())
  → popup transitions: saving → saved (auto-close after 800ms)
```

## Public API surface

| Endpoint | Auth | Body | Success | Errors |
| --- | --- | --- | --- | --- |
| `POST /api/passages/[id]/analyze` | cookie | none | `200 { passage, analysis }` | `401` (unauthed), `404` (not owned / missing), `502` (AI failed) |
| `POST /api/passages/[id]/define-word` | cookie | `{ word, sentence_context }` | `200 { definition }` | `400` (invalid input), `401`, `404`, `502` |
| `POST /api/cards/from-passage` | cookie | `{ word, deck_id, passage_id, source_context }` | `201 { card }` | `400`, `401`, `404` (deck or passage not owned), `500` |
| `GET /api/cards?source_passage_id=<id>` | cookie | — | `200 { cards }` | `400` (bad id), `401` |

## Gotchas / non-obvious decisions

1. **Lemma normalisation lives on the AI side.** `defineWordInContext` is
   instructed to return the base form ("running" → "run"). The client
   sends `definition.english` verbatim to `/from-passage`. This means a
   user clicking the same inflected token twice will create one card
   the first time and surface it as "already saved" the second time
   only if Gemini gives a consistent lemma. In practice it does — but
   if you ever see duplicates the cause is upstream, not in the saved-set
   logic.

2. **`flashcardsDb.create` was silently dropping the M4a source columns.**
   The `Flashcard` type added `source_passage_id` / `source_context` in
   M4a and the INSERT body looked complete, but the column names were
   missing from the `INSERT INTO flashcards (...)` list. So passing
   them in had no effect. M4b fixes the INSERT to actually include them.
   Re-check this if M4c surfaces any other "the value is in `input` but
   doesn't appear in the row" mystery.

3. **`speechSynthesis.onboundary` is unreliable outside Chrome.** Safari
   often fires it only for the first few words of long text and Firefox
   sometimes never fires it at all. The implementation degrades gracefully:
   if `charIndex` never updates, no word ever gets the yellow highlight
   but playback still works. There is intentionally no detect-and-warn.

4. **TTS rate changes mid-utterance are ignored by all browsers.** The
   reader reads `ttsRate` at the moment `play()` is called and never
   touches it afterwards. Users who tweak the slider in `/settings` must
   press Play again. Don't bother trying to re-target a live utterance.

5. **Auto-fire guard.** Step 2 uses a `useRef(false)` flag rather than
   keying off `passage.level_estimate` in the dependency array because
   the parent re-renders with the new `level_estimate` value right
   after `refreshPassage()` resolves. Putting `level_estimate` in deps
   would either loop (if we don't guard) or require a complex condition
   to break (if we do). The ref is simpler.

6. **`/from-passage` doesn't block on `generateCardData`.** That call
   hits 4 third-party services; if Pexels rate-limits or dictionaryapi
   is down, we still save the card with just the AI-supplied lemma and
   the user's source sentence. The user can fill in fields later from
   `/decks/<id>`. We deliberately don't surface the partial failure to
   the UI — the card lands, the marker turns green, and that's the
   contract.

7. **AI provider is async.** `getAIProvider()` is `Promise<AIProvider>` —
   not the sync form the M4b spec sketched. Both new feature modules
   `await` it. This matches the M3b `sentence-eval.ts` pattern. Don't
   refactor to a sync getter — the Cloudflare context lookup it does
   under the hood is genuinely async.

8. **Sentence-context window for `/define-word`.** Clicking a word
   triggers `findSentenceContaining(content, charIndex)`. The regex
   needs at least one `.!?` terminator in the passage; for passages
   without proper terminal punctuation (e.g. headlines), the helper
   falls back to a ±200-char window centered on the click. That's
   plenty for the AI to disambiguate POS.

9. **Yellow is reserved for speed-quiz / "active read" surfaces.** The
   karaoke highlight uses `--v-yellow` per CLAUDE.md token rules. The
   saved-word marker uses `--v-primary-soft` (a pale green) so the two
   never visually clash when a previously-saved word is currently being
   spoken.

## Spec deviations (intentional)

| Spec said | We did | Why |
| --- | --- | --- |
| Create `src/lib/passages/difficulty.ts` + `word-define.ts` at top level | Replaced the existing stubs at `src/lib/passages/ai/difficulty.ts` + `define-word.ts` | M4a had already organised AI feature modules into a `passages/ai/` subfolder alongside the M4c stubs `grade-translation.ts` / `grade-paraphrase.ts`. Moving the M4b two out would split a co-located cluster for no benefit. |
| Remove `analyzeDifficulty` / `defineWordInContext` / `gradeTranslation` / `gradeParaphrase` from the `AIProvider` interface | No-op | M4a never added them to the interface (only as feature-module stubs). `AIProvider` in `src/lib/ai/types.ts` is already clean. |
| Components use `export function` (named) | Kept `export default` | The existing M4a placeholders and their importers in `src/app/passage/[id]/page.tsx` use default exports. Changing both sides would have rippled into the wizard host for no gain. |
| `getAIProvider().generateText({ prompt, json: true, ... })` | `getAIProvider().generateText(prompt, { json: true, ... })` (real signature) | The real `AIProvider.generateText(prompt, options)` takes prompt as a positional first arg. Spec sketch was approximate. |
| `generateCardData` "find or extract" | Extracted to `src/lib/flashcards/generate.ts` | The pipeline was inlined in `/api/cards/generate/route.ts`. Duplicating it in `/from-passage` would rot fast (Pexels skip / example top-up rules are non-trivial). New module is the single source of truth. |

## Smoke-test status

Not exercised in a browser. Type-check clean (`npx tsc --noEmit`). The
following remain for the user to verify against a running dev server +
real Gemini key:

- `POST /api/passages/[id]/analyze` → ~5 s, fills level fields.
- `POST /api/passages/[id]/define-word` → ~3 s, returns lemma + meaning.
- `POST /api/cards/from-passage` → creates a card with both source
  columns populated.
- `GET /api/cards?source_passage_id=<id>` → returns only that passage's
  cards.
- Step 2 auto-fires on first mount, "Đánh giá lại" re-runs.
- Step 3 highlights the active word in Chrome and reopens with persisted
  saved-markers after reload.
- DB side-check:
  ```
  npx wrangler d1 execute english-learning-db --local \
    --command "SELECT english, source_passage_id, source_context
               FROM flashcards
               WHERE source_passage_id IS NOT NULL
               ORDER BY id DESC LIMIT 5"
  ```
