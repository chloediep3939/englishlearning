# Distractor pool — Part 1/2: Static fallback + Levenshtein util

## Goal

Set up the algorithmic foundation: static common-words fallback list + Levenshtein helper for filtering close variants.

## Doc workflow

- Save to `src/doc/prompts/distractor-random-1.md`.
- Append "Part 1" to `src/doc/results/distractor-random-result.md`.

## 1. Common words fallback list

Create `src/lib/flashcards/common-words.ts`:

```ts
// Top common English words by POS, used as last-resort distractor fallback
// when the user's vocab is too small.
// Source: COCA top 5000 + manual curation. ~40-50 words per POS.

export const COMMON_WORDS_BY_POS: Record<string, string[]> = {
  noun: [
    'time', 'people', 'way', 'day', 'man', 'thing', 'woman', 'life',
    'child', 'world', 'school', 'state', 'family', 'student', 'group',
    'country', 'problem', 'hand', 'part', 'place', 'case', 'week',
    'company', 'system', 'program', 'question', 'work', 'government',
    'number', 'night', 'point', 'home', 'water', 'room', 'mother',
    'area', 'money', 'story', 'fact', 'month', 'lot', 'right', 'study',
    'book', 'eye', 'job', 'word', 'business', 'issue', 'side',
  ],
  verb: [
    'have', 'do', 'say', 'go', 'get', 'make', 'know', 'think', 'take',
    'see', 'come', 'want', 'look', 'use', 'find', 'give', 'tell', 'work',
    'call', 'try', 'ask', 'need', 'feel', 'become', 'leave', 'put',
    'mean', 'keep', 'let', 'begin', 'seem', 'help', 'talk', 'turn',
    'start', 'show', 'hear', 'play', 'run', 'move', 'live', 'believe',
    'hold', 'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose',
  ],
  adj: [
    'good', 'new', 'first', 'last', 'long', 'great', 'little', 'own',
    'other', 'old', 'right', 'big', 'high', 'different', 'small',
    'large', 'next', 'early', 'young', 'important', 'few', 'public',
    'bad', 'same', 'able', 'free', 'sure', 'real', 'best', 'easy',
    'low', 'true', 'hard', 'major', 'open', 'late', 'happy', 'simple',
    'common', 'special', 'clear', 'fine', 'dark', 'social',
  ],
  adv: [
    'up', 'so', 'out', 'just', 'now', 'how', 'then', 'more', 'also',
    'here', 'well', 'only', 'very', 'even', 'back', 'there', 'down',
    'still', 'too', 'when', 'never', 'really', 'most', 'always',
    'often', 'quickly', 'finally', 'together', 'almost', 'though',
    'enough', 'today', 'around', 'far', 'ever', 'quite',
  ],
};

// Aliases for POS variants the cards might use
export const POS_ALIASES: Record<string, keyof typeof COMMON_WORDS_BY_POS> = {
  n: 'noun',
  noun: 'noun',
  v: 'verb',
  verb: 'verb',
  adj: 'adj',
  adjective: 'adj',
  a: 'adj',
  adv: 'adv',
  adverb: 'adv',
  r: 'adv',
};

export function getFallbackPool(pos?: string | null): string[] {
  if (!pos) {
    // Union all POS
    return Object.values(COMMON_WORDS_BY_POS).flat();
  }
  const key = POS_ALIASES[pos.toLowerCase()];
  return key ? COMMON_WORDS_BY_POS[key] : Object.values(COMMON_WORDS_BY_POS).flat();
}
```

⚠️ Verify which POS values the existing `flashcards.pos` column actually stores. Read `src/lib/types.ts` `Flashcard.pos` type and adapt `POS_ALIASES` accordingly. The aliases above cover Datamuse-style + common abbreviations.

## 2. Levenshtein helper

If a shared Levenshtein util already exists in the project (per CLAUDE.md §2 the project has `generateMisspellings` which uses Levenshtein — there might be a shared util), use that. Otherwise:

Create `src/lib/flashcards/levenshtein.ts`:

```ts
// Standard iterative Levenshtein distance.
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,        // insertion
        prev[j] + 1,            // deletion
        prev[j - 1] + cost      // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}
```

## Verification

- `npm run build` passes.
- Quick unit test inline (or just run in `npm run dev` console): `levenshtein('prefer', 'preferential')` should return 6.
- `getFallbackPool('noun')` returns 40-50 words.
- `getFallbackPool('xyz')` (unknown POS) returns the union (all POS merged).

## Next part

Part 2 (`distractor-random-2.md`) rewrites `generateDistractorPool` to use these + DB queries, removes AI.
