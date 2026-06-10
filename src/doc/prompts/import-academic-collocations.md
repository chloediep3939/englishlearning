# Prompt: Import Academic Collocations into Vocabulary DB

> Date: 2026-06-11
> Source prompt: user's `BUILD_COLLOCATIONS.md` + `parse_pdf.py` + `the-academic-collocation-list.pdf`
> (the original was in English with Vietnamese code comments; reproduced here in English).

## Goal

Treat Pearson's *Academic Collocation List* (PTE v2/2025) as **one vocabulary set**
(deck) in the existing English-learning app. Each collocation (e.g. `active
involvement`) = one word (flashcard) in that set.

## Workflow (as requested)

1. **Parse the PDF** → `collocations.json` (~2,469 entries) with `ipa` /
   `meaning_vi` / `examples` left empty.
2. **Discover the DB schema** and map JSON fields to the existing word/deck
   tables. Report and confirm before inserting.
3. **Create one set row**: `Academic Collocations (Pearson 2025)`.
4. **Enrich** every entry:
   - `ipa`: **General American (GenAm)** IPA, wrapped in `/.../`, primary `ˈ`
     and secondary `ˌ` stress, rhotic `r` after vowels, `ɑː` (not British `ɒ`)
     for LOT, `ɔːr` for NORTH, `ər` for unstressed schwa-r. Heteronyms picked by
     part of speech (record, conduct, use, present, …).
   - `meaning_vi`: short, natural Vietnamese meaning (not word-by-word).
   - `examples`: exactly 3 `{en, vi}` objects, English 8–15 words, using the
     collocation correctly in realistic contexts, natural Vietnamese.
   - Work in batches; save after each batch (resume mechanism). Never modify the
     original parsed fields. Skip entries that already have a meaning.
5. **Insert** into the DB (idempotent, transactional).
6. **Verify**: count, sample rows, search by substring.

## Decisions taken in this session (override the generic prompt)

- The app is **multi-user Cloudflare D1**, not a plain SQLite/MySQL/Postgres DB.
  Set table = `flashcard_decks`, word table = `flashcards`.
- Instead of direct DB insertion, deliverable = **30 numbered JSON files**
  (`colloc-01.json` … `colloc-30.json`) in the export format read by the app's
  existing `POST /api/decks/import` route. The user imports them sequentially
  via the in-app "Import bộ từ" dialog (file 01 → new deck; 02–30 → existing
  deck).
- Headwords keep their **articles/prepositions restored** ("achieve a goal",
  "allow access to"), reconstructed from the source's parenthetical markers.
- Enrichment for ids 83–2468 was produced by a 29-agent parallel workflow under
  a shared IPA/meaning/example rulebook; ids 1–82 (file 01) were hand-written.
