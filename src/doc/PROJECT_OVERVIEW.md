# PROJECT_OVERVIEW

> A condensed map of the codebase as of **2026-05-18**. Read this first if you
> are a new AI session or a new developer. Authoritative rules live in
> `CLAUDE.md`; this file describes **what exists today**.

---

## 1. What this is

A Vietnamese-facing English learning web app. Core flow: learner adds English
words → cards are auto-enriched (IPA, audio, examples, image, collocations) →
the SM-2 spaced-repetition engine schedules study / review sessions → multiple
quiz modes (typing, speed, cloze, pronunciation, sentence, composition) +
passage reading with karaoke TTS and on-demand grammar analysis. Marketing
name is **Bún**, mascot is also Bún (file prefix `bun-*` on the landing, with
legacy `ngoc-*` poses used in-app). Deployed on Cloudflare Workers.

---

## 2. Stack

| Layer        | Choice                                                            | Version    |
| ------------ | ----------------------------------------------------------------- | ---------- |
| Framework    | Next.js (App Router only)                                         | **16.2.6** |
| Adapter      | `@opennextjs/cloudflare` (Cloudflare Workers runtime)             | ^1.19.9    |
| React        | React + ReactDOM                                                  | 19.2.4     |
| Language     | TypeScript strict                                                 | ^5         |
| Styling      | Tailwind v4 via `@tailwindcss/postcss` + `--v-*` CSS variables    | ^4         |
| Database     | Cloudflare D1 (SQLite). Local DB in `.wrangler/state/v3/d1/`      | latest     |
| Auth         | Google OAuth + demo accounts → HMAC-signed cookie                 | custom     |
| AI provider  | Gemini (`gemini-2.5-flash`) via `getAIProvider()`                 | —          |
| Icons        | `lucide-react`                                                    | ^1.14.0    |
| Fonts        | Nunito (head + body), JetBrains Mono (IPA), Lora (landing serif)  | Google     |
| Wrangler     | `wrangler` (dev/deploy CLI)                                       | ^4.90.1    |

**No test framework. No Prettier.** `eslint` + `eslint-config-next` are
installed and `npm run lint` exists, but the project's working convention per
`CLAUDE.md` is "no ESLint" — treat lint as advisory, not enforced.

Production URL: `https://english-learning.dth290490.workers.dev`
(see `src/doc/results/deploy.md`).

---

## 3. Architecture

### Routing — Next.js 16 App Router

- App Router only (no `pages/`). All pages under `src/app/<segment>/page.tsx`.
- Dynamic params and `cookies()`/`headers()` are **async** in Next 16. Always
  `await` them.
- Route handlers are **uncached by default** in Next 16. Pages reading mutable
  DB state set `export const dynamic = 'force-dynamic'`; auth-touching routes
  also set `export const runtime = 'nodejs'`.
- `src/middleware.ts` still uses the deprecated `middleware` convention (Next
  16.2 prefers `proxy.ts`). Build emits a warning; not renamed by choice.

### Auth flow

- **Google OAuth**: `/api/auth/google` initiates, `/api/auth/callback/google`
  exchanges code → upserts a row in `users` → mints cookie. Whitelist via
  `ALLOWED_EMAILS` env var. See `src/lib/auth.ts` for HMAC + allowlist.
- **Demo accounts**: `POST /api/auth/demo` (public) mints a synthetic
  `demo-…@bun.local` user, seeds 3 decks × 4 cards + 2 passages via
  `seedDemoUser()` (`src/lib/demo/seed-user.ts`), sets cookie, redirects to
  `/dashboard`. 24-hour `demo_expires_at`. A banner sits above `<main>` when
  `user.is_demo`.
- **Cookie**: `auth=<user_id>.<ts_ms>.<hex_hmac>`, 30-day expiry, HMAC-SHA-256
  using `AUTH_SECRET`. Verified by `verifyAuthToken(token, secret)` —
  pure crypto, no DB hit.
