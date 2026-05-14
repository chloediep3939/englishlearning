# Demo-feedback prompt — UPDATES (apply alongside the main prompt)
<!-- Saved 2026-05-14 -->

Original prompt `demo-feedback.md` was written before cloze-pool / article-simplify / migrate-ai-leaks. These updates reconcile.

## Order of operations

Apply in this order:
1. `cloze-pool-1` → `cloze-pool-2` → `cloze-pool-3` first (sets up pool system)
2. `article-simplify-1` → `2` → `3` (article changes)
3. `dashboard-polish-1.md` (header pills — clock + Pomodoro)
4. **THEN** `demo-feedback.md` with these updates

If user wants demo-feedback FIRST: feedback button placement falls back to "rightmost in header before user avatar" (no clock/flame pills assumption).

## Doc workflow (CLAUDE.md §8)

Add to top of execution:
- Save `demo-feedback.md` + this updates file to `src/doc/prompts/demo-feedback.md` (concatenate or store as 2 files).
- Write `src/doc/results/demo-feedback-result.md` after.

## Update 1 — Migration number

In Section 1 of the original prompt, change:

```
migrations/0008_demo_feedback.sql
```

to:

```
migrations/NNNN_demo_feedback.sql
```

Where `NNNN` = next available 4-digit number. List `migrations/` first, find highest existing number, increment.

## Update 2 — Seed cloze pool alongside cards

Original prompt has `DemoCardSeed.examples: Array<{en, vn}>`. After cloze-pool-3, card detail UI reads from `flashcard_cloze_pool`, not from a card field.

**Change to seed-data.ts shape:**

```ts
export interface DemoCardSeed {
  english: string;
  vn_meaning: string;
  ipa: string;
  audio_url?: string | null;
  collocations: string[];
  image_url?: string | null;
  image_alt?: string | null;
  // REMOVED: examples (now in cloze pool)
  cloze_sentences: Array<{      // NEW
    sentence: string;            // with __ for blank
    blank_word: string;
    pos?: string | null;
    difficulty?: string | null;
  }>;
}
```

**In `seedDemoUser(userId)` logic** (Section 3 helper):

After inserting each card, also bulk-insert its `cloze_sentences` into `flashcard_cloze_pool` via `flashcardClozePoolDb.bulkInsert(card.english, card.cloze_sentences)`.

⚠️ `flashcard_cloze_pool` is **shared globally** (no `user_id`). If the word already has pool entries from a prior user/seed, skip the insert to avoid duplicates:

```ts
const existing = await flashcardClozePoolDb.countByWord(card.english);
if (existing === 0) {
  await flashcardClozePoolDb.bulkInsert(card.english, card.cloze_sentences);
}
```

## Update 3 — Seed generation script

Original script calls `generateCardData(english, false)`. After migrate-ai-leaks, that function may be removed or split. Script logic:

For each word, generate:
- `ipa`: from `lookupWord()` or `fetchIpa()` (per migrate-ai-leaks B2)
- `vn_meaning`: from `translateEnToVi()` (per migrate-ai-leaks B1)
- `collocations`: from `getCollocations()` (Datamuse)
- `image_url`: from Pexels API
- `cloze_sentences`: from `generateClozeSentences(word)` (returns 10 per word — see cloze-pool-2)

Parallelize calls with `Promise.all`. Each word ≈ 4-5 parallel API calls. 60 words total → reasonable run time (~2-3 min).

If translation isn't migrated to MS Translator yet (user declined env var), script falls back to whatever `translateEnToVi()` currently does.

## Update 4 — Feedback button placement (conditional)

Section 6 says "next to the clock/flame pills". Update:

- **If `dashboard-polish-1.md` is applied** (clock pill exists): place feedback button between clock pill and user avatar.
- **If not applied yet**: place feedback button as rightmost item in header, just before user avatar/menu. Same icon + click behavior, just different position.

Verify by reading the current header component before placement.

## Update 5 — Banner color token

Section 5 references `--v-orange-soft`. If this token doesn't exist in `globals.css`:

Use inline color instead:

```ts
backgroundColor: 'color-mix(in srgb, var(--v-orange) 15%, transparent)'
```

Or add `--v-orange-soft: #fff3e0` (or similar warm tint) to `globals.css` `:root`. Verify which exists; pick whichever requires less change.

## Update 6 — Mascot file paths

Original references `bun-happy` pose for feedback modal header. Verify which mascot poses exist in `public/mascot/` after any prior landing-page or other prompt application. The standard poses are `ngoc-*.png` (legacy filenames, "Bún" is the marketing name). If landing-page added `bun-*.png` files, those are landing-only and may or may not be reusable here.

Safer default: use `ngoc-happy.png` for the feedback modal header (already exists). Note in result file.

## Verification additions

After the original prompt's acceptance criteria, also verify:

- Click on a demo deck → open a card → 1-2 cloze sentences appear in "examples" section (sourced from pool).
- Open cloze quiz on a demo card → sentences appear, no AI call in logs (pool already seeded).
- New migration applied with next-sequence number (not 0008).
- Feedback button visible regardless of `dashboard-polish-1` state.

## Out of scope (for this update)

- Re-running already-applied migrations.
- Modifying the original `demo-feedback.md` text in place. Just apply both files together — this is a delta.
