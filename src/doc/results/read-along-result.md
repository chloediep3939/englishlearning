# Read-Along · Karaoke TTS — Result

> Implemented 2026-06-02. Prompts: `src/doc/prompts/read-along.md`,
> `read-along-ba-flow.md`. Feature doc: `src/doc/read-along.md`.

## Update 2026-06-02 (b) — word lookup overhaul

Post-build iterations (supersede parts of the sections below):
- **Dual-UI bug fix:** mobile block had inline `display:flex` overriding `md:hidden` → both layouts rendered. Moved flex to an inner wrapper.
- **Reading typography:** EN serif 27→24 (desktop) / 17→16 (mobile); parallel VN line now serif-ish *italic* + `--v-blue`, fixed size (15/13). Parallel toggle moved above the word card.
- **Grammar button** (`GrammarSection`) temporarily removed from `/read/[id]` (import + render commented; re-enable note left in the page).
- **Deck picker:** `SavedWordsTray` now has a `<select>` of the user's decks; chosen deck persists to `reading_deck_id`. Page passes `decks` + `initialDeckId`.
- **Word lookup pipeline rewritten** (migration `0015_word_glossary_audio.sql` adds `word_glossary.audio_src`; new dep `wink-lemmatizer`):
  1. Oxford Learner's Dictionaries first (`fetchOxfordPronunciationMeta`, page-only, no mp3 download) → US IPA + mp3 URL.
  2. On miss, `lemmaCandidates()` (wink verb/noun/adjective, ≤3) → retry Oxford. Replaced the regex `deinflectCandidates`.
  3. VN meaning + POS still from MS Dictionary on the resolved headword.
  - `reading-ipa.ts` (Gemini IPA) **deleted** — IPA now comes from Oxford.
  - New `GET /api/words/audio/[word]`: serves the Oxford mp3 from R2 if cached, else proxies `audio_src` (https + Oxford-host guarded) and best-effort caches to R2. Works under `npm run dev` (R2 absent → proxy).
  - `WordDetailCard` 🔊 now calls `speakWord(word, { audioUrl })` (real Oxford clip, TTS fallback); `GlossaryEntry` gained `audioUrl`; `WordGlossaryRow` gained `audio_src`.
  - Legacy cache self-heal: rows with `ipa IS NULL AND source='ms'` re-attempt Oxford once, then re-tag (`oxford+ms`/`oxford`/`ms+nox`/`miss`) so they never re-scrape.
- **Verification:** `tsc --noEmit` clean; migration applied `--local`; wink verified (`went→go`, `mice→mouse`, `children→child`). NOT runtime-tested: Oxford scrape on tap, the audio proxy/R2 cache, legacy self-heal — needs a browser pass.
- ⚠️ Feature doc `src/doc/read-along.md` still describes the old Gemini-IPA lookup in places (now stale); not yet rewritten.

## Scope

A karaoke-style passage reader at `/read/[id]`: TTS reads the passage aloud with
per-word highlight, tap a word for meaning/IPA/POS + save-to-deck, and an
optional parallel Vietnamese line per sentence via Microsoft Translator. Becomes
the primary reader (replaces the old `KaraokeReader`; `/passage/[id]` redirects).

## Files changed

**Created — logic (`src/lib/reading/`)**
- `tokenizer.ts` — `cleanWord` / `tokenize` / `splitPassage` / `contentWords`.
- `constants.ts` — `RA_SPEEDS`, `STOP_WORDS`, `BUN_BLUE`, keys, `estimateSeconds`.
- `db.ts` — `passageTranslationsDb` (cache-through) + `wordGlossaryDb` (global cache).
- `ai/ms-translator.ts` — Azure Translator wrapper (`getMsCredentials`, `translateSentences`, `dictionaryLookup`); timeout + 1 retry; chunks ≤100.
- `ai/reading-ipa.ts` — Gemini IPA, best-effort (null on any failure).
- `use-karaoke.ts` — TTS engine hook, faithful port of the design prototype.
- `use-reduced-motion.ts` — `prefers-reduced-motion` hook.

**Created — UI (`src/components/reading/`)**
- `ReadAlong.tsx` — loader (fetches translations + glossary, empty/unsupported states) + responsive desktop/mobile orchestrator sharing one engine.
- `ReadingPassage.tsx` — word spans, inline + parallel render modes.
- `WordDetailCard.tsx` — word/POS/IPA/meaning, on-demand lookup, save w/ states.
- `SpeedSelector.tsx`, `ReadingToggle.tsx`, `TransportControls.tsx`, `SavedWordsTray.tsx`.

**Created — API**
- `src/app/api/passages/[id]/translations/route.ts` (GET, cache-through).
- `src/app/api/words/glossary/route.ts` (POST, cache read + missing list).
- `src/app/api/words/lookup/route.ts` (POST, MS Dictionary + Gemini IPA + cache).

