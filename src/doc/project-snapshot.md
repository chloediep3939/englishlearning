# Project Snapshot

> Factual codebase snapshot generated **2026-05-31**, intended to let another
> assistant build verification roles (PM, BA, Dev, Manual QA, Automation QA)
> tailored to this repo. Authoritative rules live in `CLAUDE.md`; the broader
> living map is `src/doc/PROJECT_OVERVIEW.md`. This file answers the
> "concise factual snapshot" prompt and is intentionally terse.
>
> English-learning web app. Next.js 16 App Router on Cloudflare Workers
> (D1 + R2), custom Google OAuth, Gemini AI. Single-package repo, web-only.

## 1. Stack
- **Frontend:** Next.js **16.2.6** (App Router, no `pages/`), React **19.2.4**, TypeScript 5 (`strict`). Styling: Tailwind CSS v4 (no config file) + `--v-*` CSS custom properties in `src/app/globals.css`. State: React Context (`ThemeProvider`, `PomodoroProvider`) + local component state — no Redux/Zustand.
- **Backend:** TypeScript, Next.js 16 route handlers (uncached by default). Serverless — runs on Cloudflare Workers via `@opennextjs/cloudflare` 1.19.9. No separate backend.
- **Database:** Cloudflare **D1** (SQLite), async API. No ORM — raw `db.prepare().bind()` wrapped in `src/lib/db.ts`. Migrations as plain SQL in `migrations/` (`0001_init.sql` → `0012_oxford_audio.sql`).
- **Auth:** Custom — Google OAuth (two route handlers) → HMAC-SHA256-signed `auth` cookie carrying `user_id`. Optional `ALLOWED_EMAILS` whitelist. No NextAuth/Clerk/iron-session.
- **Infra/Hosting:** Cloudflare Workers (`wrangler.jsonc`). Bindings: `DB` (D1 `english-learning-db`), `AUDIO_BUCKET` (R2, pronunciation mp3s). Observability enabled. Compatibility date 2025-12-15.
- **Mobile:** None. Web-only — no React Native/Flutter/native folders. (`design/` holds mobile *mockups* only; `src/components/app-mobile/*` are presentational shells.)

## 2. Repo layout (depth 2)
```
english-learning/
├── design/        # Design handoff artifacts/mockups (bun_mobile, web-study-v1, landing)
├── migrations/    # D1 schema migrations (0001 → 0012, SQL)
├── public/        # Static assets (mascot PNGs, etc.)
├── scripts/       # Build/deploy helper scripts
├── src/
│   ├── app/       # App Router: pages + /api route handlers
│   ├── components/ # Feature-organized React UI
│   ├── lib/       # Core services (db, auth, ai, flashcards, passages, pronounce)
│   ├── types/     # TS type defs
│   └── doc/       # Feature docs + saved prompts/results
└── wrangler.jsonc # Cloudflare Workers config
```
**Not a monorepo** — single npm package.
- **src/app:** ~18 user-facing routes + the `/api` surface.
- **src/components:** feature folders (`flashcard-session`, `speed-quiz`, `passage`, `deck-detail`, `settings-controls`, `pomodoro`, `common`, `landing`).
- **src/lib:** `db.ts`, `auth.ts`, `current-user.ts`, `ai/` (Gemini), `flashcards/` (srs, dictionary, translate, datamuse, cloze, distractors, spelling, pexels), `passages/`, `pronounce/`.

## 3. Domain / feature surface
- **Vocabulary flashcards** — decks, SRS review (`/review`, `/study`), card CRUD, regen, audio.
- **Spaced repetition** — SM-2-style algorithm (`src/lib/flashcards/srs.ts`), reviews logged.
- **Speed quiz** — timed multiple-choice (`/speed`), the "Flashcard nhanh" surface.
- **Cloze (fill-in-the-blank)** — `/cloze`, shared word-level sentence pool.
- **Pronunciation practice** — `/pronounce`, browser ASR + Levenshtein fuzzy match.
- **Sentence-building** — `/sentence`, AI-evaluated sentence attempts per card.
- **Composition writing** — `/compose`, learner writes using a word pool; AI scores coherence + word usage.
- **Reading passages** — `/passage`, import text, difficulty analysis, karaoke reader, translate/paraphrase/grammar steps; words can be mined into flashcards (Word Bank).
- **Dictionary** — `/dictionary`, external lookup (IPA, audio, POS).
- **Deck management** — `/decks`, export/import, stage breakdown.
- **Stats dashboard** — `/stats`, `/dashboard` (streaks, retention, due counts).
- **Settings** — TTS voice/rate, theme, CEFR level, max attempts, autoplay, pomodoro.
- **Demo mode** — anonymous 24h accounts auto-seeded with content.