- `src/middleware.ts` gates non-public paths. Public: `/`, `/login`,
  `/api/auth/google`, `/api/auth/callback/*`, `/api/auth/logout`,
  `/api/auth/demo`, `/_next/*`, `/mascot/*`, `/favicon.ico`.
- Inside route handlers / server components, use
  `await requireUserId()` (throws `UnauthorizedError`) or
  `await getCurrentUserId()` (returns `null`). Never trust `user_id` from a
  request body.

### Data flow

- **Server components** read DB directly via `…Db.*` wrappers in
  `src/lib/db.ts`. Do not `fetch('/api/…')` from a server component.
- **Client components** mutate via `fetch('/api/…')` then `router.refresh()`.
- **No Server Actions** anywhere. Don't introduce them.
- `getCloudflareContext({ async: true })` is the only sanctioned way to read
  env / D1 binding (`@/lib/db` wraps it as `getDb()`).
- Background work uses `ctx.waitUntil(...)` (e.g. `ensureClozePool` in
  `/api/cards/generate`); detached `.catch(() => {})` is the local-dev fallback
  when `ctx` is unavailable.

### Server / client boundary

These modules must never be imported (directly or transitively) from a
`'use client'` file:

- `@/lib/db`, `@/lib/current-user`, `@/lib/auth`, `@/lib/ai/*`
- Any `@/lib/flashcards/*` or `@/lib/passages/*` that imports `@/lib/ai`
  (e.g. `cloze.ts`, `sentence-eval.ts`, `lemmatize.ts`, `passages/ai/*`).

Pure helpers (`srs.ts`, `spelling.ts`, `pronounce/match.ts`) are safe in client
code. `@/lib/tts.ts` is browser-only.

### Cloudflare specifics

- **D1 is async**. Every query: `await db.prepare(sql).bind(...).first<T>()` /
  `.all<T>()` / `.run()`. `.run()` exposes `meta.last_row_id` for inserts.
- `.batch([...])` is transactional for D1.
- Compatibility flags: `nodejs_compat`, `global_fetch_strictly_public`.
- `wrangler.jsonc` declares the D1 binding (`DB`) and assets binding
  (`ASSETS`); no cron triggers, no other bindings.
