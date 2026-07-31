# Result: dashboard-progress-review (2026-07-31)

> **Merge note (same day):** while this branch was in flight, `main`
> independently landed the same "Chỉ hiểu nghĩa" concept as
> `flashcard_decks.recognition_only` (migration `0018_study_unified.sql`,
> /decks tabs, DeckEditor checkbox — with recognition-style study
> sessions). At merge time this branch's duplicate `study_mode` column,
> migration 0017, and tab/editor UI were **dropped in favor of main's
> `recognition_only`**; what survived from this branch: the weighted
> `deckProgressPct` helper, the 21d/3-reps mastery gate (migration renamed
> to `0019_mastered_gate_21d.sql`), the dashboard-stat exclusion (now
> filtering `recognition_only = 0`), and the count/timezone fixes. Read
> `study_mode` below as `recognition_only`.

## Scope

Fixes the "everything shows 0%" progress problem (weighted stage percent +
loosened mastery gate), adds a deck-level study mode ("Học đầy đủ" vs
"Chỉ hiểu nghĩa") with /decks tabs and dashboard-stat exclusion, and fixes
four counting/timezone bugs found while reviewing the dashboard.

## Files changed

- `migrations/0017_deck_study_mode.sql` — new: `flashcard_decks.study_mode
  TEXT NOT NULL DEFAULT 'full'` ('full' | 'meaning').
- `migrations/0018_mastered_gate_21d.sql` — new: retro-promotes `review`
  cards with `interval_days >= 21 AND repetitions >= 3` to `mastered`
  (mirror of 0014's demotion, opposite direction).
- `src/lib/flashcards/srs.ts` — mastery gate 60d/4reps → 21d/3reps
  (comment + code).
- `src/lib/flashcards/progress.ts` — new shared helper `deckProgressPct`:
  `round((learning + 2*review + 3*mastered) / (3*total) * 100)`. Extracted
  because the old mastered-only formula was duplicated in two places.
- `src/lib/types.ts` — `DeckStudyMode` type; `FlashcardDeck.study_mode`.
- `src/lib/db.ts` —
  - `hydrateDeck` + `getAllWithCounts` mapping normalize `study_mode`.
  - `flashcardDecksDb.create/update` accept `study_mode`.
  - `getAllWithCounts`: due CASE now requires `c.id IS NOT NULL` (empty
    decks no longer report `due_count = 1`) and the JOIN gains
    `AND c.user_id = d.user_id`.
  - `countByStatus(userId, { excludeMeaning })` — optional JOIN that drops
    cards in meaning-only decks; dashboard passes it.
  - `getTodayCount`: `date(reviewed_at,'localtime')` on both sides (was
    mixing UTC and localtime).
  - `getActivityLastDays`: window filter now date-based localtime to match
    its GROUP BY.
- `src/app/api/decks/route.ts` (POST) + `src/app/api/decks/[id]/route.ts`
  (PUT) — accept/validate `study_mode`.
- `src/components/DeckEditor.tsx` — "Loại bộ" segmented control (Học đầy
  đủ / Chỉ hiểu nghĩa), sent on create & edit.
- `src/components/DeckList.tsx` — two `FilterPill` tabs (with deck counts)
  filtering by `study_mode`, default tab "Học đầy đủ"; empty-state hint per
  tab; "TẠO BỘ MỚI" moved into the same row.
- `src/components/DeckCard.tsx` — percent now `deckProgressPct(deck)`.
- `src/app/dashboard/page.tsx` — `countByStatus(..., { excludeMeaning:
  true })`; hero due SQL excludes `status = 'new'` (no more double-count
  with "· X từ mới") and meaning-only decks; "Bộ từ" widget percent uses
  `deckProgressPct`.

## Key decisions

- Weighted percent formula lives in `src/lib/flashcards/progress.ts`
  (pure, client-safe) — justified as a dedup of an already-drifting
  duplicate, despite the "extract on 3rd consumer" guideline.
- `stats/page.tsx` and `/api/stats` intentionally NOT switched to
  `excludeMeaning` — user only asked for the dashboard; left as follow-up.
- The dashboard "Bộ từ" widget still lists meaning-only decks (it's a
  navigation shortcut, not a learning stat).
- /study and /review can still pick meaning-only decks — user scoped the
  exclusion to statistics only.
- Reused `FilterPill` from `deck-detail/` directly (it's generic:
  label/active/color/onClick).

## Deviations from prompt

- The screenshot showed the tabs left of "TẠO BỘ MỚI" with icons; the
  implementation uses the existing `FilterPill` style (no icons) to stay
  consistent with the deck-detail filter row.

## Verification

- `npx tsc --noEmit` clean.
- `npx wrangler d1 migrations apply english-learning-db --local` — both new
  migrations applied; `PRAGMA table_info(flashcard_decks)` confirms
  `study_mode`. The worktree's local DB has no card rows, so 0018's UPDATE
  ran against empty data — its effect on real data is untested.
- NOT tested end-to-end (dev server not run per CLAUDE.md §10): tabs UI,
  DeckEditor control, dashboard numbers, weighted % rendering all need a
  manual smoke test. **Production requires running the same migrations
  without `--local` on next deploy.**

## Follow-ups / known issues

- `stats/page.tsx` + `/api/stats/route.ts` still use the old due SQL
  (double-counts new cards) and include meaning-only decks.
- Mobile screens `MDashboard` / `MDecksList` are hardcoded mockups —
  every number there is fake regardless of these fixes.
- Activity chart classifies lapsed cards (prev_interval reset to 0) as
  "new words" in the blue series.
- Demo seed users get `is_default` on "Đời sống" and all-'full' decks;
  no seed data exercises 'meaning'.