**Created — page / migration / docs**
- `src/app/read/[id]/page.tsx` — server page; resolves deck; renders `<ReadAlong>` + `<GrammarSection>`.
- `migrations/0013_read_along.sql` — `passage_translations` + `word_glossary` (applied `--local`).
- `src/doc/read-along.md`, prompt docs.

**Modified**
- `src/lib/types.ts` — `FlashcardSettings` += `reading_speed`/`reading_auto_continue`/`reading_deck_id`; new `GlossaryEntry`, `TranslatedSentence`, `PassageTranslationRow`, `WordGlossaryRow`.
- `src/lib/db.ts` — settings keys + get/update for the 3 reading keys; `flashcardsDb.findByEnglishInDeck` (dedup).
- `src/app/api/settings/route.ts` — PUT validation for the 3 reading keys.
- `src/app/api/cards/from-passage/route.ts` — optional `prefilled {vi,pos,ipa}` (skips the generate pipeline) + in-deck dedup (returns existing, 200).
- `src/app/passage/[id]/page.tsx` — replaced with a redirect to `/read/[id]`.
- `src/components/PassageLibraryRow.tsx` — link → `/read/[id]`.

## Key decisions

- **Save endpoint = `/api/cards/from-passage`, not `/api/cards/generate`** (user was unsure; chose reuse-first). It already records `source_passage_id`/`source_context` + verifies ownership. Added `prefilled` to skip redundant dictionary/Datamuse/Pexels/lemmatize-AI calls, and in-deck dedup.
- **`word_glossary` is global** (no `user_id`) — generic dictionary data, mirrors `flashcard_cloze_pool`. Ownership enforced at the passage layer.
- **Graceful MS degradation** — no key ⇒ EN-only + hidden parallel toggle + Gemini-IPA-only lookups; the reader and TTS work fully without Azure.
- **Deck auto-resolution server-side** — last-used (`reading_deck_id`) → first deck → auto-create "Từ vựng đọc bài"; persisted as last-used. No picker UI this cut.
- **One engine, two layouts** — desktop (`hidden md:block`) and mobile (`md:hidden`) render shared components against one `useKaraoke` instance.

## Deviations from prompt

- **Save target** changed from `/api/cards/generate` to `/api/cards/from-passage` (see above; user-approved direction).
- **UI components live in `src/components/reading/`**, not `src/lib/reading/components/` as the prompt's file map specified — matches the repo's lib (logic) vs components (JSX) split and keeps the server/client boundary clean. Pure logic + the hook stay in `src/lib/reading/` per the prompt.
- **`parallel-toggle.tsx` + `auto-continue-toggle.tsx` merged** into one `ReadingToggle` (reuse-first, CLAUDE §2) — used twice with different accent/labels.
- **`reading_sessions` table + session lifecycle deferred** (user choice). "Ôn ngay →" links to `/study?deck_id=X` instead of a saved-words filter.
- **No Sidebar nav entry** — the reader is per-passage (reached from the library), so a top-level nav item has no single target.
- `reading-ipa.ts` uses `max_tokens` (the real `AIGenerateOptions` field), not the prompt's illustrative `maxTokens`.

## Verification

- `npx tsc --noEmit` — **clean** (0 errors).
- Migration 0013 applied to the local D1 (`wrangler d1 migrations apply --local`, 4 commands OK).
- **Not tested:** no runtime/browser exercise — TTS karaoke highlight, MS Translator calls (no key in this session), the save round-trip, and the `/passage/[id]`→`/read/[id]` redirect were not run. `npm run dev/build` not executed (gated by CLAUDE §10.11).
- ⚠️ MS Translator request/response shapes are coded to the documented Azure v3.0 contract but unverified against a live endpoint.
- ⚠️ Web Speech `onboundary` word-mapping is ported faithfully from the design but browser-dependent (Safari may emit sentence-level only → degrades to sentence tint).

## Follow-ups / known issues

- **Required to enable translation/meaning:** add `MS_TRANSLATOR_KEY` + `MS_TRANSLATOR_REGION` to `.dev.vars` (local) and via `wrangler secret put` (prod). Until then the feature runs EN-only + Gemini-IPA.
- Deck **picker** UI (E5.5) deferred — deck is fixed per resolution.
- Both layouts render the passage DOM (one hidden) — fine for normal passages, slightly wasteful for very long ones.
- `KaraokeReader.tsx` + the old client `/passage/[id]` reader are now orphaned (kept per repo convention; PROJECT_OVERVIEW should be updated to note the reader is `/read/[id]`).
- Regex sentence splitting mis-handles abbreviations — acceptable per prompt, upgradeable to an NLP segmenter.
- `reading-ipa` IPA is generated even when MS dictionary missed (proper nouns) — harmless but spends a Gemini call; could gate on a dictionary hit later.