**AI / speech:**
- **Google Gemini 2.5 Flash** (`gemini-2.5-flash`) via direct REST `fetch` (no SDK) — `src/lib/ai/gemini.ts`, factory in `src/lib/ai/index.ts`. Used for card generation, composition/sentence eval, cloze gen, passage analysis, lemmatize. Graceful fallback if `GEMINI_API_KEY` missing.
- **TTS:** browser `speechSynthesis` (`src/lib/tts.ts`), voice pref in localStorage.
- **STT/ASR:** browser `SpeechRecognition`, matched via `src/lib/pronounce/match.ts` (≤1 edit short words, ≤2 longer).
- **Pronunciation audio:** Oxford US mp3s stored in R2, served via `/api/audio/[cardId]`.

## 4. API surface
All `/api/*` except auth are **auth-gated** via `requireUserId()` (throws → 401). Middleware public paths: `/`, `/login`, `/api/auth/*`, `/_next/*`, `/mascot/*`. **No Server Actions** (`'use server'` = 0 matches).

| # | Method + path | Purpose | Auth |
|---|---|---|---|
| 1 | POST `/api/auth/demo` | Create 24h demo account, auto-seed | public |
| 2 | GET `/api/auth/google` | Start OAuth (CSRF state) | public |
| 3 | GET `/api/auth/callback/google` | OAuth callback, set cookie | public |
| 4 | POST `/api/auth/logout` | Clear auth cookie | public |
| 5 | GET `/api/cards` | List cards (deck/q/due/new/source filters) | gated |
| 6 | POST `/api/cards` | Create card (+auto Oxford audio) | gated |
| 7 | GET/PUT/DELETE `/api/cards/[id]` | Card read/update/delete | gated |
| 8 | POST `/api/cards/generate` | AI-generate card from word (+save) | gated |
| 9 | POST `/api/cards/preview` | AI preview only (no save) | gated |
| 10 | POST `/api/cards/from-passage` | Create card from passage word | gated |
| 11 | POST `/api/cards/[id]/rate` | Record SRS rating (0/2/4/5) | gated |
| 12 | POST `/api/cards/[id]/test-attempt` | Log quiz attempt (mode, passed) | gated |
| 13 | GET `/api/cards/[id]/cloze` | Cloze challenge for card | gated |
| 14 | GET `/api/audio/[cardId]` | Serve Oxford mp3 from R2 | gated |
| 15 | GET/POST `/api/decks` | List / create deck | gated |
| 16 | GET/PUT/DELETE `/api/decks/[id]` | Deck CRUD (+set default) | gated |
| 17 | GET/POST `/api/passages` | List / create passage | gated |
| 18 | GET/PUT/DELETE `/api/passages/[id]` | Passage CRUD | gated |
| 19 | POST `/api/passages/[id]/analyze` | AI difficulty analysis | gated |
| 20 | GET `/api/stats` | Aggregate stats (due, streak, retention) | gated |
| 21 | POST `/api/compose/evaluate` | AI eval composition vs word pool | gated |
| 22 | POST `/api/sentence/evaluate` | AI eval sentence attempt | gated |
| 23 | GET `/api/cloze-session` | Random cloze cards for session | gated |
| 24 | GET `/api/compositions` | List compositions | gated |
| 25 | GET/PUT `/api/settings` | Get / update user settings | gated |
| 26 | GET `/api/dictionary/lookup` | External dictionary lookup | gated |

