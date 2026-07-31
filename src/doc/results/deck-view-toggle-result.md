# Result — deck-view-toggle

## Scope

Adds a grid/list display toggle to every page that lists decks (bộ từ). The
choice persists per device (localStorage) and is shared across all pages —
switching once applies everywhere.

## Files changed

- `src/components/common/DeckViewToggle.tsx` — **new**. `useDeckViewMode()`
  hook (persisted `'grid' | 'list'` preference, key `deck-view-mode`) +
  `DeckViewToggle` two-icon-button pill (LayoutGrid / List).
- `src/components/DeckCard.tsx` — new optional `layout` prop. `'list'`
  renders a compact full-width row (40px icon, name + badge, `N từ ·
  subtitle` line, inline progress bar + %, inline edit/delete buttons).
  `'grid'` (default) unchanged.
- `src/components/DeckList.tsx` — `/decks` page: toggle sits to the right of
  the "TẠO BỘ MỚI" button; container switches between the existing grid and
  a single-column flex list; passes `layout` to `DeckCard`.
- `src/components/flashcard-session/DeckPickerStep.tsx` — `/study` and
  `/review` deck picker: toggle sits at the right of the header; list mode
  collapses the per-deck grid to one column (cards there are already
  row-shaped, so no card changes needed).
- `src/doc/prompts/deck-view-toggle.md` — saved prompt.

## Key decisions

- **localStorage, not user-settings DB** — matches the speed-quiz timer-bar
  precedent (per-device visual preference, no server round-trip).
- **One shared key across pages** — the user asked for the option "on all
  pages"; a single key means one choice applies app-wide.
- **Hydration-safe default** — the hook always renders `'grid'` on
  SSR/first paint and applies the stored value in a `useEffect`, so there is
  no hydration mismatch (brief grid flash on `/study`–`/review` is the
  trade-off).
- Hook co-located with the toggle component in `common/` (both always used
  together; `src/hooks/` doesn't exist yet).

## Deviations from prompt

None.

## Verification

- `npx tsc --noEmit` — clean.
- NOT tested: running the app / clicking the toggle end-to-end (dev server
  not run per CLAUDE.md §10.11).

## Follow-ups / known issues

- QuizSetup (cloze/sentence/pronounce/speed) picks decks via a `<select>`
  dropdown, not a grid — left untouched.
- On very narrow viewports the list row's fixed-width progress bar (110px)
  may squeeze the name; acceptable for the sidebar-layout desktop app.
