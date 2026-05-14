# Cloze pool — result log

Multi-part feature. Each part appends its own section below.

---

## Part 1 — Schema + DB wrapper (2026-05-14)

### Scope

Add the shared `flashcard_cloze_pool` table, the `ClozeSentence` type, and the
`flashcardClozePoolDb` wrapper. Sentences are word-keyed (no `user_id`) and
reused across users — same caching model as `flashcard_practice_sentences` and
Datamuse. No consumers wired up yet; that's Parts 2 and 3.

### Files changed

- [migrations/0009_cloze_pool.sql](migrations/0009_cloze_pool.sql) — new migration creating `flashcard_cloze_pool` (6 columns + auto `id`) and `idx_cloze_pool_word`.
- [src/lib/types.ts](src/lib/types.ts) — added `ClozeSentence` interface (next to existing cloze types in the Flashcard module section).
- [src/lib/db.ts](src/lib/db.ts) — added `ClozeSentence` to the type imports and the `flashcardClozePoolDb` wrapper with `countByWord`, `hasMinimum`, `getByWord`, `bulkInsert`. Section header + the prescribed shared-table comment placed above the wrapper.

### Key decisions

- **Migration number**: `0009` (next in the sequence after `0008_decks_polish.sql`).
- **`this` → named reference inside `hasMinimum`**: the prompt's snippet used `this.countByWord(...)`. The rest of `db.ts` calls sibling methods by the exported name (e.g. `flashcardsDb.listByDeck` calls `flashcardsDb.getByDeck`). Switched to `flashcardClozePoolDb.countByWord(word)` to match project convention and stay safe under destructured imports. Behavior is identical.
- **`ClozeSentence` placement**: put inside the existing Flashcard module section, right after `ClozeResult`, with a one-line comment noting the shared-pool intent. Kept fields exactly as specified (`id?`, `pos?`, `difficulty?` optional; `sentence` and `blank_word` required).
- **Comment block above the wrapper**: included verbatim as requested.

### Deviations from prompt

- `this.countByWord` → `flashcardClozePoolDb.countByWord` inside `hasMinimum` (rationale above). No other deviations.

### Verification

- `npx tsc --noEmit` — clean (no output).
- `npx wrangler d1 migrations apply english-learning-db --local` — applied successfully (`0009_cloze_pool.sql`).
- `PRAGMA table_info(flashcard_cloze_pool)` — confirms columns `id, word, pos, sentence, blank_word, difficulty, created_at` with the expected `NOT NULL` flags and `created_at` defaulting to `CURRENT_TIMESTAMP`.
- `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='flashcard_cloze_pool'` — confirms `idx_cloze_pool_word` exists.
- `npm run build` — **not run**. The user's CLAUDE.md §10 forbids running build automatically; `tsc --noEmit` covered the type-check half of the prompt's "build passes" check. Flagging so the user can run `npm run build` when convenient.
- Remote D1 — **not touched**. `--remote` apply is reserved for the user.

### Follow-ups / known issues

- No consumers yet — table is empty. Parts 2 and 3 will populate it (`ensureClozePool()` background generator) and read from it (cloze quiz, compose suggest, card examples).
- ⚠️ `bulkInsert` accepts any caller-supplied `word`, but per the comment above the wrapper, writes should be gated to the upcoming `ensureClozePool()` helper. There's no runtime check enforcing that — it's a convention. Worth re-reading in Part 2 if we want a stricter boundary.
- ⚠️ The first migration apply attempt hit `SQLITE_BUSY: database is locked` (almost certainly a running `npm run dev`). It succeeded on the retry. If you see this again, briefly stopping the dev server is the cleanest fix.

---

## Part 2 — Generation + background trigger (2026-05-14)

### Scope

Replace `generateClozeSentences()` with the cloze-pool shape (single arg, returns `ClozeSentence[]` with `__` already placed and `blank_word` known), add the public `ensureClozePool()` cache-then-generate wrapper, and fire it from `/api/cards/generate` via `ctx.waitUntil` after a successful save.

### Files changed