## 5. Data model
(From `migrations/*.sql`, `src/lib/types.ts`, `src/lib/db.ts`. JSON-shaped fields stored as TEXT; booleans as INTEGER.)

- **users** — `id`, `email`(uniq), `name`, `picture_url`, `google_sub`(uniq), `is_admin`, `is_demo`, `demo_expires_at`, `created_at`, `last_login_at`. Parent of nearly everything (cascade delete; `feedback.user_id` is SET NULL).
- **user_settings** — PK `(user_id, key)`, `value`, `updated_at`. Per-user config KV (goals, theme, voice, TTS rate, CEFR, pomodoro). FK→users CASCADE.
- **app_config** — global KV `(key, value)` (legacy).
- **flashcard_decks** — `id`, `user_id`, `name`, `description`, `color`, `icon`, `subtitle`, `position`, `is_default`, `created_at`. FK→users CASCADE.
- **flashcards** — `id`, `user_id`, `deck_id`, `english`, `vietnamese`, `ipa`, `part_of_speech`, `audio_url`, `examples`(JSON), `image_url`, `image_attribution`(JSON), `collocations`(JSON), `notes`, `status`(new|learning|review|mastered), SRS fields (`ease_factor`, `interval_days`, `repetitions`, `next_review_at`, `last_reviewed_at`), audio (`audio_us_key`, `audio_us_status`), Word Bank (`source_passage_id`→passages SET NULL, `source_context`). FK→users & decks CASCADE.
- **flashcard_reviews** — SRS log: `flashcard_id`, `user_id`, `quality`(0/2/4/5), `prev_interval`, `new_interval`, `reviewed_at`.
- **flashcard_test_attempts** — quiz log: `flashcard_id`, `user_id`, `mode`(speed|cloze|pronunciation|sentence), `passed`, `time_ms`, `metadata`(JSON), `attempted_at`.
- **flashcard_practice_sentences** — per-card cloze pool: `flashcard_id`, `sentence`, `vi_translation`, `times_shown`, `last_shown_at`. **No `user_id`** — ownership derived via card. (Legacy/dead after cloze-pool migration.)
- **flashcard_cloze_pool** — *shared* word-level cloze: `word`, `pos`, `sentence`(blanked), `blank_word`, `difficulty`(CEFR). Write-once/read-all, **not user-scoped**.
- **compositions** — `user_id`, `source`(today|deck), `source_deck_id`(SET NULL), `pool_word_ids_json`, `content`, `ai_feedback_json`, `word_usage_json`, `coherence_score`, `passed`, `created_at`.
- **passages** — `user_id`, `title`, `content`, `source_label/url`, `char_count`, `word_count`, `level_estimate`(CEFR), `level_verdict`, `level_suggestion`, `last_step_viewed`, `completed_at`, cached AI (`translate_reference`, `paraphrase_tips_json`, `grammar_analysis`, `grammar_analyzed_at`, `content_hash`).
- **passage_attempts** — `user_id`, `passage_id`(CASCADE), `step_kind`(translate|paraphrase|comprehension|dictation|shadowing), `user_input`, `ai_feedback_json`, `score`.
- **feedback** — `user_id`(nullable, SET NULL), `email`, `rating`(1–5), `content`, `page_url`, `user_agent`, `is_demo_user`, `created_at`.

## 6. Testing setup
- **Unit tests:** **None.** No Jest/Vitest/Mocha in `package.json`.
- **E2E:** **None.** No Playwright/Cypress.
- **CI:** **None.** No `.github/workflows/`.
- **Linter:** ESLint **v9** (`eslint.config.mjs`, extends `eslint-config-next` core-web-vitals + typescript), script `"lint": "eslint"`. Note: `CLAUDE.md` says "No ESLint" — that doc claim is **stale**; ESLint is installed and configured (treated as advisory, not enforced).
- **Formatter:** No Prettier (no config, not in devDeps).
- **Type-check:** Via `next build` only; no standalone `tsc --noEmit` script.

