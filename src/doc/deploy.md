# Deploy to Cloudflare Workers (production)

End-to-end runbook for shipping the app to production on Cloudflare Workers
via `@opennextjs/cloudflare`. Captures the steps that worked **and** the
account-level surprises that blocked the first attempt — read both.

Status: production live at
`https://english-learning.dth290490.workers.dev` (Worker name
`english-learning`, D1 binding `DB` →
`02877c6b-122b-4d7b-bf92-f29b42700dae`). Initial deploy: 2026-05-14.

## What this covers

- Wrangler-driven prod deploy (secrets, D1 migrations, Worker upload).
- Manual browser-only steps (workers.dev subdomain onboarding, Cloudflare
  Access removal, Google OAuth redirect URI).
- Smoke checks that can be done with curl alone.
- Common stumbling blocks discovered the hard way.

Out of scope: custom domains, multi-environment (staging/preview), CI/CD,
rollback procedures beyond `wrangler rollback`.

## Account-level prerequisites (do once, ever)

Two prerequisites are easy to miss because they live at the Cloudflare
account level, not in this repo. Both blocked the first deploy.

1. **`workers.dev` subdomain must be registered for the account.** Without
   this, `wrangler deploy` builds and uploads the Worker successfully but
   then fails with `You need to register a workers.dev subdomain before
   publishing to workers.dev`. Register at
   `https://dash.cloudflare.com/<account_id>/workers/onboarding`. The
   chosen subdomain (e.g. `dth290490`) becomes part of every `*.workers.dev`
   URL on the account and is effectively permanent.

2. **Cloudflare Access must NOT be gating the hostname.** If the account
   has a Zero Trust / Access application covering `*.workers.dev`, the
   first request to the deployed Worker returns `302 →
   <team>.cloudflareaccess.com/...` instead of reaching the app's
   middleware. Symptom: `curl -I /` shows the cloudflareaccess.com
   redirect. Fix: dashboard → **Zero Trust → Access → Applications**, find
   the app covering the workers.dev hostname, delete it. This breaks the
   app's own Google OAuth callback (the Access gate fires before
   `/api/auth/callback/google` runs) so it's not just cosmetic.

## Prerequisites that live in this repo

- `wrangler.jsonc` — D1 binding with the correct `database_id` for the
  production D1 instance. Pre-existing.
- `open-next.config.ts` — OpenNext build config. Pre-existing.
- `.dev.vars` — local dev secrets. Used as the source for piping prod
  secrets into wrangler (one secret at a time, never echoed). **Not
  committed.**
- `migrations/NNNN_*.sql` — every numbered migration is applied to remote
  D1 in order. As of 2026-05-14: 8 migrations (`0001` through `0008`).

## Wrangler interactivity — secrets via stdin

`wrangler secret put NAME` reads from stdin when stdin is not a TTY.
Pattern used to set prod secrets without ever printing the value:

```bash
# Fresh AUTH_SECRET — generated, never reused from dev.
openssl rand -base64 48 | tr -d '\n' | npx wrangler secret put AUTH_SECRET

# Other secrets — extract from .dev.vars, strip optional quotes, pipe.
grep '^GOOGLE_CLIENT_ID=' .dev.vars | tail -1 \
  | sed 's/^GOOGLE_CLIENT_ID=//' | sed 's/^"//;s/"$//' | tr -d '\n' \
  | npx wrangler secret put GOOGLE_CLIENT_ID
```

`tr -d '\n'` matters — wrangler does trim, but stripping defensively
avoids accidentally storing a trailing newline as part of the secret.
`tail -1` matters if a key is duplicated in `.dev.vars` (we had two
`GEMINI_API_KEY=` lines from history — last one wins, matching how the
Cloudflare dev runtime reads `.dev.vars`).

Six secrets required for full functionality:

