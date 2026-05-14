# CLAUDE.md

> Mandatory rules for any AI coding assistant (Claude Code, Cursor, Copilot, etc.)
> working on this repository.
>
> **Read this file in full before writing or editing any code.** Also read
> `AGENTS.md` — it contains version-specific Next.js warnings that override
> your training data.
>
> If a user request conflicts with a rule here, **stop and ask** before
> breaking the rule.

---

## 0. Top priority — read docs, never assume

**Default stance: "Not sure → look it up. Can't look it up → ask. Never guess."**

Your training data is older than this project's dependencies. Concretely:

- **Next.js 16.2.x** in this repo has breaking changes vs. older versions you may
  remember. `params` is a `Promise`. `cookies()` is async. Route handlers are
  **uncached by default**. The `middleware` file convention is **deprecated** in
  16.2 — Next.js wants `proxy.ts` instead, but the project still uses
  `src/middleware.ts` (works, emits a build warning). Don't auto-rename without
  asking. The authoritative source for this exact version is
  `node_modules/next/dist/docs/01-app/` — **read it** before touching pages,
  layouts, or route handlers.
- **React 19** introduces `use()`, `useActionState`, `useOptimistic`,
  `useFormStatus`. Don't fall back to older patterns out of habit.
- **Tailwind v4** has **no `tailwind.config.*`** file. Design tokens live in
  `src/app/globals.css` as `:root { --v-* }` custom properties. Do not create
  a config file.
- **Cloudflare D1** is **async**. Every query: `await db.prepare(sql).bind(...).first() / .all() / .run()`. No `.get()`. No sync. Reads `D1Result` shape (results in `.results` for `all()`, ID in `.meta.last_row_id` for `run()`).
- **`@opennextjs/cloudflare`** is the adapter that runs Next.js on Cloudflare
  Workers. The D1 binding is accessed via
  `await getCloudflareContext({ async: true })` — wrapped by our `getDb()`
  helper in `src/lib/db.ts`. Do not import `@cloudflare/workers-types` D1
  symbols directly into client components.
- **Auth is custom**, not `iron-session` or NextAuth: HMAC-signed cookie with
  `user_id`, see `src/lib/auth.ts`. Login flow is Google OAuth via two route
  handlers: `/api/auth/google` (initiate) and `/api/auth/callback/google`
  (handle).

Before using any library API:

1. Open `node_modules/<pkg>/package.json` → confirm the installed version.
2. Read `node_modules/<pkg>/dist/*.d.ts` or the package's `README.md`.
3. If still unclear → consult online docs **matching that version** and cite
   the URL in your reply so the user can verify.

When existing code uses an unfamiliar pattern, **assume the code is right and
you are wrong**. Read surrounding files before "fixing" anything.

---

## 1. Stack snapshot — don't drift

| Layer       | Choice                                                            | Version  |
| ----------- | ----------------------------------------------------------------- | -------- |
| Framework   | Next.js (App Router only — no `pages/`)                           | 16.2.x   |
| Adapter     | `@opennextjs/cloudflare` (Cloudflare Workers runtime)             | latest   |
| React       | React + ReactDOM                                                  | 19.x     |
| Language    | TypeScript `strict`                                               | ^5       |
| Styling     | Tailwind v4 via `@tailwindcss/postcss` + V2 CSS variables (`--v-*`) | ^4     |
| Database    | Cloudflare D1 (SQLite). Local DB in `.wrangler/state/v3/d1/`      | latest   |
| Auth        | Google OAuth → HMAC-signed cookie. Multi-user (`users` table)     | custom   |
| AI provider | Gemini Flash via `getAIProvider()` (factory at `src/lib/ai/`)     | gemini-2.5-flash |
| Icons       | `lucide-react` (only)                                             | latest   |
| Fonts       | Nunito (head + body), JetBrains Mono (IPA) — via Google Fonts CSS | —        |
| Mascot      | 7 PNG poses at `public/mascot/ngoc-*.png` + `Mascot` component    | —        |

