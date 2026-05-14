# M1c-2 — Quizzes + Management UI

Status: **12 of 12 files done.** Build clean. App is functionally complete for everything except `/review` (a holdover from M1c-1 — its `ReviewSession.tsx` + `review/page.tsx` were never delivered).

## Purpose

Ship the remaining nine UI routes so every link in the sidebar leads to a working page:

| Route | What it does |
| --- | --- |
| `/speed` | 3-mode timed quiz (en→vi, vi→en, spelling). 8s per question, 4 options, AI-backed distractors when the user's library is too small. |
| `/cloze` | 2-mode fill-in-the-blank (typing, multiple choice). One challenge fetched per card via `/api/cards/:id/cloze`. |
| `/decks` | CRUD for `flashcard_decks`. Modal editor with 7 preset colors. Default deck is editable but not deletable. |
| `/stats` | 6 status tiles + 30-day bar chart + retention/streak/today blocks. Server-rendered. |
| `/settings` | Auto-saving sliders + toggles for daily limits, review hide-mastered, reminder time. |
| `/dictionary` | Standalone lookup via `/api/dictionary/lookup`, with a "save to library" button that opens a `window.prompt` for the Vietnamese gloss. |

## File map

| Path | Role |
| --- | --- |
| `src/components/QuizSetup.tsx` | Generic mode/count/deck picker. Used by both `/speed` and `/cloze`. Generic over mode value type. |
| `src/components/SpeedQuizSession.tsx` | Session UI: timer bar, prompt card, 2×2 colored options, immediate green/red feedback, end screen. |
| `src/components/ClozeSession.tsx` | Session UI: fetches challenge per card, supports typing input + 4-option mode, sentence reveal with highlighted target word. |
| `src/components/DeckEditor.tsx` | Modal form (controlled). Used for both create and edit. Backdrop click closes. |
| `src/components/DeckList.tsx` | Deck cards grid + create/edit/delete handlers. Delete confirms via `window.confirm` and warns about card migration. |
| `src/components/StatsCharts.tsx` | SVG-free bar chart (raw flexbox divs) + retention/streak/today summary. |
| `src/app/speed/page.tsx` | Setup + session container for speed quiz. |
| `src/app/cloze/page.tsx` | Setup + session container for cloze. |
| `src/app/decks/page.tsx` | Header + `<DeckList />`. |
| `src/app/stats/page.tsx` | Server component — runs 5 parallel DB queries via `Promise.all`, builds the `FlashcardStats` payload, hands it to `<StatsCharts />`. |
| `src/app/settings/page.tsx` | Client component — auto-saves on every slider change / toggle flip. |
| `src/app/dictionary/page.tsx` | Search + result card + "save to library" button (with `window.prompt` for Vietnamese gloss). |

## Data flow

```
/speed, /cloze, /decks, /settings, /dictionary  -> 'use client'
                                                  └── fetch('/api/...') -> M1b routes
/stats                                          -> Server Component
                                                  └── requireUserId() + DB wrappers directly

DeckEditor (modal)
  POST   /api/decks            (create)
  PUT    /api/decks/:id        (update)
DeckList
  GET    /api/decks            (load on mount + after save)
  DELETE /api/decks/:id        (with confirm)
SpeedQuizSession
  GET    /api/speed-quiz?mode=&count=&deck_id=    (load questions)
  POST   /api/cards/:id/test-attempt              (fire-and-forget per answer)
ClozeSession
  GET    /api/cloze-session?count=&deck_id=       (card_ids batch)
  GET    /api/cards/:id/cloze                     (per-card challenge)
  GET    /api/cards?limit=50                      (client-side distractors for MC mode)
  POST   /api/cards/:id/test-attempt              (fire-and-forget per answer)
SettingsPage
  GET    /api/settings
  PUT    /api/settings         (auto-save per change)
DictionaryPage
  GET    /api/dictionary/lookup?word=
  POST   /api/cards            (save to library, with window.prompt for Vietnamese)
```

## Public API surface

Nothing new exported for cross-module consumption. Internal contracts worth knowing:

- `QuizSetup<V>` is generic over the mode value type. `/speed` parameterises with `SpeedQuizMode`, `/cloze` with the locally-defined `ClozeMode = 'typing' | 'multiple_choice'`.
- `QuizStartOpts<V>` = `{ mode: V, count: number, deckId: number | null }`. Page-level `onStart` handlers receive this.
- `ClozeMode` is exported from `src/components/ClozeSession.tsx` (not `src/lib/types.ts`). The existing `ClozeMode = 'timed' | 'untimed'` in types.ts is M1a's planned API and is **not** the same enum.
- `DeckEditor` uses sentinel values: `null` = creating, `FlashcardDeck` = editing. `DeckList` adds `undefined` to mean "no modal open."