- [src/lib/flashcards/cloze.ts](src/lib/flashcards/cloze.ts) — full rewrite of the file. `generateClozeSentences(word)` now uses the cloze-pool prompt template and returns `ClozeSentence[]`. Added `ensureClozePool(word, { minimum })`. `blankOutWord` preserved untouched (still useful for fallback rendering in Part 3 callers that read pre-blanked sentences from the pool, and for the legacy practice-sentence path until Part 3 migrates it).
- [src/app/api/cards/generate/route.ts](src/app/api/cards/generate/route.ts) — imported `ensureClozePool` and `getCloudflareContext`; after the successful `flashcardsDb.create(...)` inside the `deckId !== null` branch, fire `ensureClozePool(data.english)` through `ctx.waitUntil` with a detached-promise fallback for the local-dev edge case.
- [src/doc/prompts/cloze-pool-2-generation.md](src/doc/prompts/cloze-pool-2-generation.md) — prompt saved verbatim (with a `<!-- Saved 2026-05-14 -->` header).

### Key decisions

- **Defensive parsing**: kept the codefence-strip + try/catch defensive pattern, but the new prompt returns a top-level JSON array (not `{sentences: [...]}`), so the parser now expects `Array.isArray(parsed)`. Each item is validated for `sentence: string`, `blank_word: string`, both non-empty, AND that `sentence` actually contains the `__` blank marker — a cheap sanity check against the model returning unmasked text. `pos` and `difficulty` are optional → normalized to `null` if missing.
- **`word` field at insert time**: `generateClozeSentences` stamps `word: lower` on every returned `ClozeSentence`, so consumers see a consistent shape. `flashcardClozePoolDb.bulkInsert` also lowercases — defense in depth.
- **Headword source in the trigger**: used `data.english` (the lemma the card actually persists with), matching the existing comment on line 64. `bulkInsert` lowercases too, so case is normalized on both ends.
- **`ctx.waitUntil` placement**: only inside the `deckId !== null` branch, AFTER the save but BEFORE the response — that's when we know a card was persisted. Other branches (preview-only return, missing VI translation 422, deck-not-found 404) intentionally don't trigger.
- **Fallback when `ctx` is unavailable**: detached `ensureClozePool(...).catch(() => {})` so the request still returns fast. `ensureClozePool` already swallows its own errors, so the `.catch` is belt-and-suspenders.
- **No changes to `/api/cards/preview`, `/api/cards/from-passage`, or `POST /api/cards`** — the prompt explicitly excluded preview, and only named `/api/cards/generate` for the trigger. Other card-save paths are listed under follow-ups.

### Deviations from prompt

- **None functionally.** Minor cosmetic: kept the prompt's `cf` variable name (per the snippet) even though it shadows the property name `.cf` on the returned context object. The user clearly chose this naming in the prompt — preserved verbatim.

### Verification

- `npx tsc --noEmit` — **4 expected errors** in [src/app/api/cards/[id]/cloze/route.ts](src/app/api/cards/[id]/cloze/route.ts) at lines 16, 18, 47, 49 (the two old callers of `generateClozeSentences` — extra `partOfSpeech` arg + wrong return shape). All other files compile clean. The prompt explicitly defers these migrations to Part 3 ("Direct callers of `generateClozeSentences` should be migrated (Part 3)."), so the breakage is intentional but it means **the build is red between Parts 2 and 3** — Part 3 needs to land before any deploy.
- `npm run dev` end-to-end smoke — **not run** (CLAUDE.md §10 forbids running dev/build automatically). The "open add page → add a word → check D1 row count" verification steps in the prompt are for the user to run when convenient.
- `flashcard_cloze_pool` row inspection — **not run** (depends on a successful add through the running app).

### Follow-ups / known issues

