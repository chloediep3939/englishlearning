# article-simplify — Result

Three-part simplification of the article (passage) reading flow:
strip auto AI from the backend submit (Part 1), then TTS karaoke UI
(Part 2), then bring grammar back as an on-demand action (Part 3).
This doc accumulates results across parts.

The codebase names the feature **passage**, not "article". The prompt
uses "article" generically — this doc maps it to `passages`
throughout.

---

## Part 1 — Strip AI from backend submit (2026-05-14)

### Scope

Make sure the article (passage) submit endpoint is a plain CRUD save:
validate, store, return ID. No AI imports, no auto-population of
AI-derived columns (CEFR level estimate, level verdict / suggestion,
translate reference, paraphrase tips).

### Files changed

- [src/app/api/passages/route.ts](src/app/api/passages/route.ts) —
  POST handler response slimmed from `{ passage: Passage }` (full
  hydrated row including `level_estimate`, `level_verdict`,
  `level_suggestion`, `translate_reference`, `paraphrase_tips`,
  `char_count`, `word_count`, `last_step_viewed`, etc.) to the flat
  `{ id, title, content, created_at }` shape from the prompt. No
  other change — validation, auth (`requireUserId()`), and the
  `passagesDb.create(...)` call were already AI-free.
- [src/doc/prompts/article-simplify-1-backend.md](src/doc/prompts/article-simplify-1-backend.md) — prompt saved verbatim.
- [src/doc/results/article-simplify-result.md](src/doc/results/article-simplify-result.md) — new (this file).

### Key decisions

- **Endpoint identification.** The prompt suggested
  `src/app/api/article/{grade,save}/...` as illustrative paths. The
  actual submit endpoint is **POST /api/passages**
  ([src/app/api/passages/route.ts](src/app/api/passages/route.ts)).
  Path name is fine post-strip (it's a noun, not a verb like
  "grade") — no rename needed. The prompt's "rename if misleading"
  guidance doesn't apply.
- **No AI imports to strip.** Grep
  (`grep -l "getAIProvider\|analyzeDifficulty" src/app/api/passages/`)
  shows the submit endpoint has **never** called AI. The auto-AI
  population happens later, from the frontend, hitting separate
  endpoints — see "Out of scope below". So Part 1's "remove imports"
  step was a verify-only, no edit needed there.
- **Columns left in place (not dropped).** Per the prompt and
  CLAUDE.md §10.8, the AI-derived columns
  (`level_estimate`, `level_verdict`, `level_suggestion`,
  `translate_reference`, `paraphrase_tips_json`) stay on the
  `passages` table. They simply remain NULL for new rows. Old rows
  with populated values are still readable through GET endpoints.
- **Response shape: flat, per prompt.** User explicitly chose the
  flat `{ id, title, content, created_at }` shape over the
  `{ passage: { ... } }` wrapper. This is a breaking change for the
  existing `/passage/new` page — see "Follow-ups". The slim response
  also drops `source_label`/`source_url`/`char_count`/`word_count`
  (none AI-derived) because the prompt explicitly listed only four
  fields.
- **Comment added** in the POST handler explaining the slim shape
  and that the frontend will catch up in Part 2.
- **DB wrapper untouched.** `passagesDb.create()` and
  `hydratePassage()` still return the full `Passage` shape — that's
  used by GETs and step routes. Only the POST endpoint's JSON
  response shape changed.

### Deviations from prompt

- Prompt assumed AI calls existed inside the submit endpoint. They
  didn't — so the "strip imports / prompt construction / parsing /
  error handling" steps were no-ops. Recorded as a verify rather
  than skipping silently.
- Prompt's illustrative column names (`cefr`, `summary`,
  `vocab_suggestions`, `themes`, `topics`) don't exist in the
  passages table. Mapped to the actual columns
  (`level_estimate`, `level_verdict`, `level_suggestion`,
  `translate_reference`, `paraphrase_tips_json`).
- No "Part 1" append — this result file did not exist yet, so it's
  created with the Part 1 section as the first entry. Future parts
  append below.

### Verification