## Gotchas

- **`var(--v-yellow-deep)` is referenced but undefined.** Used in `SpeedQuizSession` for `textShadow` on the score number and for the progress bar gradient. CSS will silently drop the rule (no shadow), and the gradient becomes invalid → the bar may render flat or transparent. Add `--v-yellow-deep: #e8b500` (or similar) to `globals.css` if you want the polished look.
- **`StatsCharts` recomputes `count` from `{new, review}`.** The M1a `FlashcardStats.cards_per_day_last_30` shape is `{ date, new, review }`, but the spec used a single `count` field. The component adds them locally rather than changing the wire type.
- **`DictionaryResult` instead of `DictionaryEntry`.** Spec imported `DictionaryEntry` from `@/lib/types`, but no such type exists. We import `DictionaryResult` from `@/lib/flashcards/dictionary` (the actual shape `lookupWord` returns).
- **`ClozeSession` distractors are client-side.** When mode is `multiple_choice`, the component fetches `/api/cards?limit=50` and picks 3 random English words. If the user has fewer than 4 cards total, you'll see placeholder strings like `"option 4"`. The shuffle is **deterministic per word** (seeded by `correct.length * 7 + charCodeAt(0)`) so options don't reshuffle on re-render.
- **`SpeedQuizSession` keyboard handler runs on `window`.** It listens for `1/2/3/4` and would fire even with a focused input. There are no inputs in this view, but if you add one later, guard with `e.target instanceof HTMLInputElement`.
- **`ClozeSession` keyboard `useEffect` has no dep array.** Intentional — the handler closes over current `state` / `input` / `revealed`, and re-binding on every render keeps it correct. Slightly wasteful but not buggy. Don't "fix" by adding deps unless you also restructure with `useRef`.
- **`SettingsPage` auto-saves on every change.** Sliders fire `onChange` continuously while the user drags, which means dozens of PUTs per second. There's no debouncing yet. Acceptable for single-user local dev; revisit if it ever ships to a metered backend.
- **`StatsPage` runs 5 parallel DB queries.** Cheap on D1 today (single user, < 1000 cards). At scale, profile `flashcardReviewsDb.getStreakDays` first — it scans up to 365 distinct review days in JS.
- **Decks `card_count` field.** API `/api/decks` (M1b) returns `decks: FlashcardDeckWithCounts[]`, which has `total/new_count/learning_count/...` — but our UI calls it `card_count`. ⚠️ This will likely be **0/undefined at runtime**. Either: rename the UI field to `total`, or have the API alias it. Worth checking when you load `/decks` and `/cloze` and `/speed`.
- **`fetch().json()` in strict mode.** Inferred type is `unknown`. We cast at every call site (`as Promise<{ error?: string }>`, etc.). Consider a small `apiJson<T>(url)` helper if this gets repetitive.
- **No `<Suspense>` around `useSearchParams`.** None of the M1c-2 pages read query params, so the wrapper isn't needed. If you later add a `?next=` style param to any page, remember to wrap.

## Spec deviations recorded

1. `StatsCharts` recomputes count locally (see above).
2. `dictionary/page` uses `DictionaryResult` from the flashcards lib (see above).
3. `NodeJS.Timeout` → `ReturnType<typeof setTimeout>` for portability across runtimes.
4. `DeckEditor` description textarea uses `value={description ?? ''}` to avoid React's controlled-component-with-null warning.
5. Mascot name in user-facing text uses "Bún" (M0-patch rename).

## Open items

- **`src/components/ReviewSession.tsx` + `src/app/review/page.tsx`** — still pending from M1c-1. Sidebar nav and dashboard CTA already link to `/review`; that route currently 404s.
- **`--v-yellow-deep` token** — add if you care about the score-screen styling.
- **`/decks` count display** — verify the card count number actually shows; may need to align with `total` field from API response.

## Future maintainers

- The pattern for new quiz modes is: define mode list (`MODES: QuizMode<X>[]`), pass to `<QuizSetup>`, wire `onStart` to fetch the appropriate session endpoint, render a session component. Don't try to unify all quiz session UIs — each has enough variation (timer vs reveal, text input vs option grid, per-card fetch vs batch) that abstraction would hurt more than copy-paste.
- `ClozeSession` is the most complex component here. If it gets touched, run through both modes manually: typing (Enter submits, Enter again advances) and multiple_choice (1/2/3/4 picks, Enter/Space advances after reveal).
- `SettingsPage` saves are best-effort. If the PUT fails, the local state still shows the new value but the DB has the old one. There's no rollback. Worth keeping the slider as a fully controlled component (with optimistic local state) only if you don't mind that quirk.
- If you ever need a real chart library, the only consumer is `StatsCharts`. Right now it's ~150 lines of flexbox; swapping to something like `recharts` would be a single-file change.