- ⚠️ **Build is red until Part 3.** [src/app/api/cards/[id]/cloze/route.ts](src/app/api/cards/[id]/cloze/route.ts) calls `generateClozeSentences(card.english, card.part_of_speech)` (2 args) and feeds the result to `flashcardPracticeSentencesDb.createMany` (which still wants `{en, vi}[]`). Part 3's job is to swap this route over to `flashcardClozePoolDb.getByWord(card.english)` and drop the old practice-sentence path (or repurpose it). No `@ts-ignore` was added.
- ⚠️ Other card-save paths NOT yet wired to `ensureClozePool`: `POST /api/cards` (single-import confirm save), `POST /api/cards/from-passage` (word-bank save from passage reader). If we want pool generation for those flows too, the same `ctx.waitUntil(ensureClozePool(...))` block needs to be copied in (or extracted to a shared helper). The prompt only mentioned `/api/cards/generate`, so I stopped there.
- ⚠️ `ensureClozePool` swallows errors silently after logging — that's intentional for background work, but it means a chronically failing AI provider produces no user-visible signal. If we want monitoring later, this is the place to add it.
- ⚠️ `bulkInsert` is still publicly exported from `flashcardClozePoolDb` — convention says writes should be gated to `ensureClozePool`, but nothing enforces it at runtime. Flagged again from Part 1.
- The `temperature: 0.85` + `max_tokens: 3000` + `json: true` params on the AI call were carried over from the old `generateClozeSentences` — they're reasonable for 10-sentence JSON generation, but worth tuning if the model returns malformed JSON often.

---

## Part 3 — Wire up consumers (2026-05-14)

### Scope

