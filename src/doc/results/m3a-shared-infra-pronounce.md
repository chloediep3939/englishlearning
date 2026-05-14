# M3a — Shared infra + F1 Luyện đọc

Phase 1 of 3 for the M3 practice modes. Lays down the cross-cutting plumbing
(migration, types, settings, sidebar) and ships F1 — pronunciation practice
via the Web Speech API.

Status: **11 of 11 files done.** `tsc --noEmit` clean. Migration applied
locally. No browser smoke test was run — F1 needs `npm run dev` to actually
exercise the mic capture path.

## Purpose

- Add the `compositions` table now (consumed by F3 in M3c) so M3c stays a thin
  layer.
- Extend `FlashcardSettings` with four new keys (`daily_new_word_target`,
  `f1_max_attempts`, `f2_timer_seconds`, `f3_max_words_per_composition`) and
  surface them in the Settings UI.
- Add a sidebar entry for `/pronounce` only — `/sentence` (M3b) and
  `/compose` (M3c) are deliberately omitted to avoid dead links during the
  intermediate phases.
- Ship F1 Luyện đọc end-to-end: setup, ASR-driven session, help panel, summary.

## File map

| Path | Role |
| --- | --- |
| `migrations/0005_m3.sql` | New table `compositions` + index. **Numbered 0005** because `0004_flashcards_multiuser.sql` already exists; the original spec said 0004. |
| `src/lib/types.ts` | Extended `FlashcardSettings` with 4 keys. Added `PronunciationAttemptMeta`, `SentenceAttemptMeta`/`SentenceEvaluation` (M3b placeholder), `Composition`/`CompositionRow`/`CompositionAiFeedback`/`CompositionSource` (M3c placeholder), `M3_SETTINGS` const. |
| `src/types/speech-recognition.d.ts` | Web Speech API ambient declarations. Adds `SpeechRecognition`, `SpeechRecognitionEvent`, `SpeechRecognitionErrorEvent`, and augments `Window` with `SpeechRecognition`/`webkitSpeechRecognition`. Picked up via tsconfig `include: ["**/*.ts"]`. |
| `src/lib/compositions/db.ts` | New module — `compositionsDb.create/getById/listByUser/deleteById`. **No consumers in M3a.** Hydrates JSON columns and normalizes `passed` to boolean. |
| `src/lib/db.ts` | Added `flashcardsDb.getReviewedSince(userId, sinceIso, opts)` (opaque-cutoff filter, excludes mastered). Added `flashcardsDb.getAll(userId, limit)` to back the relaxed `/api/cards` endpoint. Extended `SETTINGS_KEYS`, `getFlashcardSettings`, `updateFlashcardSettings` with the 4 M3 keys. |
| `src/app/api/settings/route.ts` | PUT validator extended with range checks for the 4 new keys. `f1_max_attempts` allows 0 (= unlimited). |
| `src/app/settings/page.tsx` | New section **"Luyện tập"** with 4 controls (Target / Mic / Timer / BookOpenText icons). Added a generic `SliderWithIcon` and a specialised `MaxAttemptsControl` with "Không giới hạn" checkbox. |
| `src/components/Sidebar.tsx` | One new nav entry: `Mic` icon, label "Luyện đọc", route `/pronounce`, color `--v-red`. |
| `src/app/api/cards/route.ts` | Relaxed the 400 in the no-filter branch — bare `?limit=N` now returns the user's most recent N cards across all decks. |
| `src/lib/pronounce/match.ts` | `normalize`, `levenshtein`, `isMatch(transcripts, target)`. Per-word fuzzy with tolerance 1 (≤5 chars) or 2 (>5 chars). Multi-word targets check all-words-present, order-independent. |
| `src/app/pronounce/page.tsx` | Client setup container — reads `f1_max_attempts` from `/api/settings`, hands off to `<PronounceSession>` once cards are loaded. Uses `QuizSetup` with a single-mode array. |
| `src/components/PronounceSession.tsx` | F1 session — state machine, ASR plumbing, help panel, summary, unsupported / permission-denied banners. |

## Data flow