| Secret | Source | Notes |
| --- | --- | --- |
| `AUTH_SECRET` | freshly generated | **Never reuse dev value.** ≥32 chars random. HMAC key for the auth cookie. |
| `GOOGLE_CLIENT_ID` | reuse dev value | Same OAuth client works for dev + prod as long as both callback URLs are registered with Google. |
| `GOOGLE_CLIENT_SECRET` | reuse dev value | Paired with `GOOGLE_CLIENT_ID`. |
| `GEMINI_API_KEY` | reuse dev value | Without this, AI features (cloze, distractors, passage analysis, composition feedback) degrade. |
| `PEXELS_API_KEY` | reuse dev value | Without this, card image autofill returns no images. |
| `ALLOWED_EMAILS` | reuse dev value or skip | Comma-separated whitelist. Skip to allow any Google account. First user becomes admin. |

Verify all six via `npx wrangler secret list` (returns names only, never
values).

## Wrangler interactivity — Worker auto-create

On the *first* `wrangler secret put` for a new Worker name, wrangler
prompts `There doesn't seem to be a Worker called "X". Do you want to
create...?`. In non-TTY context, wrangler **falls back to yes** and creates
the Worker as a placeholder. Subsequent secret puts attach to that
placeholder. This is convenient — no need to deploy first.

## D1 migrations

```bash
npx wrangler d1 migrations list english-learning-db --remote
npx wrangler d1 migrations apply english-learning-db --remote
```

The `--remote` flag is the difference between this and local dev.
**Local** D1 lives in `.wrangler/state/v3/d1/`; **remote** D1 is the
Cloudflare-hosted SQLite instance keyed by `database_id` in
`wrangler.jsonc`. They are independent — applying migrations locally does
nothing for prod and vice versa.

After applying, sanity-check:

```bash
npx wrangler d1 execute english-learning-db --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

Expected user tables (11 as of 2026-05-14): `app_config`, `compositions`,
`flashcard_decks`, `flashcard_practice_sentences`, `flashcard_reviews`,
`flashcard_test_attempts`, `flashcards`, `passage_attempts`, `passages`,
`user_settings`, `users`. Plus system tables `_cf_KV`, `d1_migrations`,
`sqlite_sequence`.

Never modify a migration that has been applied to remote D1. Write a new
one.

## Deploy command

```bash
npm run deploy
```

Runs `@opennextjs/cloudflare build` (compiles Next.js for the Workers
runtime, emits `.open-next/worker.js` and `.open-next/assets/`) followed
by `wrangler deploy`. First run is ~2–4 minutes; rebuilds are much faster
because the OpenNext cache is reused.

On success, wrangler prints the `*.workers.dev` URL and a Version ID.
Save the URL — it's the only thing you need for Step 4 below.

## Google OAuth redirect URI (manual, browser-only)

The Google Cloud Console doesn't expose an API for editing redirect URIs
on existing OAuth clients, so wrangler cannot automate this.

1. https://console.cloud.google.com/apis/credentials
2. Open the OAuth 2.0 Client used by this app (same one whose ID is in
   `.dev.vars`).
3. **Authorized redirect URIs** → **+ ADD URI** →
   `https://<workers-subdomain>.workers.dev/api/auth/callback/google`
4. Keep existing `http://localhost:3000/...` / `http://localhost:8788/...`
   entries — those are still needed for local dev.
5. SAVE. Propagates in seconds.

Sanity check via curl: `curl -sI /api/auth/google` should `302` to
`accounts.google.com` with `redirect_uri=` matching exactly what was just
registered.

## Smoke tests (curl)

Infrastructure-level checks that don't require a browser:

| Probe | Expected |
| --- | --- |
| `curl -I /` (unauthed) | `307 → /login` |
| `curl -I /login` | `200` |
| `curl -I /api/auth/google` | `307 → accounts.google.com` with correct `client_id` + `redirect_uri` |
| `curl -I /decks` (unauthed) | `307 → /login?next=/decks` |
| `curl -I /mascot/ngoc-sleep.png` | `200` (proves asset binding works) |

These verify middleware gating, OAuth handshake setup, and the assets
binding. They do **not** verify D1 reads/writes, AI calls, or the full
OAuth round-trip.

## Smoke tests (browser-only)

Things curl cannot exercise. Open the prod URL in an **incognito** window
so dev cookies don't bleed in.

- Sign in with Google → consent → land on `/`.
- `/add` autofill: paste an English word, blur, IPA + Vietnamese + image
  populate.
