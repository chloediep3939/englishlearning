# distractor-random — Result

Two-part rewrite of `generateDistractorPool` from AI-generated to
algorithmic (user's own vocab + static fallback). This doc accumulates
results across parts.

---

## Part 1 — Static fallback + Levenshtein util (2026-05-14)

### Scope

Set up the foundation for the algorithmic distractor pool: a static
common-words fallback list keyed by part-of-speech, and ensure a
Levenshtein helper is reachable from `flashcards/`.

### Files changed

- `src/lib/flashcards/common-words.ts` — new. Exports `COMMON_WORDS_BY_POS`
  (noun/verb/adj/adv lists, ~36-50 words each), `POS_ALIASES`, and
  `getFallbackPool(pos)`. Unknown / null POS returns the union of all
  four pools.
- `src/doc/prompts/distractor-random-1.md` — new. Prompt saved verbatim.
- `src/doc/results/distractor-random-result.md` — new (this file).

### Key decisions

- **No new `levenshtein.ts` file.** A working
  `levenshtein(a, b): number` already exists at
  [src/lib/pronounce/match.ts:14](src/lib/pronounce/match.ts#L14) and
  the prompt explicitly says "if a shared util exists, use that."
  Part 2 will import from `@/lib/pronounce/match`. If the 3rd consumer
  appears (per CLAUDE.md §2.1) we should promote it to
  `@/lib/common/levenshtein.ts` then.
- **Typed POS_ALIASES properly.** Original snippet typed the alias
  table as `Record<string, keyof typeof COMMON_WORDS_BY_POS>` where the
  dict itself was `Record<string, string[]>` — that collapses
  `keyof typeof` to `string` and loses the constraint. Switched to an
  explicit `POSKey` union (`'noun' | 'verb' | 'adj' | 'adv'`) so the
  alias values are narrowed.
- **POS values verified against the local DB.** Ran a `SELECT DISTINCT
  part_of_speech FROM flashcards` — current values are `verb`, `noun`,
  `adjective`, `proper noun`. Added `'proper noun' → 'noun'` and
  `'transitive verb' / 'intransitive verb' → 'verb'` to the alias table
  on top of the Datamuse-style abbreviations from the prompt.
- **Field name nit:** the prompt referred to `flashcards.pos` /
  `Flashcard.pos` — the actual schema/type is `part_of_speech`. The
  helper's parameter is just named `pos`, so no rename needed; noted
  in a comment.

### Deviations from prompt

- Skipped creating `src/lib/flashcards/levenshtein.ts` (reused
  existing util — sanctioned by the prompt's "use that" clause).
- Extra aliases added (`proper noun`, `transitive verb`,
  `intransitive verb`) based on observed DB values.
- POSKey union typing instead of the looser `Record<string, string[]>` +
  `keyof typeof` pattern.

### Verification

- `npx tsc --noEmit` — clean, no errors.
- Spot-checked pool sizes by reading the source:
  - `getFallbackPool('noun')` → 50 words ✓ (within 40-50 target)
  - `getFallbackPool('verb')` → 50 words ✓
  - `getFallbackPool('adj')` → 44 words ✓
  - `getFallbackPool('adv')` → 36 words ✓
  - `getFallbackPool('xyz')` → union of all four (180 words)
- Levenshtein test (`levenshtein('prefer', 'preferential') === 6`) NOT
  executed at runtime — left for Part 2 when there's a real consumer
  to wire up. The existing `@/lib/pronounce/match` implementation is
  already in production use via the pronunciation flow.
- Did NOT run `npm run build` (would have re-bundled and is gated
  by §10.11 — no consumer of the new module yet).

### Follow-ups / known issues

- Part 2 will rewrite `src/lib/flashcards/distractors.ts` to use
  `getFallbackPool` + DB queries and import `levenshtein` from
  `@/lib/pronounce/match`. The AI-based pool generator there will be
  removed.
- If a 3rd consumer of `levenshtein` shows up, extract to
  `@/lib/common/levenshtein.ts` per CLAUDE.md §2.1.
- `common-words.ts` is currently English-only — fine for the distractor
  use case but worth noting if the pool ever needs Vietnamese fallback
  (the current AI-based pool generates Vietnamese phrases — confirm in
  Part 2 whether the consumers expect EN or VN distractors).

---

## Part 2 — Rewrite generateDistractorPool (2026-05-14)

### Scope

Replace the AI-driven `generateDistractorPool()` with a pure algorithmic
function: per-target distractors sourced from the user's own vocab
(Tier 1 same-deck → Tier 2 full vocab → Tier 3 static English fallback).
Refactor the only caller (`/api/speed-quiz`) to use the new per-card
signature.

### Files changed

- `src/lib/flashcards/distractors.ts` — full rewrite. New signature
  `generateDistractorPool(targetWord, options)`. `options` adds `lang`
  ('en'/'vi'), `userId`, `count`, `pos`, `deckId`, `excludeWords`.
  Three-tier candidate funnel, case-insensitive dedup that preserves
  original casing, Fisher-Yates shuffle. AI provider import removed.
- `src/app/api/speed-quiz/route.ts` — dropped `needsAI` pre-pass,
  `aiPool`, and the secondary `allCards` query. `buildTranslationQuestion`
  is now async and calls `generateDistractorPool` per card. Pool SELECT
  now includes `deck_id` and `part_of_speech` so each call can pass
  them through. Placeholder padding (`(lựa chọn N)`) kept as the final
  fallback when both DB tiers come up empty.
- `src/doc/prompts/distractor-random-2.md` — prompt saved verbatim.

### Key decisions

- **Added a `lang: 'en' | 'vi'` option.** The prompt's spec was
  English-implicit (used `headword` and Levenshtein-skip-close-variants
  semantics that only work in English). The only real caller needs
  Vietnamese distractors, so the function had to be language-aware.
  Confirmed direction with the user before implementing (option:
  "Vietnamese pool from user's cards + drop static fallback").
- **`lang === 'vi'` skips Levenshtein filtering and the Tier 3 static
  fallback.** Reasons: (a) Vietnamese edit distance doesn't track
  inflectional similarity (no "preferred → prefer" analog), so the
  `< 3` skip rule would just throw away valid distractors; (b) per the
  user's choice, Vietnamese fallback list is intentionally not built —
  caller pads with placeholders.
- **Used `levenshtein` from `@/lib/pronounce/match`** (decided in Part 1)
  rather than creating a new util.
- **Schema-name fixes vs. prompt.** Prompt referenced `headword` /
  `pos` — actual columns are `english` / `part_of_speech` (verified via
  migrations 0002, 0004). All SQL adjusted accordingly.
- **`${column}` interpolation in SQL.** The column name is derived from
  a closed two-value union literal (`'english' | 'vietnamese'`), not
  user input. Parameter values still use `.bind()`. Per CLAUDE.md §4.5
  the "never string-concat" rule applies to values, not identifiers —
  SQL placeholders can't bind column names anyway. Added a comment.
- **Case-insensitive dedup, preserve display casing.** Pulling
  `LOWER(...)` everywhere (as the prompt did) would have made distractor
  options look ugly when a card's correct answer was capitalized.
  Compromise: SELECT raw column for display, use `LOWER(col) != ?` for
  filtering against the target, dedupe via a lowercased `Set`.
- **Speed-quiz refactor — drop `allCards` pre-fetch.** Tier 1 + Tier 2
  inside `generateDistractorPool` already do the equivalent (and add
  POS filtering on top). Net trade-off: per-card DB roundtrips instead
  of one bulk query, but better distractor quality (same POS). Noted
  as a perf follow-up.

### Deviations from prompt

- Added `lang` option (not in spec) — required by the only caller.
- Used existing `levenshtein` rather than creating
  `src/lib/flashcards/levenshtein.ts` (already decided in Part 1).
- Column name corrections (`english` / `part_of_speech` instead of
  `headword` / `pos`).
- Case-preserving distractors instead of `LOWER()`-ed.
- Speed-quiz caller refactor is larger than the example one-liner in
  the prompt: `buildTranslationQuestion` became async, the `allCards`
  query + `needsAI` pre-pass were removed entirely. Driven by the
  function moving from "one big pool" to "per-target call."

### Verification

- `npx tsc --noEmit` — clean across files I touched
  (`distractors.ts`, `common-words.ts`, `speed-quiz/route.ts`).
  Two pre-existing errors in `src/app/api/cards/[id]/cloze/route.ts`
  remain — they stem from unrelated in-flight cloze-pool changes
  (migration 0009 / `src/lib/flashcards/cloze.ts`), not from this work.
- `grep getAIProvider src/lib/flashcards/distractors.ts` → empty. ✓
- `grep -rn "generateDistractorPool" src/` shows one caller
  (`speed-quiz/route.ts`) on the new signature. ✓
- Did NOT exercise the route end-to-end against the local DB. The
  three intended scenarios (50-card deck → Tier 1 hits; 1-card user →
  placeholders; POS-filtered → same-POS results) should be smoke-tested
  via `npm run dev` + the speed-quiz UI before this ships.
- Did NOT run `npm run build` (gated by §10.11).
- Levenshtein behavior unchanged — same implementation as used in
  pronunciation matching, in production for months.

### Follow-ups / known issues

- **Per-card DB queries.** A 20-card quiz now issues up to 20 × 2 = 40
  D1 queries instead of 1 bulk fetch. Local SQLite handles this
  trivially; at Cloudflare edge it should still be sub-100ms but worth
  measuring. Optimization path if needed: pre-fetch user's vocab once
  and pass it as an in-memory pool option to `generateDistractorPool`.
- **Small-vocab UX regression on `en_to_vi`.** Previously the AI Vietnamese
  pool filled in for users with <3 Vietnamese cards. Now those users see
  `(lựa chọn 1) / (lựa chọn 2)` placeholders. Acceptable per the locked-in
  decision, but a Vietnamese `common-words-vi.ts` could be added later if
  early users complain.
- **POS filter narrowing.** Stricter than the old code (which mixed POS
  in `allCards`). Users with small per-POS vocab counts may see fewer
  real distractors per card. Quality > quantity trade-off — revisit if
  feedback says otherwise.
- **Pre-existing cloze TS errors.** `src/app/api/cards/[id]/cloze/route.ts`
  has two type errors from in-flight cloze-pool work. Not in this PR's
  scope; mentioned only so they're not blamed on this change.
