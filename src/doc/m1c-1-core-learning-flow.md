# M1c-1 — Core Learning Flow UI

Status: **10 of 12 files done.** ReviewSession + `/review/page.tsx` pending — the source spec was truncated and not yet re-supplied.

## Purpose

Ship the user-facing surface for the SRS core loop:

1. **Dashboard** — show real per-user counts, streak, and CTAs into study/review.
2. **Add** — type an English word, auto-pull dictionary/collocation/translation data via `/api/cards/generate`, save to DB.
3. **Study** — walk through new cards (capped by `daily_new_limit`), rate each with the 4-button SM-2 grading.
4. **Sidebar** — surfaces user identity (avatar + name) and a logout control.

The accompanying review flow (typed recall before reveal) lives in `ReviewSession` which is not yet wired up.

## File map

| Path | Role |
| --- | --- |
| `src/app/layout.tsx` | Root layout. Reads current user, gates sidebar render on auth. |
| `src/app/page.tsx` | Dashboard server component — runs four DB queries in parallel via `Promise.all`. |
| `src/app/add/page.tsx` | Add page wrapper around `AddCardForm`. |
| `src/app/study/page.tsx` | Study page — loads `getNewForToday(userId, daily_new_limit)`, hands cards to `StudySession`. |
| `src/components/Sidebar.tsx` | Client nav, 10 routes, user info card, logout. |
| `src/components/Mascot.tsx` | Pose-based mascot image (unchanged from M0, used by several pages). |
| `src/components/AudioButton.tsx` | Audio playback button, `Audio` element first, `speechSynthesis` fallback. Two variants: `circle` (default) and `inline` (pill). |
| `src/components/WordCard.tsx` | Read-only card display — english/IPA/POS/Vietnamese/examples/collocations/notes. `compact` prop trims examples + hides collocations/notes. |
| `src/components/RatingButtons.tsx` | 4-button SRS rating (quality 0/2/4/5). Renders kbd hint. |
| `src/components/LogoutButton.tsx` | POST `/api/auth/logout`, then `router.push('/login')`. |
| `src/components/AddCardForm.tsx` | Add form with auto-generate step. Submits to `/api/cards`, resets + toasts on success. |
| `src/components/StudySession.tsx` | Stateful session UI — progress bar, current card, rating buttons, keyboard shortcuts, done screen. |
| `next.config.ts` | Adds `images.remotePatterns` for `lh{3,4,5,6}.googleusercontent.com` so `<Image>` can render Google avatars. |

## Data flow

```
Server Components (page.tsx, add/page.tsx, study/page.tsx)
  └── requireUserId() + DB wrapper calls directly (no fetch)
        └── flashcardsDb.getNewForToday(userId, limit)
        └── flashcardReviewsDb.getStreakDays(userId)
        └── userSettingsDb.getFlashcardSettings(userId)

Client Components (AddCardForm, StudySession, LogoutButton)
  └── fetch('/api/...') -> uses M1b routes
        POST /api/cards/generate    -> auto-fill data
        POST /api/cards             -> create
        POST /api/cards/:id/rate    -> SRS update + review log
        POST /api/auth/logout       -> clear cookie
```

Server pages never call their own API routes. Client components are the only `fetch` callers.

## Styling conventions

- All styling is **inline `style={{...}}`** using CSS custom properties from `src/app/globals.css` (`--v-*`).
- No Tailwind utility classes inside these components. Tailwind is loaded globally but only consumed as the CSS reset/baseline.
- Color tokens used here: `--v-bg`, `--v-surface`, `--v-panel`, `--v-ink`, `--v-ink-soft`, `--v-muted`, `--v-border`, `--v-primary`, `--v-primary-deep`, `--v-primary-soft`, `--v-accent`, `--v-accent-soft`, `--v-red`, `--v-orange`, `--v-yellow`, `--v-blue`, `--v-purple`.
- Typography: `--v-font-head` (Nunito, weights 700-900), `--v-font-body` (Nunito), `--v-font-mono` (JetBrains Mono).
- Brand label in sidebar: **"English Learning"** (the spec wrote "Học AV"; the user preference rules).