**No test framework. No ESLint. No Prettier.** Follow the style of nearby
files.

**Deploy target: Cloudflare Workers.** Local dev via `npm run dev` (uses
`initOpenNextCloudflareForDev()` to wire D1 binding to Next dev server) or
`npm run preview` (full Workers runtime locally). Production: `npm run deploy`
via `wrangler`.

---

## 2. Code reuse first — do not write new when existing works

Before creating any new file, function, component, or utility:

1. **Grep the codebase** for existing implementations. Quick map:

   | Need                              | Use / copy from                                              |
   | --------------------------------- | ------------------------------------------------------------ |
   | Get current user ID (server)      | `requireUserId()` from `@/lib/current-user`                  |
   | Get current user record           | `getCurrentUser()` from `@/lib/current-user`                 |
   | DB binding access                 | `getDb()` from `@/lib/db`                                    |
   | Card / deck / review CRUD         | `flashcardsDb`, `flashcardDecksDb`, `flashcardReviewsDb` in `@/lib/db` |
   | Test attempt logging              | `flashcardTestAttemptsDb.create(userId, {...})`              |
   | Settings get/update               | `userSettingsDb.getFlashcardSettings(userId)`                |
   | SRS algorithm                     | `calculateNextReview` from `@/lib/flashcards/srs`            |
   | English word lookup               | `lookupWord()` from `@/lib/flashcards/dictionary`            |
   | EN→VI translation                 | `translateEnToVi()` from `@/lib/flashcards/translate`        |
   | Collocations                      | `getCollocations()` from `@/lib/flashcards/datamuse`         |
   | AI text generation                | `getAIProvider().generateText()` from `@/lib/ai`             |
   | AI cloze sentences                | `generateClozeSentences()` from `@/lib/flashcards/cloze`     |
   | AI distractor pool                | `generateDistractorPool()` from `@/lib/flashcards/distractors` |
   | Algorithmic misspellings          | `generateMisspellings()` from `@/lib/flashcards/spelling`    |
   | Auth cookie create / verify       | `createAuthToken()`, `verifyAuthToken()` in `@/lib/auth`     |
   | Email allowlist check             | `isEmailAllowed()` in `@/lib/auth`                           |
   | Layout shell (sidebar + main)     | `src/app/layout.tsx`                                         |
   | Sidebar nav                       | `src/components/Sidebar.tsx`                                 |
   | Mascot image                      | `<Mascot pose=... />` from `@/components/common/Mascot`      |
   | Loading state (mascot + label)    | `<LoadingState message=... />` from `@/components/common/LoadingState` |
   | Part-of-speech badge (purple)     | `<POSPill pos={...} />` from `@/components/common/POSPill`   |
   | Dictionary lookup links           | `<LookupPills word={...} />` from `@/components/common/LookupPills` |
   | Feedback section (colored rail)   | `<FeedbackSection title color>` from `@/components/common/FeedbackSection` |
   | Settings card layout              | `<SettingsCard title icon>` from `@/components/SettingsCard` |
   | Settings controls                 | `Slider`, `Toggle`, `SliderWithIcon`, `MaxAttemptsControl`, `CefrControl`, `TtsRateControl`, `VoicePickerControl`, `ThemeControl` from `@/components/settings-controls/*` |
   | Typed `fetch` JSON                | `apiJson<T>(url, init?)` from `@/lib/common/api-json` (throws `ApiError`) |
   | Client TTS                        | `speak(text, opts)` + `getStoredVoicePreference()` from `@/lib/tts` |
   | Shared types                      | `src/lib/types.ts`                                           |
   | Icons                             | `lucide-react`                                               |
   | Theme tokens                      | `var(--v-bg)`, `var(--v-surface)`, `var(--v-ink)`, `var(--v-ink-soft)`, `var(--v-muted)`, `var(--v-border)`, `var(--v-primary)`, `var(--v-accent)`, plus functional palette `--v-red`, `--v-orange`, `--v-yellow`, `--v-blue`, `--v-purple`, `--v-pink`, `--v-teal`, `--v-green`. Stage colors: `--v-stage-{new,learning,review,mastered}` |
   | Shadows                           | `var(--v-shadow-sm/md/lg)`, `var(--v-press)`                 |
   | Fonts                             | `var(--v-font-head)`, `var(--v-font-body)`, `var(--v-font-mono)` |
   | Keyframes                         | `v-ngoc-bob`, `v-ngoc-float`, `v-sparkle` (defined in `globals.css`) |

