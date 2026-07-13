# Read-once mode, passage editing, and speed-quiz timer/border

Four related tweaks shipped together (2026-07-07).

## 1. Configurable speed-quiz timer (`speed_timer_seconds`)

The "Flashcard nhanh" per-question countdown was hard-coded at 8s. It is now a
user setting.

- **Setting key:** `speed_timer_seconds` (stored in `user_settings`, no schema
  change). `0` = timer off (the countdown bar is hidden entirely). Otherwise
  4–20s. `0` is preserved on read via the same explicit-undefined check used by
  `f1_max_attempts` (a plain `|| default` would turn 0 back into 8).
- **Type / range:** `FlashcardSettings.speed_timer_seconds` +
  `M3_SETTINGS.speed_timer_seconds` (`{default:8, min:4, max:20, step:1}`).
- **Plumbing:** `getFlashcardSettings` / `updateFlashcardSettings` in
  `src/lib/db.ts` (+ `SETTINGS_KEYS`); validated in
  `src/app/api/settings/route.ts` (`0` OR 4–20).
- **UI:** new `SpeedTimerControl` (slider + "Tắt đồng hồ" checkbox, modeled on
  `MaxAttemptsControl`), mounted in the "Luyện tập" settings card.
- **Consumption:** `src/app/speed/page.tsx` fetches settings client-side (same
  pattern as `sentence/page.tsx`) and passes `timerSeconds` to
  `SpeedQuizSession`, which renders `<TimerBar>` only when `timerSeconds > 0`.
  Note: `TimerBar` is purely visual — running out does nothing (the timer is
  "soft"), so hiding it is the whole behavior of "off".

## 2. Single option-border color

`SpeedQuizSession` used a 4-color decorative border array (`OPTION_COLORS`).
Removed — all four options now use `2px solid var(--v-border)`. Feedback colors
(green correct / red wrong / muted revealed) are unchanged.

## 3. Edit saved passages

Delete + the edit backend (`PUT /api/passages/[id]`, `passagesDb.update`)
already existed. Added the missing edit **UI**:

- Pencil button in `PassageLibraryRow` next to the trash button (both are
  buttons inside the row `<Link>`, so both `preventDefault`/`stopPropagation`).
- New route `src/app/passage/[id]/edit/` — server `page.tsx` loads the passage
  (ownership-checked via `passagesDb.getById`, `notFound()` otherwise) and hands
  it to `EditPassageClient`, which reuses `PassageForm` with `initialValues`,
  PUTs, then routes to `/read/[id]`. Editing content invalidates cached
  translations server-side (existing BR1 behavior).

## 4. Read-once mode ("Đọc nhanh", no save)

Read a pasted passage with full karaoke + per-sentence translation, but nothing
is persisted.

- **Entry:** new client route `src/app/read-once/page.tsx` — a textarea
  (≥20 chars) → renders `ReadAlong` in ephemeral mode with a synthetic passage
  (`id: 0`, `decks: []`). Reading rate/auto-continue are pulled from settings.
- **`ReadAlong` gained two props:** `ephemeral` and `backHref`.
  - `ephemeral` swaps the translations source: instead of the id-based
    cache-through route it POSTs raw `content` to the new
    `POST /api/reading/translate` (no cache, degrades to EN-only exactly like
    the id-based route). It also hides the saved-words tray/deck picker and
    passes `allowSave={false}` to `WordDetailCard`.
  - `backHref` (default `/passage`) — read-once points it at `/read-once` so
    "back" starts a fresh paste.
- **`WordDetailCard` gained `allowSave` (default true):** when false, the
  "Lưu vào bộ từ" button + save error are hidden; meaning/pronunciation lookup
  is untouched. The empty-state hint drops the "& lưu vào bộ từ" phrase.
- The glossary endpoint (`/api/words/glossary`, `/api/words/lookup`) is already
  id-less, so word meanings work in read-once with no changes.

### File map

| File | Change |
| --- | --- |
| `src/lib/types.ts` | `speed_timer_seconds` on `FlashcardSettings` + `M3_SETTINGS` |
| `src/lib/db.ts` | `SETTINGS_KEYS` + get/update for `speed_timer_seconds` |
| `src/app/api/settings/route.ts` | validate `speed_timer_seconds` (0 or 4–20) |
| `src/components/settings-controls/SpeedTimerControl.tsx` | **new** slider + off toggle |
| `src/app/settings/page.tsx` | mount `SpeedTimerControl` |
| `src/app/speed/page.tsx` | fetch setting, pass `timerSeconds`, dynamic subtitle |
| `src/components/SpeedQuizSession.tsx` | `timerSeconds` prop; hide bar at 0; single border |
| `src/components/PassageLibraryRow.tsx` | pencil edit button |
| `src/app/passage/[id]/edit/page.tsx` | **new** server edit page |
| `src/app/passage/[id]/edit/EditPassageClient.tsx` | **new** edit form wrapper |
| `src/app/api/reading/translate/route.ts` | **new** id-less translate |
| `src/components/reading/ReadAlong.tsx` | `ephemeral` + `backHref` |
| `src/components/reading/WordDetailCard.tsx` | `allowSave` prop |
| `src/app/read-once/page.tsx` | **new** read-once entry |
| `src/app/passage/page.tsx` | "Đọc nhanh" header button |

### Not done / notes

- No migration (settings are key-value rows).
- Read-once = full translation but **no** word-save (per product decision).
- Verified with `tsc --noEmit` (clean). Not exercised end-to-end in a browser;
  MS Translator path in `/api/reading/translate` not run against a live key.
