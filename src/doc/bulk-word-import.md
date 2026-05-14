# Bulk word import (Nhiều từ tab)

A second tab on `/add` that lets the user paste 10–30 English words and
auto-fills each one through the existing AI pipeline. Goal: replace the
"add 20 words, one at a time" loop with a single paste + wait.

## Files

| Path | Role |
| --- | --- |
| `src/app/add/page.tsx` | Server-component shell. Renders heading + `<AddTabs />`. |
| `src/components/add/add-tabs.tsx` | Client tab switcher (`?tab=single\|bulk` via `useSearchParams`). Wrapped in `<Suspense>` because Next 16 requires it. |
| `src/components/add/single-import.tsx` | Existing single-word form, moved out of `src/components/AddCardForm.tsx` for symmetry. No behavioral change. |
| `src/components/add/bulk-import.tsx` | The bulk flow — `form → processing → done` state machine in one component. |
| `src/lib/flashcards/generate.ts` | Added 3rd arg `skipImage: boolean = false` to `generateCardData()`. When true, the Pexels leg is skipped (resolves to `null` immediately) — image fetch is the slowest leg by a wide margin, so this is the bulk-import default. |
| `src/app/api/cards/generate/route.ts` | Extended to accept `skip_image` and `deck_id` in the body. When `deck_id` is present and valid, the endpoint **also persists** the card via `flashcardsDb.create()` and returns `{ saved: true, card }`. When `deck_id` is absent, behavior is unchanged (returns `GeneratedCardData`). |

## Data flow per word

```
client (bulk-import.tsx)
  └─ POST /api/cards/generate
       body: { english, deck_id, skip_image }
       ├─ requireUserId()
       ├─ verify deck ownership (when deck_id present)
       ├─ generateCardData(english, 0, skip_image)
       │    ├─ lookupWord()           ◄─ dictionary
       │    ├─ getCollocations()      ◄─ datamuse
       │    ├─ translateEnToVi()      ◄─ Gemini
       │    └─ getPexelsImage()       ◄─ skipped when skip_image
       ├─ flashcardsDb.create(userId, {...generated})
       └─ → { saved: true, card }
```

Single-word UI continues to POST `/api/cards/generate` **without** `deck_id`,
then POST `/api/cards` to save. That path is untouched.

## Client concurrency

Worker-pool, `PARALLELISM = 5`. Each worker pulls the next pending word from
a shared cursor and runs `processOne()` (one fetch). When the cursor is
exhausted, the worker exits; once all workers exit we transition to the
`done` phase. We use a worker pool rather than fixed "batches of 5" so the
slowest word in a batch doesn't stall the next one.

## Parser rules

- Split on `/[\n,;\s]+/`.
- Trim, lowercase.
- Keep tokens matching `^[a-z][a-z'-]*[a-z]$|^[a-z]$` — English letters with
  optional internal apostrophe/hyphen. Single-letter words allowed.
- Dedupe (already-lowercased).
- Hard cap 30 — anything past is dropped with a warning, never silently.

## Pre-flight dedup

Before the first fetch, the client pulls `/api/cards?deck_id=N&limit=500`
(or `?limit=500` if neither a deck nor the default-deck id resolved) and
diff's against the parsed list. Duplicates go into `skipped[]`; the rest
become `rows[]`. When the picker shows "Mặc định", we resolve to the user's
actual default deck (via `is_default` from `/api/decks`) so the dedup scope
matches the server's write target (`flashcardDecksDb.ensureDefault`).

If `toProcess.length === 0` after dedup, we show a toast and stay on the
form. No request is made.

## State machine

```
form  ─── submit ───► processing  ─── all settled ───► done
                          │                              │
                          └── per-row retry on failure ──┘
                                            (stays in done after first finish)
```

- `form`: deck picker, textarea, `skip_image` toggle, submit button.
- `processing`: header `"Đang nhập X từ vào \"DeckName\"..."`, progress bar
  (`(done + failed) / total`), per-row status list.
- `done`: Bún `happy` pose, summary pills (`done` / `skipped` / `failed`),
  actions `XEM BỘ TỪ` (to `/decks/[resolvedDeckId]`) and `NHẬP TIẾP`
  (reset). Failed rows keep their retry buttons.

## URL sync

`?tab=bulk` selects the bulk tab; anything else (including bare `/add` and
`?tab=single`) selects single. Switching tabs uses `router.replace()` so
back-button doesn't accumulate history entries.

## localStorage

`add_last_deck_id`: the deck id last chosen in the bulk picker. Persists
across reloads/sessions. The single-import tab does **not** read this (it
intentionally keeps its own session-local default).

## Gotchas / decisions

- **`skipImage` vs `imageSkip`.** The original `generateCardData(english,
  imageSkip)` second arg is a Pexels carousel index (used by single-import's
  "reload image" button). The new third arg `skipImage` is a hard skip
  switch. Don't conflate them: a card created with `skipImage: true` has
  `image_url = null` and can be re-imaged later from the edit modal.
- **The dedup query has `limit=500`.** That's a soft cap. Decks larger than
  500 cards will not have all words considered for dedup, and may produce
  duplicate rows for words past the 500 most-recent. Acceptable for now —
  bulk-import's primary use case is "I just learned 20 new words", not "I'm
  re-importing my 2000-word backlog". If that changes, swap for a
  lightweight `/api/cards/exists?words=...` endpoint that returns booleans.
- **Concurrency cap of 5** is a guess. Gemini's free tier has tight QPS
  limits and Pexels rate-limits per key. If users start hitting 429s we can
  drop to 3 — the worker pool makes that a one-line change.
- **Retry button** calls the same `processOne()` directly (not through the
  pool). With manual retries you can briefly exceed PARALLELISM, but it's
  user-initiated and rare. Fine.
- **`/api/cards/generate` is now overloaded.** It both "generates" and
  "saves" depending on whether `deck_id` is present. Slightly weird name
  but the alternative (a new endpoint) was ruled out by spec. If the
  endpoint grows a third mode, split it.
