# M3c — F3 Viết bài (composition)

Phase 3 of 3 for the M3 practice modes. Adds a long-form writing exercise:
the user picks a pool of vocabulary (either every card they reviewed today,
or a hand-curated slice of a deck), writes a short passage that mixes
English and Vietnamese, and Gemini grades the result on coherence, per-word
usage, and specific issues. Past compositions are persisted and re-openable.

Status: **all files done.** `tsc --noEmit` clean. No end-to-end browser
test was run; smoke tests deferred to the user.

## Purpose

- Ship F3 end-to-end: pool picker → editor → AI grading → feedback view,
  plus a history list + detail with delete and "rewrite-with-same-pool".
- Re-use M3a's `compositionsDb` and the `flashcardsDb.getReviewedSince`
  wrapper. Add the missing piece: `flashcardsDb.getByIds(userId, ids)` for
  ownership-filtering a client-supplied pool.
- Extend the `AIProvider` interface with `evaluateComposition(pool, content)`
  — a deliberate divergence from the M3b pattern (see "Spec deviations").
- Wire `/compose` into the sidebar.

## File map

| Path | Role |
| --- | --- |
| `src/lib/ai/types.ts` | Added `CompositionPoolWord` and the `evaluateComposition` method on `AIProvider`. The interface now has two methods (was one). |
| `src/lib/ai/gemini.ts` | `evaluateComposition` impl: builds the prompt (escapes `"""` and clamps content to 3000 chars), calls the local `generateText` helper (`json: true`, `temperature: 0.4`, `max_tokens: 1500`), parses + normalises the JSON. Throws on empty response so the route can return 502. Returns a zero-payload `CompositionAiFeedback` when no key. |
| `src/lib/ai/index.ts` | `noopProvider` learned the same zero-payload behavior for `evaluateComposition`. |
| `src/lib/db.ts` | Added `flashcardsDb.getByIds(userId, ids)` — SELECT … WHERE user_id = ? AND id IN (…) with dynamic placeholders. Order is **not** preserved. Used by `/api/compose/evaluate` (filter pool) and by `/compose/history/[id]` (resolve redo payload). |
| `src/lib/compositions/redo.ts` | Tiny client-safe module exporting `REDO_STORAGE_KEY` and the `ComposeRedoPayload` shape. Lives outside `compositions/db.ts` because the latter pulls in the D1 binding (server-only). |
| `src/app/api/compose/today-pool/route.ts` | GET `?since=<iso>&limit=<n>` — proxies `flashcardsDb.getReviewedSince`. Validates `since` is parseable. The **client** computes start-of-today in local TZ — server treats `since` as opaque. |
| `src/app/api/compose/evaluate/route.ts` | POST `{ source, source_deck_id?, pool_word_ids, content }`. Validates (source ∈ {today, deck}; pool non-empty; content ≥ 20 chars; clamps to 3000). Filters pool via `getByIds`. **Pre-checks `ai.available`** → 503 if not configured. Calls `ai.evaluateComposition` → 502 on throw. Persists via `compositionsDb.create`. Returns `{ composition }`. |
| `src/app/api/compositions/route.ts` | GET list with `limit` (≤100, default 20) + `offset`. |
| `src/app/api/compositions/[id]/route.ts` | GET + DELETE. Both ownership-scoped via `compositionsDb.getById` / `deleteById` (the wrapper enforces `WHERE id = ? AND user_id = ?`). |
| `src/components/Sidebar.tsx` | One new nav entry: `BookOpenText` icon, label "Viết bài", route `/compose`, color `--v-blue`, inserted directly after `/sentence`. |
| `src/app/compose/page.tsx` | `'use client'` — 3-phase state machine (`picker` → `editing` → `feedback`). On mount, reads `sessionStorage[REDO_STORAGE_KEY]` once, clears it, and jumps straight to `editing` if present. Hydration gate prevents a frame of "picker" flashing before the redo payload is consumed. |
| `src/components/ComposePoolPicker.tsx` | Two tabs ("Hôm nay" / "Bộ từ khác"). Today tab auto-selects every card; deck tab is multi-select with a hard cap at `f3_max_words_per_composition` (default 30, read from `/api/settings`). Has Random / Bỏ chọn hết / cap warning. Empty-state for today links to `/review`. |
| `src/components/ComposeEditor.tsx` | Read-only pool chips above an autofocused textarea. Char counter turns orange > 2500 and red > 3000 (server clamps). Submit gated at ≥ 20 chars trimmed. Shows Bún `idle` bobbing + "Bún đang đọc bài…" during submit. Error banner has a "Thử lại" button that re-POSTs the same body. |
| `src/components/ComposeFeedback.tsx` | Two-column layout. Left: SVG score gauge (0–10, ring colour from `--v-red` / `--v-orange` / `--v-primary`), verdict pill, passage with inline annotations. Right: 2–3 side panels ("Đã dùng", "Gợi ý thêm" or "Chưa dùng", "Cần sửa"). Footer buttons are configurable via `onNew` / `onRewriteSamePool` / `extraFooter` so the same component renders in both `/compose` and the history detail view. |
| `src/components/CompositionHistoryRow.tsx` | `'use client'` list item — date + source label + word count + score pill. Whole row is a `<Link>` to the detail page; trash button stops propagation, `confirm`s, DELETEs, then `router.refresh()`. |
| `src/components/CompositionDetail.tsx` | `'use client'` wrapper around `ComposeFeedback`. Adds a header ("Bài viết ngày …"), an "N từ đã xoá" badge when `poolWords.length < composition.pool_word_ids.length`, and the footer's redo + delete buttons. Redo writes `ComposeRedoPayload` to `sessionStorage` then `router.push('/compose')`. |
| `src/app/compose/history/page.tsx` | Server Component. Calls `compositionsDb.listByUser(userId, { limit: 50 })`. Empty state links back to `/compose`. |
| `src/app/compose/history/[id]/page.tsx` | Server Component. Loads composition + resolves `pool_word_ids` via `flashcardsDb.getByIds`. Renders `<CompositionDetail>`. |

