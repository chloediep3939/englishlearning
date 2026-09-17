# Roadmap checklist — implementation result

Date: 2026-09-16
Prompt: `src/doc/prompts/roadmap-checklist.md`

## Scope

A "Lộ trình" module that stores the full B2 checklist (141 items across Nghe /
Đọc / Viết / Nói, each with its own test method and pass threshold) and lets a
learner mark every item ✓ đạt / ✗ chưa đạt / chưa test with a free-text note.
The point is the overview: at a glance the learner sees what the whole skill
requires and which parts they are still missing.

## Files changed

Created:

- `src/doc/prompts/roadmap-checklist.md` — the checklist content, verbatim from
  the user's artifact, in a parseable markdown shape. **Source of truth** for
  the seed data.
- `scripts/gen-roadmap-seed.mjs` — parses that doc and writes the migration
  (DDL + INSERTs). Avoids hand-transcribing 141 rows of Vietnamese into SQL and
  handles quote escaping.
- `migrations/0021_roadmap.sql` — generated. Tables `roadmap_skills` (4 rows),
  `roadmap_items` (141), `roadmap_tools` (9), `roadmap_progress` (per-user).
- `src/lib/roadmap/db.ts` — `roadmapDb`: `listSkills`, `listTools`, `listItems`,
  `getSummary`, `itemExists`, `setProgress`.
- `src/app/api/roadmap/[key]/route.ts` — `PUT` one item's status + note.
- `src/app/roadmap/page.tsx` — overview: overall bar, 4 skill cards, tools table.
- `src/app/roadmap/[skill]/page.tsx` — one skill: header, skill note, checklist.
- `src/components/roadmap/skill-meta.ts` — per-skill color/icon + status colors.
- `src/components/roadmap/ProgressBar.tsx` — 3-segment pass/fail/untested bar.
- `src/components/roadmap/RoadmapChecklist.tsx` — client: filter bar + grouping.
- `src/components/roadmap/RoadmapItemRow.tsx` — client: one row, status buttons,
  expandable detail (cách test / đạt khi), note editor.
- `src/components/roadmap/RoadmapSummaryCard.tsx` — read-only card for /dashboard.

Modified:

- `src/lib/types.ts` — appended `RoadmapStatus`, `ROADMAP_RETEST_DAYS`,
  `RoadmapSkill`, `RoadmapItem`, `RoadmapItemWithProgress`,
  `RoadmapSkillSummary`, `RoadmapTool`.
- `src/components/Sidebar.tsx` — new nav entry "Lộ trình" (`Map`, `--v-blue`),
  placed right after "Tổng quan".
- `src/app/dashboard/page.tsx` — added `roadmapDb.getSummary` to the existing
  `Promise.all` and rendered `<RoadmapSummaryCard>` between the stat tiles and
  the activity chart (desktop layout only).

## Key decisions

- **Content in D1, not in a TS constant.** The user explicitly asked for a
  table so items can be checked/noted and later edited without a deploy.
  `roadmap_items` / `roadmap_skills` / `roadmap_tools` have no `user_id` — they
  are shared reference content, like `flashcard_cloze_pool`. The multi-tenancy
  boundary is `roadmap_progress`, and every query against it filters by
  `user_id`.
- **`item_key` (`nghe-01`, `viet-37`, …) is the join key**, not the row id, so
  the content tables can be re-seeded or re-numbered by a future migration
  without orphaning progress. The generator doc says explicitly: never renumber
  seeded rows; append new items at the end of a skill.
- **`untested` has no row.** Only `pass` / `fail` are stored (CHECK constraint);
  the app derives `untested` from the LEFT JOIN miss. Setting a row back to
  "chưa test" deletes it.
- **`tested_at` only moves when the status changes.** Editing just the note is
  not a re-test, so the 4-week retest clock is not reset by a typo fix.
- **Retest window = 28 days** (`ROADMAP_RETEST_DAYS`), from the checklist's own
  footer. Passed as a bound parameter to `datetime('now', ?)`, not concatenated.
- **Filter pill is local to `RoadmapChecklist`** rather than reusing
  `deck-detail/FilterPill`. Per CLAUDE.md §2.1 extraction happens on the 3rd
  consumer; this is the 2nd. If a third filter bar appears, extract the two into
  `components/common/FilterPill.tsx`.
