# Session deck picker

Added 2026-05-17.

## Purpose

`/study` (Học hôm nay) and `/review` (Ôn tập) now show a deck (bộ từ)
selection step before the per-card `SessionPicker`. The learner picks
which deck to pull from, then continues into the normal subset selection
and the typing session.

Users with only the default deck skip the deck picker entirely — the
page behaves as it did before. The picker only appears when
`decks.length > 1`.

## File map

- `src/components/flashcard-session/DeckPickerStep.tsx` — new client
  component. Renders the deck grid + the "Tất cả các bộ" card. Also
  exports `DeckEyebrow` (the deck-name pill shown above the session
  once a deck is picked).
- `src/app/study/page.tsx` — reads `?deck_id`, gates the picker on
  `decks.length > 1`, passes the filter into `getNewForToday`.
- `src/app/review/page.tsx` — same shape for `getDueForReview`.

## URL contract

The picker uses query-param navigation so the server component owns the
filter. No client API calls.

| URL                   | Meaning                                                 |
| --------------------- | ------------------------------------------------------- |
| `/study`              | No choice yet — show DeckPickerStep (if >1 deck).       |
| `/study?deck_id=all`  | Explicit "all decks" — skip picker, no DB filter.       |
| `/study?deck_id=42`   | Filter cards by `deck_id = 42`.                         |
| `/review`             | Same shape.                                             |
| `/review?deck_id=all` |                                                         |
| `/review?deck_id=42`  |                                                         |

`?deck_id=` values that are neither `"all"` nor a positive integer fall
through to `null` (no filter) but keep `deck_id !== undefined`, so the
page still skips the picker and renders the eyebrow as "Tất cả các bộ".
This is by design — the URL is the user's explicit intent and we don't
want to bounce them back to the picker if they typed nonsense.

## Data flow

1. Page reads `decks = flashcardDecksDb.getAllWithCounts(userId)` — one
   query, returns deck rows joined with per-status counts including
   `new_count` (used by `/study`) and `due_count` (used by `/review`).
2. If the picker should show, `cards = []` (no second query).
3. Otherwise `getNewForToday(userId, limit, deckFilter)` /
   `getDueForReview(userId, limit, exclude_mastered, deckFilter)` runs
   with the resolved filter. Both DB methods already accept
   `deck_id: number | null`.
4. `SessionFlow` is unchanged — it receives the pre-filtered
   `initialCards` exactly as it did before the picker existed.

`router.refresh()` from "Học thêm phiên nữa" preserves the query
string, so the user stays inside the same deck on a second session.

## Picker UI

- Sorted by `relevantCount(deck)` desc, then by `deck.position`. Decks
  with zero relevant cards drop to the bottom and render as disabled
  (no `href` on the `Link`).
- "Tất cả các bộ" card always renders at the top, even when empty —
  it doubles as a "just start a global session" affordance.
- Counts shown: `new_count` for /study, `due_count` for /review.
- Per-deck icon: deck row's `icon` field looks up into the local
  `ICON_MAP` (12 lucide icons mirroring `DECK_ICON_OPTIONS`). Falls
  back to `BookOpen` if unknown.

## Back links

Top-of-page "← Đổi bộ từ" appears only when `decks.length > 1` AND the
user is past the picker stage. Single-deck users see "← Dashboard"
instead — no point sending them somewhere with one option.

## Gotchas

- `searchParams` is a Promise in Next.js 16 — both pages `await` it.
  Don't access fields synchronously.
- `flashcardDecksDb.getAllWithCounts` adds a query per page load, but
  it's a single grouped query and the deck table is small.
- The picker doesn't update counts in real time. If the user adds new
  cards mid-picker, they need a page refresh to see the new count.
  Acceptable v1 trade-off.
- "Học thêm phiên nữa" preserves the query string. If a deck has no
  more due cards after the session, the user lands on `ReviewEmpty`
  inside that deck — they need to click "← Đổi bộ từ" to pick a
  different deck. This is intentional: the alternative (auto-bouncing
  to the picker) would surprise users who deliberately picked a deck.