## Data flow

```
/compose                       -> 'use client' (3-phase shell)
                                  on mount: read+clear sessionStorage redo
                                  ├── ComposePoolPicker  (phase = picker)
                                  │      ├── GET /api/settings              (read f3_max_words_per_composition)
                                  │      ├── GET /api/compose/today-pool    (today tab)
                                  │      ├── GET /api/decks                 (deck dropdown)
                                  │      └── GET /api/cards?deck_id=…       (deck tab)
                                  ├── ComposeEditor      (phase = editing)
                                  │      └── POST /api/compose/evaluate
                                  │             ├── flashcardsDb.getByIds       (ownership filter)
                                  │             ├── ai.evaluateComposition      (Gemini, or noop)
                                  │             └── compositionsDb.create
                                  └── ComposeFeedback    (phase = feedback)
                                         (read-only render of returned composition)

/compose/history               -> server: compositionsDb.listByUser
                                  └── CompositionHistoryRow per row
                                         └── DELETE /api/compositions/[id] + router.refresh()

/compose/history/[id]          -> server: compositionsDb.getById + flashcardsDb.getByIds
                                  └── CompositionDetail
                                         ├── DELETE /api/compositions/[id] -> /compose/history
                                         └── "Viết lại" -> sessionStorage + push('/compose')
```

## Public API surface

- `AIProvider.evaluateComposition(pool, content) → Promise<CompositionAiFeedback>`
  — new interface method. Implementations must throw on transient failure
  (Gemini HTTP error / malformed JSON) so the route can map to 502. When
  the provider is unavailable, returns a zero-payload (coherence 0, all
  word_usage false, empty issues + suggestions, passed false) instead of
  throwing. The route additionally short-circuits with 503 by pre-checking
  `ai.available` so users see a clear "AI chưa được cấu hình" message.
- `flashcardsDb.getByIds(userId, ids) → Promise<Flashcard[]>` — user-scoped
  IN-clause lookup. Silently drops IDs that don't belong to the user; order
  of returned rows is not guaranteed.
