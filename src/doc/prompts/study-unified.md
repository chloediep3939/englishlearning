# Prompt: study-unified (saved 2026-07-29)

# study-unified.md — Unified Study Flow + Flashcard SRS Scoring + Recognition-Only Decks
## 0. Context — read first
EnglishLearning ("Bún"): Next.js 16 App Router on Cloudflare Workers (@opennextjs/cloudflare), React 19, TypeScript strict, D1 (async, parameterized queries only). Styling: inline `style={{}}` with `--v-*` CSS variables from `globals.css`. **NO Tailwind utility classes.** Icons: lucide-react only. All UI text in Vietnamese.
**This prompt SUPERSEDES `study-review-loop.md`. Do not apply that file. If any of it was applied, reconcile toward this spec.**
Run order: intended after `nav-grouping.md` and `demo-feedback.md`. If `nav-grouping.md` has NOT been applied, apply the nav change in A1 to the current (ungrouped) sidebar instead — everything else is unaffected.
Assumed present from the SRS overhaul (`calculateNextReview` in the SRS lib): mastery gate (`interval_days >= 60 AND repetitions >= 4`), ±15% fuzz for intervals ≥ 4 days, lapse handling for "Lại" (ease −20pp, floor 130%, interval cut), first-rating-per-session guard. **Reuse this code. Never fork SRS math into components.**
Before writing any code, read: current `/study` and `/review` pages, the flashcard flip game (it has a timed variant and a free-flip variant), `recordRating` + `calculateNextReview`, `FlashcardSettings` + `/api/settings`, deck list + deck edit pages, and the migrations folder (to pick the next migration number). Record actual file paths in the results doc (section 6).
---
## 1. Part A — Merge Học + Ôn into one flow
### A1. Routes & nav
- Single entry: `/study`. `/review` becomes a server-side redirect to `/study`.
- Sidebar: remove the separate "Ôn tập" item. One item "Học" → `/study`. If the grouped sidebar from `nav-grouping.md` exists, remove it from its group and keep the rest of the structure unchanged.
- Any other links/buttons pointing to `/review` (dashboard cards, empty states, etc.) → repoint to `/study`. Grep for `/review`.
### A2. Session setup screen (replaces the old manual word-selection step entirely)
Shown on `/study` before a session starts. Same-page 2-step state machine (setup → session), no route change.
- **Mode picker** — 3 options: `Ôn` / `Học` / `Ôn + Học` (default `Ôn + Học`).
- **Live counts** next to the picker: "X từ cần ôn" (due cards) · "Y từ mới" (new cards). Update when deck filter or segment changes.
- **Limits**: two number inputs prefilled from settings `session_review_limit` and `session_new_limit` (Part D). Editable per session; per-session edits are NOT persisted back to settings.
- **Deck scope**: default = all decks in the active segment; multi-select dropdown to narrow.
- **Segments** (see Part C): segmented control `Học đầy đủ` | `Chỉ hiểu nghĩa`. Sessions never mix the two deck groups. Hide the second segment when the user has no recognition decks.
- CTA "Bắt đầu" — disabled when the resulting queue would be empty.
- **No manual card selection anywhere.** Card picking is automatic:
  - `Ôn`: due cards, most overdue first (oldest `due_date`), up to review limit.
  - `Học`: random sample from the new pool, up to new limit.
  - `Ôn + Học`: build both lists, then interleave new cards evenly among due cards (Anki-style spread — new cards must not clump at the start or end; exact algorithm is your choice).
Definitions — align to the existing schema, but the intent is:
- **New** = card never rated in a study session (`repetitions = 0` / no SRS state).
- **Due** = has SRS state and `due_date <=` end of today (local day boundary, consistent with existing streak logic). Excludes suspended/hidden-mastered cards per existing rules.
### A3. In-session Anki loop
- Queue-based. Rating buttons: Lại / Khó / Tốt / Dễ.
- `Lại` → re-insert the same card at current position **+2**. `Khó` → **+4**. `Tốt` / `Dễ` → remove from queue.
- Every rating click writes a review row via `recordRating` with `source='study'`.
- Only the **first** rating of a card within the session mutates SRS state; later ratings of the same card in the same session are log-only (`srs_applied=0`). This is the existing guard — keep it.
- Queue empty → existing session summary screen.
### A4. API
- Endpoint(s) serving counts + the built queue for the setup screen and session start. Suggested: `GET /api/study/session?mode=&group=&deckIds=&reviewLimit=&newLimit=&countsOnly=`. Exact shape is your choice; requirements: parameterized D1 queries, reuse the existing card DTO, server builds the queue (client does not re-derive it).
---
## 2. Part B — Flashcard flip game: SRS scoring (timed mode ONLY)
### B1. Scope
- Locate the existing flashcard flip feature. **Only the timed variant scores SRS.**
- Free-flip variant: **no SRS mutation, no review rows written.** Leave its gameplay untouched.
### B2. Rules per answer (timed mode)
- **Card is new (no SRS state yet)** → always log-only (`srs_applied=0`), correct or wrong. There is nothing to lapse; first learning happens in study sessions.
- **Correct AND card is due**:
  - `interval_days = max(interval_days + 1, round(interval_days * 1.2))`, then apply the standard ±15% fuzz if the result ≥ 4 days.
  - **ease unchanged, repetitions unchanged** (flashcard play must never feed the mastery gate).
  - Push `due_date` accordingly. Log row `source='flashcard'`, `srs_applied=1`.
