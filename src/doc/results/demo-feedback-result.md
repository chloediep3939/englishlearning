# Demo account + Feedback popup — result

## Scope

Two bundled features:

1. **Demo accounts** — a "Trải nghiệm ngay" button on `/login` mints a synthetic user (`demo-…@bun.local`), seeds 3 decks × 4 cards + 2 sample passages + a few "already studied" review rows, sets the HMAC auth cookie, and redirects to `/dashboard`. A persistent banner above `<main>` warns about the 24 h auto-expiry and offers a one-click upgrade to Google OAuth.
2. **Feedback widget** — a sidebar item (with companion modal) that POSTs `{ rating?, content, email? }` to `/api/feedback`. Visible on every page, in both collapsed and expanded sidebar modes; submits Bún-voice copy and a green "thanks 🌱" confirmation.

## Files changed

### New

- [migrations/0011_demo_feedback.sql](migrations/0011_demo_feedback.sql) — adds `users.is_demo`, `users.demo_expires_at` (unix-seconds, partial index), creates `feedback` table with FK SET NULL.
- [src/lib/demo/seed-data.ts](src/lib/demo/seed-data.ts) — hand-written demo content: 3 decks × 4 cards × 2 cloze sentences + 2 short passages + `DEMO_SEED_HISTORY` table. Replaces the literal-`[]` placeholder shape from the prompt.
- [src/lib/demo/seed-user.ts](src/lib/demo/seed-user.ts) — `seedDemoUser(userId)` helper. Inserts decks (flips first to default), cards, gates cloze pool by `countByWord` (shared global table), seeds review history + status updates for 4 cards, inserts passages, batch-upserts settings.
- [src/app/api/auth/demo/route.ts](src/app/api/auth/demo/route.ts) — `POST /api/auth/demo`. Validates `AUTH_SECRET`, creates user via `usersDb.createDemo`, seeds, sets HTTP-only HMAC cookie, returns `{ ok, redirect: '/dashboard' }`. Rolls back (deletes passages then user) if seeding throws.
- [src/app/api/feedback/route.ts](src/app/api/feedback/route.ts) — `POST /api/feedback`. Validates `content` length (10–2000), `rating` range (1–5), reads `Referer` + `User-Agent`, stamps `is_demo_user` from the cookie identity. Skips the prefilled email when it's a synthetic `@bun.local` placeholder.
- [src/components/demo/demo-banner.tsx](src/components/demo/demo-banner.tsx) — client banner with 60 s tick + sessionStorage-scoped dismiss + `Đăng ký bằng Google` CTA.
- [src/components/feedback/feedback-widget.tsx](src/components/feedback/feedback-widget.tsx) — combined button + modal client component. Bún-pose header, emoji mood picker (1/3/5), textarea (counter), optional email, green success state.
- [scripts/generate-demo-seed.ts](scripts/generate-demo-seed.ts) — one-shot dev script. Uses raw `fetch` (no Cloudflare context) against Free Dictionary, MyMemory, Datamuse, Gemini, Pexels; reads keys from `process.env`. Documented to run via `GEMINI_API_KEY=… npx -y tsx scripts/generate-demo-seed.ts`. **Not run** as part of this task — see Follow-ups.
- [src/doc/prompts/demo-feedback.md](src/doc/prompts/demo-feedback.md) — verbatim main prompt copy (CLAUDE.md §8).
- [src/doc/prompts/demo-feedback-updates.md](src/doc/prompts/demo-feedback-updates.md) — verbatim updates copy.
- [src/doc/results/demo-feedback-result.md](src/doc/results/demo-feedback-result.md) — this file.

### Modified