- `compositionsDb` — unchanged, already shipped in M3a.
  (`create / getById / listByUser / deleteById`.)
- `REDO_STORAGE_KEY` + `ComposeRedoPayload` from `@/lib/compositions/redo`
  — the contract between `CompositionDetail` (writer) and `/compose/page.tsx`
  (reader). Payload is `{ source, source_deck_id, words: Flashcard[] }`.
- `CompositionAiFeedback` — already defined in `@/lib/types` since M3a.
  Wire shape from `/api/compose/evaluate`: `{ composition: Composition }`
  where `Composition.ai_feedback` is the full payload.

## Gotchas

- **AI provider interface grew.** Unlike M3b (which kept `AIProvider` at
  one method and put grading in a feature module — see `sentence-eval.ts`),
  M3c added `evaluateComposition` to the interface. Both methods coexist on
  the interface now. If you add F4+ later, pick a side: either keep adding
  methods, or migrate `evaluateComposition` back into a feature module to
  match `sentence-eval.ts`. Don't leave this half-and-half forever.
- **`since` is opaque on the server.** `/api/compose/today-pool` does
  string comparison on `last_reviewed_at >= ?`. The client is expected to
  compute start-of-today in the user's local timezone and pass it. If the
  client sends UTC midnight, the user will lose ~7 hours of cards in
  GMT+7. See `ComposePoolPicker.tsx` mount effect — uses
  `new Date(); setHours(0,0,0,0); toISOString()` which is correct.
- **Pool words are normalised case-insensitively.** Gemini sometimes
  returns word_usage keys with different casing than the pool spelling.
  `parseCompositionFeedback` (in `gemini.ts`) walks the pool, defaults
  every word to `false`, then applies parsed values via a lowercase map.
  `suggested_additions` are similarly normalised back to canonical pool
  spelling. Callers can rely on `word_usage` keys matching `Flashcard.english`
  exactly.
- **Passage annotation is best-effort.** `renderAnnotatedPassage` in
  `ComposeFeedback.tsx` underlines pool-word hits with a word-boundary
  regex (`\b<word>\b`, case-insensitive). It also underlines issue
  excerpts where they appear verbatim. When Gemini paraphrases the
  excerpt, that issue simply won't be underlined inline — but it still
  shows up in the right column. Overlaps resolve issue > used. This is
  the explicit MVP fallback the spec asked for; don't sink time into a
  perfect tokenizer.
- **Composition source_deck_id has `ON DELETE SET NULL`.** Deleting a
  deck doesn't cascade-delete its compositions; the FK just nulls out.
  The history detail currently labels `source === 'deck'` as "Pool từ
  deck" with no deck name lookup. If you want "(deck đã xoá)" wording,
  add a deck-name join in `compositionsDb.listByUser` / `getById`.
- **`getByIds` doesn't preserve input order.** SQLite returns rows in
  arbitrary order for `IN (…)` queries. If you ever need order-preserved
  results (e.g., to show pool words in the order the user originally
  selected them), sort client-side using the original `pool_word_ids`
  array. The current UI doesn't depend on order.
- **`/api/compose/today-pool` default limit is 30.** The picker passes
  `DEFAULT_MAX = 30` for the initial fetch even though the user's actual
  setting might be higher. If they have more than 30 cards reviewed today,
  the today tab caps at 30 (which is also the spec's design intent for the
  default cap). Bumping the fetch to the user's actual `f3_max_words_per_composition`
  is a future polish — not a bug.
- **AI fallback vs route 503 are different.** The noop provider and the
  Gemini provider with no key both return zero-payload from
  `evaluateComposition` (so it can never silently bury a composition with
  a fake feedback). The route catches `!ai.available` *before* calling
  evaluate and returns 503 with a polite message. The fallback payload
  is the second line of defence — if someone calls evaluate directly with
  an unavailable provider, they get a recognisable empty result instead
  of a thrown exception.