Migrate `GET /api/cards/[id]/cloze` and the card-detail modal off direct AI calls and onto the shared `flashcard_cloze_pool`. Add a new `GET /api/cloze/pool` endpoint as the read path for client components. Drop AI-generated examples from the card-creation pipeline. Compose suggest was **skipped per user direction** (the existing endpoint is a story-suggester, not a sentence-suggester; the prompt's snippet was incompatible).

### Files changed

- [src/app/api/cards/[id]/cloze/route.ts](src/app/api/cards/[id]/cloze/route.ts) — full rewrite. Reads from `flashcardClozePoolDb.getByWord(card.english, 1)`; lazy-fills via `ensureClozePool` when the pool is empty (older cards). Maps the pool row into the existing `ClozeChallenge` shape: `english` = `blank_word` (so typing comparison uses the actual inflected answer), `blanked_sentence` = sentence with `__`-runs normalized to `_____`, `full_sentence` = sentence with the blank reified to `blank_word`, `vi_sentence` = `null`. Dictionary-example fallback (via `blankOutWord`) preserved for cards where the pool genuinely can't be filled. Drops `flashcardPracticeSentencesDb` usage entirely.
- [src/app/api/cloze/pool/route.ts](src/app/api/cloze/pool/route.ts) — **new** authed GET endpoint. Query: `?word=<lemma>&limit=<1..10>` (default 3, clamped). Returns `{ sentences: ClozeSentence[] }`. Lazy-fills the pool on empty.
- [src/components/deck-detail/CardDetailModal.tsx](src/components/deck-detail/CardDetailModal.tsx) — added `poolSentences` state + a `useEffect` keyed on `card.id, card.english` that fetches `/api/cloze/pool?word=…&limit=2` via `apiJson`. The Examples section renders pool sentences (via a new `PoolSentence` helper that highlights the target word in `--v-primary` bold). When the pool is empty AND the legacy `card.examples` column has data, falls back to the old rendering — so cards saved before the pool feature don't suddenly appear blank.
- [src/app/api/cards/generate/route.ts](src/app/api/cards/generate/route.ts) — dropped the `examples: data.examples` field from `flashcardsDb.create(...)`. New cards saved through this route persist with an empty examples column; the cloze pool is the canonical source on read.
- [src/lib/flashcards/generate.ts](src/lib/flashcards/generate.ts) — removed the `generateExamples` AI top-up (and the now-unused `MIN_EXAMPLES` constant + import). Dictionary-sourced examples still flow through for the legacy single-import preview pane.
- [src/doc/prompts/cloze-pool-3-consumers.md](src/doc/prompts/cloze-pool-3-consumers.md) — prompt saved verbatim.

### Key decisions

- **`ClozeChallenge.english` = `blank_word`, not the card lemma.** Pool sentences may use inflected forms (e.g. `"running"` when the headword is `"run"`). The cloze quiz UI (`ClozeSession.tsx`) uses `challenge.english` both for typing-answer comparison and for the in-card hint chip / audio fallback — surfacing `blank_word` keeps grading correct and the hint maximally useful. Trade-off: multiple-choice mode pulls distractors from other card lemmas, so a question for `"run"` whose pool sentence used `"running"` will show "running" as the answer next to lemma distractors — distinguishable but less hard. Acceptable for v1; flagged below.
- **Fallback chain for the cloze quiz**: pool → lazy-fill via `ensureClozePool` → pool again → `card.examples[0]` via `blankOutWord` → 503. The dictionary fallback is preserved so cards that genuinely can't be pool-filled (no AI key, repeated failures) still serve a challenge.
- **Compose suggest skipped.** The existing endpoint takes `pool_word_ids: number[]` and returns a 120–180 word story (called by `ComposeEditor.tsx`). The prompt's snippet replaces it with a single-word → single-sentence lookup, which would break the compose flow. The user confirmed: leave the story-suggester untouched.
- **Card-detail rendering**: kept the legacy `card.examples` rendering as a graceful fallback, gated on `!poolLoading && card.examples.length > 0`. This prevents the "modal appears, examples disappear for a beat, examples reappear" flicker for cards that have both legacy examples and a pool. New cards (which now never write `card.examples`) skip straight to pool rendering.
- **`PoolSentence` helper** lives in `CardDetailModal.tsx` (sibling to existing `Section`, `iconBtnStyle`, etc.). Co-located because it's the only consumer for now. If/when other components render pool sentences, this is a candidate for `src/components/common/`.
- **`dynamic = 'force-dynamic'` on the new pool route.** The pool changes when lazy-fills happen, so Next's default uncached behavior is what we want; setting `force-dynamic` makes that explicit and avoids any future surprise if defaults shift.
- **No new types.** Reused `ClozeSentence` (Part 1) and the existing `ClozeChallenge`.
- **`flashcardPracticeSentencesDb` left in place.** The old per-card practice-sentence table is no longer read or written by the migrated cloze route. The wrapper in `db.ts` is now dead code; the table and migration stay (CLAUDE.md §9). Flagged as cleanup follow-up.
- **`generateExamples` left in place.** The function in `src/lib/flashcards/examples.ts` is no longer imported anywhere. Same treatment — left in the tree for now; remove during a dedicated cleanup pass.

### Deviations from prompt

- **Section 3 (Compose suggest): skipped entirely**, per the user's answer to my clarifying question. The prompt's snippet was structurally incompatible with the real endpoint (story-suggester, not single-sentence). No changes to `src/app/api/compose/suggest/route.ts`.
- **Cloze quiz response contract**: the prompt's "return the empty array" comment doesn't fit the endpoint's `ClozeChallenge` shape — that was data-level wording, not the HTTP response. The real route now returns 503 with `{ error: 'Cloze chưa sẵn sàng, thử lại sau.' }` when no sentence can be produced anywhere in the fallback chain. UI already handles `!res.ok` (sets state to null); the visible behaviour matches what the prompt wanted.
- **CardDetailModal kept a graceful fallback** to the legacy `card.examples` for older cards. The prompt asked to replace the data source, not to actively hide legacy data. This minimizes "blank modal" surprises during the migration window. New cards never trigger the fallback because they save with an empty examples column.
- **Examples top-up removed for ALL `generateCardData` callers**, not just `/api/cards/generate`. The change is in the shared helper, so single-import preview and `/api/cards/from-passage` also no longer get the AI top-up. Dictionary examples still flow through. This matches the spirit of "stop populating that column" but goes one step beyond the literal scope; flagged here.
- **`POST /api/cards` (single-import save) and `/api/cards/from-passage` still write `examples` to the DB** if the body / `generateCardData` returns any (now dictionary-only). The prompt only said to remove from `/api/cards/generate`; the other save paths were out of scope. Inconsistent but literal.

### Verification

- `npx tsc --noEmit` — **clean** (no output). All earlier breakage from Part 2 is resolved.
- `grep -rn "generateClozeSentences(" src/` — only two hits, both inside `src/lib/flashcards/cloze.ts` (declaration on line 15, single call from `ensureClozePool` on line 81). **No external callers**. Verification step 6 ✓.
- `grep -rn "generateExamples\b" src/` — only the declaration in `src/lib/flashcards/examples.ts` (dead code, retained).
- `grep -rn "flashcardPracticeSentencesDb" src/` — only the wrapper declaration in `src/lib/db.ts` (dead code, retained).
- `npm run build` — **not run** (CLAUDE.md §10).
- End-to-end smoke (add word → wait → open cloze quiz → confirm no AI hit) — **not run**; for you to exercise.

### Estimated AI calls eliminated

Per active user, going forward:
- **Cloze quiz**: previously hit AI on first cloze for each card (~1 generation per card per user, possibly + occasional regen). Now: 1 generation per unique word, **shared across all users**. For a user with 200 cards and ~10% overlap with other users, that's roughly 200 → ~180 unique-word generations across the entire system. The big win is the long tail of repeated common words ("preferential", "ubiquitous", etc.) becoming free for everyone after the first hit.
- **Card creation**: previously called `generateExamples` when the dictionary returned < 2 examples — call it ~30–50% of new cards. **Eliminated**: 0 such calls now. For a user adding 50 cards, that's roughly 15–25 AI calls saved at creation time.
- **Compose suggest**: unchanged (story-suggester left in place).

Rough order-of-magnitude: a steady-state user adding 50 cards and grinding cloze on 200 cards previously paid ~200–250 AI calls in the relevant flows; now pays ~10–30 (mostly first-time pool fills for words not yet generated by anyone). **~80–90% reduction** for cloze + examples specifically.

### Follow-ups / known issues

- ⚠️ **Multiple-choice cloze quality regression** when the pool sentence uses an inflected form. The MC answer (now `blank_word`, e.g. `"running"`) is morphologically distinguishable from lemma distractors. Either filter the pool to lemma-form sentences only, or have the MC distractor builder also vary morphology — out of scope for Part 3.
- ⚠️ **Other card-save paths still write `examples`**: `POST /api/cards` and `POST /api/cards/from-passage`. If we want a fully clean cutover, wire them up the same way `/api/cards/generate` was. Same for adding the `ensureClozePool` trigger (Part 2 follow-up).
- ⚠️ **Other read consumers of `card.examples` are not migrated.** Still reading from the legacy column: [src/components/WordCard.tsx](src/components/WordCard.tsx), [src/components/flashcard-session/RevealStage.tsx](src/components/flashcard-session/RevealStage.tsx) (incl. its `vi` translation rendering), [src/app/api/sentence/evaluate/route.ts](src/app/api/sentence/evaluate/route.ts), single-import preview ([src/components/add/single-import.tsx](src/components/add/single-import.tsx)). For new cards (which now save empty `examples`), these consumers will render nothing. CardDetailModal is the only one migrated per the prompt's literal scope.
- ⚠️ **Dead code candidates** for a future cleanup pass:
  - `flashcardPracticeSentencesDb` wrapper in `src/lib/db.ts` (last reader removed in Part 3).
  - `generateExamples` in `src/lib/flashcards/examples.ts` (last caller removed in Part 3).
  - The `flashcard_practice_sentences` table itself — drop only when we're certain no historical data needs reading (per CLAUDE.md §9, don't drop columns/tables without explicit confirmation).
- ⚠️ **Lazy-fill latency on the new pool endpoint**: when a card's word isn't in the pool yet, the first GET to `/api/cloze/pool` does a sync AI call (10-sentence generation), which can take several seconds. Acceptable for the card-detail open path (modal can show a loader) but worth noting. The cloze quiz route inherits the same behaviour as its second fallback step.
- ⚠️ **No retry / backoff** on `ensureClozePool` failures. If AI is flaking, subsequent requests will retry on every call. For now this is fine because `hasMinimum` short-circuits once the pool is filled; once filled, no AI hit. But during an outage, the latency cost is paid per request.