- Server components read `roadmapDb` directly; the client rows mutate through
  the route handler then `router.refresh()` (§4.3 — no Server Actions).

## Deviations from prompt

- The checklist's intro box ("cách đọc bảng", the 4 kinds of test) is kept in
  the source doc but is **not** rendered in the app — it describes a chat
  workflow with an assistant, not something Bún can do. The per-skill note boxes
  (Viết, Nói) are stored in `roadmap_skills.note` and are rendered.
- The tools table is a plain table on the overview page; external links are
  shown as text, not as anchors (the source lists bare domains).

## Verification

- `npx tsc --noEmit` — clean for all new/changed files. One **pre-existing**
  error remains, unrelated: `.next/dev/types/validator.ts` references a deleted
  route `src/app/api/cards/refresh-ipa/route.js` (stale generated types).
- `npx wrangler d1 migrations apply english-learning-db --local` — applied.
  Verified seeded counts: nghe=23, doc=29, viet=62, noi=27 (141 total),
  4 skills, 9 tools.
- Ran the exact SQL of `listItems`, `getSummary` and the `setProgress` upsert
  against the local D1 with a temporary user, and confirmed:
  fail / pass+stale / untested hydrate correctly; a same-status write keeps
  `tested_at` while a status change refreshes it; the FK to `users` is enforced.
  The temporary user and its progress rows were deleted afterwards.