- **3000-char clamp is enforced twice.** Client soft-warns above 2500,
  hard-colours above 3000, but doesn't block submit. Server trims to
  exactly 3000 before storing. So the client UI is a hint; the server is
  the truth.
- **Redo hydration gate.** `/compose/page.tsx` renders "Đang tải…" until
  the sessionStorage read finishes. Without this, the picker briefly
  appears before being replaced by the editor, which causes a flash and
  triggers picker's settings/today-pool fetches unnecessarily.
- **`sessionStorage` is consumed on read.** `removeItem` runs before the
  payload is parsed, so a malformed payload doesn't get reused on the
  next visit. If the parse throws, the user lands in picker phase as a
  silent fallback.
- **History row preview is plain text, not annotated.** The 140-char
  preview in `CompositionHistoryRow` is raw `composition.content`; no
  highlights. If you want highlights in the row, factor
  `renderAnnotatedPassage` out of `ComposeFeedback` first.

## Spec deviations recorded

1. **`evaluateComposition` is an `AIProvider` method, not a feature
   module.** Deliberate, at user request — opposite of M3b's
   `sentence-eval.ts` pattern. See first gotcha.
2. **Styling uses inline `style={{}}` with CSS vars,** not Tailwind
   utility classes as in the spec code samples. Matches the project's
   established convention (CLAUDE.md §4.6 + every other page).
3. **`flashcardsDb` import path is `@/lib/db`,** not the spec's
   `@/lib/flashcards/db`. The wrapper has always lived in `db.ts`.
4. **Sidebar "Lịch sử" is a button on `/compose`,** not a nested
   sub-entry. The sidebar in this project is a flat list (M3a/M3b
   convention).
5. **Sidebar colour `--v-blue` for /compose.** Not specified in the spec
   — blue was free in the palette and reads as "writing".
6. **`REDO_STORAGE_KEY` and payload type live in
   `src/lib/compositions/redo.ts`,** not on `/compose/page.tsx`. Allows
   `CompositionDetail.tsx` to consume them without importing across the
   app/ ↔ components/ boundary.
7. **Server-side redo resolution via `getByIds`,** not a client-side
   `/api/cards?ids=…` endpoint. Spec's first option was query-param
   `/compose?redo=<id>` + extra fetch; chose the simpler sessionStorage
   path the spec recommended as fallback.

## Future maintainers

- **Cost.** Each `/api/compose/evaluate` call is one Gemini request
  (~1500 token cap, slightly larger than F2). Compositions are user-driven
  and infrequent — caching probably not worth it. If you later expose
  composition rewriting / multiple drafts on the same pool, consider
  caching `(content_hash, pool_hash) → feedback` in a new D1 table to
  avoid re-grading identical resubmits.
- **Adding a "compositions per day" stat.** Trivial — add a
  `countSinceDate(userId, sinceIso)` method to `compositionsDb` and
  surface it on the stats page. The table already has `created_at`
  indexed by user via `idx_compositions_user_created`.
- **Highlighting upgrades.** If you want the issue-excerpt underline to
  tolerate paraphrasing, the cheap upgrade is a Levenshtein-windowed
  match (slide a window over `content` and accept the best match within
  distance N). A better upgrade is to ask Gemini for character offsets
  instead of excerpts — change the prompt to require
  `{ start_index, end_index, problem, suggestion }`. Watch out: Gemini
  is unreliable at offset arithmetic.
- **Replacing the AI provider.** `evaluateComposition` lives on the
  interface, so a non-Gemini provider must implement both `generateText`
  and `evaluateComposition`. The cleanest path is to base the new
  provider on `gemini.ts` (copy + swap the fetch + extraction) so the
  parser is shared. If you ever want a function-calling provider, that's
  the moment to migrate the F2 + F3 graders to a single `evaluate<T>`
  abstraction.
- **Composition deletion.** Hard delete, no soft-delete column. If you
  ever need undo, add a `deleted_at TIMESTAMP NULL` column in a new
  migration and update `listByUser` / `deleteById` accordingly. Don't
  modify migration `0005_m3.sql` — it's applied.