```
/pronounce  -> 'use client'
              ├── GET /api/settings                 (read f1_max_attempts)
              ├── GET /api/cards?limit=N[&deck_id]  (load cards for session)
              └── <PronounceSession>
                    ├── window.SpeechRecognition    (mic capture, ASR)
                    └── POST /api/cards/:id/test-attempt   (fire-and-forget per card)

/settings (existing)
  GET  /api/settings          -> FlashcardSettings (typed, now 10 fields)
  PUT  /api/settings          -> persists any subset of fields

compositionsDb (no consumers in M3a — wired for M3c)
```

## Public API surface

Internal contracts worth knowing:

- **`FlashcardSettings`** now has 4 extra fields. `f1_max_attempts === 0` means
  "unlimited" — preserve this explicitly. Code that reads the setting must
  fall back to `M3_SETTINGS.<key>.default` for new users, but the wrapper
  already does that.
- **`M3_SETTINGS`** is the single source of truth for slider min/max/step/default
  for the four M3 settings. Import from `@/lib/types`.
- **`isMatch(transcripts, target)`** — returns true if any ASR alternative
  contains all target words (fuzzy, order-independent). Used by F1 only, but
  generic enough to reuse in M3b speech-driven sentence checks if we want.
- **`compositionsDb.create({source: 'today' | 'deck', source_deck_id, pool_word_ids, content, ai_feedback, word_usage, coherence_score, passed})`** —
  JSON columns are stringified inside the wrapper. Consumers don't call
  `JSON.stringify` themselves.
- **`PronunciationAttemptMeta`** is the shape we send as `metadata` to
  `POST /api/cards/:id/test-attempt` when `mode === 'pronunciation'`. Stored
  as JSON in `flashcard_test_attempts.metadata`.
- **`/api/cards?limit=N`** (no other filter) is **new**. Returns most recent
  N cards across all decks for the current user. Existing callers that pass
  `deck_id` / `q` / `due` / `new` are unchanged.

## Spec deviations recorded

1. **Migration numbered `0005_m3.sql`** instead of the spec's `0004_m3.sql`
   because `0004_flashcards_multiuser.sql` already exists. Numbering is global.
2. **Settings model is typed, not raw KV.** Spec assumed F1 would read
   settings as `{ settings: Record<string, string> }` (raw key-value).
   Existing `/api/settings` returns typed `FlashcardSettings`. We extended
   `FlashcardSettings` and the wrapper rather than introducing a parallel KV
   endpoint. F1 reads `s.f1_max_attempts` directly.
3. **`/api/cards` relaxed instead of building `/api/pronounce-cards`.**
   Spec's example code (`fetch('/api/cards?limit=N')`) wouldn't have worked
   against the existing handler, which 400'd without a specific filter. We
   added a final fallback branch instead of building a parallel endpoint.
4. **M3 settings keys use bare names**, no `flashcard_` prefix (e.g.
   `f1_max_attempts`, not `flashcard_f1_max_attempts`). Spec didn't dictate,
   and bare names better fit the cross-mode (non-flashcard) intent. The legacy
   keys remain prefixed; we accepted the inconsistency.
5. **`MaxAttemptsControl` writes on uncheck.** When the user toggles
   "Không giới hạn" off, we immediately commit the current slider value
   (defaults to `M3_SETTINGS.f1_max_attempts.default` = 3 if the previous
   saved value was 0). Spec said "only write to backend when user explicitly
   drags" — strict reading would leave persisted state at 0 while UI shows
   slider at 3, which is confusing.
6. **`compositionsDb.create` uses `compositionsDb.getById(...)`**, not
   `this.getById(...)`. TS would type `this` as `unknown` on a const object
   literal. Functionally identical.
7. **Mic pulse keyframes inline** via `<style jsx global>` in
   `PronounceSession.tsx`. Could be moved to `globals.css` next to the
   `v-ngoc-bob` keyframes, but the animation is single-use.

## Gotchas

- **Web Speech API event handlers are mounted once.** `PronounceSession`
  registers `onresult` / `onerror` / `onend` in a `useEffect(…, [])`, so the
  closures capture the first-render values. We mirror the moving state
  (`attempts`, `idx`, `helpedThisCard`, `cards`, `maxAttempts`) behind refs
  that are updated in their own effects. If you tweak this component, keep
  that pattern — re-registering handlers on every render is the alternative
  and it churns the underlying recogniser.
- **Strict Mode double-mount.** In React 18+ dev, `useEffect(…, [])` runs
  twice — we create a recogniser, abort it, then create another. Production
  is unaffected. If you see "double mic prompt" in dev, that's the cause.
