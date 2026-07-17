# Template PTE — speaking template memorization

## Purpose

The user memorizes PTE speaking templates (e.g. Summarize Group Discussion) by
**listening repeatedly** — flashcard SRS is word-level and was a bad fit. This
feature stores template *frames* (text with `[slot]` tokens and `/` `//`
thought-group markers) plus *fills* (the frame with real content substituted),
and offers four practice modes centered on TTS listening.

## Concepts

- **Frame**: raw template text. Slots are `[name]` (any bracketed name — `[topic]`,
  `[N1]`, `[reason]`; 1–40 per frame, nothing hard-coded). `/` = minor chunk
  break, `//` = sentence break (same markers the read-once chunker understands).
- **Fill** ("bài mẫu"): one concrete version. Created either via the slot form
  (stores `slot_values_json` + server-assembled `filled_text`) or by pasting a
  complete text (`slot_values_json = NULL` → excluded from the quiz).

## File map

| Area | Files |
|---|---|
| Migration | `migrations/0016_pte_templates.sql` (`pte_templates`, `pte_template_fills`) |
| Types | `PteTemplate*`, `PteTemplateFill*` in `src/lib/types.ts` |
| Slot util (pure, client-safe) | `src/lib/templates/slots.ts` |
| DB wrappers | `src/lib/templates/db.ts` (`pteTemplatesDb`, `pteTemplateFillsDb`) |
| API | `src/app/api/templates/route.ts`, `[id]/route.ts`, `[id]/fills/route.ts`, `[id]/fills/[fillId]/route.ts` |
| Pages | `src/app/templates/page.tsx` (list), `templates/new/page.tsx`, `templates/[id]/page.tsx` |
| Components | `src/components/templates/`: `TemplateEditor`, `TemplateDetailClient` (orchestrator), `TemplateKaraoke`, `MemorizeTrainer`, `FillForm`, `SlotQuiz` |
| Shared change | loop toggle in `src/lib/reading/use-karaoke.ts` + `src/components/reading/TransportControls.tsx` |

## Practice modes (TemplateDetailClient `mode`)

1. **Karaoke + nhắc lại** (`TemplateKaraoke`): `parseManualBreaks(text)` →
   ephemeral `<ReadAlong>` (id 0), identical wiring to `/read-once`. Text is
   either `stripSlots(frame_text)` ("Nghe khung" card) or a fill's
   `filled_text` ("Đọc bài" per fill). Echo mode comes from chunk practice.
   New **"Lặp cả bài"** toggle in TransportControls loops the whole passage
   (wraps to sentence 0 in `use-karaoke`; default off, session-only).
2. **Học thuộc dần** (`MemorizeTrainer`): `parseFrame` renders the frame
   line-by-line; hide levels 0/25/50/75/100% via `isWordHidden` (deterministic
   hash, monotonic across levels); slots render as purple pills and are never
   hidden; tap a blank to peek (orange until tapped again); first-letter hint
   toggle; per-line 🔊 + "Phát cả bài" sequential playback via
   `POST /api/reading/tts` (blob cached per line, speechSynthesis fallback).
3. **Tự luyện với đề mới** (`FillForm`): slot form with live preview (filled
   values green, missing slots orange) or paste-whole toggle; "Lưu và đọc ngay"
   saves then jumps straight to karaoke of the new fill. The same component
   also edits an existing fill (Pencil button on a fill row → prefilled form,
   PATCH `/api/templates/[id]/fills/[fillId]`; switching modes converts the
   fill between slot-form and pasted-whole).
4. **Quiz điền slot** (`SlotQuiz`): frame visible, slot contents of a chosen
   fill hidden behind inline inputs; lenient grading (lowercase, strip
   punctuation, collapse spaces); per-slot reveal; only fills with
   `slot_values` are offered.

## Data model notes

- Both tables user-scoped (`user_id` on every row + every query); fills also FK
  `template_id ... ON DELETE CASCADE`.
- `filled_text` is assembled **server-side** in the fills POST handler
  (`fillTemplate`) so it can never drift from frame + values. It keeps the `/`
  markers so karaoke chunking follows the template's rhythm.
- Editing a frame (adding `[N16]`…) propagates to form/preview/quiz
  automatically; old fills keep their frozen `filled_text` (still readable) and
  the quiz shows "chưa có" for slots missing from an old fill.

## Gotchas

- `parseManualBreaks` collapses `//` runs into one break — `/` vs `‖`
  distinction only renders in MemorizeTrainer/SlotQuiz, not karaoke. Fine
  because `splitPassage` sentence-splits on punctuation anyway.
- Ephemeral ReadAlong re-fetches translation (Gemini) + glossary per karaoke
  session — same as read-once.
- `SLOT_RE` would treat prose like `[sic]` as a slot; the editor's live slot
  pills make that visible.
- No SRS, no mobile-optimized layout for the new pages.
