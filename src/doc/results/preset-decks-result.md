# Preset decks ("Thư viện bộ từ") — implementation result (pilot)

Date: 2026-09-16
Prompt: `src/doc/prompts/preset-decks.md`

## Scope

A shared library of ready-made vocabulary decks built from the roadmap word
lists (NGSL, AWL), split by level into decks of ≤ 30 words, each card with a
Vietnamese gloss, part of speech, 3 natural en+vi examples, collocations and an
optional note. A learner opens a deck, unticks words they already know, can send
individual words to another of their own decks, and copies the rest into a new
or existing deck. The preset itself is never modified. **This round is the
pilot: 4 decks / 120 words seeded for quality review.**

## Files changed

Created:

- `scripts/build-preset-decks.mjs` — deterministic split of `content/wordlists/ngsl.json` + `awl.json` into levels and ≤ 30-word decks → `content/preset-decks/manifest.json`.
- `content/preset-decks/manifest.json` — generated: 16 levels, 112 decks, 3,290 words.
- `content/preset-decks/AUTHORING.md` — content spec (gloss, POS, example, collocation, note rules) used by the authoring agents; reuse it for the remaining decks.
- `scripts/check-preset-deck.mjs` — structural validator for a content file against the manifest.
- `content/preset-decks/{ngsl-1-01,ngsl-1-02,awl-1-01,awl-1-02}.json` — pilot content, in Bún's deck import format (also importable via "Import").
- `scripts/gen-preset-decks-seed.mjs` — content files → migration SQL (`--ddl` for the first one).
- `migrations/0033_preset_decks.sql` — generated: tables `preset_deck_levels`, `preset_decks`, `preset_deck_cards` + all 16 levels + 4 pilot decks (120 cards).
- `src/lib/preset-decks/db.ts` — `presetDecksDb.listLevels(userId)`, `getDeck(userId, code)`, `getCards(code)`.
- `src/app/api/preset-decks/[code]/copy/route.ts` — `POST`, copies selected words into the user's decks.
- `src/app/decks/library/page.tsx` — library overview (grouped Từ thông dụng / Từ học thuật → levels → deck tiles).
- `src/app/decks/library/[code]/page.tsx` — one preset deck.
- `src/components/preset-decks/PresetLevelSection.tsx` — level card with deck tiles + "đã có" progress.
- `src/components/preset-decks/PresetDeckPicker.tsx` — client: select / unselect / "bỏ từ đã có", per-word move, target picker, submit, success state.
- `src/components/preset-decks/PresetWordRow.tsx` — client: one word row, expandable examples / collocations / note.

Modified:

- `src/lib/types.ts` — appended `PresetDeckSummary`, `PresetDeckLevel`, `PresetDeckCard`, `PresetDeckDetail`.
- `src/app/decks/page.tsx` — "Thư viện" button in the title row linking to `/decks/library`.

## Key decisions

- **Content in D1, no `user_id`** (like `word_list_entries`). "Lấy bộ về" copies rows into `flashcards` for the user through `flashcardsDb.create`; nothing user-specific is stored on the preset side, so other users are unaffected.
- **Levels.** NGSL: rank bands of 500 (1–500 … 2501–2809). AWL: one level per sublist (60 words → 2 decks). Decks are balanced (`ceil(n/30)` near-equal chunks), in list order.
- **Closed-class NGSL words skipped** (138: articles, pronouns, auxiliaries/modals, basic prepositions, numbers…) — they make poor flashcards. Discourse words (however, although, whether, still, even…) are kept. The skip list is in `build-preset-decks.mjs`.
- **"Đã biết" = already in any of the user's decks** (case-insensitive headword match). Those words start unticked and show a "Đã có · <deck>" badge; no extra table. Words the user unticks manually are not persisted — per the clarification, the copy itself is what is saved.
- **Per-word "chuyển sang"** targets the user's existing decks. A moved word is implicitly selected; server-side a word listed in both `words` and `moves` only goes to the move target.
- **IPA not authored** — joined from `word_glossary` (Oxford US, prefetched for NGSL ≤ 1500 + AWL) at read/copy time. 117/120 pilot words have it (missing: percent, process, last).
- **Duplicates** against the target deck are skipped, same rule as `/api/decks/import`. The import route's insert loop was not extracted: preset cards are already typed/normalized, so only a ~10-line loop is shared in spirit.
- **Preset decks without content are hidden**, so later batches just add decks via new migrations (levels are `INSERT OR IGNORE`d every time).
- **Migration applied locally with `d1 execute --file` + a manual `d1_migrations` row**, not `migrations apply`, because the roadmap session's in-progress 0034/0036 were also pending in the same folder.

