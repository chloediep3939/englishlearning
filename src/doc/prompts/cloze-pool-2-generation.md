<!-- Saved 2026-05-14 -->

# Cloze pool — Part 2/3: Generation + background trigger

## Prerequisite

Part 1 (`cloze-pool-1-schema.md`) must be done. Table `flashcard_cloze_pool` exists, `flashcardClozePoolDb` wrapper available.

## Goal

1. Refactor `generateClozeSentences()` to generate 10 sentences in one call.
2. Add `ensureClozePool(word)` wrapper: checks pool, generates only if missing.
3. Trigger background pool gen after a card is saved.

## Doc workflow

- Save this prompt to `src/doc/prompts/cloze-pool-2-generation.md`.
- Append "Part 2" section to `src/doc/results/cloze-pool-result.md`.

## Pre-reading

- Existing `src/lib/flashcards/cloze.ts` — read full file to match prompt style.
- Existing `/api/cards/generate/route.ts` — for the background trigger insertion point.
- Cloudflare Workers `getCloudflareContext({ async: true })` pattern in `src/lib/db.ts`.

## Update `src/lib/flashcards/cloze.ts`

Change `generateClozeSentences(word)` to return 10 sentences. The new prompt:

```
Generate exactly 10 fill-in-blank sentences using the English word "{word}".
Each sentence must contain "{word}" (or an inflected form of it) replaced by __ (two underscores).
Vary contexts (work, school, daily life, news, casual) and CEFR levels (mix B1, B2, C1).
Return ONLY a JSON array — no markdown fences, no prose:
[{"sentence": "She received __ treatment from the staff.", "blank_word": "preferential", "pos": "adj", "difficulty": "B2"}, ...]
```

Return type:

```ts
export async function generateClozeSentences(word: string): Promise<ClozeSentence[]>
```

⚠️ Keep existing JSON-parsing defensive pattern from the file (strip code fences, try/catch). If existing returns fewer fields, extend to include `blank_word`, `pos`, `difficulty`.

## Add `ensureClozePool` to same file

```ts
export async function ensureClozePool(
  word: string,
  options: { minimum?: number } = {}
): Promise<void> {
  const min = options.minimum ?? 5;
  const lower = word.toLowerCase();

  try {
    if (await flashcardClozePoolDb.hasMinimum(lower, min)) {
      return; // cache hit, skip AI
    }
    const sentences = await generateClozeSentences(lower);
    if (sentences.length === 0) {
      console.warn(`[cloze-pool] AI returned 0 sentences for "${lower}"`);
      return;
    }
    await flashcardClozePoolDb.bulkInsert(lower, sentences);
    console.log(`[cloze-pool] saved ${sentences.length} sentences for "${lower}"`);
  } catch (err) {
    // Swallow — this is background work. Log and move on.
    console.error(`[cloze-pool] failed for "${lower}":`, err);
  }
}
```

This is the ONLY function callers should use going forward — it handles the cache check + AI call + save. Direct callers of `generateClozeSentences` should be migrated (Part 3).

## Background trigger in `/api/cards/generate`

In the route handler, AFTER the card is successfully saved (after `flashcardsDb.create(...)` returns), add:

```ts
import { ensureClozePool } from '@/lib/flashcards/cloze';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// ... after card save:
try {
  const cf = await getCloudflareContext({ async: true });
  cf.ctx.waitUntil(ensureClozePool(headword));
} catch {
  // ctx unavailable (local dev edge case) — fire-and-forget
  ensureClozePool(headword).catch(() => {});
}
```

`waitUntil` lets the HTTP response return immediately while AI generation runs in the background until completion. Standard Cloudflare Workers pattern.

⚠️ `/api/cards/preview` — DO NOT add this trigger. Preview doesn't save a card; we only want pool gen after the user confirms save.

## Constraints

- No new packages.
- The AI call still uses `getAIProvider().generateText()` — no other change to provider.
- Lowercase word everywhere.
- Don't await `waitUntil`'s promise from the route handler; that defeats the point.

## Verification

```bash
npm run dev
```

Steps:
1. Open the add-word page, add a new word, e.g. "preferential".
2. Wait ~5 seconds, then check:
   ```bash
   npx wrangler d1 execute english-learning-db --local \
     --command="SELECT word, COUNT(*) FROM flashcard_cloze_pool GROUP BY word"
   ```
   Expect: `preferential | 10`.
3. Add the same word again as a different user → no new rows; count stays 10. AI call should NOT fire (check logs).
4. Add a different word, "ubiquitous" → 10 new rows for "ubiquitous".

## Next part

Part 3 (`cloze-pool-3-consumers.md`) updates cloze quiz, compose suggest, and card example display to read from the pool.