2. **If a similar pattern exists, extend or imitate it.** Do not invent a
   parallel style.

3. **Never duplicate types.** Shared types live in `src/lib/types.ts`.

4. **If you must introduce a new abstraction**, justify it in one sentence
   in your reply and ask the user before proceeding.

5. Rule of thumb: if you're about to write the second version of something,
   stop — reuse or refactor the first.

### 2.1 The `common/` convention

Reusable, generic primitives live in `src/components/common/` (UI) and
`src/lib/common/` (helpers). The mandatory workflow:

1. **Grep `src/components/common/` and `src/lib/common/` before writing**
   any new component or helper. If a match exists, use it. Add a prop
   if you need a variation — do NOT fork the implementation.
2. If nothing matches BUT this is the **3rd consumer** of a copy-paste
   pattern, stop and extract to `common/` before continuing your task.
3. **Anti-pattern: variant flags.** Never put
   `if (variant === 'X')` branches inside a common component. Variants
   that diverge more than ~30% should stay as separate components.
4. **Anti-pattern: speculative extraction.** Don't pre-create empty
   `common/` files. Extract on the 3rd consumer, not the 1st.
5. **Anti-pattern: mega-components.** Keep primitives small and
   composable. `<EmptyState>` USES `<Mascot/>` — it doesn't replace it.

Feature-local sub-components (only used by one orchestrator) live in a
sibling `<feature>/` folder, not `common/`. Examples already in tree:

```
src/components/speed-quiz/        ← SummaryScreen, TimerBar, StatTile, SparkleBurst
src/components/deck-detail/       ← StageBreakdown, FilterPill, WordRow, CardDetailModal
src/components/settings-controls/ ← Slider, Toggle, SliderWithIcon, ...
```

### 2.2 File-size rule

**Aim to keep .tsx / .ts files under 500 lines.** When a file crosses
that, split it: each "section" with its own state, conditional branch,
or comment header is a candidate for extraction into a co-located
sub-component (in a `<feature>/` folder next to the parent). Don't
batch-split during unrelated work — call out the size in your reply
and ask the user.

Audit history of which files cross this line is tracked in
`REFACTOR_AUDIT.md` at the repo root.

---

## 3. Never-assume checklist

Run through this list mentally before every code change. Any "not sure" →
look it up or ask.

| #    | Don't assume                                                  | Verify by                                                          |
| ---- | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| 3.1  | A library API exists as you remember                          | Read `.d.ts` in `node_modules`                                     |
| 3.2  | Runtime is Edge / Node / browser                              | Check `"use client"`, `export const runtime`, file location        |
| 3.3  | A file or folder exists                                       | `ls` first                                                         |
| 3.4  | Existing code is wrong                                        | Default: code is right, you are wrong — read it carefully          |
| 3.5  | The user wants more than they asked for                       | Stay in scope; suggest extras at the end of your reply             |
| 3.6  | Data shape (DB row, JSON column, fetch response)              | Read the type / migration / a sample                               |
| 3.7  | Browser / CSS features are universally supported              | Verify before using                                                |
| 3.8  | A route is already auth-protected                             | Middleware redirects unauthed → `/login`. Routes additionally call `requireUserId()` for ownership |
| 3.9  | An error path is handled upstream                             | Handle locally too                                                 |
| 3.10 | Compiling = working                                           | Always report what you tested vs. didn't                           |
| 3.11 | The conversation context is still fresh                       | Re-read the original request before continuing                     |
| 3.12 | A CLI / tool exists                                           | Check `package.json` scripts and the lockfile                      |
| 3.13 | i18n / locale                                                 | UI strings here are Vietnamese; confirm before changing            |
| 3.14 | An env variable exists                                        | Check `.dev.vars`; tell the user if you add a new one              |
| 3.15 | The DB schema has the column you need                         | Read the latest `migrations/NNNN_*.sql` files, or run `npx wrangler d1 execute english-learning-db --local --command="..."` |
| 3.16 | Package manager                                               | This repo uses `npm` (`package-lock.json`)                         |
| 3.17 | D1 query returns synchronously                                | **All D1 queries are async.** Always `await`                       |
| 3.18 | A wrapper enforces user ownership                             | Every user-scoped wrapper takes `userId` as first param. Routes call `requireUserId()` and pass it explicitly |