- **NOT tested:** no browser run. `npm run dev` / `npm run build` were not
  executed (CLAUDE.md §10.11 — needs the user's go-ahead), so the pages, the
  route handler over HTTP, and the dashboard card have not been exercised
  end-to-end. Nothing applied to the remote D1 either.

## Follow-ups / known issues

- **Production DB still needs the migration**:
  `npx wrangler d1 migrations apply english-learning-db` (no `--local`) — user
  action, per CLAUDE.md §10.5.
- **No mobile screen.** `/roadmap` renders the desktop layout on phones, same as
  `/templates`. `src/components/app-mobile` has no roadmap tab.
- `src/app/dashboard/page.tsx` is ~640 lines, already over the 500-line guide
  before this change (this change added 4 lines). Worth splitting separately.
- Phase 2 idea, deliberately skipped: a "Luyện ngay" link per item into the
  matching Bún module (chính tả → /study, collocation → /cloze, phát âm →
  /pronounce, viết → /compose). Needs a per-item mapping column.
- There is no UI to add/edit checklist items yet — editing means a new
  migration (or a direct `wrangler d1 execute`). That was accepted for phase 1.

---

## Update 2026-09-16 — tabs, filter cleanup, spelled-out word lists

Follow-up round after the first deploy, driven by user feedback on the live page.

### Changes

- **4 skill cards → tabs.** New `src/components/roadmap/RoadmapTabs.tsx` (client).
  `/roadmap` now loads all 141 items once and filters them client-side, so the
  learner can mark items across all four skills without a page navigation. Each
  tab carries its own progress bar, `pass/total`, and a red/orange line when the
  skill has failed or stale items. The active tab is mirrored into the URL as
  `?skill=<code>` with `history.replaceState` (no server re-render per tab).
- **`/roadmap/[skill]` is now a redirect** to `/roadmap?skill=<code>` so links
  shared before this change keep working. `RoadmapSummaryCard` links were
  updated to the `?skill=` form.
- **Removed the "Chưa test" filter pill.** With nothing marked it produced the
  exact same count and list as "Tất cả", which read as a duplicate. Filters are
  now Tất cả / Chưa đạt / Cần test lại / Đã đạt; untested items still appear
  under "Tất cả".
- **Abbreviations spelled out** across the whole checklist, per user request:
  NGSL → New General Service List, AWL → Academic Word List, then the PTE task
  codes (WFD → Write From Dictation, SST → Summarize Spoken Text, RA → Read
  Aloud, RS, DI, RL, SGD, RTS, ASQ, HIW, HCS, SMW, FIB, MC/MCM, RO, SWT, WE),
  plus PEEL, SVA → "hoà hợp chủ ngữ – động từ", CEFR → "khung tham chiếu ngôn
  ngữ châu Âu", D&D → "drag & drop".

### How content edits work now

`scripts/gen-roadmap-seed.mjs` gained a `--sync <path>` mode: it re-parses the
source doc and emits a migration of `UPDATE … WHERE item_key = …` statements
(items, skills, tools) instead of DDL + INSERT. This is the supported way to
change checklist wording after 0021 shipped — CLAUDE.md §4.5 forbids editing an
applied migration, and `item_key` stays fixed so no user progress is lost.

- `migrations/0022_roadmap_wordlist_names.sql` — NGSL / AWL expansion.
- `migrations/0023_roadmap_expand_abbreviations.sql` — PTE task codes and the
  rest. 154 UPDATEs each (141 items + 4 skills + 9 tools), content only.

### Verification

- `npx tsc --noEmit` clean (the pre-existing stale `validator.ts` error aside).
- 0022 + 0023 applied to **local and production** D1. On production:
  `SELECT COUNT(*) … label GLOB '*[A-Z][A-Z][A-Z]*'` (excluding the list names)
  returns 0 — no three-letter abbreviation left in any item label.
- Deployed: version `d4b3ae73-7a2f-4375-b09b-91ef7cd51b9d`. `/roadmap`,
  `/roadmap?skill=noi`, `/roadmap/nghe` all answer 307 → `/login` when signed
  out (route exists, middleware gates it, no 404/500).
- **Still NOT verified in a browser.** Tab switching, the `?skill=` deep link,
  the `/roadmap/[skill]` redirect and the new filter set have not been clicked
  through by anyone yet — middleware blocks unauthenticated checks, and no
  local dev run was made.

## Update 2026-09-16 — nghe-13/14/17 tests, data importer for sentence and passage banks

### Files changed

- `src/components/roadmap/test/dictation-grade.ts` — `soundsClose`, `gradeFabrication`, `gradeWords`, `alignFull`.
- `src/lib/edge-tts/synthesize.ts`, `src/app/api/reading/tts/route.ts` — optional `voice` (allow-list: Aria US, Sonia GB, Natasha AU); SSML `xml:lang` follows the voice.
- `src/components/roadmap/test/audio.ts` — sentence cache keyed by voice; `strict` mode (no browser-TTS fallback, used for accent test).
- `src/lib/roadmap/dictation-db.ts` — modes `words | fabrication | accent | reconstruct`; `pool` of item keys (defaults to the item itself).
- `src/app/api/roadmap/[key]/dictation-test/route.ts` — voice assignment for accent; server re-grades each new mode.
- `src/components/roadmap/test/DictationCard.tsx`, `src/components/roadmap/DictationTestSession.tsx` — UI for the new modes.
- `migrations/0034_roadmap_tests_nghe_13_14_17.sql` — test rows; sentences drawn from the nghe-06/07/08 bank.
- `migrations/0036_listening_passages.sql` — passage bank table (no UI yet).
- `scripts/import-roadmap-data.mjs` — JSON → validated migration (sentences + passages); rejects placeholder verifiers.
- `scripts/check-d1-split.mjs` — copy of wrangler's statement splitter (moved from `/tmp`).
- `content/roadmap-data/examples/*.example.json` — format examples (not real data).
- `src/doc/roadmap-data-format.md` — JSON formats, authoring + blind-verify prompts, import steps.

### Key decisions

- Migrations renumbered 0033→0034 and 0034→0036 because another session reserved 0033 (preset decks) and 0035 is the running Oxford NGSL 1501–2809 prefetch.
- nghe-13/14/17 reuse the verified nghe-06/07/08 sentences instead of a new bank.
- nghe-14 score = US% − GB/AU% word accuracy (threshold ≤ 15). nghe-17 counts sentences the learner self-reports as rewritten by meaning (forced to "no" when the typing is perfect).

### Verification

- `tsc --noEmit` clean (stale `.next/dev/types/validator.ts` error aside).
- Importer: both examples validate; 7 mutated files (bad keyword, smw tail, hiw index, topic, charset, scan count, sentence length) each rejected with the right message; generated SQL applied twice to a copy of the local DB → 10 sentences, 1 passage (idempotent); split-check 3 statements.
- 0034 + 0036 applied local and production; deployed version `8eec920c-a7c0-49f4-a313-e83ee6e069a1`. `/roadmap/test/nghe-13` → 307 (login), `/api/roadmap/nghe-14/dictation-test` → 401 when signed out.
- **Not tested in a browser**: the three new test flows, GB/AU voice playback on production, the save path.
- ⚠️ The production apply also applied `0033_preset_decks.sql` from a parallel session (it appeared between listing and applying). Its code is not deployed; tables are unused. The other session was notified.
