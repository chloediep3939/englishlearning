# Result: pte-templates

> Date: 2026-07-17. Prompt: `src/doc/prompts/pte-templates.md`.

## Scope

New "Template PTE" feature at `/templates`: a library of PTE speaking templates
(frames with `[slot]` tokens and `/` `//` thought-group markers) with four
practice modes — karaoke + echo (listening-first, per the user's goal), progressive
word-hiding memorization, fill-slots-for-a-new-topic, and a slot recall quiz.

## Files changed

**Created**
- `migrations/0016_pte_templates.sql` — `pte_templates` + `pte_template_fills` tables (user-scoped, fills cascade on template delete).
- `src/lib/templates/slots.ts` — pure slot util: `SLOT_RE`, `extractSlots`, `fillTemplate`, `stripSlots`, `parseFrame`, `isWordHidden` (deterministic + monotonic hiding).
- `src/lib/templates/db.ts` — `pteTemplatesDb` (create/getById/listByUser with fill_count/update/deleteById) and `pteTemplateFillsDb` (create/getById/listByTemplate/deleteById), mirroring `src/lib/passages/db.ts`.
- `src/app/api/templates/route.ts` — GET list, POST create (validates 20–10,000 chars, 1–40 slots).
- `src/app/api/templates/[id]/route.ts` — GET, PATCH, DELETE.
- `src/app/api/templates/[id]/fills/route.ts` — GET fills; POST with two body shapes: `{topic, slot_values}` (server-side assembly via `fillTemplate`, 400 lists missing slots) or `{topic, filled_text}` (pasted whole, `slot_values_json = NULL`).
- `src/app/api/templates/[id]/fills/[fillId]/route.ts` — DELETE (guards template_id linkage).
- `src/app/templates/page.tsx` — server list page (title, slot count, fill count, empty state with Mascot).
- `src/app/templates/new/page.tsx` — thin wrapper around `TemplateEditor`.
- `src/app/templates/[id]/page.tsx` — server detail page; loads template + fills + reading prefs, renders `TemplateDetailClient`.
- `src/components/templates/TemplateEditor.tsx` — create/edit form with live slot pills.
- `src/components/templates/TemplateDetailClient.tsx` — mode orchestrator (menu / karaoke / memorize / fill / quiz / edit) + fills list with per-fill karaoke and delete.
- `src/components/templates/TemplateKaraoke.tsx` — `parseManualBreaks` → ephemeral `<ReadAlong>` (read-once wiring, chunk breaks seeded from `/`).
- `src/components/templates/MemorizeTrainer.tsx` — hide levels 0/25/50/75/100%, first-letter hint toggle, tap-to-peek, per-line listen + play-all (Edge TTS with browser fallback, per-line blob cache).
- `src/components/templates/FillForm.tsx` — slot form with live preview / paste-whole toggle; "Lưu bài mẫu" and "Lưu và đọc ngay".
- `src/components/templates/SlotQuiz.tsx` — fill picker (slot-value fills only), inline inputs per slot, lenient grading, per-slot reveal, score.

**Modified**
- `src/lib/types.ts` — added `PteTemplate`, `PteTemplateRow`, `PteTemplateFill`, `PteTemplateFillRow`.
- `src/lib/reading/use-karaoke.ts` — loop-whole-passage support: `loop` state + `toggleLoop`, wrap-to-sentence-0 in the `speakSentence` bounds branch. Default off; existing consumers unchanged.
- `src/components/reading/TransportControls.tsx` — "Đọc lại từ đầu" row now also holds a "Lặp cả bài" toggle button (Repeat icon, highlighted when on). Benefits `/read/[id]` and `/read-once` too.
- `src/components/Sidebar.tsx` — nav entry `Template PTE` (`ScrollText`, purple) after `Bài đọc`.

## Key decisions

- Fills store BOTH `slot_values_json` (re-editable, feeds the quiz) and the
  assembled `filled_text` (source of truth for TTS). Assembly happens server-side
  in the POST handler so the two can never drift.
- Slot count is not hard-coded: everything derives from `extractSlots` over the
  current frame (regex `\[([A-Za-z][A-Za-z0-9 _-]{0,30})\]`, 1–40 slots). Editing
  the frame to add `[N16]`… propagates automatically. Old fills keep their frozen
  `filled_text`; the quiz shows "chưa có" for slots missing from an old fill and
  skips grading them.
- `isWordHidden` uses a Knuth multiplicative hash — deterministic (CLAUDE.md §6.8)
  and monotonic across levels (a word hidden at 25% stays hidden at 50/75/100).
  Verified: ~24.8% of 1000 ordinals hidden at level 25.
- Frame karaoke reads `stripSlots(frame_text)` — slots vanish, `/` markers stay,
  so chunk practice works on the bare frame with no fill required.
- Loop was implemented inside `use-karaoke` (session-only state, not persisted)
  rather than a ReadAlong prop — smallest surface, off by default.
- Fill PATCH (re-edit a saved fill) deferred — delete + recreate covers it.

## Deviations from prompt

- None vs. the agreed plan. (The original chat prompt was open-ended "how should
  I put this in"; scope was negotiated in-chat — see prompt file.)

## Verification

- `npx tsc --noEmit` clean.
- Migration applied locally (`wrangler d1 migrations apply --local`); both
  `pte_%` tables confirmed via sqlite_master.
- Slot util smoke-tested via esbuild+node: extractSlots order, fillTemplate
  missing-slot detection, stripSlots output, parseFrame token kinds/break levels,
  isWordHidden monotonicity + distribution.
- NOT tested: no end-to-end run (`npm run dev` not run per CLAUDE.md §10.11) —
  the pages, API routes, karaoke loop, memorize TTS, and quiz UI have not been
  exercised in a browser. User should smoke-test the flows listed in the plan.

## Follow-ups / known issues

- Fill re-edit (PATCH) not implemented.
- No SRS scheduling for templates (explicitly out of scope; can be added later).
- No mobile-optimized layout for the new pages (read-once has none either);
  ReadAlong itself keeps its own mobile layout.
- Ephemeral ReadAlong re-fetches translation/glossary on every karaoke session
  (same behavior as read-once) — costs a Gemini call per session.
- `//` collapses to a single chunk break in karaoke (`parseManualBreaks`
  behavior); the `/` vs `‖` distinction renders only in memorize/quiz views.
