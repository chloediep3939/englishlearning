# Result: add-word-examples (2026-08-04)

## Scope

Example sentences for newly added words now come from the Oxford Learner's
entry page (parsed from the same HTML the audio fetch already downloads,
zero extra requests), translated to Vietnamese via MyMemory, and saved to
the card — but ONLY when the card has zero examples. Cards with any
example are user-controlled and never touched. The card-detail modal
gains an en+vi examples editor, and the deck sweep can retro-fill old
0-example (bulk-added) cards.

## Files changed

- `src/lib/oxford/pronunciation.ts` — `extractExamples(html)` (balanced
  `<span class="x">` scanner, entity decode, dedupe, 20–160 chars, cap 8);
  `examples: string[]` added to `ParsedUsPronunciation`/`OxfordPronunciation`;
  new `fetchOxfordExamples(url)`.
- `src/lib/oxford/persist.ts` — `resolvePronunciation` and
  `fetchAndStoreOxfordAudio` thread `examples` through (`OxfordAudioResult`
  gains the field; phrases return [] — dictionary fallback covers).
- `src/lib/flashcards/build-examples.ts` — new `ensureCardExamples`:
  no-op unless the card has 0 examples; picks 3 candidates (Oxford first,
  dict fallback, headword-stem preference); sequential MyMemory
  translation, en-only kept on a miss; re-reads before write so
  concurrently user-added examples win. Never throws.
- `src/app/api/cards/generate/route.ts` (Nhiều từ) — background
  `ensureCardExamples` task (waitUntil) fed by the audio fetch's Oxford
  examples + dictionary examples.
- `src/app/api/cards/route.ts` (Một từ POST) — same background fill, only
  when the card was saved with 0 examples (user-entered preview examples
  always win).
- `src/app/api/cards/[id]/regenerate/route.ts` — new `'examples'` field →
  leg fetches Oxford (`fetchOxfordExamples`) + dictionary and calls
  `ensureCardExamples` (self-guarding no-op on ≥1 example).
- `src/components/deck-detail/WordRow.tsx` — `RegenField` union +
  `FIELD_LABEL_VI` gain `'examples'` ("ví dụ"). `getMissingFields`
  unchanged (no new warning badge).
- `src/components/DeckDetailClient.tsx` — sweep `fixTargets` gains
  `needsExamples = card.examples.length === 0`; the regenerate call sends
  `'examples'` for those cards, and the example-image step also runs for
  them so freshly added examples get their Pexels image in the same sweep.
- `src/components/deck-detail/CardDetailModal.tsx` — edit mode now shows an
  "Ví dụ (en + vi)" editor (rows with en/vi inputs, remove, "+ Thêm ví dụ",
  max 5 — same shape as the single-import preview editor); PUT body
  includes `examples` (the API already accepted it). View mode unchanged.
- `src/components/add/single-import.tsx` — auto-gen description line
  updated ("3 ví dụ Oxford + dịch Việt").

## Key decisions

- Oxford over ozdic: already scraped for audio (examples ride along free),
  learner-grade sentences; ozdic's Examples tab is Wiktionary-sourced and
  has no API.
- The single-word tab's example editor already existed
  (single-import.tsx:880-931) — untouched; it is the user-control surface.
- MyMemory free tier ≈ 5000 chars/day/IP → ~25–30 translated sentences per
  day. Beyond that, examples save en-only; "Học câu" skips vi-less
  sentences. (Re-running the sweep later does NOT translate them — the
  0-example guard blocks it; noted as a follow-up.)

## Deviations from prompt

- None. The "only when zero examples" rule is enforced in
  `ensureCardExamples` itself, so every entry point inherits it.

## Verification

- `npx tsc --noEmit` clean. No migrations.
- NOT tested end-to-end (dev server not run): Oxford HTML parse against
  the live page, MyMemory translations, sweep retro-fill, and the modal
  editor all need a manual smoke test.

## Follow-ups / known issues

- en-only examples (MyMemory quota misses) are never re-translated —
  the 0-example guard blocks the fill and the user rule forbids touching
  existing examples. If this bites, a separate explicit "dịch ví dụ" action
  would be needed.
- `extractExamples` depends on Oxford's `<span class="x">` markup — if
  Oxford changes their HTML, examples silently return [] (audio parse has
  the same property).
