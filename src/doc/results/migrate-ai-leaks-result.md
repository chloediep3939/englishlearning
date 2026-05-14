# Migrate AI leaks — result

## Scope

Final audit pass to confirm AI usage is restricted to cloze pool generation, sentence/paragraph grading, on-demand grammar analysis, and the compose feature. Discovery showed B1 (translation), B2 (IPA), and B3 (`/api/cards/generate` AI prompt) were already complete from prior migrations. The only concrete change in this pass was deleting dead AI code (`src/lib/flashcards/examples.ts`).

## Files changed

- **Deleted** [src/lib/flashcards/examples.ts](src/lib/flashcards/examples.ts) — orphan `generateExamples()` helper. Last caller was removed in cloze-pool Part 3 (see [src/doc/results/cloze-pool-result.md:103](src/doc/results/cloze-pool-result.md#L103)) and the file was explicitly noted as "retained for a dedicated cleanup pass." This is that pass.
- **Created** [src/doc/prompts/migrate-ai-leaks.md](src/doc/prompts/migrate-ai-leaks.md) — verbatim copy of the user prompt per CLAUDE.md §8.
- **Created** [src/doc/results/migrate-ai-leaks-result.md](src/doc/results/migrate-ai-leaks-result.md) — this file.

No other source files were modified. No env vars added. No new dependencies.

## Discovery findings (recap)

Each B-task was already satisfied before this pass:

| Task | Status | Reality on disk |
|---|---|---|
| B1 — translation off AI | ✅ already done | [translate.ts](src/lib/flashcards/translate.ts) calls MyMemory (`api.mymemory.translated.net`, free tier, 8 s timeout, 500 char cap). No AI. |
| B2 — IPA from dictionary | ✅ already done | [dictionary.ts](src/lib/flashcards/dictionary.ts) uses Free Dictionary API (`dictionaryapi.dev`). `lookupWord()` returns `ipa`, `audio_url`, `ipa_alt`, `audio_url_alt`, `accent`. No second-source fetch needed. |
| B3 — strip AI prompt from `/api/cards/generate` | ✅ already done | [cards/generate/route.ts](src/app/api/cards/generate/route.ts) has no AI prompt. It delegates to [generateCardData()](src/lib/flashcards/generate.ts) which fans out in parallel to `lookupWord`, `getCollocations` (Datamuse), `translateEnToVi` (MyMemory), `getPexelsImage`. AI is invoked only afterward via `ensureClozePool` in a `waitUntil` background task. |

## Phase C verify grep result

`grep -rn "getAIProvider\|generateText" src/lib/flashcards/ src/app/api/cards/`:

- `src/lib/flashcards/cloze.ts` — cloze pool generation (kept, in reserved list)
- `src/lib/flashcards/sentence-eval.ts` — sentence grading (kept, in reserved list)
- `src/lib/flashcards/lemmatize.ts` — AI Gemini call with regex fallback (kept by user choice; see Follow-ups)

Nothing under `src/app/api/cards/`. The prompt's "Expected results" line ("Nothing else in `src/app/api/cards/`") is satisfied.

## Key decisions

- **Did not migrate `lemmatize.ts`.** It calls Gemini per card-creation request (cache-busting hot path) and is not in the prompt's reserved-AI list, so it is technically a leak. User explicitly chose to keep it as-is so irregular verbs (ran → run, went → go, was → be) still resolve correctly; the regex fallback only handles `-ies` / `-es` / `-ied` / `-ed` / `-s`. Documented in Follow-ups.
- **Deleted `examples.ts` rather than leaving it.** Per CLAUDE.md §"Avoid backwards-compatibility hacks" and the existing note in [cloze-pool-result.md](src/doc/results/cloze-pool-result.md) flagging it for a future cleanup pass. Zero source consumers — only historical doc references in `src/doc/results/`, which were intentionally left untouched (CLAUDE.md §6.3 preserves user's existing files).
- **Skipped the Azure Translator env-var ask.** B1's `STOP AND ASK USER` clause only triggers if translation is on AI; it is not.

## Deviations from prompt

- Prompt presents B1–B3 as conditional ("if `translateEnToVi` uses AI", "if cards/generate AI prompt asks for IPA"). All three conditions were false, so no migration code was written for B1, B2, or B3. The prompt allows this ("Skip tasks that are already non-AI") and matches the spirit of "final cleanup."
- Added one concrete change beyond the literal B-task list — deletion of dead `examples.ts` — surfaced by the Phase C grep and explicitly flagged as a future cleanup item in prior result docs.
- Did not change `lemmatize.ts` despite its being on the AI hot path. Decision was the user's after the discovery report; documented as a known follow-up rather than a silent acceptance.

## Verification

- `grep -rn "from '@/lib/flashcards/examples'\|from './examples'\|generateExamples" src/` — zero matches in source code (only historical doc-result files). No broken imports left by the deletion.
- Phase C grep — confirms only `cloze.ts`, `sentence-eval.ts`, `lemmatize.ts` remain.
- ⚠️ **Did not run `npm run build` or `tsc`** (CLAUDE.md §10.11 forbids running build scripts automatically). Deletion is import-safe based on the grep above; please run `npm run build` to confirm.
- ⚠️ **Did not exercise card creation end-to-end.** Discovery was static read + grep only. The behavioral pipeline was not edited, so a regression is unlikely, but the user should verify by adding a word in `/add` if they want hard confirmation.

## Follow-ups / known issues

- **`lemmatize.ts` remains on AI.** This is the last AI call in the card-creation hot path and is not in the prompt's reserved list. If you later want to drop it, options were: (a) regex-only (loses irregular-verb coverage), or (b) regex + small hardcoded irregular-verb map (e.g. ran/went/was/took/saw/etc.) before the regex fallback. Option (b) is a half-day's work and would eliminate the last per-card Gemini call.
- **Doc references to `examples.ts` still exist** in [v2-design-migration.md](src/doc/results/v2-design-migration.md) and [cloze-pool-result.md](src/doc/results/cloze-pool-result.md). Left intact per CLAUDE.md §6.3 (preserve user's files / historical record). If you want those scrubbed, that's a separate request.
- **Compose feature AI calls** (`src/app/api/compose/{evaluate,suggest}/route.ts`) are outside the cards/ scope but also outside the prompt's "reserved" list (which mentions only cloze, grading, grammar — compose is its own category). The prompt explicitly grouped them under "covered by prior migrations" so they are intentionally untouched here.