---

## 4. Architecture rules

### 4.1 Routing — Next.js 16 App Router

- App Router only. **No `pages/` directory.**
- Page: `src/app/<segment>/page.tsx`.
- Dynamic segment: `src/app/<segment>/[id]/page.tsx`. Type `params` as
  `Promise<{ id: string }>` and `await params`.
- API route: `src/app/api/<resource>/route.ts`. Plural noun where applicable. Dynamic id:
  `[id]/route.ts`.
- `cookies()` is async — use `await cookies()`.
- `headers()` is async — use `await headers()`.
- Route handlers are **uncached by default** in Next 16. Don't assume the
  old caching semantics.
- Pages reading mutable DB state export
  `export const dynamic = 'force-dynamic'` (project-wide pattern).
- Most auth-related route handlers also set `export const runtime = 'nodejs'`
  explicitly (the OpenNext default is already Node, but being explicit avoids
  edge-runtime confusion).
- **Note on `middleware.ts`:** in Next.js 16.2 this file convention is
  deprecated in favor of `proxy.ts`. Build emits a warning but still works.
  Don't auto-rename — ask the user before changing.

### 4.2 Server vs. client components

- Server Component by default.
- Add `'use client'` only when the file needs hooks, state, browser APIs,
  or event handlers.
- **Server-only modules — never import from `'use client'` files (directly or transitively):**
  - `@/lib/db` (D1 binding access via Cloudflare context)
  - `@/lib/current-user` (reads cookies)
  - `@/lib/auth` (reads `process.env.AUTH_SECRET`)
  - `@/lib/ai/*` (reads `process.env.GEMINI_API_KEY`)
  - Any `@/lib/flashcards/*` file that imports `@/lib/ai` (e.g. `cloze.ts`,
    `distractors.ts`). Pure helpers (`srs.ts`, `spelling.ts`) are safe.
- If a client component needs validation logic (e.g. `checkAnswer`,
  `levenshtein`), **inline it** in the client file rather than importing from
  a server-only module.

### 4.3 Data flow

- Read data in Server Components by calling `…Db.getX(userId, ...)` directly from
  `@/lib/db`. Do **not** `fetch('/api/…')` from a Server Component.
- Client-side mutations: `fetch('/api/…', { method: 'POST' })` then
  `router.refresh()`.
- **This project does not use Server Actions.** Do not introduce them
  unless the user explicitly asks.

### 4.4 Auth

- **Multi-user with Google OAuth.** `users` table populated automatically on
  first login. First user becomes `is_admin = 1`.
- Whitelist via `ALLOWED_EMAILS` env var (comma-separated). Empty = open to
  any Google account. Check via `isEmailAllowed(email)` in
  `src/lib/auth.ts`.
- Cookie: `auth`, value `<user_id>.<timestamp_ms>.<hex_hmac>`. Verified by
  `verifyAuthToken(token)` — returns `userId | null`. 30-day expiry.
- HMAC secret: `process.env.AUTH_SECRET` (required, ≥16 chars).
- OAuth credentials: `process.env.GOOGLE_CLIENT_ID`,
  `process.env.GOOGLE_CLIENT_SECRET`.