- `npx tsc --noEmit` — 4 pre-existing errors in
  [src/app/api/cards/[id]/cloze/route.ts](src/app/api/cards/[id]/cloze/route.ts);
  zero new errors in or around `src/app/api/passages/`. Confirmed
  the pre-existing errors are unrelated to this change by filtering
  the error list by file path.
- `grep -l "getAIProvider" src/app/api/passages/route.ts` → no
  match. Submit endpoint has no AI.
- `grep -rn "getAIProvider\|analyzeDifficulty"
  src/app/api/passages/ src/lib/passages/` → other passage
  endpoints (`[id]/analyze`, `[id]/translate-reference`,
  `[id]/paraphrase-tips`, `[id]/define-word`,
  `[id]/translate-grade`, `[id]/paraphrase-grade`) still use AI.
  That matches the prompt's "other article endpoints may still use
  AI — that's Part 3's concern."
- Manual submit through the existing flow **NOT** exercised — the
  frontend now breaks at the response (see Follow-ups). DB row write
  path is unchanged from before, so an existing passage row would
  still appear with `content` filled and AI columns NULL.
- ⚠️ `npm run build` not run (CLAUDE.md §10.11 — gated).

### Follow-ups / known issues

- ⚠️ **Frontend breakage until Part 2.**
  [src/app/passage/new/page.tsx:32](src/app/passage/new/page.tsx#L32)
  reads `(await res.json()).passage.id` — with the new flat
  response, `passage` is undefined and the redirect throws.
  This is the expected cost the prompt accepted ("Frontend (Part 2)
  won't expect them anymore"), but worth flagging loudly so the user
  doesn't try to submit a new passage between Part 1 and Part 2.
  Easiest Part 2 fix: change line 32 to read the flat shape
  (`{ id } = await res.json()`).
- **Auto-AI in the post-submit flow still runs.** The frontend in
  [src/components/passage/PassageStep3Reader.tsx:118-120](src/components/passage/PassageStep3Reader.tsx#L118-L120)
  and [src/components/passage/PassageStep2Difficulty.tsx:44](src/components/passage/PassageStep2Difficulty.tsx#L44)
  still fires `/analyze`, `/translate-reference`, and
  `/paraphrase-tips` automatically when the user reaches Step 2/3.
  That's not part of the submit endpoint, so out of scope for Part 1
  per the prompt — but it means CEFR / translate-ref / paraphrase
  tips still get populated for new passages once the user opens
  them. If the goal is genuinely "CEFR gone from the auto-flow",
  Part 2 (or a separate Part 1.5) will need to drop those frontend
  pre-fetch fire-and-forget calls.
- **AI columns can be dropped later.** Per CLAUDE.md §10.8 the
  columns stay for now. If they become permanently unused after
  Part 3 settles, a future migration could drop them — but the
  prompt explicitly defers this ("possibly never — cheap to keep").
- **Other consumers of the POST response.** Grepped
  `grep -rn "/api/passages'" src/` for POST callers — only
  [src/app/passage/new/page.tsx:18](src/app/passage/new/page.tsx#L18)
  consumes the response shape. So the breakage surface is exactly
  one file.

---

## Part 2 — Karaoke reader + wizard removal (2026-05-14)

### Scope

Replace the multi-step passage wizard (Edit / Difficulty / Reader /
Translate / Paraphrase) with a single karaoke reader page. Add
in-page TTS controls (Play/Pause, Stop, rate, voice). Keep
word-click → save-to-Word-Bank, but swap the AI `/define-word`
lookup for the free dictionary API (`lookupWord` / `/api/dictionary/lookup`).
Also fix the response-shape breakage Part 1 introduced.

### Files changed

- [src/components/passage/KaraokeReader.tsx](src/components/passage/KaraokeReader.tsx)
  — new. Karaoke component: `speechSynthesis` utterance, `onboundary`
  char-index → token highlight, inline Play/Pause + Stop + rate +
  voice controls, 5K-char guard with banner, no-TTS-support disabled
  state, voiceschanged listener. Includes `DefinePopup` +
  `DefinitionBody` that fetch `/api/dictionary/lookup` and present
  IPA + audio + English definitions + examples. Word save still uses
  `/api/cards/from-passage`.
- [src/app/passage/[id]/page.tsx](src/app/passage/[id]/page.tsx) —
  rewrote. Dropped `PassageWizardTabs`, all step rendering, and the
  step-persistence effect that wrote `last_step_viewed` back to the
  DB. Now: fetch passage → render title + `<KaraokeReader />`. ~50%
  smaller file.
- [src/app/passage/new/page.tsx](src/app/passage/new/page.tsx) —
  Part-1 breakage fixed. Changed
  `const { passage } = ...; router.push(...passage.id)` to
  `const { id } = ...; router.push(...id)`. Removed the now-unused
  `import type { Passage }`.
- [src/doc/prompts/article-simplify-2-tts.md](src/doc/prompts/article-simplify-2-tts.md)
  — prompt saved verbatim + clarification answers appended.
- [src/doc/results/article-simplify-result.md](src/doc/results/article-simplify-result.md)
  — this section appended.

### Key decisions

- **New file, not modify `PassageStep3Reader`.** The existing Step 3
  reader already had karaoke + popup, but it also hard-coded the
  auto-AI pre-fetch (`/analyze`, `/translate-reference`,
  `/paraphrase-tips`) on mount and used the AI `/define-word`
  endpoint. Rewriting in place would have re-touched every method
  and orphaned the wizard component name. New file is clearer; the
  old `PassageStep3Reader` becomes orphan code (see Follow-ups).
- **Tokenizer kept from Step 3** —
  `/([a-zA-Z][a-zA-Z'-]*[a-zA-Z]|[a-zA-Z])|([^a-zA-Z]+)/g`. This
  splits into word vs non-word runs so punctuation flows correctly
  and only real words are clickable. Simpler than the prompt's
  `\S+` (which would have made `word.` clickable as one unit).
- **Did NOT extend `speak()` in `@/lib/tts`.** The prompt suggested
  extending it to support `onboundary`. Karaoke needs a different
  lifecycle — long utterance, per-word events, pause/resume/stop —
  than the fire-and-forget `speak()` used by AudioButton and the
  voice picker. Folding both into one helper would make `speak()`
  uglier. Karaoke uses `speechSynthesis` directly; both still share
  `getStoredVoicePreference()`.
- **Voice default = stored preference.** On mount the component reads
  `getStoredVoicePreference()` (the same value the Settings voice
  picker writes). The user can override inline for this session
  only — we do NOT call `setStoredVoicePreference` from the reader.
- **Rate default = 1.0.** Not pulled from settings
  (`passage_tts_rate`) on purpose — keeps the component independent
  and matches the prompt's "rate dropdown in the controls bar"
  mockup. If the saved-setting parity matters, that's a follow-up
  (one apiJson call).
- **Word-click → dictionary API.** Per user clarification, swapped
  `/api/passages/[id]/define-word` (AI Gemini call) for
  `/api/dictionary/lookup` (free dictionaryapi.dev). UX is similar:
  popup shows headword, IPA, audio/speak button, POS pill, and now
  English definitions + example sentences (Step 3 had a Vietnamese
  AI gloss; this loses Vietnamese but gains audio + multiple senses,
  zero cost, zero quota). New `notFound` popup phase explicitly
  handles 404 from the dictionary API.
- **Audio playback for the lemma.** When dictionaryapi.dev returns
  `audio_url`, the speak button plays the recorded audio (real
  pronunciation) instead of `speechSynthesis`. Falls back to
  `speechSynthesis` when audio is missing or `Audio.play()` throws.
- **Save path unchanged.** Still
  `POST /api/cards/from-passage`. That route internally calls
  `generateCardData` which still uses AI for the example top-up.
  That's a user-initiated AI call (the save click), not the
  auto-flow Part 1 was killing, so it stays.
- **5000-char TTS guard.** Hardcoded `MAX_TTS_CHARS = 5000` because
  Chrome on macOS and Safari both truncate utterances past about
  ~5-8K chars. Long passages get a yellow-orange banner explaining
  Bún only reads the first 5K. Word-click still works on the
  visible (sliced) portion only — the rest of the passage isn't
  rendered.
- **`onboundary` may not fire on iOS Safari.** Inline comment in
  `play()`. The audio still plays; the highlight just stays at -1.
  No fake-timing fallback — better silent degradation than
  desync'd highlighting.
- **Wizard removal is the user's call, not the prompt's.** The
  prompt's mockup implied a single-page reader; the user
  explicitly confirmed "Replace wizard entirely" via the scoping
  question. So Steps 1, 2, 7, 8 and `PassageWizardTabs` are no
  longer reachable from the UI. See Follow-ups for cleanup.

### Deviations from prompt

- Tokenizer: word-vs-non-word regex from existing code, not the
  prompt's `\S+` runs (rationale above).
- Did not extend `@/lib/tts.speak()` — kept direct `speechSynthesis`
  in the component (prompt allowed either, with a comment).
- Added word-click → save flow that wasn't in the prompt's mockup,
  per user clarification.
- 5000-char guard threshold matches the prompt; behaviour is "slice
  + banner", not "warn before play". Functionally equivalent.
- Rate dropdown values: `[0.75, 1, 1.25, 1.5]`, matching the prompt.

### Verification

- `npx tsc --noEmit` — exits 0, no errors. The pre-existing 4
  errors in [src/app/api/cards/[id]/cloze/route.ts](src/app/api/cards/[id]/cloze/route.ts)
  noted in Part 1's verification appear to have cleared between
  runs (incremental-cache artifact from the unrelated `cloze.ts`
  WIP edits already in the working tree — confirmed by running a
  fresh `tsc --noEmit`).
- ⚠️ Manual browser exercise NOT performed — CLAUDE.md §10.11 gates
  `npm run dev` / `npm run preview`. Karaoke timing, voice list
  population on Chrome vs. Safari, the long-article banner, and
  the word-click → dictionary popup are all untested at runtime.
  Spot-checked the component logic by reading it back; the data
  flow matches the working `PassageStep3Reader` reference for the
  shared parts (tokenization, charIndex match, save flow).
- Imports resolve: `@/lib/flashcards/dictionary` (type-only),
  `@/lib/tts`, `@/lib/common/api-json`, `@/lib/types`,
  `lucide-react` — all already in the project.
- Server-only boundary respected — only `import type
  { DictionaryResult }` from `@/lib/flashcards/dictionary`. The
  runtime `lookupWord` is reached via the existing
  `GET /api/dictionary/lookup` route, not direct import.
- `npm run build` not run (§10.11).

### Follow-ups / known issues

- ⚠️ **Orphaned components.** Now unreferenced after the wizard
  drop:
  - [src/components/PassageWizardTabs.tsx](src/components/PassageWizardTabs.tsx)
  - [src/components/passage/PassageStep1Edit.tsx](src/components/passage/PassageStep1Edit.tsx)
  - [src/components/passage/PassageStep2Difficulty.tsx](src/components/passage/PassageStep2Difficulty.tsx)
  - [src/components/passage/PassageStep3Reader.tsx](src/components/passage/PassageStep3Reader.tsx)
  - [src/components/passage/PassageStep7Translate.tsx](src/components/passage/PassageStep7Translate.tsx)
  - [src/components/passage/PassageStep8Paraphrase.tsx](src/components/passage/PassageStep8Paraphrase.tsx)
  - [src/components/passage/StepPlaceholder.tsx](src/components/passage/StepPlaceholder.tsx)
  - The companion API routes
    (`/api/passages/[id]/analyze`, `.../translate-reference`,
    `.../paraphrase-tips`, `.../translate-grade`,
    `.../paraphrase-grade`, `.../define-word`) and their server-side
    AI helpers (`src/lib/passages/ai/*.ts`) are also now unreached
    from the UI. They still ship in the Workers bundle.
  - Left in place rather than deleted (CLAUDE.md §6.7 stay in scope
    + §10.6 don't delete files outside explicit request). The
    safest cleanup is a separate "remove passage wizard" PR after
    Part 3 lands and we're sure the simplified flow is the final
    shape.
- **`passage_pre_fetch` setting is now dead.** The toggle in
  `userSettingsDb.getFlashcardSettings(...)` and the corresponding
  Settings UI control still exist but no longer gate anything.
  Cleanup is part of the same "remove passage wizard" follow-up.
- **`last_step_viewed` column** is no longer written by the UI;
  the value persists at whatever step the user was on before
  Part 2. Harmless (column stays per CLAUDE.md §10.8).
- **TTS rate setting parity.** The Settings page has a
  `passage_tts_rate` slider; the new karaoke reader ignores it and
  defaults to 1.0 each session. If users complain, a 1-line fetch
  on mount restores the link.
- **iOS Safari word highlight.** No `onboundary` for the `word`
  unit on iOS Safari → no highlight, but audio plays. Acceptable
  degradation; documented inline.
- **Long article truncation affects TTS only.** Renderer tokenizes
  the *full* `content`; only `ttsContent` (first 5K chars) is fed
  to `speechSynthesis`. Past the cap the karaoke highlight stops
  but the user can still read the rest. Word-click looks up the
  sentence in the full content too.

---

## Part 3 — Grammar button + on-demand AI endpoint (2026-05-14)

### Scope

Add a "Tìm hiểu grammar patterns" button below the passage. On
click, fires an AI call that returns a JSON list of grammar
patterns with Vietnamese explanations and verbatim examples from
the text. Cache by content hash so identical articles (across
users) reuse a single analysis.

### Files changed

- [migrations/0010_passage_grammar.sql](migrations/0010_passage_grammar.sql)
  — new. Adds `grammar_analysis TEXT`, `grammar_analyzed_at DATETIME`,
  `content_hash TEXT`, plus `idx_passages_content_hash`. All
  columns nullable so existing rows stay valid; lazy backfill
  per option (a) in the prompt (D1 lacks built-in SHA-256).
- [src/lib/types.ts](src/lib/types.ts) — extended `Passage` and
  `PassageRow` with the three new columns. Added `GrammarPattern`
  and `GrammarAnalysis` interfaces.
- [src/lib/passages/hash.ts](src/lib/passages/hash.ts) — new.
  `hashContent(text)` returns the SHA-256 hex of the trimmed,
  lowercased content via `crypto.subtle.digest`. Workers + browser
  both support it; no Node polyfill needed.
- [src/lib/passages/db.ts](src/lib/passages/db.ts) — `hydratePassage`
  now parses `grammar_analysis` (with shape validation — invalid
  rows hydrate as `null`). Added three new wrapper methods:
  - `setContentHash(userId, id, hash)` — user-scoped UPDATE for
    lazy backfill.
  - `findGrammarByContentHash(hash)` — **cross-user** lookup,
    returns raw JSON string. Intentional: see Key decisions.
  - `setGrammarAnalysis(userId, id, analysisJson)` — user-scoped
    UPDATE that stamps `grammar_analyzed_at = CURRENT_TIMESTAMP`.
- [src/lib/passages/ai/grammar.ts](src/lib/passages/ai/grammar.ts)
  — new. `analyzeGrammar(content)` builds the prompt, calls Gemini
  with `json: true, temperature: 0.3, max_tokens: 1500`, parses
  + validates the JSON, returns `GrammarAnalysis | null`. Mirrors
  the existing `analyzeDifficulty` shape so callers + error paths
  are familiar.
- [src/app/api/passages/[id]/grammar/route.ts](src/app/api/passages/[id]/grammar/route.ts)
  — new POST handler. Logic: 401 if unauth → 404 if not owned →
  return cached analysis on this row if present → backfill hash if
  missing → look up cached analysis by hash (cross-user) → if hit,
  copy to this row + return → else AI call → write + return. Adds
  one `console.log` line on AI invocation so the user can verify
  cache behavior from the dev server log.
- [src/components/passage/GrammarSection.tsx](src/components/passage/GrammarSection.tsx)
  — new. Renders the button (purple, sparkle icon) + error rail +
  pattern cards (purple left border, head font name, Vietnamese
  explanation, italic verbatim examples). Disabled state when
  already analyzed.
- [src/app/passage/[id]/page.tsx](src/app/passage/[id]/page.tsx) —
  renders `<GrammarSection passageId={...} initialAnalysis={passage.grammar_analysis} />`
  below `<KaraokeReader />`. Initial fetch of the passage already
  carries the hydrated analysis, so the section paints synchronously
  on revisit (no extra round-trip).
- [src/doc/prompts/article-simplify-3-grammar.md](src/doc/prompts/article-simplify-3-grammar.md)
  — prompt saved verbatim.
- [src/doc/results/article-simplify-result.md](src/doc/results/article-simplify-result.md)
  — this section appended.

### Key decisions

- **Cross-user cache is intentional and safe.**
  `findGrammarByContentHash` deliberately omits the `WHERE user_id = ?`
  filter — a violation of the multi-tenancy rule for any other table.
  Safe here because: (a) the hash is over the article *content*,
  so a hit proves the requesting user already has the same text;
  (b) the analysis is derived from the content the user can already
  see; (c) we don't expose any per-row metadata (author, deck
  membership) in the response. Documented as a `Why:` comment in
  the wrapper method.
- **Lazy hash backfill instead of one-shot migration.** D1's SQLite
  has no `sha256()` function, and adding a separate backfill
  endpoint just to populate ~tens of existing rows is overkill. The
  grammar route computes + stores the hash on the first call per
  row. Cost is one tiny UPDATE per pre-M5 passage on first analysis.
- **Wrapper methods, not raw SQL.** The prompt's example used raw
  `db.prepare(...)` in the route. The repo convention is wrapper
  helpers on `passagesDb` so SQL stays in one file and `user_id`
  scoping is enforced consistently (CLAUDE.md §4.5). Route is now
  a five-line orchestration over the wrapper.
- **Store the raw AI JSON.** On AI hit, `setGrammarAnalysis` writes
  `JSON.stringify(analysis)` (re-stringified after parse-validation).
  On cache hit, the cached JSON string is copied verbatim. The
  response then `JSON.parse`s once before responding, so the client
  always gets the structured shape — but the DB column stays as a
  TEXT JSON string per CLAUDE.md §4.5.
- **Validation has two layers.** `parseGrammar` in the AI helper
  filters out patterns with missing name/explanation. `hydratePassage`
  re-validates on read so malformed stored rows degrade to `null`
  rather than crash the page. `route.ts` has a third `safeParseAnalysis`
  for the cross-user cache-hit path (defensive — the cached JSON
  has already been validated when it was written).
- **No `runtime = 'nodejs'` strictness deviation.** Set on the route
  per CLAUDE.md §4.1 (mirrors `/analyze`, `/translate-reference`,
  etc.).
- **AI quota error handling is future-proofed but not fully active.**
  The current Gemini provider returns `null` on any error (including
  429), and the route maps that to `502 { error: 'ai_error' }`.
  The frontend `GrammarSection` ALSO handles `429` /
  `{ error: 'ai_quota_exceeded' }` so it'll do the right thing the
  moment the gemini provider starts throwing `AIQuotaError`
  (the class exists in `@/lib/ai/types` but isn't thrown yet).
- **Server-side initialAnalysis prop, not client fetch.** The page
  reads `passage.grammar_analysis` from the passage GET, which is
  already hydrated by `hydratePassage`. So users revisiting a
  previously-analyzed passage see results on first paint — no
  extra fetch, no flicker. Matches the prompt's "UI loads it
  directly on page open" intent.
- **Button color = purple.** The repo uses `--v-purple` for POS pills
  and other meta affordances. Felt right for "grammar metadata"
  context, and visually separates from the green TTS Play button.
- **`Sparkles` icon.** From `lucide-react` (already in repo). Signals
  "AI" / "magic" without using emojis (CLAUDE.md says emojis only
  on explicit request).

### Deviations from prompt

- **Table name** is `passages`, not the placeholder
  `<article_table>` — substituted everywhere.
- **Endpoint path** is `/api/passages/[id]/grammar`, not the
  prompt's `/api/article/[id]/grammar` — consistent with Parts 1/2
  and the existing `/api/passages/[id]/*` namespace.
- **Hash helper location** is `src/lib/passages/hash.ts`, not the
  prompt's `src/lib/article/hash.ts` — same reason.
- **Validation is stricter than the prompt's
  `JSON.parse(cleaned); analysisJson = cleaned`.** Patterns with
  empty `name` or `explanation_vi` are dropped; empty result →
  null → 502. Prevents storing junk JSON in the cache.
- **Markdown fence stripping is `(?:json)?` matched** so both
  ` ```json ` and bare ` ``` ` fences are removed (matches the
  existing `parseDifficulty` regex).
- **Cross-user cache copies the cached JSON** to this user's row.
  Means the analysis count grows by one row per cache hit. Could
  use a normalized `grammar_analyses(hash, analysis)` table instead
  — that's a future optimization, not needed at this scale.

### Verification

- ⚠️ **Migration NOT applied.** Per CLAUDE.md §10.11 wrangler isn't
  run automatically. User needs to run:
  ```
  npx wrangler d1 migrations apply english-learning-db --local
  ```
  before exercising the route locally. Production: same command
  without `--local`.
- `npx tsc --noEmit` — exits 0, no errors. New types
  (`GrammarPattern`, `GrammarAnalysis`) wire through cleanly.
- `grep -rn "AIQuotaError" src/` — only the type definition + the
  import line in `gemini.ts`; nothing throws it yet. The frontend
  branch in `GrammarSection` is dead code until that lands, but
  costs nothing.
- Cache lookup query verified user-unscoped intentionally:
  `grep -n findGrammarByContentHash src/lib/passages/db.ts` shows
  `WHERE content_hash = ?` only — no `user_id` clause.
- Article ownership verified on every write path
  (`passagesDb.getById(userId, n)` happens before any DB write).
- ⚠️ **Runtime not exercised.** `npm run dev` / `wrangler d1
  migrations apply` are gated by CLAUDE.md §10.11. End-to-end
  flow not tested:
  - Migration apply (needs user step).
  - First AI call → DB write.
  - Reload → cached-on-row return.
  - Second user with identical content → cross-user cache hit
    (`console.log '[passage grammar] AI invoke'` should fire only
    once across both users).
- `npm run build` not run (§10.11).

### Follow-ups / known issues

- ⚠️ **User must apply migration 0010** before the grammar route
  works locally. Without it, `passagesDb.getById` would fail when
  hydrating the new columns (D1 returns rows by `SELECT *` and
  TypeScript expects the new fields to exist on `PassageRow`).
  Recovery: just run the wrangler command above.
- **No "Regenerate" affordance.** Once a passage has an analysis,
  the button reads "Đã phân tích" and is disabled. The prompt
  explicitly out-of-scoped a force-fresh button. Adding one later
  would be: clear the row's `grammar_analysis` + clear or recompute
  hash, then re-click.
- **Per-pattern highlight in the article** (click a pattern →
  highlight its example sentences inside the karaoke reader) is
  out of scope per the prompt. Possible Part 4 if the UX ask comes.
- **The cross-user cache key is "trim + lowercase" only.** If two
  users paste articles that differ only by punctuation or accent
  marks, they get different cache keys. Acceptable for now —
  tighter normalization (Unicode NFC, collapsing whitespace, etc.)
  is easy to add to `hashContent` if false misses become a problem.
- **Race: two concurrent first-time analyses of the same content**
  → both miss cache, both call AI, both write. Last write wins,
  one AI bill paid twice. Acceptable at current scale; a row-lock
  or batch insert with `INSERT OR IGNORE` on a dedicated
  `grammar_analyses` table would be the principled fix.
- **Logging.** Added a `console.log` on AI invocation so the user
  can verify cache behavior from `wrangler tail` or the dev server
  log. Remove or downgrade to `debug` before production if it
  proves noisy.
- **Orphan API routes from Part 2 still exist.** None of them
  conflict with the new grammar route, but the broader cleanup
  remains pending (see Part 2 follow-ups).
- **Word saved to Word Bank via dictionary lookup.** The save call
  to `/api/cards/from-passage` still runs `generateCardData`
  internally, which may make an AI call to top up examples. That
  AI cost is user-initiated (save click) — fine for now, but worth
  noting that "lookupWord + save" isn't fully zero-AI end-to-end.
