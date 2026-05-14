# M4a — Passages: shared infra + Step 1 (paste + library)

Phase 1 of 3 for M4 passage-based learning. Lays down the cross-cutting
plumbing (DB, types, settings, AI module skeletons) for the "Bài đọc"
feature and ships **Step 1 (paste + library + read/edit)** end-to-end.
Steps 2 / 3 / 7 / 8 render placeholders that M4b / M4c will fill in.

Status: **all files done.** `tsc --noEmit` clean. Migration `0006_passages.sql`
applied locally and verified. No browser run yet; smoke tests deferred to
the user.

## Purpose

- Stand up the M4 substrate without forcing M4b / M4c to do schema work:
  `passages` + `passage_attempts` tables, all M4 types, the user-settings
  keys, and 4 AI feature-module stubs that future phases can fill in by
  replacing one file each.
- Ship Step 1 of the wizard as a real feature: paste a passage, see it in
  the library, open it, edit it, delete it.
- Render every other step (2 / 3 / 7 / 8) as a discoverable empty state
  so the wizard navigation is wired even when the content isn't.
- Add the Word Bank source-tracking columns (`flashcards.source_passage_id`,
  `flashcards.source_context`) now, so M4b can wire "Save to deck" with
  no schema change.

## File map

| Path | Role |
| --- | --- |
| `migrations/0006_passages.sql` | Creates `passages` + `passage_attempts` tables and adds 2 nullable columns on `flashcards`. `passage_attempts.passage_id` has `ON DELETE CASCADE`; `flashcards.source_passage_id` has `ON DELETE SET NULL` so deleting a passage doesn't lose user-saved cards. |
| `src/lib/types.ts` | Added `CefrLevel`, `LevelVerdict`, `PassageStepKind`, `Passage`, `PassageRow`, `PassageAttempt`, `PassageAttemptRow`, `DifficultyAnalysis`, `WordDefinitionInContext`, `TranslationFeedback`, `ParaphraseFeedback`, `M4_SETTINGS`. Extended `FlashcardSettings` with 3 required M4 keys + `Flashcard` with 2 nullable source-tracking fields. |
| `src/lib/db.ts` | Extended `SETTINGS_KEYS`, `getFlashcardSettings`, and `updateFlashcardSettings` for the 3 M4 keys. Added a `parseCefr` helper that defaults invalid stored values to `M4_SETTINGS.user_cefr_level.default`. `hydrateCard` is unchanged — the new `source_passage_id` / `source_context` columns ride along on the existing spread. |
| `src/lib/passages/db.ts` | `passagesDb` (create / getById / listByUser / update / deleteById) + `passageAttemptsDb` (record / getLatestByStep / listByPassage). Mirrors the `compositionsDb` shape from M3. `update` recomputes `char_count` / `word_count` server-side whenever `content` changes — callers can't push inconsistent counts. Word counting uses `(s.trim().match(/\S+/g) ?? []).length`. |
| `src/lib/passages/ai/difficulty.ts` | Stub for M4b. Currently returns a B1/just_right placeholder so any premature wiring renders something instead of crashing. |
| `src/lib/passages/ai/define-word.ts` | Stub for M4b. Returns `{ english: word, vietnamese: '(chưa có)', part_of_speech: 'unknown', example_sentence: '', ipa: null }`. |
| `src/lib/passages/ai/grade-translation.ts` | Stub for M4c. Returns a zero-payload `TranslationFeedback`. |
| `src/lib/passages/ai/grade-paraphrase.ts` | Stub for M4c. Returns a zero-payload `ParaphraseFeedback`. |
| `src/app/api/passages/route.ts` | GET (limit / offset paged list) + POST. POST validates content 100–10 000 chars, auto-derives title from first 60 chars at a word boundary, normalises a missing URL scheme to `https://`. |
| `src/app/api/passages/[id]/route.ts` | GET + PUT + DELETE. PUT whitelists 9 mutable fields with per-field type / range validation (CEFR enum, verdict enum, content length, last_step_viewed bounds, parseable completed_at). |
| `src/app/api/settings/route.ts` | Validator extended with `user_cefr_level` (must be one of the 6 enum values), `passage_tts_rate` (0.5–1.5, rounded to one decimal so slider ticks don't accumulate float noise), `passage_pre_fetch` (boolean). |
| `src/app/settings/page.tsx` | New `Section title="Học theo bài đọc"` between "Luyện tập" and "Nhắc nhở (sắp có)". Three controls: `CefrControl` (6 segmented buttons + VN level label), `TtsRateControl` (slider with "🔊 Nghe thử" using `window.speechSynthesis`), reused `Toggle` for pre-fetch. |
| `src/components/Sidebar.tsx` | One new entry: `Newspaper` icon (chosen because `BookOpen` collides with `/study`), label "Bài đọc", route `/passage`, colour `--v-teal`, inserted directly after `/compose`. |
| `src/app/passage/page.tsx` | Server-rendered library list (limit 50). Empty state shows Mascot `idle` pose + CTA to `/passage/new`. |
| `src/app/passage/new/page.tsx` | Client wrapper around `PassageForm`. POSTs `/api/passages` and navigates to `/passage/[id]` on success. |
| `src/app/passage/[id]/page.tsx` | Wizard shell (client). Loads the passage, restores `last_step_viewed` (falls back to step 1 if invalid). Debounced 500 ms PUT on tab change. Skips the PUT when the active step already equals the persisted value. |
| `src/components/PassageForm.tsx` | **Reused** by both `/passage/new` and `PassageStep1Edit`. Title / content / source label / source URL fields. Live char + word counters (orange > 9000, red > 10 000). Submit gated at ≥ 100 chars trimmed. Caller passes an `onSubmit` that throws to surface an error banner. |
| `src/components/PassageWizardTabs.tsx` | 5 tabs (1 Bài / 2 Độ khó / 3 Đọc / 7 Dịch / 8 Viết lại). Numbers 4 / 5 / 6 are deliberately reserved for future wizard steps. |
| `src/components/PassageLibraryRow.tsx` | List row. Title, date, word count, source label, level pill (colour from `level_verdict`), "Đã học" badge when `completed_at` set. Trash button calls DELETE + `router.refresh()`. |
| `src/components/passage/PassageStep1Edit.tsx` | Real Step 1. Toggles between read mode (title, source badge + link, scrollable content with `whitespace-pre-wrap`, stats row, edit + delete buttons) and edit mode (mounts `PassageForm` with the passage's current values, PUT on save, then `onSaved()` to refresh). |
| `src/components/passage/StepPlaceholder.tsx` | Shared empty state used by the 4 stub steps. M4b / M4c replace each step's body but can leave this helper alone. |
| `src/components/passage/PassageStep2Difficulty.tsx` | Placeholder (icon 🔧). Wired in M4b. |
| `src/components/passage/PassageStep3Reader.tsx` | Placeholder (icon 🎧). Wired in M4b. |
| `src/components/passage/PassageStep7Translate.tsx` | Placeholder (icon 📝). Wired in M4c. |
| `src/components/passage/PassageStep8Paraphrase.tsx` | Placeholder (icon 🔁). Wired in M4c. |

## Data flow

```
/passage                       -> Server Component
                                  └── passagesDb.listByUser(userId, { limit: 50 })
                                         └── PassageLibraryRow per row
                                                └── DELETE /api/passages/[id] + router.refresh()

/passage/new                   -> 'use client'
                                  └── PassageForm
                                         └── POST /api/passages
                                                ├── passagesDb.create
                                                └── 201 → router.push(/passage/[id])

/passage/[id]                  -> 'use client' (wizard shell)
                                  ├── GET  /api/passages/[id]   (on mount)
                                  ├── PUT  /api/passages/[id]   (debounced 500ms on tab change)
                                  │      └── { last_step_viewed }
                                  └── one of 5 step components by tab

  step 1 → PassageStep1Edit    -> read ↔ edit toggle
                                  └── PUT /api/passages/[id]   (full content update)
                                         └── passagesDb.update (recomputes char/word_count)

  steps 2/3/7/8 → placeholders -> StepPlaceholder (no requests)

PUT /api/passages/[id]         -> whitelist + validate → passagesDb.update → return updated row
```

## Public API surface

- `passagesDb.create(userId, { title, content, source_label?, source_url? }) → Promise<Passage>`
  — server computes `char_count` + `word_count` from `content`; do not pass them.
- `passagesDb.getById(userId, id) → Promise<Passage | null>` — null when not owned by user.
- `passagesDb.listByUser(userId, { limit?, offset? }) → Promise<Passage[]>` — newest first.
- `passagesDb.update(userId, id, partial) → Promise<Passage | null>` — 9 fields whitelisted:
  `title`, `content`, `source_label`, `source_url`, `level_estimate`, `level_verdict`,
  `level_suggestion`, `last_step_viewed`, `completed_at`. When `content` is present,
  `char_count` + `word_count` are recomputed automatically. Returns null when not owned.
- `passagesDb.deleteById(userId, id) → Promise<boolean>` — true on actual deletion.
- `passageAttemptsDb.record(userId, passageId, { step_kind, user_input, ai_feedback, score? }) → Promise<PassageAttempt>`
  — wraps a `JSON.stringify(ai_feedback)` and returns the hydrated row. Wired in M4c.
- `passageAttemptsDb.getLatestByStep(userId, passageId, stepKind) → Promise<PassageAttempt | null>`
  — used by M4c to pre-populate Step 7 / 8 with the user's last try.
- `passageAttemptsDb.listByPassage(userId, passageId) → Promise<PassageAttempt[]>`
  — for any future "attempt history" view.
- 4 AI feature modules under `src/lib/passages/ai/` — each exports one async function
  matching the type signature declared in `@/lib/types`. Stubs return safe placeholders;
  M4b / M4c implementations should call `getAIProvider().generateText({ json: true, ... })`
  internally, parse, and throw on transient failure so the eventual route can return 502.
- `Passage` (extended hydrator) — `level_estimate` / `level_verdict` are narrowed from
  raw strings to `CefrLevel | null` / `LevelVerdict | null` by `hydratePassage`. Don't
  re-narrow at the call site.

## Gotchas

- **AI methods are feature modules, NOT on the `AIProvider` interface.** This is the
  opposite of M3c (which added `evaluateComposition` to the interface) and matches M3b
  (`sentence-eval.ts`). The interface still has only `generateText` + `evaluateComposition`.
  The inconsistency I flagged in [m3c-compose.md](m3c-compose.md) is now leaning toward
  the feature-module side — if you ever revisit, the cleanest move is to also pull
  `evaluateComposition` off the interface. Don't add more methods to it.
- **Sidebar icon is `Newspaper`, not the spec's `BookOpen`.** `BookOpen` is already used
  by `/study`. `BookOpenText` is used by `/compose`. `Newspaper` reads as
  "articles/passages" and is visually distinct from both.
- **All 3 M4 settings are required on `FlashcardSettings`,** not optional with `?`.
  Defaults come from `M4_SETTINGS` in `getFlashcardSettings`. Spec used `?` markers but
  that contradicts the existing M3 pattern.
- **`passage_tts_rate` is rounded to 1 decimal at the API layer.** A slider tick like
  `0.7000000000000001` becomes `0.7` before it touches the DB. The control reads back
  the round value, so the slider stays in sync.
- **Server recomputes `char_count` / `word_count` on every content update.** Wrapper
  enforced — calling sites cannot skip it or pass stale counts. If you ever want to
  preserve a manually-set count (no use case yet), bypass `update()` and write SQL
  directly.
- **`source_url` is best-effort normalised** ("example.com" → "https://example.com").
  No URL parser, no whitelist, no rejection. Renders as plain text on the row when
  malformed; user can edit. Don't trust this to be reachable.
- **`flashcards.source_passage_id` is `ON DELETE SET NULL`.** Cards saved from a deleted
  passage survive — their context is preserved in `source_context`, just the back-link
  to the source is dropped. UI consumers must tolerate null `source_passage_id` even
  when `source_context` is set.
- **`flashcards.create` / `update` do NOT yet pass `source_passage_id` / `source_context`.**
  The columns exist; the wrappers don't expose them yet. M4b will need to extend
  `flashcardsDb.create` (and possibly `update`) when "Save to Word Bank" lands in the
  reader. Cards added before that change will simply have NULLs.
- **`last_step_viewed` is debounced 500 ms.** Rapidly switching 1 → 2 → 3 sends only
  one PUT (the final value). If you add a step that's expensive to land in (e.g.
  triggers an AI call on mount), put the trigger inside the step component, not on the
  tab-change handler — by the time the PUT fires, the user has already left.
- **`VALID_STEPS` is `{1, 2, 3, 7, 8}`.** If `last_step_viewed` in the DB is anything
  else (e.g. from a future migration that adds and removes steps), the wizard silently
  falls back to step 1.
- **TTS preview uses `window.speechSynthesis`.** Works in modern browsers; silently
  no-ops in environments without it. The voice and pronunciation are browser-default —
  there's no Anthropic / Gemini call here.
- **`PassageForm` autofocuses the title by default**; `/passage/new` passes
  `contentFocus` so the paste lands directly in the textarea. Step 1 edit uses the
  default (title focus) so the user can rename without scrolling.
- **The wizard tab bar uses negative `marginBottom: -1`** to overlap the section
  border below — that's intentional, keeps the active underline flush with the
  divider. If you move the tabs into a card with no underline, drop the `-1`.

## Spec deviations recorded

1. **AI methods are feature modules in `src/lib/passages/ai/`**, not extensions to
   `AIProvider`. Per user choice. See first gotcha.
2. **Sidebar icon `Newspaper`, not `BookOpen`.** `BookOpen` was already taken by
   `/study`; spec didn't know.
3. **Sidebar colour `--v-teal`,** chosen because spec didn't specify; visually
   pairs with `/cloze` and `/stats`.
4. **`FlashcardSettings` M4 keys are required, not optional.** Matches the existing
   M3 pattern; defaults live in the wrapper.
5. **Inline `style={{}}` with CSS vars** for all new components, not Tailwind utility
   classes as in spec code samples (CLAUDE.md §4.6 + every existing page).
6. **Shared `PassageForm` component** for `/passage/new` and Step 1 edit. Spec showed
   them as separate inline forms; reusing avoids two diverging validators.
7. **Server-side `char_count` / `word_count` recompute** on content updates. Spec
   handed the responsibility to the wrapper signature without spelling it out — made
   it explicit.
8. **`StepPlaceholder` shared helper** for steps 2 / 3 / 7 / 8. Spec inlined each
   placeholder per file; sharing keeps each stub at ~12 lines.

## Future maintainers

- **Wiring M4b's Step 2 / Step 3.** Replace the body of the corresponding component
  file under `src/components/passage/`. The wizard shell already gates rendering on
  the active step and refreshes the passage via `onSaved` — pass `onSaved` down from
  the shell only if the step mutates the passage row (Step 2 sets `level_estimate` +
  `level_verdict` + `level_suggestion`, so it does; Step 3 doesn't yet, but will once
  Word Bank saving wants to surface a count).
- **Wiring M4c's Step 7 / Step 8.** These don't mutate the passage row — they record
  attempts via `passageAttemptsDb.record(userId, passageId, { step_kind, ... })`. Use
  `passageAttemptsDb.getLatestByStep` to pre-populate the textarea with the user's
  last try on mount.
- **Filling the AI stubs.** Each `src/lib/passages/ai/*.ts` file currently returns a
  placeholder. The concrete impl pattern:
  ```ts
  const ai = await getAIProvider();
  if (!ai.available) return <placeholder same as the stub>;
  const raw = await ai.generateText(buildPrompt(...), { json: true, ... });
  if (!raw) throw new Error('AI returned no text');
  return parseFeedback(raw);
  ```
  The route handler is responsible for the `ai.available` short-circuit → 503 and
  the catch → 502 pattern (see M3c's `/api/compose/evaluate` for the canonical shape).
- **Adding Word Bank saves.** Step 3 will need `flashcardsDb.create` (and maybe
  `update`) to accept `source_passage_id` and `source_context`. The columns exist in
  the DB — only the wrapper signatures need extending. Don't write to those columns
  via raw SQL; route everything through `flashcardsDb` so future migrations stay
  manageable.
- **Cost.** Step 2 (difficulty) is one Gemini call per passage and can be cached on
  the row (`level_estimate` + friends). Step 7 / 8 are one call per submission,
  rarely repeated. Step 3's word-define is one call per word looked up — if usage
  grows, cache by `(lemma, surrounding-bigram)` in a small D1 table. None of this
  matters for single-user dev.
- **Markdown / formatting in passages.** Content is stored as raw text. The reader
  renders `whitespace-pre-wrap` so newlines preserve, but Markdown is not parsed. If
  you ever support pasted Markdown, decide between (a) parsing on render and
  re-escaping for the AI prompts, or (b) stripping on intake. Don't half-implement
  one and not the other — the AI seeing raw asterisks while the user sees rendered
  bold is a debugging nightmare.
- **Deletion.** Hard delete via `passagesDb.deleteById`. `passage_attempts` cascades.
  `flashcards.source_passage_id` nulls out. No soft delete column — if you ever need
  undo, add `deleted_at TIMESTAMP NULL` in a new migration and update the wrappers.
  Don't modify migration `0006_passages.sql` — it's applied.