- **`no-speech` error does NOT count as a failed attempt.** It's silence,
  not a wrong answer. Same for generic errors — the user can retry without
  losing an attempt. Only successful ASR results that fail `isMatch` count.
- **F1 currently uses `flashcardsDb.getAll`** (recent-first across all decks).
  Switching to "due cards only" or "weakest cards" later is a one-line API
  swap — keep the page-level URL builder generic.
- **`f1_max_attempts: 0 = unlimited`** is a "magic number" that the slider
  UI and the session code both honor. `MaxAttemptsControl` handles toggling
  between 0 and 1-10 via a checkbox; `PronounceSession` treats `maxAttempts > 0`
  as the enforce-limit signal (`maxAttempts <= 0` means never auto-fail).
- **`f1_max_attempts` defaults are split between two places.** The wrapper
  in `db.ts` falls back to 3 for new users (since `Number(undefined) || 3 = 3`
  but `Number('0') || 3 = 3` would corrupt the unlimited setting — we
  explicitly check `raw === undefined`). The UI also defaults to 3 if the
  raw setting is missing. Stays in sync as long as both reference `M3_SETTINGS`.
- **`compositions.source_deck_id` is `ON DELETE SET NULL`**, not CASCADE.
  Deleting a deck preserves the composition's history but breaks the foreign
  key link. Intentional — compositions are user-owned, not deck-owned.
- **`getReviewedSince`'s `sinceIso` is opaque to the server.** Caller is
  responsible for computing local-midnight on the client side and stringifying.
  Don't try to parse it into a `Date` server-side.
- **`/api/cards?limit=N` bare** is now a wide-open query (no deck, no status
  filter, just "last N by `created_at`"). Capped at 500 by the existing
  `Math.max(1, Math.min(500, …))` in the handler.

## Open items

- **No browser smoke test.** F1's ASR path, help panel, settings round-trip,
  and `test-attempt` POST were not exercised in a real browser. Tasks for
  manual QA before declaring M3a complete:
  1. Chrome: start session, speak word → got transcript → pass/fail evaluated.
  2. Help button reveals IPA + TTS audio + Vietnamese + image.
  3. `f1_max_attempts` setting respected (set to 1 → first wrong → immediate fail).
  4. "Không giới hạn" checkbox (value 0) → no auto-fail.
  5. Firefox: shows unsupported banner instead of crashing.
  6. Mic permission denied: friendly banner with "Thử lại" + "Quay lại".
  7. Silence ("no-speech") does NOT count as a failed attempt.
  8. `flashcard_test_attempts` rows created (check via wrangler d1).
- **`/sentence` and `/compose` sidebar entries** still missing — by design,
  to be added in M3b / M3c.
- **No F1 composition documentation in `src/doc/`** beyond this file. M3b and
  M3c will get their own.

## Future maintainers

- **Adding a new M3 setting:** four touch points — extend `FlashcardSettings`
  (types.ts), add to `SETTINGS_KEYS` array (db.ts), add read + write paths in
  `userSettingsDb` (db.ts), add validator in `/api/settings/route.ts`, and
  add a control in `settings/page.tsx`. Consider whether the bare-name vs
  `flashcard_` prefix convention applies.
- **The `compositions` table is wired but unused** — `compositionsDb` is
  fully implemented and tested via tsc, but no route handler or page calls
  it yet. M3c is expected to add `POST /api/compositions` and `GET
  /api/compositions/:id`, and a `/compose` page.
- **`PronounceSession` is the most complex component here.** If you touch it,
  run through: ready → listening → pass (fast advance), and ready → listening
  → fail → retry → pass (limit enforcement), and verify `helped` flag toggles
  exactly when the help panel was opened during a card.
- **The mic pulse keyframe** is component-local. If we add more pulse-style
  animations (M3b for the timer, maybe), promote `v-mic-pulse` to
  `globals.css` and remove the `<style jsx global>` block.
- **Cross-mode setting reuse:** `daily_new_word_target` (formerly only F-mode)
  is now in `FlashcardSettings` because that's our typed settings shape, but
  it's not flashcard-specific. If we ever rename `FlashcardSettings` →
  `UserSettings`, do it via a typedef alias first — every Server Component
  reads `settings.foo` and won't notice the rename.
