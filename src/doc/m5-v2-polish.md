# M5 — V2 polish (Decks · Settings · Speed result)

Three V2-audit polish passes. Each is independently shippable but they share
infrastructure (migration 0008 adds deck columns; new settings keys add
client-side TTS + theme support).

## File map

### Task 1 — Decks redesign + `/decks/[id]` detail

- `migrations/0008_decks_polish.sql` — adds `icon`, `subtitle` to
  `flashcard_decks` (both nullable).
- `src/lib/types.ts` — extends `FlashcardDeck` with `icon` + `subtitle`;
  exports `DECK_ICON_OPTIONS` (12 lucide names) + `DeckIcon` type.
- `src/lib/db.ts` — `flashcardDecksDb.create` + `update` persist the new
  columns. Adds `flashcardsDb.listByDeck(userId, deckId, { limit })` as an
  options-object alias of `getByDeck`.
- `src/app/api/decks/route.ts` + `[id]/route.ts` — POST/PUT accept `icon`
  (must be in `DECK_ICON_OPTIONS`) + `subtitle` (≤60 chars, trimmed,
  empty → null).
- `src/components/DeckEditor.tsx` — adds a 12-icon grid picker
  (40×40 buttons, active = primary border + deck color background) and a
  subtitle text input (maxLength 60). Modal is now scrollable.
- `src/components/DeckCard.tsx` — new card with 60×60 colored icon tile,
  name + count, optional subtitle, progress bar
  (`mastered_count / total`), edit + delete corner buttons. Clicking the
  card navigates to `/decks/[id]`.
- `src/components/DeckList.tsx` — switched from 240px-min grid to 280px-min
  grid, delegates rendering to `DeckCard`.
- `src/app/decks/[id]/page.tsx` — Server Component. Loads deck + cards via
  `flashcardsDb.listByDeck(userId, deckId, { limit: 500 })`. 404s when
  the deck isn't owned by the current user.
- `src/components/DeckDetailClient.tsx` — hero card (80×80 icon tile) +
  stage breakdown bar (segmented by new/learning/review/mastered, colors
  match the project stage map) + search input + 5 filter pills + word-row
  list. Row click opens a card detail modal showing IPA, image, examples,
  collocations, notes and a "Xoá thẻ" button (calls `DELETE /api/cards/[id]`).

### Task 2 — Settings 2×3 grid + Âm thanh + Giao diện

- `migrations/0008_decks_polish.sql` — DB schema unchanged for settings; the
  3 new settings (`autoplay_audio`, `voice_preference`, `theme`) are added
  as new keys in the existing `user_settings` (key, value) table — no
  migration needed.
- `src/lib/types.ts` — extends `FlashcardSettings` with the 3 keys, adds
  `ThemeMode = 'light' | 'dark' | 'system'`.
- `src/lib/db.ts` — `SETTINGS_KEYS` includes the new keys;
  `getFlashcardSettings` returns defaults (`autoplay_audio: true`,
  `voice_preference: 'auto'`, `theme: 'system'`); `updateFlashcardSettings`
  persists.
- `src/app/api/settings/route.ts` — PUT validator accepts the 3 keys.
- `src/lib/tts.ts` — pure-browser TTS helper with `speak(text, opts)`,
  `getStoredVoicePreference()`, `setStoredVoicePreference(pref)`. Used by
  `AudioButton` and any preview call sites.
- `src/components/AudioButton.tsx` — refactored to call `speak()` with
  `getStoredVoicePreference()`. Other TTS call sites
  (passage karaoke, etc.) intentionally NOT refactored to minimize churn.
- `src/components/SettingsCard.tsx` — visual primitive (panel-bg,
  rounded box, title + body). Used as grid items.
- `src/app/settings/page.tsx` — full rewrite. Layout is a CSS grid
  (`repeat(auto-fit, minmax(360px, 1fr))`) of 6 SettingsCard children:
  Mục tiêu hàng ngày · Nhắc nhở + ôn tập · Luyện tập · Học theo bài đọc ·
  Âm thanh · Giao diện. All existing controls are preserved and regrouped.
- `src/components/ThemeProvider.tsx` — client component. On mount applies
  `data-theme="light|dark"` to `<html>` based on the user's chosen
  `theme` setting (system mode subscribes to `prefers-color-scheme`).
  Exports `THEME_PREHYDRATION_SCRIPT` — an inline `<script>` injected in
  `<head>` so the chosen theme is applied before React hydrates,
  preventing the light-mode flash.
- `src/app/layout.tsx` — reads `theme` from settings server-side and wraps
  the tree in `<ThemeProvider theme={...}>`. Injects
  `THEME_PREHYDRATION_SCRIPT` into `<head>`.