- `src/middleware.ts` gates all non-public paths. Public paths:
  `/login`, `/api/auth/google`, `/api/auth/callback/google`,
  `/api/auth/logout`, static assets.
- **In route handlers** that need the user, call
  `const userId = await requireUserId();` (throws `UnauthorizedError` if
  unauthed; middleware should have already redirected anonymous requests).
- **Never trust `user_id` from a request body or URL.** Always derive from
  the cookie via `requireUserId()`.

### 4.5 Database

- **Cloudflare D1 — async API everywhere.** Every query:
  `await db.prepare(sql).bind(...).first<T>()` or `.all<T>()` or `.run()`.
  No `.get()`. No `.iterate()`. No sync.
- Access the binding via `await getDb()` from `@/lib/db` — never call
  `getCloudflareContext()` directly in route handlers.
- Schema lives in `migrations/NNNN_<name>.sql` files. Apply with
  `npx wrangler d1 migrations apply english-learning-db --local`.
  Production: same command without `--local`.
- **Never modify a migration that has already been applied.** Write a new
  migration instead.
- Every user-scoped wrapper method takes `userId: number` as the first
  parameter. Every SQL filter for user-owned data must include
  `WHERE user_id = ?` (or join through a row that does).
- `flashcard_practice_sentences` is the one user-scoped-by-derivation
  exception: it has no `user_id` column, but routes must verify card
  ownership (via `flashcardsDb.getById(userId, cardId)`) before reading or
  writing sentences for that card.
- All queries use `.bind(...)` parameter binding. **Never string-concat
  values into SQL.**
- JSON-shaped fields are stored as TEXT columns. `JSON.parse` on read and
  `JSON.stringify` on write — inside the wrapper, not at the call site.
  See `hydrateCard()` / `hydrateDeck()` helpers in `src/lib/db.ts`.
- Booleans in SQLite/D1 are stored as INTEGER (0/1). Wrappers normalize to
  `boolean` when returning typed objects.
- Naming: `snake_case` tables / columns, `id INTEGER PRIMARY KEY AUTOINCREMENT`,
  `TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)` for timestamps.
- Result shape recap:
  - `.first<T>()` → `T | null`
  - `.all<T>()` → `{ results: T[], success, meta }` — use `.results`
  - `.run()` → `{ success, meta: { last_row_id, changes } }` — use
    `Number(result.meta.last_row_id)` for inserted ID
  - `.batch([...])` → `D1Result[]` (transactional for D1; atomic per Cloudflare docs)

### 4.6 Styling

- Tailwind v4. **Do not create `tailwind.config.*`.**
- V2 design tokens are CSS custom properties prefixed `--v-` defined in
  `src/app/globals.css`. Read them via `var(--v-…)`.
- **Never hard-code hex colors.** Use tokens.
- Yellow (`--v-yellow`) is reserved for **Flashcard nhanh / speed quiz**
  surfaces only — don't use it elsewhere.
- Stage colors map: `new=--v-blue`, `learning=--v-orange`,
  `review=--v-primary` (green), `mastered=--v-purple`.
- Char-diff colors (typed recall): correct=`--v-primary`,
  wrong-position=`--v-orange`, not-in-word=`--v-red`. Match the rating
  button color system.
- Inline `style={{}}` with CSS vars is the primary form. Recipe classes
  (`.v-card`, `.v-btn-primary`, etc.) in `globals.css` are convenience —
  prefer inline style.
- Mascot voice & copy convention: mascot calls itself **"mình"** and the
  user **"bạn"**. Keep consistent across UI strings.
- Sleeping Ngọc at sidebar bottom is decorative; poses can change with
  app state (idle → active, sleep → idle > 30s, run → during flashcard
  quiz, etc.). Currently always `sleep`.
- Icons: `lucide-react` only.

### 4.7 Forms & validation

- Native React state + `<form onSubmit>`. Do not introduce `react-hook-form`,
  `zod`, `yup`, or similar.