## Public API surface (this milestone)

None of these files export anything consumed by other modules outside their own page. They're pure UI primitives. Other client code can re-import them as plain default exports.

Internal contract worth noting:

- `RatingButtons.onRate: (quality: 0 | 2 | 4 | 5) => void` — quality values are **non-contiguous** (no 1, 3). Matches the `flashcardReviewsDb` CHECK constraint.
- `WordCard.compact: boolean` — when true, only first example shown and collocations/notes hidden. Use in lists.
- `AudioButton.variant: 'circle' | 'inline'` — circle for hero use, inline pill for compact contexts (e.g. AddCardForm preview).

## Gotchas

- **Auth is via `requireUserId()` in server components.** It throws `UnauthorizedError`. Middleware should redirect before this fires for unauthed users, but if it ever does fire, Next will render the closest error boundary — currently there is none, so a hard 500 is the failure mode. Worth adding `error.tsx` later.
- **`next/image` with Google avatars** requires `next.config.ts` → `images.remotePatterns`. If Google ever serves from `lh7+.googleusercontent.com`, that domain has to be added too. There is no wildcard.
- **`useSearchParams` requires a `Suspense` boundary** in Next 16 client trees that read query params. Login page already wraps its inner client with Suspense for this reason. Study/Add do not read query params yet, but if added later remember the wrapper.
- **`Sidebar` is `'use client'`** because it uses `usePathname()` for the active highlight. The `userEmail/userName/userPicture` props are passed down from the server layout, so the user info itself doesn't need a client fetch.
- **`router.refresh()` after every mutation.** Server components have no client cache invalidation, so without `refresh()` the dashboard counts/streak will lag behind by one navigation.
- **Keyboard shortcuts (1/2/3/4)** in `StudySession` listen on `window` and fire even if the page also has a focused input. There are no inputs on the study screen so it's currently fine; if any get added, the handler needs to skip when an `<input>` or `<textarea>` is focused.
- **SRS quality is 0/2/4/5** (not 0-5). Matches Anki-style SM-2 4-button. Don't accept other values from the client; the route validator rejects them.
- **No optimistic UI in `StudySession`.** Rating waits for the POST to return before advancing. On a slow network the user will feel lag. Worth adding optimistic advance later, but be careful about retry/error states.
- **`AddCardForm` does not validate length client-side.** The route enforces `english ≤ 200 chars` and `vietnamese ≤ 500 chars` — server-side rejection only.
- **Spec deviations recorded:**
  - Sidebar brand label is "English Learning" not "Học AV" — user preference.
  - `next.config.ts` remote patterns added (out of spec scope but needed for runtime).
  - Mascot alt text is "Bún" not "Ngọc" — user renamed in M0-patch.

## Open items before M1c-1 is complete

1. `src/components/ReviewSession.tsx` — typed-recall variant. Distinct from `StudySession`: must accept user input, compare against the answer, then reveal the card and offer rating buttons.
2. `src/app/review/page.tsx` — page wrapper, calls `flashcardsDb.getDueForReview(userId, limit)` instead of `getNewForToday`.

Sidebar nav and dashboard CTA already link to `/review`; until those two files exist that route 404s at runtime.

## Future maintainers

- If you add a new study mode (e.g. listening), copy the `StudySession` shell rather than abstracting prematurely. The cycle of "fetch cards → progress → display card → rate → advance → done screen" is shared, but the actual card UI differs enough per mode that one shared component would grow into a flag soup.
- Inline styles will eventually become a pain. The reason we're not extracting CSS modules yet is V2 tokens are still in flux. Once tokens stabilise (probably after M2), consider migrating components to CSS Modules or styled-jsx.
- The dashboard runs four parallel DB queries. If `flashcardReviewsDb.getStreakDays` becomes a hot path (it iterates up to 365 rows of distinct dates), profile and consider caching the result on `users.last_streak_computed`.
