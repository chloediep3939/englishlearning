<!-- Saved 2026-05-14 -->

# Cloze pool — Part 1/3: Schema + DB wrapper

## Goal

Create the shared cloze sentence pool table. Generated once per word, reused globally across users.

## Doc workflow (CLAUDE.md §8)

- Save this prompt to `src/doc/prompts/cloze-pool-1-schema.md`.
- After done, append section "Part 1" to `src/doc/results/cloze-pool-result.md` (this is a multi-part feature; one result file aggregating all 3 parts).

## Schema

New migration `migrations/NNNN_cloze_pool.sql` (use next number in sequence):

```sql
CREATE TABLE flashcard_cloze_pool (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL,             -- lowercase headword (lookup key)
  pos TEXT,                       -- noun/verb/adj/adv etc. nullable
  sentence TEXT NOT NULL,         -- full sentence, target word replaced by __
  blank_word TEXT NOT NULL,       -- the inflected form used in the sentence
  difficulty TEXT,                -- A1/A2/B1/B2/C1/C2 if AI returns, nullable
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX idx_cloze_pool_word ON flashcard_cloze_pool(word);
```

**No `user_id`** — sentences are word-specific generic linguistic content, shared globally (same reasoning as Datamuse caching).

## Types

Add to `src/lib/types.ts`:

```ts
export interface ClozeSentence {
  id?: number;
  word: string;
  pos?: string | null;
  sentence: string;
  blank_word: string;
  difficulty?: string | null;
}
```

## DB wrapper

Add `flashcardClozePoolDb` to `src/lib/db.ts`, alongside other wrappers:

```ts
flashcardClozePoolDb: {
  async countByWord(word: string): Promise<number> {
    const db = await getDb();
    const row = await db
      .prepare('SELECT COUNT(*) AS n FROM flashcard_cloze_pool WHERE word = ?')
      .bind(word.toLowerCase())
      .first<{ n: number }>();
    return row?.n ?? 0;
  },

  async hasMinimum(word: string, min: number): Promise<boolean> {
    return (await this.countByWord(word)) >= min;
  },

  async getByWord(word: string, limit = 10): Promise<ClozeSentence[]> {
    const db = await getDb();
    const res = await db
      .prepare(
        'SELECT * FROM flashcard_cloze_pool WHERE word = ? ORDER BY RANDOM() LIMIT ?'
      )
      .bind(word.toLowerCase(), limit)
      .all<ClozeSentence>();
    return res.results ?? [];
  },

  async bulkInsert(word: string, sentences: ClozeSentence[]): Promise<void> {
    if (sentences.length === 0) return;
    const db = await getDb();
    const stmts = sentences.map((s) =>
      db
        .prepare(
          'INSERT INTO flashcard_cloze_pool (word, pos, sentence, blank_word, difficulty) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(
          word.toLowerCase(),
          s.pos ?? null,
          s.sentence,
          s.blank_word,
          s.difficulty ?? null
        )
    );
    await db.batch(stmts);
  },
}
```

## Comment / convention note

In `src/lib/db.ts`, right above the wrapper, add a comment:

```ts
// flashcard_cloze_pool — shared across users, like flashcard_practice_sentences.
// Sentences are word-specific generic linguistic content (no PII).
// Read by any authed user; written by background ensureClozePool() only.
```

## Constraints

- D1 async: `await`, `.bind()`, `.all<T>()`, `.first<T>()`. No sync, no `.get()`.
- Lowercase word on read AND write.
- Migration numbering: next 4-digit zero-padded number.

## Verification

```bash
npx wrangler d1 migrations apply english-learning-db --local
npx wrangler d1 execute english-learning-db --local --command="SELECT name FROM sqlite_master WHERE type='table' AND name='flashcard_cloze_pool'"
```

Confirm:
- Table exists with the 6 columns.
- Index `idx_cloze_pool_word` exists.
- `npm run build` passes; TypeScript `ClozeSentence` import works.

## Next part

Part 2/3 (`cloze-pool-2-generation.md`) adds the AI generation function and background trigger.
Part 3/3 (`cloze-pool-3-consumers.md`) wires up cloze quiz, compose suggest, and card examples to use the pool.