## 7. Build & run
- **Package manager:** npm (`package-lock.json`).
- **Scripts (verbatim):**
  - `"dev": "next dev"`
  - `"build": "next build"`
  - `"start": "next start"`
  - `"lint": "eslint"`
  - `"preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview"`
  - `"deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"`
  - `"cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"`
- **Env var keys** (local `.dev.vars`; Cloudflare secrets in prod — values not shown): `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAILS`, `GEMINI_API_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `PEXELS_API_KEY`. (DB/R2 access is via wrangler bindings, not env vars.)
- DB migrate (local): `npx wrangler d1 migrations apply english-learning-db --local`.

## 8. External integrations
| Service | SDK | Init file | Notes |
|---|---|---|---|
| Google OAuth | none (manual) | `src/app/api/auth/google/route.ts`, `.../callback/google/route.ts` | login + user provisioning |
| Gemini 2.5 Flash | none (REST `fetch`) | `src/lib/ai/gemini.ts` (factory `src/lib/ai/index.ts`) | optional; fallback if key absent |
| Pexels images | none (REST) | `src/lib/flashcards/pexels.ts` | card illustrations |
| Datamuse | none (REST, no key) | `src/lib/flashcards/datamuse.ts` | collocations |
| Free Dictionary API | none (REST, no key) | `src/lib/flashcards/dictionary.ts` | IPA/audio/defs |
| MyMemory | none (REST, no key) | `src/lib/flashcards/translate.ts` | EN→VI translation |
| Cloudflare D1 + R2 | `@cloudflare/workers-types` (types) | `src/lib/db.ts` via `getCloudflareContext()` | DB + audio storage |

**Not present:** Stripe, Sentry, PostHog/Segment, Firebase, SendGrid, Twilio, Auth0/Clerk.

## 9. Known gaps / risks
- **TODO/FIXME/HACK:** 0 in `src/`.
- **No error boundaries:** no `error.tsx` or `not-found.tsx` anywhere in `src/app/` — server/route errors fall back to default Next.js pages.
- **No tests, no CI** (see §6) — zero automated regression safety net. Biggest risk for verification roles.
- **Logging:** ~82 `console.error/warn` calls across routes/libs; no structured logging, trace IDs, or aggregation service.
- **Error responses:** routes catch and return bare `500` with no error-shape contract — clients can't distinguish validation vs. DB vs. timeout failures.
- **No input-validation layer** (Zod etc. is forbidden by repo rules); each handler validates ad-hoc.
- **Deprecated middleware convention:** still uses `src/middleware.ts` (Next 16.2 prefers `proxy.ts`) — emits build warning, works for now.
- **Migrations:** no rollback/versioning-in-code mechanism.
- **Secrets:** `.env`, `.dev.vars`, `.env.local` are **gitignored and not tracked** (verified via `git ls-files` / `git check-ignore`) — local-only, as intended. Minor note: a default-looking `ADMIN_PASSWORD` exists in local `.dev.vars`; confirm prod uses a strong value via Cloudflare secrets.
- **Dependencies:** current — `next 16.2.6`, `react 19.2.4`, `typescript 5`, `tailwindcss 4`. No stale semver ranges detected.

## 10. Open questions for the PM
1. **Source of truth for "pass/mastery":** SRS quality (0/2/4/5), the per-mode `test_attempts.passed`, and the session mastery gate (2 clean / 3 if failed) all coexist — which is authoritative for QA to assert "card learned"?
2. **AI non-determinism:** Gemini scores compositions/sentences and analyzes passages. What are the acceptable-output tolerances QA should validate against, given identical input can yield different feedback?
3. **Demo accounts:** 24h auto-expiring, auto-seeded — should automated QA run against demo accounts, dedicated test users, or both? What's the expiry/cleanup behavior to test?
4. **Browser-API features (TTS/ASR):** speech recognition and synthesis are browser-dependent and permission-gated — which browsers/devices are in scope, and how should pronunciation matching be verified without flaky mic input?
5. **Multi-tenancy boundary:** every query is `user_id`-scoped (except the shared `flashcard_cloze_pool`) — is cross-user data isolation a priority test dimension, and is the shared cloze pool intentionally global (no leakage concern)?