- [src/lib/types.ts:5-29](src/lib/types.ts#L5-L29) — `User` gains `is_demo: boolean` + `demo_expires_at: number | null`. New `Feedback` + `FeedbackInput` interfaces.
- [src/lib/db.ts](src/lib/db.ts) — `hydrateUser()` helper; `usersDb.getById` / `getAll` route through it. New `usersDb.createDemo()` + `deleteById()`. New `feedbackDb.create()` + `listRecent()`. `Feedback` import added.
- [src/lib/current-user.ts](src/lib/current-user.ts) — `getCurrentUser()` delegates to `usersDb.getById()` so `is_demo` hydration stays in one place.
- [src/middleware.ts:11](src/middleware.ts#L11) — `/api/auth/demo` added to `PUBLIC_PATHS`. Anonymous callers can mint a demo cookie.
- [src/app/login/LoginInner.tsx](src/app/login/LoginInner.tsx) — adds `Trải nghiệm ngay` button, `hoặc` divider, sub-text, loading spinner via inline `animation: 'v-spin 1s linear infinite'`, error toast.
- [src/app/layout.tsx](src/app/layout.tsx) — wraps `<main>` in a flex-column so `DemoBanner` can sit above it when `user.is_demo`. Passes `isDemo` to `<Sidebar>`.
- [src/components/Sidebar.tsx](src/components/Sidebar.tsx) — new `isDemo?: boolean` prop. `FeedbackWidget` inserted between nav and avatar block. Moved `marginTop: 'auto'` to the new wrapper so the bottom anchor still works.

## Key decisions

- **Feedback placement: sidebar bottom**, not a global header (per your decision before implementation). There is no app-wide header — only the dashboard page renders a header row with `<ClockPill />`. Putting the widget in the sidebar means it survives sidebar collapse (icon-only, `title=` tooltip) and is visible on every page in the app.
- **Hand-written seed only** (your "Recommended" answer). The script ships ready-to-run but I did not execute it: it needs a `GEMINI_API_KEY` and would burn ~60 Gemini calls. Today's demo flow uses the hand-written 12-card seed in `seed-data.ts`. You can rerun the script later and the file gets overwritten.
- **Cleanup: deferred (Option B)**. No `wrangler.jsonc` edit, no scheduled handler. Demo rows accumulate until you delete them manually — the partial index `idx_users_demo_expires WHERE is_demo = 1` makes the future cleanup query fast (`DELETE FROM users WHERE is_demo = 1 AND demo_expires_at < unixepoch()`).
- **Email allowlist bypass**. `ALLOWED_EMAILS` only gates Google OAuth (`isEmailAllowed` in `src/lib/auth.ts`). The demo route doesn't call it — synthetic `@bun.local` emails would never match a real allowlist anyway, and gating demo creation behind one defeats the purpose.
- **No `nanoid`**. Per CLAUDE.md §10.1 the dependency cannot be added without explicit approval. The route uses `crypto.randomUUID().replace(/-/g, '').slice(0, 10)` which gives plenty of entropy for an internal placeholder email.
- **`wrangler.toml` → `wrangler.jsonc`**. The repo uses the JSONC form; the prompt mentioned `wrangler.toml` only in the (rejected) Option A. No change.
- **Migration number 0011** (not 0008). 0010 was the last applied migration before this task.
- **Synthetic email handling in `/api/feedback`**. When a demo user submits without typing a custom email, we record `email = NULL` instead of the synthetic `demo-…@bun.local` — that placeholder is meaningless for replies. Real users' emails are preserved.
- **`flashcard_cloze_pool` is shared globally** (no `user_id`), so the seeder gates each `bulkInsert` on `countByWord(word) === 0`. Multiple demo signups for the same word list don't duplicate rows.
- **Rollback path** in `/api/auth/demo`. `passages.user_id` FK is declared without `ON DELETE CASCADE` (see [migrations/0006_passages.sql:19](migrations/0006_passages.sql#L19)), so the rollback deletes passages first, then the user — relying on cascades for decks/cards/reviews/test_attempts/settings (those FKs do declare CASCADE in [migrations/0004_flashcards_multiuser.sql](migrations/0004_flashcards_multiuser.sql) and [0003_users.sql](migrations/0003_users.sql)).

## Deviations from prompt

- **Mascot**: prompt mentioned a `bun-happy` pose. The modal uses `ngoc-happy.png` (per Update 6, since the `ngoc-*` files are the canonical poses and `bun-*` is landing-only). The "Bún" name in copy is unchanged.
- **Hand-written seed is 12 cards, not 60**. Your "Recommended" answer was to ship a small seed and run the script later. The script's word lists do contain all 60 words from the prompt.
- **Demo banner**: rendered above `<main>` via a new flex-column wrapper inside the user-shell branch of `src/app/layout.tsx`, rather than inside a non-existent "sidebar layout" component (the prompt referenced `src/components/app-shell/sidebar-layout.tsx`, which doesn't exist in this repo).
- **`src/lib/db/feedback.ts` and `src/lib/db/users.ts`** (separate files in the prompt's "files touched" list) merged into `src/lib/db.ts` to match the existing monolithic shape. No split-file refactor.
- **Feedback button icon**: `MessageSquare` (lucide) over `MessageCircleHeart` — `MessageCircleHeart` isn't in the lucide version used here.
- **No "60 từ" claim in the banner copy** — the hand-written seed only ships 12, so the sub-text on login says "12 từ mẫu + 2 bài đọc".

## Verification

- ✅ `npx tsc --noEmit` — clean (no output → 0 errors).
- ✅ Migration applied locally: `npx wrangler d1 migrations apply english-learning-db --local` reported both `0010` and `0011` as applied.
- ✅ Schema sanity-checked via `PRAGMA table_info(users)` and `PRAGMA table_info(feedback)` — both have the expected columns.
- ⚠️ **Did not run `npm run build`, `npm run preview`, or `npm run dev`** — CLAUDE.md §10.11 forbids running build/dev scripts without explicit ask.
- ⚠️ **Did not exercise the route handlers end-to-end** in a running server. `tsc` is the only behavioural check; the demo creation + seed flow has not been booted in a browser.
- ⚠️ **`scripts/generate-demo-seed.ts` not run.** Would need `GEMINI_API_KEY` in env + `tsx` installed (or `npx -y tsx`). The script is type-clean against `noEmit` because `tsc` includes it via the project's default-config glob; if the user has issues running it, the most likely cause is `tsx` not resolving.
- ⚠️ **Migration not applied to remote.** Section 1 of the prompt said "apply local + remote". I did not run `npx wrangler d1 migrations apply english-learning-db` (without `--local`), per CLAUDE.md §10.5 which forbids remote DB writes without explicit confirmation. **You should run that yourself before deploying.**

## Follow-ups / known issues

- **Run the seed script** when you have `GEMINI_API_KEY` configured: `GEMINI_API_KEY=… npx -y tsx scripts/generate-demo-seed.ts`. It will overwrite `src/lib/demo/seed-data.ts` with a richer 60-word seed. If you want images, also set `PEXELS_API_KEY`.
- **Apply migration 0011 to remote**: `npx wrangler d1 migrations apply english-learning-db` (no `--local`).
- **Cleanup job (Option A) is still on the table** if demo signups accumulate. The shape we'd want: `triggers.crons = ["0 3 * * *"]` in `wrangler.jsonc`, plus an `export default { async scheduled(_ev, env) { … } }` in a Worker entry — but OpenNext currently owns `.open-next/worker.js`, so the scheduled handler would need wiring through their `wrangler.toml` extension API. Defer until you actually have demo-row buildup.
- **`scripts/` has no `README.md`**. The script itself documents its env vars in the file header; you can add a README if more scripts land.
- **Pexels images are not seeded** in the hand-written content. All `image_url` fields are `null`. The script can populate them but you'll see "Tap to add an image" placeholders in card detail meanwhile.
- **Locked-down `ALLOWED_EMAILS`** + demo upgrade: clicking "Đăng ký bằng Google" in the banner sends the user to Google OAuth; if their real email isn't on the allowlist, they'll land back on `/login` with `error=not_allowed`. That's the existing behaviour, not changed here — but worth knowing if you ship demo accounts to people outside the allowlist.
- **No demo-account quota.** Anyone can hit `/api/auth/demo` repeatedly to mint accounts. If abuse becomes a concern, add an IP-keyed rate-limiter (e.g. Cloudflare's `RateLimit` binding) on the route.
