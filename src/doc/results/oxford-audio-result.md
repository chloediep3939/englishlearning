# oxford-audio — result

Date: 2026-05-28
Prompt: `src/doc/prompts/oxford-audio.md`

## Scope

Each card now fetches its US pronunciation from Oxford Learner's Dictionaries:
the US mp3 is stored in Cloudflare R2 (binding `AUDIO_BUCKET`) and the US IPA
overwrites the card's `ipa`. The read-aloud button plays the stored mp3 when
available, otherwise falls back to browser TTS (with a small warning when an
Oxford fetch failed). A per-deck "Cập nhật phát âm" button re-fetches audio for
every card, 5 in parallel.

## Files changed

- `wrangler.jsonc` — added `r2_buckets` block (binding `AUDIO_BUCKET`, bucket `english-learning-audio`).
- `src/lib/auth.ts` — added `AUDIO_BUCKET?: R2Bucket` to the global `CloudflareEnv` interface (+ `R2Bucket` import).
- `migrations/0012_oxford_audio.sql` — **new**. `ALTER TABLE flashcards ADD COLUMN audio_us_key TEXT` and `audio_us_status TEXT`.
- `src/lib/types.ts` — added `audio_us_key: string | null` and `audio_us_status: 'ok' | 'failed' | null` to the `Flashcard` interface.
- `src/lib/db.ts` — added `getAudioBucket()` helper; added the two new columns to the `flashcardsDb.create` INSERT list + bind (D1 trap); added them to the `flashcardsDb.update` allowlist `map`.
- `src/lib/oxford/pronunciation.ts` — **new**. `fetchOxfordPronunciation(url)` + pure, testable `parseOxfordUsPronunciation(html)`. Regex over the first `.webtop` block, preferring the American container; 6s shared AbortController; never throws.
- `src/lib/oxford/persist.ts` — **new**. `fetchAndStoreOxfordAudio(userId, cardId, word)` — builds the Oxford URL via `lookupUrl('Oxford', word)`, fetches, puts the mp3 in R2, overwrites IPA, sets status. Never throws. Exports `audioKey(cardId)`.
- `src/app/api/audio/[cardId]/route.ts` — **new**. `GET` serves the stored mp3 from R2, ownership-scoped, `audio/mpeg` + `immutable` cache. Accepts (ignores) `?v=` for cache-busting.
- `src/app/api/cards/route.ts` — single-word save (`POST`) now awaits `fetchAndStoreOxfordAudio` before returning the card.
- `src/app/api/cards/generate/route.ts` — bulk save branch (deck_id present) now awaits `fetchAndStoreOxfordAudio` before re-reading the card.
- `src/app/api/cards/[id]/refresh-audio/route.ts` — **new**. `POST` re-fetches one card's audio (always overwrites); returns `{ ok, ipa, failed, word, card }`.
- `src/components/AudioButton.tsx` — reworked: plays `/api/audio/{cardId}?v={updated_at}` when `audioStatus==='ok'`, else TTS; shows an orange warning badge when `audioStatus==='failed'`. New optional props `cardId`, `audioStatus`, `audioVersion`. Removed the old TEMP audio_url short-circuit; `audioUrl` prop retained (deprecated, ignored) for call-site compatibility.
- `src/components/deck-detail/WordRow.tsx`, `src/components/WordCard.tsx`, `src/components/flashcard-session/RevealStage.tsx`, `src/components/deck-detail/CardDetailModal.tsx` — pass `cardId` / `audioStatus` / `audioVersion` to `AudioButton`.
- `src/components/deck-detail/RefreshAudioButton.tsx` — **new**. Self-contained per-deck "Cập nhật phát âm": button + 5-parallel worker pool + progress strip + failed-word summary.
- `src/components/DeckDetailClient.tsx` — renders `<RefreshAudioButton>` in the hero card; added `handleCardUpdated` to swap refreshed cards into state.

## Key decisions

