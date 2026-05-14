# Dashboard polish #1 — streak bar + clock/Pomodoro + sidebar collapse

Three concurrent changes to the global shell + dashboard.

## Files

| Path | Change |
| --- | --- |
| `src/components/dashboard/streak-bar.tsx` | **New.** 14-cell streak strip with streak#/check/date labels. Two layout modes (A: today right-anchored; B: today centered at 8). |
| `src/components/pomodoro/pomodoro-provider.tsx` | **New.** React Context. Phase state machine `idle/work/break/paused`. Timer = `endsAt - Date.now()` (drift-free). Hydrates from `localStorage`; auto-advances if the saved `endsAt` expired while the tab was closed. Web-Audio beep on phase end. |
| `src/components/pomodoro/clock-pill.tsx` | **New.** Header pill. Shows wall-clock `HH:MM` (30s refresh) when idle, `mm:ss` countdown otherwise. Bg tint changes by phase. Click → popover with big timer + buttons. |
| `src/app/layout.tsx` | Wraps the app shell in `<PomodoroProvider>`. Reads `pomodoro_work_minutes` / `pomodoro_break_minutes` from `userSettingsDb`. |
| `src/app/page.tsx` | Removed the diamond pill; added `<ClockPill />` to the header row. Replaced the inline 14-day calendar strip with `<StreakBar />`. Removed unused `activity14`. |
| `src/components/Sidebar.tsx` | Removed the "Bún ngủ trưa" block. Added a `PanelLeftClose/PanelLeftOpen` toggle. Collapsed mode = 64px, icon-only, native `title=` tooltips. Persists to `localStorage` key `sidebar_collapsed`. |
| `src/lib/types.ts` | `FlashcardSettings` gains `pomodoro_work_minutes` (default 25) + `pomodoro_break_minutes` (default 5). |
| `src/lib/db.ts` | `userSettingsDb` reads/writes the two new keys. `flashcardReviewsDb.getLongestStreak(userId)` — single SQL pass over distinct review-dates. `SETTINGS_KEYS` extended. |
| `src/app/api/settings/route.ts` | PUT accepts `pomodoro_work_minutes` (1–120) and `pomodoro_break_minutes` (1–60). |

## Pomodoro state machine

```
idle ── start ──► work ── (endsAt) ──► break ── (endsAt) ──► work ── …
  ▲                │                        │
  │                pause                    pause
  │                ▼                        ▼
  └── reset ──── paused ◄──── resume ───────┘
```

Persistence shape (one localStorage key, `pomodoro_state`):

```ts
{
  phase: 'idle' | 'work' | 'break' | 'paused',
  endsAt: number | null,          // Date.now() epoch ms; null when idle/paused
  lastPhase: 'work' | 'break',    // what we were doing before pause / what to resume
  remainingMsAtPause: number | null,
}
```

If the tab is closed mid-work and reopened after `endsAt`, the provider
auto-advances to the next phase rather than restoring stale `endsAt`. This
means the user comes back to "now in break" instead of a frozen 00:00.

## Streak bar layout

`N = 14`. Position of today's cell:

- `streak = 0` → `T = 1` (today leftmost, everything else projected future).
- `0 < streak < 14` → `T = streak` if reviewed today, else `streak + 1`
  (today sits at the right edge of the past run).
- `streak ≥ 14` → `T = 8` (centered).

Each cell shows:
- **Top:** streak day number (`var(--v-ink)` for past/today, `var(--v-muted)` for future).
- **Middle pill:**
  - Past → solid `--v-primary` + white check.
  - Today (reviewed) → same as past.
  - Today (pending) → dashed `--v-primary` border + 6px primary dot.
  - Future → dashed `--v-border`, transparent fill.
- **Bottom:** local-timezone `d/M` (no leading zero), `--v-ink-soft`.

The local-timezone bit forces the component to be a Client Component —
SSR would compute dates in the server's TZ, which Cloudflare Workers
report as UTC.

## Sidebar

- "Bún ngủ trưa" block removed entirely (no replacement, no fallback).
- Toggle at the top of the sidebar (right-aligned when expanded, centered when collapsed).
- Collapsed mode (64px): module heading hidden, nav labels hidden, native
  `title=` for hover tooltip, user avatar centered (name + logout
  hidden).
- Persisted to `localStorage` key `sidebar_collapsed` ("1" / "0").
- `transition: width 200ms ease, padding 200ms ease` — main content
  width adjusts because the sidebar's `width` is the actual element width.

## Settings & TODOs

- `pomodoro_work_minutes` / `pomodoro_break_minutes` are wired through
  `FlashcardSettings`, the DB, and the GET/PUT route — but there's **no
  UI on /settings yet** for changing them. Defaults (25/5) apply
  silently. Settings-page UI is a follow-up.
- Longest-streak `kỷ lục: N` is computed by
  `flashcardReviewsDb.getLongestStreak` and surfaced as a subtitle on
  the streak bar. Cached only by the page render (re-queries on each
  dashboard load); fine for now since it's bounded by distinct review
  days.

## Gotchas

- **Provider mounts on every page**, but the clock pill only renders on
  `/`. That's intentional — the spec only puts the pill in the dashboard
  header. State (and the beep on phase transition) survives navigation
  even when the pill isn't visible.
- **Sidebar avatar is hydration-gated** (`hydrated` state). Without
  this, SSR renders the expanded user block, then on hydration we'd
  snap to collapsed → flash of wrong layout. The gate trades one render
  cycle for no flash.
- **No migration is required** — the new settings live in
  `user_settings(key, value)` rows that are upserted on demand. Existing
  users will see defaults (25/5) until they POST a new value.
- **`getStreakDays` quirk** (pre-existing, not changed): if the user
  hasn't reviewed today, it returns `0` even when they reviewed
  consecutively up to yesterday. So `streak = 5, reviewedToday = false`
  doesn't currently happen, even though the streak-bar logic handles
  it correctly if the helper is fixed later.