## Deviations from prompt

- Pilot only (4 decks), by agreement — the other 108 decks have manifest entries but no content yet.
- New decks created from a preset get `subtitle` = the level label (e.g. "Học thuật · Sublist 1").

## Verification

- `npx tsc --noEmit` — clean except the pre-existing `.next/dev/types/validator.ts` stale `refresh-ipa` error.
- `node scripts/check-preset-deck.mjs` — ✓ for all 4 pilot files (warnings only for irregular forms: said, went, told, men…).
- Content reviewed manually (all 120 cards): glosses, examples, translations, collocations. One fix: removed the `try – tried – tried` note (regular verb).
- Migration executed on local D1: 16 levels, 4 decks, 120 cards; JSON with apostrophes round-trips; deck-meta and card+IPA queries return expected rows.
- **NOT tested:** no browser run (CLAUDE.md §10.11 — `npm run dev` needs the user's go-ahead), so the library pages, the picker UI and `POST /api/preset-decks/[code]/copy` have not been exercised end-to-end. Local DB has no users, so the owned-word matching was not run against real cards. Nothing applied to remote D1.

## Follow-ups / known issues

- **Remaining 108 decks** (3,170 words): run authoring agents with `AUTHORING.md`, check, then `node scripts/gen-preset-decks-seed.mjs migrations/00NN_preset_decks_<batch>.sql <codes…>` (no `--ddl`).
- **IPA for NGSL 1501–2809** is not in `word_glossary` yet (roadmap session's `0035_word_glossary_oxford_ngsl_upper` is covering that).
- Copied cards have no Oxford mp3 until the user presses "Cập nhật phát âm" on the deck (same as JSON import). Could be kicked off in `waitUntil` after copy.
- No mobile layout for `/decks/library` and no entry point in `MDecksList`.
- Possible link from roadmap items (doc-01 … doc-04, nghe-09 … nghe-11) to the matching library level.
- **Production already has 0033.** The roadmap session ran `migrations apply --remote` for its own files while 0033 sat in the folder, so 0033 went to production too (the peer session reported md5 `83db2619…`, which matches the local file). The code is not deployed, so nothing reads the tables yet. From now on 0033 is frozen: fixes and new decks go in 0037+ (0034–0036 belong to the roadmap session).

---

## Update 2026-09-16 — level view, user-chosen deck size, enriched source content

User feedback on the first UI (screenshot): too ugly; run "Sửa từ thiếu info"
on the source set and store it in the DB (every user needs it anyway); show by
level and list every word; the learner picks how many words to take and types
how many words go in each deck.

### Changes

- **UI rebuilt around levels.** `/decks/library` shows all 16 levels as tiles
  per list (NGSL / AWL), with "đã có x/y" progress; levels without content show
  "Đang soạn". `/decks/library/[code]` is now a **level** page listing every
  word of the level: search, filter (Chưa có / Đã có / Tất cả), "Chọn nhanh N
  từ chưa có", select-all-visible, compact rows (custom checkbox, Pexels
  thumbnail, word + IPA + POS abbreviation, meaning, "Đã có" tag) that expand
  into examples with their images, collocation chips, note and audio.
- **Take bar** (sticky bottom, appears once something is selected):
  "Tạo bộ mới" with a typed words-per-deck (5–200, live preview "Chia thành 3
  bộ: 20 · 20 · 5") or "Thêm vào bộ có sẵn". Replaces the per-row "Theo bộ
  đích" select — moving words to another deck = select them and add to an
  existing deck.
- **API** `POST /api/preset-levels/[code]/copy` replaces
  `/api/preset-decks/[code]/copy`. New decks are named "<level label> · Bộ N",
  numbering continues after the user's existing decks with that prefix.
- **Source enrichment** — `scripts/enrich-preset-decks.mjs` does what the deck
  "Sửa từ thiếu info" sweep does, once, on the content files: Oxford US IPA
  (CMU fallback) + Oxford mp3 URL, Pexels image for the word, Pexels image per
  example sentence. `gen-preset-decks-seed.mjs --enrich --alter` turns it into
  `migrations/0037_preset_decks_enrich.sql` (adds `ipa`, `audio_src`,
  `image_url`, `image_attribution` to `preset_deck_cards` + UPDATEs).
- **Audio for copied cards:** the card gets `audio_url` = Oxford mp3 URL and
  `audio_us_status = 'ok'`; `/api/audio/[cardId]` now proxies that URL when the
  card has no R2 key yet and caches it to R2 (`audio/cards/<id>.mp3`) on first
  play. `isAllowedOxfordUrl` moved from `/api/words/audio/[word]` into
  `src/lib/oxford/pronunciation.ts` so both routes share the SSRF guard.

### Removed (created earlier in this feature, never shipped)

`src/app/api/preset-decks/[code]/copy/route.ts`,
`src/components/preset-decks/{PresetLevelSection,PresetDeckPicker}.tsx`
(old `PresetWordRow.tsx` rewritten).

### Verification (update 2)

- `npx tsc --noEmit` — clean for `src/` (only stale `.next` generated-type errors).
- Enrichment: IPA 120/120, Oxford mp3 URL 119/120, word image 44/120, example images ~211/360. Pexels throttled the run
  part-way (non-ok responses → `getPexelsImage` returns null); the script was stopped and 0037 generated from what was
  filled. Rerun `enrich-preset-decks.mjs` later and ship the rest as a new `--enrich` migration (no `--alter`).
- 0037 applied locally (`d1 execute --file` + `d1_migrations` row) and **on remote** (user approved; it was the only
  pending remote migration). Deployed with `npm run deploy` (user approved) → version `4d258162`. This deploy also
  shipped the roadmap session's uncommitted work in this worktree (it had already deployed it before).
- Production `/decks/library/ngsl-1` redirects unauthenticated requests to `/login` (no 500).
- **NOT tested:** the logged-in pages and `POST /api/preset-levels/[code]/copy` were not exercised in a browser — local
  dev in this worktree has no `.dev.vars` and returned 500 on every route (leftover production build in `.next`), and
  production login is Google OAuth. The first-play R2 caching in `/api/audio/[cardId]` is untested.

---

## Update 2026-09-16 — full NGSL/AWL rollout + PTE collocations

- **All NGSL + AWL content authored and shipped.** 112 decks / 3,290 cards across
  16 levels (NGSL 6 levels, AWL sublists 1–10), seeded to local + remote in
  batches (migrations 0038–0052). Each deck: gloss, POS, 3 en+vi examples,
  collocations, notes; enriched with Oxford US IPA/mp3 (CMU fallback) via
  `scripts/enrich-preset-decks.mjs`.
- **Academic Collocation List (Pearson/PTE) added as a third list `colloc`.**
  2,468 collocations from `collocations-import/colloc-01..30.json` (already
  complete: gloss, IPA, 3 examples). `scripts/build-colloc-preset.mjs` re-splits
  them into 150-card blocks (17 groups, 1 block per level), copies them into the
  preset format and appends to the manifest. Migrations 0053/0054.
  - POS is stored verbatim ("adj + n" etc.); no `collocations` field (each card
    IS a collocation); no audio (multi-word → browser TTS); no images.
  - UI: `preset-meta.ts` gains a `colloc` entry (teal, Link2 icon, "Cụm từ học
    thuật / PTE"); `--v-teal-soft` token added; library `lists` array includes it.
- **Remote total: 5,758 preset cards** (3,290 word + 2,468 collocation), 129
  decks, 33 levels. Deployed (versions through `7abbd8f6`).
- Block-size note: word decks use ≤30/block; the collocation list uses 150/block
  at the user's request (one 150-card group per level).
- **Still deferred:** Pexels images for most cards (rate-limited; rerun
  `enrich-preset-decks.mjs` and ship a follow-up `--enrich` migration); mobile
  layout for `/decks/library`; roadmap→library links.