1. **Regex parser, not HTMLRewriter.** The prompt preferred HTMLRewriter but explicitly permitted a regex scoped to the American block. For pure extraction (no rewriting), HTMLRewriter's per-chunk text buffering is error-prone. The regex targets the first `.webtop` block, prefers `phons_n_am` for IPA and a `us_pron`/`__us_` mp3 URL, with positional-2nd as fallback. Verified against the live `purchase` page: `ipaUs = /ˈpɜːrtʃəs/`, mp3 = `.../us_pron/.../purchase__us_1.mp3`.
2. **Shared persist helper.** Both save paths and the refresh route call `fetchAndStoreOxfordAudio` so the fetch/R2/DB logic lives in one place.
3. **Inline (awaited) on save.** Per the prompt, the fetch is awaited before the response so the returned card already carries the US IPA / audio. Bulk import is ~1–3s/card slower (accepted in the prompt).
4. **`AudioButton` centralizes the play logic.** It's the single shared component, so the Oxford-mp3-first behavior flows to every consumer that passes the new props.
5. **Audio cache-bust = `card.updated_at`.** `fetchAndStoreOxfordAudio` → `flashcardsDb.update` bumps `updated_at`, which the button appends as `?v=`.
6. **`getAudioBucket()` throwing is treated as a best-effort miss** — under plain `next dev` the R2 binding is absent; the persist helper catches it and records `failed`, never breaking card creation.

## Deviations from prompt

- **Also wired `/api/cards` POST (single-word "Một từ" save).** The prompt named only `/api/cards/generate`, but that route's save branch only runs for bulk import (deck_id present). The single-word add saves via `/api/cards`, so it had to be wired too to satisfy the "New card via /add (Một từ) → IPA shows US value" acceptance test.
- **Refresh route returns the full `card`** in addition to the prompt's `{ ok, ipa, failed, word }`, so the client can swap fresh state in (and bust the cache via the new `updated_at`).
- **Parser uses regex** rather than HTMLRewriter (permitted fallback) — see Key decision #1.
- **Did NOT wire `/api/cards/from-passage` or `/api/decks/import`.** These are other card-creation paths the prompt didn't list. Cards created there get `audio_us_status = null` (TTS, no warning) and can be backfilled via the per-deck "Cập nhật phát âm" button. Left out to avoid slowing passage-save / deck-import.
- **`AudioButton` props threaded into 4 surfaces** (WordRow, WordCard, RevealStage, CardDetailModal) — the ones rendering a full `Flashcard`. `ClozeSession`, `SpeedQuizSession`, `single-import` preview, and the dictionary page still use TTS (they don't carry a saved card with `audio_us_status` / `updated_at`).

## Verification

- ✅ `npx tsc --noEmit` — clean (exit 0).
- ✅ `npx wrangler d1 migrations apply english-learning-db --local` — applied; confirmed `audio_us_key` / `audio_us_status` columns exist on `flashcards`.
- ✅ Parser logic verified against the **real** Oxford `purchase` page (fetched locally): correct US IPA + US mp3 URL.
- ⚠️ **NOT run end-to-end in the Workers runtime.** Per CLAUDE.md §10.11 I did not run `npm run preview` / `npm run deploy`. The R2 binding only exists under the Workers runtime, so the serving route, R2 put, and audio playback were not exercised live.
- ⚠️ **Worker-egress block untested (gotcha #1).** Oxford responds 200 to a browser-UA fetch from a normal machine, but whether Cloudflare Worker egress is blocked can only be confirmed via `npm run preview` / `wrangler dev`. If Oxford blocks the Worker, every fetch records `failed` and the UA/approach must change.
- ⚠️ **R2 bucket not created.** `npx wrangler r2 bucket create english-learning-audio` creates remote account infra (CLAUDE.md §10) — left for the user to run before deploy. Local `npm run preview` uses a local R2 simulation and does not need the remote bucket.

## Follow-ups / known issues

- **Run before deploy:** `npx wrangler r2 bucket create english-learning-audio` (and the same with `--remote`-equivalent for prod migration: `npx wrangler d1 migrations apply english-learning-db`).
- **Smoke test (you):** `npm run preview`, add a single word (e.g. `purchase`), confirm the read button plays the Oxford clip and the IPA shows the US value; try a word with no US mp3 to see the `failed` warning; run the deck "Cập nhật phát âm" sweep.
- **Other create paths** (`from-passage`, `decks/import`) don't auto-fetch Oxford audio — use the deck button to backfill, or wire them later.
- **ClozeSession / SpeedQuiz / dictionary** read-aloud still TTS-only (no saved-card audio status plumbed). Could be extended if desired.
- **`audioUrl` prop on `AudioButton`** is now deprecated/ignored; call sites still pass it in a few non-card spots. A later cleanup could drop it everywhere.
