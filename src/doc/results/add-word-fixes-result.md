# Result: add-word-fixes (2026-07-31)

## Scope

Fixes two add-word bugs (bulk add silently not saving; "optional" Vietnamese
meaning actually required), reworks the deck-detail toolbar (removes
"Cập nhật IPA" and the per-row blue download icon, promotes "Sửa N từ thiếu
info" to a toolbar button that sweeps the whole deck), and horizontally
centers the /study & /review session content.

## Files changed

- `src/components/add/bulk-import.tsx` — `handleSubmit` now threads the
  resolved `targetDeckId` through `runBatch` → `processOne` and sends it as
  `deck_id` (previously sent the raw `deckId` state, which is `null` when
  the picker shows "Mặc định"). `processOne` additionally requires
  `saved: true` in the response before marking a row done. `retryWord`
  passes `resolvedDeckId`.
- `src/app/api/cards/generate/route.ts` — the generate-only branch is gone:
  a missing/null `deck_id` now resolves via `flashcardDecksDb.ensureDefault`
  and the route always saves (bulk import is its only caller; the
  single-word UI uses `/api/cards/preview` + `POST /api/cards`). The 422
  "Không sinh được nghĩa tiếng Việt" guard was removed — a failed
  auto-translate saves `vietnamese = ''`.
- `src/components/add/single-import.tsx` — removed the client-side
  "Cần điền nghĩa tiếng Việt." block in `runSave`; empty meaning is sent
  as `''`.
- `src/app/api/cards/route.ts` — `vietnamese` validation now only rejects
  `> 500` chars; empty is allowed (column is `TEXT NOT NULL`, `''` is fine).
- `src/components/DeckDetailClient.tsx` — removed `RefreshIpaButton` usage
  and the now-unused `reloadCards()`. `brokenCards` became `fixTargets`
  (per-card `{ contentMissing, needsPron }`: content = image/meaning via
  regenerate; pronunciation = missing IPA or `audio_us_status !== 'ok'`,
  phrases IPA-only). `handleBulkRegen` runs both steps per card (regenerate
  then refresh-audio) with worker-pool 3. New toolbar button
  "Sửa N từ thiếu info" (disabled at N = 0, live "Đang sửa m/n" label); the
  orange strip is now progress-only (renders only while/just after a sweep).
- `src/components/deck-detail/WordRow.tsx` — removed the blue Download
  button, `handleFetchPronunciation`, its state, `needsPronunciation`, and
  the now-unused `onCardUpdated` prop. Speaker button, missing-fields
  badge, audio-failed badge, and lookup pills unchanged.
- `src/components/deck-detail/RefreshIpaButton.tsx` — **deleted** (feature
  removed).
- `src/app/api/cards/refresh-ipa/route.ts` — **deleted** (only caller was
  the removed button).
- `src/components/flashcard-session/FlashcardSession.tsx` — session root
  div gets `maxWidth: 960, margin: '0 auto'` (matches the TypingStage
  bubble's `min(960px, 95vw)`). SummaryScreen already self-centers (640px).

## Key decisions

- `/api/cards/generate` contract changed to always-save because a repo-wide
  grep confirmed `bulk-import.tsx` is the only caller; the old generate-only
  branch was a legacy path from before `/api/cards/preview` existed.
- Empty `vietnamese` is stored as `''` (not NULL) to avoid a migration; the
  existing `getMissingFields` already flags blank meanings, so such cards
  surface with the orange "Thiếu: nghĩa" badge and are fixable via the new
  toolbar sweep (regenerate route translates EN→VI).
- The sweep excludes `ipa` from the regenerate call — IPA + mp3 both come
  from the Oxford `refresh-audio` route (per user: "phần mp3 và IPA xài
  function của Cập nhật phát âm").
- A card counts as "fixed" if either step reported success, "failed" if
  neither did (mirrors the old fixed/failed semantics).

## Deviations from prompt

- None functionally. Note: `refresh-audio` overwrites IPA with the Oxford
  value when one is parsed, so a hand-edited IPA on a card with failed audio
  gets overwritten by the sweep — identical to the existing "Cập nhật phát
  âm" behavior, accepted in planning.

## Verification

- `npx tsc --noEmit` clean.
- NOT tested end-to-end: dev server was not run (CLAUDE.md §10 forbids
  auto-running it). Bulk add → deck persistence, empty-meaning save, the
  toolbar sweep, and the study-page centering all need a manual smoke test.

## Follow-ups / known issues

- `src/doc/results/bulk-word-import.md` still documents the old
  "deck_id absent → returns GeneratedCardData" behavior (now stale).
- `generateCardData` returns the raw input as `english`, not the lemma,
  despite comments claiming otherwise ("boxes" saves as "boxes" with
  "box"'s IPA/audio) — pre-existing, out of scope.
- The "XEM BỘ TỪ" button on the bulk completion screen stays hidden when
  the user had no decks at submit time (`resolvedDeckId` null) even though
  the server now saves into a freshly created default deck.
