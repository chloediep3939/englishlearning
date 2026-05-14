# Distractor pool — Part 2/2: Rewrite generateDistractorPool

## Prerequisite

Part 1 done: `common-words.ts` + `levenshtein.ts` exist.

## Goal

Rewrite `generateDistractorPool()` in `src/lib/flashcards/distractors.ts` to be pure algorithmic — no AI. Priority chain: same-deck → user vocab → static fallback.

## Doc workflow

- Save to `src/doc/prompts/distractor-random-2.md`.
- Append "Part 2" to `src/doc/results/distractor-random-result.md`.

## Pre-reading

- Existing `src/lib/flashcards/distractors.ts` (current implementation)
- All callers: `grep -rn "generateDistractorPool(" src/`
- `flashcardsDb` in `src/lib/db.ts` — note user-scoping pattern

## New signature

```ts
export interface DistractorOptions {
  userId: number;
  count?: number;          // default 3
  pos?: string | null;     // POS filter; null = any
  deckId?: number;         // prefer same-deck words
  excludeWords?: string[]; // additional skips (e.g. the answer itself)
}

export async function generateDistractorPool(
  targetWord: string,
  options: DistractorOptions
): Promise<string[]>
```

## Implementation

Replace the file contents entirely:

```ts
import { getDb } from '@/lib/db';
import { levenshtein } from './levenshtein';
import { getFallbackPool } from './common-words';

export interface DistractorOptions {
  userId: number;
  count?: number;
  pos?: string | null;
  deckId?: number;
  excludeWords?: string[];
}

export async function generateDistractorPool(
  targetWord: string,
  options: DistractorOptions
): Promise<string[]> {
  const count = options.count ?? 3;
  const target = targetWord.toLowerCase();
  const excludeSet = new Set(
    (options.excludeWords ?? []).map((w) => w.toLowerCase())
  );
  excludeSet.add(target);

  const db = await getDb();
  const candidates: string[] = [];

  // Tier 1: same deck
  if (options.deckId) {
    const sql = options.pos
      ? `SELECT DISTINCT LOWER(headword) AS word FROM flashcards
         WHERE deck_id = ? AND user_id = ? AND LOWER(headword) != ? AND pos = ?`
      : `SELECT DISTINCT LOWER(headword) AS word FROM flashcards
         WHERE deck_id = ? AND user_id = ? AND LOWER(headword) != ?`;
    const binds = options.pos
      ? [options.deckId, options.userId, target, options.pos]
      : [options.deckId, options.userId, target];
    const res = await db.prepare(sql).bind(...binds).all<{ word: string }>();
    for (const row of res.results ?? []) candidates.push(row.word);
  }

  // Tier 2: user's full vocab (if Tier 1 not enough)
  if (filteredAndShuffled(candidates, target, excludeSet).length < count) {
    const sql = options.pos
      ? `SELECT DISTINCT LOWER(headword) AS word FROM flashcards
         WHERE user_id = ? AND LOWER(headword) != ? AND pos = ?`
      : `SELECT DISTINCT LOWER(headword) AS word FROM flashcards
         WHERE user_id = ? AND LOWER(headword) != ?`;
    const binds = options.pos
      ? [options.userId, target, options.pos]
      : [options.userId, target];
    const res = await db.prepare(sql).bind(...binds).all<{ word: string }>();
    for (const row of res.results ?? []) {
      if (!candidates.includes(row.word)) candidates.push(row.word);
    }
  }

  // Tier 3: static fallback
  const filtered = filteredAndShuffled(candidates, target, excludeSet);
  if (filtered.length < count) {
    const fallback = getFallbackPool(options.pos);
    for (const word of fallback) {
      if (!candidates.includes(word.toLowerCase())) {
        candidates.push(word.toLowerCase());
      }
    }
  }

  return filteredAndShuffled(candidates, target, excludeSet).slice(0, count);
}

function filteredAndShuffled(
  pool: string[],
  target: string,
  exclude: Set<string>
): string[] {
  // Filter: not in exclude set, not too similar to target
  const filtered = pool.filter((w) => {
    if (exclude.has(w)) return false;
    // Skip very close variants (inflections, plurals, etc.)
    if (levenshtein(w, target) < 3) return false;
    return true;
  });

  // Fisher-Yates shuffle
  const arr = [...filtered];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

⚠️ Remove the existing AI import (`getAIProvider` or similar) from this file. After the rewrite, `grep getAIProvider src/lib/flashcards/distractors.ts` should return nothing.

## Update callers

Grep `generateDistractorPool(` to find all callers. Update each:

```ts
// Was (example):
const distractors = await generateDistractorPool(word);

// Becomes:
const distractors = await generateDistractorPool(word, {
  userId,
  deckId: card.deck_id,
  pos: card.pos,
  excludeWords: [card.headword], // already covered by default but explicit
});
```

Each caller should already have `userId` from `requireUserId()`. If not, add it.

## Constraints

- D1 async + `.bind()`.
- All queries scoped by `user_id` (CLAUDE.md §5 — multi-tenancy boundary).
- No new packages.
- Levenshtein threshold < 3 catches simple inflections (preferential / preferred / prefer ≥ 3 distance from each other typically — verify with test cases if unsure).

## Verification

- User with 50 cards in a deck → distractors come from Tier 1 same-deck. Test by quizzing a word; inspect returned distractors.
- New user, 1 card → Tier 1 empty, Tier 2 empty, Tier 3 (static) fires. Distractors still returned, count = 3.
- Tier 3 + POS = 'verb' → returns 3 verbs from `COMMON_WORDS_BY_POS.verb`.
- `grep getAIProvider src/lib/flashcards/distractors.ts` returns empty.
- `npm run build` passes.

## Out of scope

- Datamuse hybrid (was considered earlier, decided against for simplicity).
- Distractor quality scoring (could track which fooled users → weight later).
- Cross-user distractor sharing (Tier 1/2 are intentionally user-scoped).