- `src/app/globals.css` — dark-mode tokens scoped under `[data-theme='dark']`
  (surface / ink / border / shadow overrides). Functional palette tokens
  (`--v-primary`, `--v-blue`, etc.) are unchanged.

### Task 3 — Speed quiz summary

- `src/components/SpeedQuizSession.tsx` — `results` state expanded to
  `QuestionResult { card_id, passed, timed_out, time_ms }`. New
  `SummaryScreen` component renders 4 colored stat tiles (Đúng / Sai /
  Hết giờ / Chuỗi dài nhất), a per-question speed bar chart (bar width =
  `time_ms / maxTime`, color matches pass/fail), and a `SparkleBurst`
  decorative overlay shown only when accuracy ≥ 80%. Sparkles use the
  existing `v-sparkle` keyframe in `globals.css`.

## Data model

```sql
-- 0008_decks_polish.sql
ALTER TABLE flashcard_decks ADD COLUMN icon TEXT;     -- lucide name, e.g. "BookOpen"
ALTER TABLE flashcard_decks ADD COLUMN subtitle TEXT; -- short tagline, ≤60 chars
```

New `user_settings` keys (no schema migration — the table is key/value):

| Key | Stored as | Default |
|---|---|---|
| `autoplay_audio` | `'1'` / `'0'` | `'1'` |
| `voice_preference` | voice name or `'auto'` | `'auto'` |
| `theme` | `'light'` / `'dark'` / `'system'` | `'system'` |

## Public API surface

- `POST /api/decks` — accepts `icon` (validated against `DECK_ICON_OPTIONS`)
  and `subtitle` (≤60 chars, trimmed).
- `PUT /api/decks/[id]` — same accept set + `null` clears either field.
- `PUT /api/settings` — accepts `autoplay_audio` (boolean),
  `voice_preference` (string ≤100), `theme` (one of `light|dark|system`).
- `GET /api/settings` — response includes the 3 new keys.

## Gotchas

1. **Voice preference is mirrored to `localStorage`.** The DB is the source
   of truth, but `AudioButton` doesn't fetch settings — it reads the
   `voice_preference` key from `localStorage` via
   `getStoredVoicePreference()`. The Settings page calls
   `setStoredVoicePreference(value)` whenever it saves the field. Other TTS
   call sites (passage karaoke) currently bypass the preference; flagged
   as follow-up.

2. **Theme flash prevention** uses an inline script in `<head>` that reads
   `localStorage.theme` before React mounts. Anonymous visitors default
   to `'system'`. Per-request theme is read from settings server-side and
   passed to `<ThemeProvider>` which mirrors into localStorage on mount.

3. **Dark-mode visual debt.** Components with hard-coded `#fff`/`#000`
   colors (most buttons that show "white text on primary" use literal
   `#fff`) look correct in light mode but stand out in dark mode against
   the surface tokens. The picker functions and most of the layout
   adapts; deeper visual polish is a separate pass.

4. **`flashcardsDb.listByDeck` is an alias** of `getByDeck` with an
   options-object signature. Both work. New callers should prefer
   `listByDeck` for the named-option clarity.

5. **Speed quiz result `wrong` ≠ `total - correct`.** Wrong specifically
   excludes timed-out questions (those are bucketed separately for the
   "Hết giờ" tile). The summary's totals add to `questions.length` once
   all four tile values are summed with the time-outs.

6. **Card edit isn't wired in deck detail.** The spec mentions linking to
   `/add?edit=<id>` but that route doesn't exist yet — the modal currently
   shows a read-only card with a "Xoá thẻ" button. Follow-up.

7. **No tests.** Repo has no test framework. Verified manually via the
   feature in the browser and by `npx tsc --noEmit`.

## Decisions worth recording

- **Icon list is curated, not free-form.** 12 lucide icons. Stored as a
  string (icon name) so we don't lock the DB schema to a specific
  icon library version.
- **Subtitle is a separate column** rather than reusing `description`.
  Description is intended for longer multi-line context; subtitle is
  always a one-line tagline (max 60 chars).
- **Progress bar shows mastered/total**, not (mastered+review)/total —
  mastered is the only stage we want to celebrate at the deck level.
- **Stage breakdown bar omits zero-count stages.** Cleaner visual; the
  legend below still shows all four counts.
- **`DeckEditor` modal reused for both create + edit** on `/decks/[id]`.
  No separate edit-only component.
- **Theme picker applies immediately** without waiting for the PUT
  response. The PUT failure case would leave the UI in the new theme
  with the old DB value — acceptable since the next page load re-syncs.

End of file.