- Save card → appears in default deck.
- `/review` → either empty state or due cards.
- `/passage/new` → paste ≥200 chars → redirects to `/passage/[id]` and
  auto-analyzes.
- `/pronounce` (Chrome only) → mic permission → ASR transcripts.
- `/compose` "Hôm nay" tab loads.

If anything fails, `npx wrangler tail` streams live prod logs while
reproducing.

## Gotchas

- **`AUTH_SECRET` MUST be fresh for prod.** Reusing the dev value means
  the same HMAC key signs dev + prod cookies — a session forged in dev
  would be valid in prod (and vice versa). The runbook flags this; do not
  ignore it.
- **The `workers.dev` URL is account-global.** Once you pick a subdomain
  (`dth290490`), every Worker on the account lives at
  `<worker-name>.<subdomain>.workers.dev`. You can't change it.
- **Cloudflare Access on the workers.dev domain breaks app auth silently.**
  The user never sees the app's `/login`; they get a Cloudflare SSO page
  instead. Worse, our `/api/auth/callback/google` is also gated, so
  Google's redirect after consent hits the Access gate, not our handler.
  Check `curl -I /` after every deploy that touches the account-level
  Cloudflare config.
- **`wrangler secret list` returns names only.** Designed that way — you
  cannot read a secret value back after setting it. To rotate, just `put`
  again with the new value.
- **`wrangler.jsonc` does not pin a wrangler version.** Production
  deployment used wrangler 4.90.1 on 2026-05-14. If wrangler ships a
  breaking change to `secret put` stdin behavior or `d1 migrations apply`
  semantics, the patterns here may break.
- **`compatibility_date: "2025-12-15"`** in `wrangler.jsonc` pins runtime
  features. Bumping it can introduce breaking Workers runtime changes —
  don't bump as part of a routine deploy.
- **The local D1 (`.wrangler/state/v3/d1/`) is not in sync with prod.**
  Don't assume `.first<T>()` results from local match prod row counts.
  Always `--remote` for prod debugging.
- **`npm run deploy` reads `.dev.vars` and prints a banner about it.**
  That's OpenNext informing you that those values are bundled into the
  *dev preview* deployment artifact metadata — actual prod secrets come
  from `wrangler secret put`. The banner is benign but startling.

## Rollback

```bash
npx wrangler deployments list
npx wrangler rollback <deployment-id>
```

Worker rollback only — D1 migrations are NOT reverted automatically. If a
migration broke prod, fix forward via `wrangler d1 execute --remote
--command "..."` queries (per CLAUDE.md §9, requires explicit user
confirmation for destructive ops).

## Future maintainers

- **Re-deploy is just `npm run deploy`.** No secret/migration steps unless
  you added a new secret or migration in this round of work.
- **Adding a migration:** write `migrations/NNNN_<name>.sql` (next number
  in the global sequence). Apply locally first
  (`npx wrangler d1 migrations apply english-learning-db --local`), test,
  then on next prod deploy run `npx wrangler d1 migrations apply
  english-learning-db --remote` before `npm run deploy`. Order matters —
  schema must exist before the new Worker tries to use it.
- **Adding a secret:** pipe it in as shown in the "Wrangler interactivity
   — secrets via stdin" section. Update the secrets table in this doc.
   Update code that reads `process.env.NEW_SECRET`.
- **Adding a new env var (non-secret):** add to `vars` block in
  `wrangler.jsonc`. Committed to git — DO NOT put secrets here.
- **Changing the OAuth client:** add the new client's ID + secret via
  `wrangler secret put`. Register the prod callback URL with the new
  client in Google Console. Old client can be deleted from Google once
  no sessions reference it (cookies are HMAC-signed by `AUTH_SECRET`, not
  by Google — so swapping OAuth clients invalidates *future* logins, not
  active sessions).
- **Custom domain:** dashboard → Workers & Pages → english-learning →
  Custom Domains → Add. Then re-register the callback URL with Google
  for the new origin. Re-run all the curl smoke checks against the new
  domain.
- **`compatibility_flags`** currently includes `nodejs_compat` (required
  for our Node-built libs) and `global_fetch_strictly_public` (D1 / OAuth
  fetches go through the public internet, not via internal Cloudflare
  bindings). Removing either will break the deploy.
