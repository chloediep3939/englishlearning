# Deck view toggle (grid / list)

Every page that lists decks (bộ từ) offers a grid/list display toggle. The
preference is per-device, stored in localStorage under `deck-view-mode`, and
shared by all pages — switching on one page applies everywhere.

## File map

- `src/components/common/DeckViewToggle.tsx` — `useDeckViewMode()` hook
  (returns `[mode, setMode]`, persists to localStorage) and the
  `DeckViewToggle` pill with two icon buttons.
- Consumers:
  - `src/components/DeckList.tsx` (`/decks`) — grid ↔ single-column list;
    passes `layout` down to `DeckCard`.
  - `src/components/DeckCard.tsx` — `layout='list'` renders a compact row
    variant; default `'grid'` is the original tall card.
  - `src/components/flashcard-session/DeckPickerStep.tsx` (`/study`,
    `/review`) — list mode collapses the deck grid to one column.

## Gotchas

- The hook renders `'grid'` on SSR/first paint and reads localStorage in a
  `useEffect` — do not read localStorage in the initializer here, it would
  cause a hydration mismatch on server-rendered pages.
- If a new page lists decks, use `useDeckViewMode()` + `DeckViewToggle`
  rather than a local toggle so the shared preference keeps working.