- Build artifact: `.open-next/worker.js` (OpenNext's output).

---

## 4. Feature inventory

Every feature below has been verified by reading the relevant route /
component. Pages live under `src/app/*/page.tsx`.

| Feature                  | Route(s)                                             | Status / notes |
| ------------------------ | ---------------------------------------------------- | -------------- |
| **Landing page (Bún)**   | `/` (signed-out only; redirects to `/dashboard` if authed) | Long-scroll marketing page with 11 sections + 12 mascot poses. Desktop in `src/components/landing/`, mobile in `src/components/landing-mobile/`. CSS switch via `md:hidden`/`hidden md:block`. |
| **Dashboard**            | `/dashboard`                                         | Eyebrow + greeting, streak/gem pills, hero CTA with mascot bob + progress ring, 14-day streak strip, 4 stat tiles, 30-day stacked bar chart, decks-by-progress. ClockPill (Pomodoro). |
| **Add word — single**    | `/add?tab=single`                                    | English-only required (Vietnamese auto-translates via MyMemory). Live preview pane. Generates IPA/audio/POS (Free Dictionary), collocations (Datamuse), Pexels image, examples (dictionary only — AI examples removed). |
| **Add word — bulk**      | `/add?tab=bulk`                                      | Paste up to 30 words → parallel pipeline (worker pool, parallelism 5) → save to deck. Pre-flight dedup against existing deck cards. Skips Pexels image (slowest leg). |
| **Decks**                | `/decks`, `/decks/[id]`                              | User-scoped decks with icon + subtitle + colored tile. Card detail modal lazy-loads cloze pool sentences via `/api/cloze/pool`. |
| **Study session**        | `/study?deck_id=<id|all>`                            | New cards for today. Two-phase typing → reveal+rate. Auto-play 6× audio loop, smart-Enter, failed-card re-queue, per-rating interval preview (`previewIntervals` in `srs.ts`). Deck picker step appears only when `decks.length > 1`. |
| **Review session**       | `/review?deck_id=<id|all>`                           | Same shape as Study but pulls due cards (`next_review_at <= now`). Same deck-picker URL contract. |
| **Speed quiz**           | `/speed`                                             | Multi-mode (en→vi, vi→en, spelling, mix). Distractors generated algorithmically via `generateDistractorPool()` (tier 1: same deck, tier 2: user vocab, tier 3: static fallback for English; Vietnamese tier 3 padded with placeholders). |
| **Cloze quiz**           | `/cloze`                                             | Fill-in-blank using shared `flashcard_cloze_pool` (word-keyed, global). Lazy-fills via `ensureClozePool` on miss. Fallback: dictionary examples blanked via `blankOutWord`. |
| **Pronounce**            | `/pronounce`                                         | Browser ASR practice; `flashcards/pronounce/match.ts` does Levenshtein scoring. Uses real audio recording (`speakWord`) for the help panel. |
| **Sentence**             | `/sentence`                                          | Learner writes a sentence using a target word, AI grades for `used_correctly` / `grammar_ok` / `semantic_ok` + 1-2 sentence VI feedback. Timer setting. |
| **Compose**              | `/compose`, `/compose/history`, `/compose/history/[id]` | Pool of 5–30 words → AI suggests a story (`/api/compose/suggest`) → user writes 120–180 words → AI grades coherence + word usage + issues + additions (`/api/compose/evaluate`). Compositions saved to `compositions` table with full feedback JSON. |
| **Article (passage)**    | `/passage`, `/passage/new`, `/passage/[id]`          | **Simplified to single karaoke reader** (Mar 2026). Paste content → render → `<KaraokeReader>` highlights words as TTS speaks, click any word → `/api/dictionary/lookup` popup → save to Word Bank. `<GrammarSection>` adds an on-demand "Tìm hiểu grammar patterns" button that calls AI + caches by content hash. |
| **Dictionary lookup**    | `/dictionary`                                        | Standalone external-lookup page (Oxford / YouGlish / ozdic links). Per memory: stays as external lookup, NOT a library browser. |
| **Settings**             | `/settings`                                          | Daily goals, mastered-hide toggle, F1/F2/F3 controls (max attempts, timer, max words), CEFR level (M4), TTS rate, voice picker, theme, autoplay, Pomodoro durations. |
| **Stats**                | `/stats`                                             | 30-day cards-per-day, retention rate, totals. |
| **Login**                | `/login`                                             | Google button + "Trải nghiệm ngay" demo button. |
| **Feedback widget**      | Sidebar (every page)                                 | Modal with mood picker + textarea + optional email → `POST /api/feedback`. |

Routes that exist as orphans (built before the article simplification, no
longer reachable from UI): `PassageStep1Edit`, `PassageStep2Difficulty`,
`PassageStep3Reader`, `PassageStep7Translate`, `PassageStep8Paraphrase`,
`PassageWizardTabs`, plus the matching `/api/passages/[id]/{analyze,
define-word, paraphrase-grade, translate-grade, paraphrase-tips,
translate-reference}` routes. See §10.

---

## 5. AI usage map

The project went through a deliberate AI-minimization pass (see
`src/doc/results/migrate-ai-leaks-result.md`, `cloze-pool-result.md`,
`distractor-random-result.md`). Verified via
`grep -rn "getAIProvider\|generateText" src/`.

### What still uses Gemini

| Task                         | Module / route                                            | Notes |
| ---------------------------- | --------------------------------------------------------- | ----- |
| Cloze pool generation        | `src/lib/flashcards/cloze.ts` → `ensureClozePool()`       | Word-keyed, shared globally across users via `flashcard_cloze_pool`. Triggered as `ctx.waitUntil` background work after `/api/cards/generate` saves a card. |
| Sentence grading             | `src/lib/flashcards/sentence-eval.ts`                     | Used by `/api/sentence/evaluate`. Returns `SentenceEvaluation` (used_correctly, grammar_ok, semantic_ok, feedback). |
| Composition story suggest    | `/api/compose/suggest`                                    | Generates a 120–180 word seed story from a pool of words. |
| Composition grading          | `/api/compose/evaluate`                                   | Coherence 0–10, word_usage map, issues, suggested_additions. |
| Passage grammar analysis     | `src/lib/passages/ai/grammar.ts` → `/api/passages/[id]/grammar` | On-demand button. Cached on the passage row + cross-user via `content_hash`. |
| Lemmatize headword           | `src/lib/flashcards/lemmatize.ts`                         | AI first (handles irregulars: ran→run, went→go), regex fallback (-s/-es/-ies/-ed). **Still on AI per user choice.** One call per card add. |

The other `src/lib/passages/ai/*` modules (`grade-paraphrase`,
`grade-translation`, `translate-reference`, `paraphrase-tips`, `difficulty`,
`define-word`) **still exist in source** but are no longer reached from the
UI after the article-simplify rewrite. They will execute if the orphan
`/api/passages/[id]/{paraphrase-grade,translate-grade,…}` routes are called
directly.

### What was deliberately moved OFF AI

| Task                         | Provider                                       | Module                                  |
| ---------------------------- | ---------------------------------------------- | --------------------------------------- |
| EN → VI translation          | MyMemory API (free, 5000 chars/day per IP)     | `src/lib/flashcards/translate.ts`       |
| IPA + audio + POS + examples | Free Dictionary API (`dictionaryapi.dev`)      | `src/lib/flashcards/dictionary.ts`      |
| Collocations                 | Datamuse API                                   | `src/lib/flashcards/datamuse.ts`        |
| Pexels image                 | Pexels search API                              | `src/lib/flashcards/pexels.ts`          |
| Speed-quiz distractors       | Algorithmic (user vocab tiers + static pool)   | `src/lib/flashcards/distractors.ts` + `common-words.ts` |
| Misspelling distractors      | Algorithmic (transposition / doubling / sub)   | `src/lib/flashcards/spelling.ts`        |
| Passage word lookup (click)  | Free Dictionary via `/api/dictionary/lookup`   | `KaraokeReader.tsx` (was AI define-word)|
| `generateExamples` helper    | **Deleted** in migrate-ai-leaks                | (was `src/lib/flashcards/examples.ts`)  |

### Caching strategy

- **Cloze pool**: `flashcard_cloze_pool` is the only table without a `user_id`
  column — sentences are generic, reused across all users. `hasMinimum(word, n)`
  short-circuits AI when ≥ n sentences exist.
- **Grammar analysis**: `passages.grammar_analysis` (per row) +
  `findGrammarByContentHash(hash)` (cross-user lookup, intentionally unscoped —
  the hash proves content equality so the leak is benign).
- **AI quota errors**: `AIQuotaError` class is defined in `src/lib/ai/types.ts`
  but the Gemini provider **does not throw it yet** — 429s currently log and
  return `null`, surfacing as a generic 502 in route handlers. The frontend in
  `GrammarSection` is pre-wired for 429 but never sees it. See §10.

### ⚠️ CEFR status

The prompt that drove this overview said "CEFR removed entirely." That's
partially true: the article wizard that surfaced CEFR has been replaced by
`KaraokeReader`, so the user never sees CEFR-related UI in the new passage
flow. But `CefrLevel` types, the `user_cefr_level` setting, and the
`passages.level_*` columns still exist in `src/lib/types.ts`,
`M4_SETTINGS`, and the schema. The `<CefrControl>` settings control also
still ships.

---

## 6. Database schema

11 migrations (`migrations/0001_init.sql` → `0011_demo_feedback.sql`). All
applied via `npx wrangler d1 migrations apply english-learning-db --local`.

| Table                            | Scope             | Purpose                                                                   |
| -------------------------------- | ----------------- | ------------------------------------------------------------------------- |
| `app_config`                     | global            | Bootstrap KV. Flashcard keys deleted in 0003 when moved to `user_settings`. |
| `users`                          | global            | Google OAuth + demo. Columns: `email, name, picture_url, google_sub, is_admin, is_demo, demo_expires_at, last_login_at`. |
| `user_settings`                  | **user-scoped**   | `(user_id, key) PK, value TEXT`. All flashcard / passage / Pomodoro / UI settings live here. |
| `flashcard_decks`                | **user-scoped**   | `(id, user_id, name, description, color, position, is_default, icon, subtitle)`. |
| `flashcards`                     | **user-scoped**   | The card. SM-2 fields (`ease_factor, interval_days, repetitions, next_review_at`), JSON columns (`examples, collocations, image_attribution`), `status` enum (`new/learning/review/mastered`), `source_passage_id` + `source_context` for Word Bank. |
| `flashcard_reviews`              | **user-scoped**   | One row per rating. `quality IN (0,2,4,5)` (again/hard/good/easy). |
| `flashcard_test_attempts`        | **user-scoped**   | Multi-mode quiz log. `mode IN ('speed','cloze','pronunciation','sentence')`. |
| `flashcard_practice_sentences`   | per-card (no user_id; auth via card ownership) | Legacy per-card cloze cache. **Dead code** after cloze-pool migration — wrapper retained but unused. |
| `flashcard_cloze_pool`           | **GLOBAL (no user_id)** | Shared cloze sentences keyed by lowercase headword. Written only by `ensureClozePool`; read by all users. |
| `compositions`                   | **user-scoped**   | F3 history. Stores pool word IDs, content, `ai_feedback_json`, `word_usage_json`, `coherence_score`, `passed`. |
| `passages`                       | **user-scoped**   | Title + content + char/word count + cached AI outputs (`level_estimate`, `translate_reference`, `paraphrase_tips_json`, `grammar_analysis`, `content_hash`). |
| `passage_attempts`               | **user-scoped**   | One row per step submission. `step_kind IN ('translate','paraphrase','comprehension','dictation','shadowing')`. Largely unused after article simplification. |
| `feedback`                       | inbox (FK SET NULL on user delete) | In-app feedback submissions. `created_at` is unix seconds (not TIMESTAMP) to match `demo_expires_at` shape. |

Convention recap (from `CLAUDE.md` §4.5): snake_case, `id INTEGER PRIMARY KEY
AUTOINCREMENT`, `.bind(...)` for every value, JSON columns hydrate/dehydrate
inside wrappers (`hydrateCard`, `hydrateDeck`, `hydratePassage`, `hydrateUser`).

---

## 7. Key module map

Updated against the current code. If you need to do X, use Y from Z.

| Need                                   | Use                                                                 |
| -------------------------------------- | ------------------------------------------------------------------- |
| Current user ID (server)               | `requireUserId()` / `getCurrentUserId()` from `@/lib/current-user`  |
| Full user record                       | `getCurrentUser()` from `@/lib/current-user`                        |
| D1 binding                             | `getDb()` from `@/lib/db`                                           |
| Card CRUD                              | `flashcardsDb` from `@/lib/db`                                      |
| Deck CRUD                              | `flashcardDecksDb` from `@/lib/db`                                  |
| Review log                             | `flashcardReviewsDb` from `@/lib/db`                                |
| Test attempts                          | `flashcardTestAttemptsDb` from `@/lib/db`                           |
| Settings                               | `userSettingsDb.getFlashcardSettings(userId)` etc.                  |
| Shared cloze pool                      | `flashcardClozePoolDb` from `@/lib/db`                              |
| Composition CRUD                       | `src/lib/compositions/db.ts`                                        |
| Passage CRUD + grammar cache           | `src/lib/passages/db.ts`                                            |
| Feedback inbox                         | `feedbackDb` from `@/lib/db`                                        |
| SRS calculation                        | `calculateNextReview` / `previewIntervals` / `intervalLabel` from `@/lib/flashcards/srs` |
| Dictionary lookup                      | `lookupWord()` from `@/lib/flashcards/dictionary`                   |
| EN → VI translation                    | `translateEnToVi()` from `@/lib/flashcards/translate`               |
| Collocations                           | `getCollocations()` from `@/lib/flashcards/datamuse`                |
| Pexels image                           | `getPexelsImage()` from `@/lib/flashcards/pexels`                   |
| Lemmatize a word                       | `lemmatize()` from `@/lib/flashcards/lemmatize` (AI + regex fallback) |
| Misspelling distractors                | `generateMisspellings()` from `@/lib/flashcards/spelling`           |
| Quiz distractors                       | `generateDistractorPool()` from `@/lib/flashcards/distractors`      |
| Cloze pool generate + cache            | `ensureClozePool()` from `@/lib/flashcards/cloze`                   |
| Sentence grading                       | `evaluateSentence()` from `@/lib/flashcards/sentence-eval`          |
| End-to-end card data (single import)   | `generateCardData()` from `@/lib/flashcards/generate`               |
| Levenshtein                            | `levenshtein()` from `@/lib/pronounce/match`                        |
| AI provider                            | `getAIProvider()` from `@/lib/ai` (Gemini or noop)                  |
| AI error classes                       | `AIError` / `AIQuotaError` from `@/lib/ai`                          |
| Passage hash (cache key)               | `hashContent()` from `@/lib/passages/hash`                          |
| Passage AI helpers                     | `analyzeGrammar`, `analyzeDifficulty`, `gradeTranslation`, `gradeParaphrase`, `translateReference`, `paraphraseTips`, `defineWord` — `src/lib/passages/ai/*` |
| Auth cookie create / verify            | `createAuthToken()` / `verifyAuthToken()` in `@/lib/auth`           |
| Email allowlist                        | `isEmailAllowed()` in `@/lib/auth`                                  |
| Demo seed                              | `seedDemoUser(userId)` from `@/lib/demo/seed-user`                  |
| Demo content                           | `DEMO_DECKS`, `DEMO_PASSAGES`, `DEMO_SEED_HISTORY` in `@/lib/demo/seed-data` |
| Client TTS — single word               | `speakWord(word, { audioUrl, rate, voice_preference, lang })` from `@/lib/tts` (prefers real recording, falls back to speechSynthesis) |
| Client TTS — long-form                 | `speak(text, opts)` from `@/lib/tts` (used directly by KaraokeReader for sentence-level utterances) |
| Voice preference (localStorage)        | `getStoredVoicePreference()` / `setStoredVoicePreference()` from `@/lib/tts` |
| Typed `fetch` JSON                     | `apiJson<T>(url, init?)` from `@/lib/common/api-json` (throws `ApiError`) |
| Mascot image                           | `<Mascot pose=... />` from `@/components/common/Mascot`             |
| Loading state                          | `<LoadingState message=... />` from `@/components/common/LoadingState` |
| POS pill (purple)                      | `<POSPill pos={...} />` from `@/components/common/POSPill`          |
| External lookup links                  | `<LookupPills word={...} />` from `@/components/common/LookupPills` |
| Colored feedback rail                  | `<FeedbackSection title color>` from `@/components/common/FeedbackSection` |
| Settings card                          | `<SettingsCard title icon>` from `@/components/SettingsCard`        |
| Settings controls                      | `Slider`, `Toggle`, `SliderWithIcon`, `MaxAttemptsControl`, `CefrControl`, `TtsRateControl`, `VoicePickerControl`, `ThemeControl` in `@/components/settings-controls/` |
| Demo banner                            | `<DemoBanner />` in `@/components/demo/demo-banner`                 |
| Feedback widget                        | `<FeedbackWidget />` in `@/components/feedback/feedback-widget`     |
| Pomodoro                               | `<PomodoroProvider>` + `<ClockPill>` in `@/components/pomodoro/`    |
| Streak strip                           | `<StreakBar />` in `@/components/dashboard/streak-bar`              |
| Karaoke reader                         | `<KaraokeReader />` in `@/components/passage/KaraokeReader`         |
| Grammar button + render                | `<GrammarSection />` in `@/components/passage/GrammarSection`       |
| Deck-detail card modal                 | `<CardDetailModal />` in `@/components/deck-detail/CardDetailModal` |
| Mobile shell                           | `<MAppShell tab=...>` in `@/components/app-mobile/_shell/`          |

---

## 8. Conventions (high-impact only)

`CLAUDE.md` is authoritative. The rules that bite most often:

1. **D1 is async.** Always `await db.prepare(...).bind(...).first()/.all()/.run()`.
2. **Server-only modules must never reach `'use client'` files.** See §3.
3. **Every user-scoped query filters by `user_id`.** Multi-tenancy boundary.
4. **Inline `style={{}}` with `var(--v-*)`** is the primary form. Recipe
   classes (`.v-card`, `.v-btn-primary`) exist as convenience.
5. **Yellow (`--v-yellow`) is reserved for speed quiz.** Other surfaces use
   the `--v-yellow-deep` shade or other tokens.
6. **Stage colors**: `new=--v-blue`, `learning=--v-orange`,
   `review=--v-primary`, `mastered=--v-purple`.
7. **No new frameworks.** No Server Actions, no NextAuth, no react-hook-form,
   no zod, no Prettier, no test runner. Don't add packages without the user's
   nod (CLAUDE.md §10.1).
8. **File size**: aim for <500 lines per `.ts(x)`. Tracked in `REFACTOR_AUDIT.md`
   at the repo root.
9. **Vietnamese is the user-facing locale.** Mascot voice = "mình" (mascot) /
   "bạn" (user). Doc files (`src/doc/`) are English.
10. **Don't run `npm run build/dev/preview/deploy` automatically.** Wrangler
    `--remote` is also gated.

---

## 9. Doc workflow

Per `CLAUDE.md` §8, every long / multi-file prompt produces two files:

```
src/doc/
  prompts/<feature>.md          ← user's prompt, saved verbatim
  results/<feature>-result.md   ← what was actually built
  <feature>.md                  ← optional feature doc (English) after a "large feature"
  PROJECT_OVERVIEW.md           ← this file
```

History so far (results that exist): `m1c-1-core-learning-flow`,
`m1c-2-quizzes-mgmt`, `m3a-shared-infra-pronounce`, `m3b-sentence`,
`m3c-compose`, `m4a-passages`, `m4b-passage-reader`, `m4c-passage-grading`,
`m5-v2-polish`, `v2-design-migration`, `dashboard-polish-1`,
`bulk-word-import`, `single-import-preview-flow`, `cloze-pool-result`,
`distractor-random-result`, `migrate-ai-leaks-result`, `landing-page-result`,
`mobile-handoff-result`, `article-simplify-result`, `vocab-audio-fix-result`,
`demo-feedback-result`, `deploy.md`. Feature doc: `session-deck-picker.md`.

---

## 10. Pending / known issues

### Prompts with no matching result file

- **`ai-quota-error-handling.md`** — Designed the `AIQuotaError` flow. The
  class is defined in `src/lib/ai/types.ts` and route-handler / UI sites are
  pre-wired for `429 { error: 'ai_quota_exceeded' }`, but the Gemini provider
  in `src/lib/ai/gemini.ts` still logs and returns `null` on any error
  (including 429). **The 429 → friendly-message path never fires.** No result
  file documents whether this was deliberately deferred.
- **`ai-usage-audit.md`** — Template / checklist form rather than an
  implementation prompt; no result expected. The audit fed into the
  cloze-pool / distractor-random / migrate-ai-leaks work.

### Dead / orphaned code from the article simplification

- Components: `PassageWizardTabs`, `PassageStep1Edit`, `PassageStep2Difficulty`,
  `PassageStep3Reader`, `PassageStep7Translate`, `PassageStep8Paraphrase`,
  `StepPlaceholder`.
- API routes (still ship in bundle, not reachable from UI):
  `/api/passages/[id]/{analyze,define-word,paraphrase-grade,translate-grade,paraphrase-tips,translate-reference}`.
- Server helpers: `src/lib/passages/ai/{difficulty,define-word,grade-paraphrase,grade-translation,paraphrase-tips,translate-reference}.ts`.
- Settings: `passage_pre_fetch` is wired through but no longer gates anything.
- Column: `passages.last_step_viewed` no longer written.

### Dead / orphaned from cloze-pool migration

- `flashcardPracticeSentencesDb` wrapper in `src/lib/db.ts` — last reader
  removed.
- `flashcard_practice_sentences` table — schema retained per §10.8 of CLAUDE.md
  (no destructive migrations).

### Legacy `card.examples` column

`/api/cards/generate` no longer writes `examples`, so new cards have empty
`examples`. But these consumers still read `card.examples`:
`WordCard.tsx`, `flashcard-session/RevealStage.tsx`,
`api/sentence/evaluate/route.ts`, `components/add/single-import.tsx`.
They render nothing for new cards but don't crash.

### Mobile screens

`src/components/app-mobile/screens/*` are **presentational shells with
sample data**. The desktop pages already fetch real data; mobile components
ignore it. Wiring is a per-screen follow-up.

Mobile routes also lack the full session flow: `MFlashcardTyping` is the only
mounted review screen — `MReveal` is built but not routed; rate flow not
wired. `/cloze`, `/compose`, `/study`, `/speed`, `/stats` have no mobile
component and fall back to the desktop layout.

### Lemmatize on AI hot path

`lemmatize.ts` makes one Gemini call per `/add` request to resolve irregular
verbs (ran→run, went→go). Regex fallback exists but is intentionally
conservative. Per the migrate-ai-leaks decision this stays on AI; it is
**not** in the formal "reserved AI" list and is a candidate for an irregular-
verb-map cleanup if quota becomes a problem.

### Demo data follow-ups

- Demo seed is the **hand-written 12-card** set in
  `src/lib/demo/seed-data.ts`. The richer 60-word seed via
  `scripts/generate-demo-seed.ts` was never executed (requires
  `GEMINI_API_KEY`).
- No demo-account cleanup job. The partial index
  `idx_users_demo_expires WHERE is_demo = 1` is in place but unused —
  rows accumulate. Cleanup is a manual `DELETE FROM users WHERE is_demo = 1
  AND demo_expires_at < unixepoch()` for now.
- No per-IP rate-limit on `/api/auth/demo`.

### Landing page

- Mobile responsive uses Tailwind `md:` breakpoint (768px); the design
  targets 402px and 1280px. Tablet / landscape phone may surface gaps.
- Footer links point to `#` placeholders (`/privacy`, `/terms`,
  `/changelog`, `/blog` don't exist).
- Heavy use of `color-mix(in srgb, …)` requires Safari 16.4+ / Chrome 111+
  / Firefox 113+.

### Inconsistencies that surfaced during the scan

- **CEFR status mismatch.** Prompts described CEFR as removed; types,
  settings keys, the `<CefrControl>` settings control, and the
  `passages.level_*` columns are still in code. The UI surface (article
  difficulty step) is gone, the rest remains.
- **`eslint` is installed and `npm run lint` exists**, but `CLAUDE.md` §1
  says "no ESLint." The script works but isn't part of the workflow.
- **`AIQuotaError` is exported and the UI handles `429`**, but no AI route
  has ever returned 429 because the Gemini provider doesn't throw.
- **`grep -rn 'TODO\|FIXME' src/`** returns no matches. There are no
  source-code-level open TODOs — all known follow-ups are doc-side.