- **Correct AND card NOT due** → log-only (`source='flashcard'`, `srs_applied=0`). No SRS change. (Prevents interval farming by replaying the game.)
- **Wrong** (due or not) → full "Lại" lapse via the SAME lapse path as study sessions (ease −20pp floor 130%, interval cut per existing rule, card due today). Log `source='flashcard'`, `srs_applied=1`.
- **Daily cap**: max ONE `srs_applied=1` flashcard event per card per local day. Check today's `flashcard_reviews` (`source='flashcard' AND srs_applied=1`) before mutating. One exception: if today's applied event was a **correct** one and the user later answers **wrong**, apply the lapse anyway (once). After a lapse has been applied, everything else that day is log-only.
### B3. Where the logic lives
- Extend `recordRating` (or add `recordFlashcardResult` next to it) in the SRS lib to take `source` and implement the transition above, sharing `calculateNextReview`'s lapse code. The flashcard component only reports correct/wrong + card id.
### B4. Stats & streak
- Everywhere "reviewed today" / review counts / streak activity are computed: include `source='flashcard'` rows (both `srs_applied` values count as activity; `srs_applied` only gates state mutation). Timed flashcard play keeps the streak alive.
---
## 3. Part C — Recognition-only decks ("Chỉ hiểu nghĩa")
### C1. Behavior
- Deck-level flag. **SRS scheduling is identical** for both deck types — only the exercise composition inside sessions differs.
- First, **inventory the actual exercise/question types** in the study session code (self-grade flip, multiple choice, typing, cloze, listening, …). Do not assume — read the code. List every type in the results doc with its classification.
- Classification rule for recognition decks:
  - **KEEP**: any exercise that shows the English word (text or audio) and asks for the Vietnamese meaning — e.g. flip-and-self-grade EN→VI, multiple-choice meaning, audio→choose meaning.
  - **REMOVE**: any exercise requiring the user to type/spell/produce the English word, VI→EN recall, or cloze that requires typing the word.
  - If, after filtering, a card has no available exercise type, fall back to flip-and-self-grade EN→VI.
- Timed flashcard game (Part B) applies to both deck types unchanged.
- Session separation is handled by the setup-screen segments (A2).
### C2. UI
- **Deck edit screen**: toggle "Chỉ hiểu nghĩa" + one line of helper text: "Chỉ luyện nhận diện nghĩa, không luyện chính tả / gõ từ."
- **Deck card**: small badge (lucide `Eye` + "Hiểu nghĩa") when `recognition_only = 1`.
- **Deck list page**: 2 tabs — `Học đầy đủ` (default) | `Chỉ hiểu nghĩa`. Tab styling consistent with the `/add` tabs. Recognition tab empty state explains the toggle in deck settings.
---
## 4. Part D — Settings
Add to the typed `FlashcardSettings` interface and wire through the existing `/api/settings` shape (do NOT bypass the typed-settings pattern):
| Key | Default | Meaning |
| --- | --- | --- |
| `session_review_limit` | 20 | Default số thẻ ôn mỗi phiên |
| `session_new_limit` | 20 | Default số thẻ mới mỗi phiên |
Settings page: two number inputs in the study section, labels in Vietnamese, sensible min/max (1–200).
---
## 5. Migration — single file
Next sequential number (check the migrations folder), e.g. `00XX_study_unified.sql`:
```sql
ALTER TABLE decks ADD COLUMN recognition_only INTEGER NOT NULL DEFAULT 0;
ALTER TABLE flashcard_reviews ADD COLUMN source TEXT NOT NULL DEFAULT 'study';
ALTER TABLE flashcard_reviews ADD COLUMN srs_applied INTEGER NOT NULL DEFAULT 1;
```
⚠️ **D1 INSERT column trap (M4a precedent)** — mandatory checklist:
- Update the TS types for `decks` and `flashcard_reviews`.
- Update **every** `INSERT INTO decks ...` and `INSERT INTO flashcard_reviews ...` in the codebase to explicitly include the new columns (grep for both). Do not rely on column defaults silently.
- If `scripts/generate-demo-seed.ts` / demo seed data exists (from `demo-feedback.md`), update its deck INSERTs too (`recognition_only = 0`).
---
## 6. Acceptance checklist + results
- [ ] `/review` redirects to `/study`; sidebar has a single "Học" entry; no dangling `/review` links
- [ ] Setup screen: 3 modes with live counts, limits prefilled from settings and editable, deck filter, 2 deck-type segments, no manual card picking
- [ ] `Ôn + Học` interleaves new cards evenly among due cards
- [ ] In-session loop: Lại +2 / Khó +4 / Tốt-Dễ exit; first-rating-only SRS mutation intact
- [ ] Timed flashcard: new card → log-only; correct+due → ×1.2, ease & reps unchanged; correct+not-due → log-only; wrong → full lapse; daily cap with wrong-overrides-correct exception; free-flip writes nothing
- [ ] All `decks` / `flashcard_reviews` INSERTs include the new columns; demo seed updated if present
- [ ] Stats + streak count `source='flashcard'` rows as review activity
- [ ] Recognition decks: toggle, badge, 2 tabs, production/spelling exercises excluded, EN→VI fallback works
- [ ] `session_review_limit` / `session_new_limit` in settings UI + API
- [ ] `tsc` clean
Write results to `src/doc/results/study-unified.md`: files touched, the exercise-type inventory with keep/remove classification, migration number used, and any deviations from this spec with reasons.