- Validate input manually inside the route handler. Never trust client
  data. Coerce types (`Number()`, `String()`) and validate ranges before
  passing to DB wrappers.

---

## 5. Security

- All secrets in `.dev.vars` (local) or Cloudflare secrets (production):
  `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `ALLOWED_EMAILS` (optional), `GEMINI_API_KEY` (optional).
- **Never hard-code secrets.** Never paste them in source.
- The user_id in the auth cookie is HMAC-signed. Always verify via
  `verifyAuthToken()` — never trust the cookie value without verification.
- **Every user-scoped DB query MUST be filtered by `user_id`** (or join
  through a row that is). This is the multi-tenancy boundary. A leaked
  query without `user_id` filter is a data-leak vulnerability.
- Prepared statements (`.bind(...)`) for every SQL query — no exceptions.
- Never log session content, cookies, passwords, OAuth tokens, or env
  secrets.
- Never read `.dev.vars` / `.env*` files and paste their contents into a
  reply.
- If you find a secret leaked in committed code, **tell the user**. Do not
  silently rewrite history.
- Google OAuth `state` parameter is CSRF protection — never skip verifying it
  in the callback.
- AI-generated content is treated as user input: never inject into SQL
  directly, never `eval`. Stored as plain TEXT in `flashcard_practice_sentences`.

---

## 6. AI behavior — non-negotiable

### 6.1 Honest reporting

After every task, your reply must clearly state:

- **What you did**, file by file.
- **What you didn't do** — skipped, deferred, or out of scope.
- **What you're uncertain about**, prefixed with `⚠️`. Example:
  "⚠️ I'm not sure the D1 batch semantics are atomic in error cases — please
  verify against the Cloudflare docs."
- **What you tested vs. didn't test.** "Types compile. Schema applied via
  wrangler. Did not exercise the route handler end-to-end."

Forbidden without verification: "done", "fixed", "complete", "working",
"tested".

### 6.2 No faking to pass

Never do any of the following to make code look like it works:

- `@ts-ignore` or `@ts-expect-error` without a written reason.
- `try { … } catch {}` that swallows the error silently.
- Hard-coded values to satisfy a check.
- Deleting or weakening an assertion.
- Stubbing missing imports with empty objects or fake exports.
- Mocking data without marking it `// TODO: replace with real data`.

If something is genuinely missing, **stop and ask** rather than inventing
a fake.

### 6.3 Preserve the user's code

- Keep existing comments, including TODOs, FIXMEs, and Vietnamese notes.
- Do not delete commented-out code — the user left it there for a reason.
- Do not add filler comments (`// increment i`).
- Do not reformat files you weren't asked to reformat.
- Do not rename variables or files outside the requested scope.

### 6.4 Ask before, not after

- If the request has ≥1 ambiguity that affects architecture, **ask first**.
- Minor style ambiguity → pick a reasonable option and note it.
- Never write 200 lines and then say "I assumed X, let me know if wrong."

### 6.5 Stop when looping

- If you've tried to fix the same issue 3 times without success, **stop**.
  Report the loop and ask the user for logs, screenshots, or a restated
  problem.
- Do not burn tokens on random fixes.

### 6.6 Protect user data

Never run the following without explicit confirmation in the chat:

- `rm -rf` / `rm` on anything outside the immediate scope.
- `DROP TABLE`, `TRUNCATE`, `DELETE FROM …` without `WHERE user_id = ?` (or
  equivalent narrow scope).
- `npx wrangler d1 execute … --remote` against the production DB.
- `git reset --hard`, `git push --force`, `git clean -fd`.
- Edits to `.dev.vars`, `.env`, `.env.*`, `wrangler.jsonc` secrets.
- `git commit` / `git push` — let the user do those.
- Schema migrations that drop columns or tables.
- Edits to files outside the repo (e.g. `~/.bashrc`, system config).

For any destructive DB operation locally, the user can re-apply migrations
to rebuild — but only after explicit confirmation.

### 6.7 Stay in scope

- Do the one thing requested.
- Do not refactor adjacent code "while you're there."
- If you see something worth fixing, list it at the end of the reply as a
  suggestion. Do not fix it without permission.

### 6.8 Reproducible behavior

- Do not depend on `Math.random()`, `Date.now()`, or `fs.readdir` ordering
  for core logic.
- If you must (shuffling distractors, generating OAuth state, etc.), it's
  fine — but document it.

### 6.9 Long-conversation drift

- Re-read this file before starting a new sub-task in a long session.
- Drift away from the original request is the most common failure mode.
  Re-read the original request as well.

---

## 7. After completing a large feature

A "large feature" = a new page + route handlers + DB tables, or anything
that spans ≥3 files.

When you finish one:

1. Ask the user: **"Should I write documentation for this feature?"**
2. If yes → create `src/doc/<feature-name>.md`.
   (`src/doc/` does not exist yet; create it on first use.)
3. Documentation must be written in **English**, regardless of the
   conversation language.
4. Include: purpose, file map, data model, public API surface, gotchas,
   any decisions worth recording for future maintainers.
5. Keep it concise — this is a developer note, not marketing copy.

---

## 8. Conventions

- **Path alias:** `@/*` → `./src/*`. Always use it (`@/components/...`,
  `@/lib/...`).
- **Component files:** `PascalCase.tsx`.
- **Library / util files:** `kebab-case.ts` (e.g. `current-user.ts`,
  `srs.ts`).
- **Hooks:** `useThing.ts` in `src/hooks/`.
- **Variables / functions:** `camelCase`. Types / React components:
  `PascalCase`.
- **API routes:** `/api/<plural-resource>`, dynamic id `[id]`.
- **TypeScript:** `strict` is on. No `any` — use `unknown` and narrow. No
  `@ts-ignore`.
- **Migrations:** `migrations/NNNN_<name>.sql`, four-digit zero-padded
  prefix. Numbering is global (one sequence across all features).
- **UI locale:** Vietnamese is the user-facing default. Match the locale of
  the surrounding section. Files in `src/doc/` are English-only.
- **Mascot voice:** "mình" (mascot) / "bạn" (user). Don't break this.

---

## 9. Forbidden without explicit user confirmation

1. Installing or removing any npm package.
2. Upgrading or downgrading any version in `package.json`.
3. Editing any `.dev.vars` / `.env*` file.
4. Editing `wrangler.jsonc` bindings, secrets, or compatibility flags.
5. Running `wrangler` commands that touch the remote DB (`--remote`,
   `wrangler d1 backup`, etc.).
6. Deleting any file outside the explicit scope of the request.
7. Running git commands that rewrite history or push to a remote.
8. Dropping DB tables or columns. Modifying an already-applied migration.
9. Creating accounts, calling external paid APIs, or sending real emails.
10. Disabling TypeScript strictness or skipping type errors.
11. Running `npm run build`, `npm run dev`, `npm run preview`, or
    `npm run deploy` automatically.
12. Adding a `pages/` directory or anything that signals dropping App Router.
13. Renaming `src/middleware.ts` to `src/proxy.ts` (Next.js 16.2 deprecation)
    without asking — ask first.
14. Introducing Server Actions, NextAuth, iron-session, or any new auth
    library.

---

## 10. Quick mental checklist before you reply

- [ ] Did I read the relevant existing file(s)?
- [ ] Did I check the installed version of any library I used?
- [ ] Am I reusing existing components / DB wrappers / patterns?
- [ ] Did I scope every user-data query by `user_id`?
- [ ] Did I `await` every D1 query?
- [ ] Did I keep server-only modules out of `'use client'` files?
- [ ] Did I stay strictly within the requested scope?
- [ ] Am I about to claim "done" without testing? (Don't.)
- [ ] Did I list everything I'm uncertain about?
- [ ] Is this a large feature → do I need to ask about `src/doc/`?

---

End of file.