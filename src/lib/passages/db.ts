import { getDb } from '@/lib/db';
import type {
  Passage,
  PassageRow,
  PassageAttempt,
  PassageAttemptRow,
  PassageStepKind,
  CefrLevel,
  LevelVerdict,
  GrammarAnalysis,
} from '@/lib/types';

function countWords(text: string): number {
  return (text.trim().match(/\S+/g) ?? []).length;
}

function parseGrammarAnalysis(raw: string | null): GrammarAnalysis | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as { patterns?: unknown }).patterns)
    ) {
      return parsed as GrammarAnalysis;
    }
    return null;
  } catch {
    return null;
  }
}

function hydratePassage(row: PassageRow): Passage {
  // Strip the `*_json` row form before spreading so the public Passage shape
  // doesn't leak the storage column name.
  const {
    paraphrase_tips_json: tipsJson,
    grammar_analysis: grammarJson,
    ...rest
  } = row;
  let paraphrase_tips: string[] | null = null;
  if (tipsJson) {
    try {
      const parsed = JSON.parse(tipsJson) as unknown;
      if (Array.isArray(parsed)) {
        paraphrase_tips = parsed.filter((x): x is string => typeof x === 'string');
      }
    } catch {
      // Malformed cache row — treat as not-cached. The next pre-fetch will overwrite it.
      paraphrase_tips = null;
    }
  }
  return {
    ...rest,
    level_estimate: row.level_estimate as CefrLevel | null,
    level_verdict: row.level_verdict as LevelVerdict | null,
    paraphrase_tips,
    grammar_analysis: parseGrammarAnalysis(grammarJson),
  };
}

function hydrateAttempt(row: PassageAttemptRow): PassageAttempt {
  return {
    id: row.id,
    user_id: row.user_id,
    passage_id: row.passage_id,
    step_kind: row.step_kind,
    user_input: row.user_input,
    ai_feedback: JSON.parse(row.ai_feedback_json) as unknown,
    score: row.score,
    created_at: row.created_at,
  };
}

export const passagesDb = {
  async create(
    userId: number,
    data: {
      title: string;
      content: string;
      source_label?: string | null;
      source_url?: string | null;
    },
  ): Promise<Passage> {
    const db = await getDb();
    const charCount = data.content.length;
    const wordCount = countWords(data.content);
    const result = await db
      .prepare(
        `INSERT INTO passages (user_id, title, content, source_label, source_url, char_count, word_count)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        userId,
        data.title,
        data.content,
        data.source_label ?? null,
        data.source_url ?? null,
        charCount,
        wordCount,
      )
      .run();
    const id = Number(result.meta.last_row_id);
    const created = await passagesDb.getById(userId, id);
    if (!created) throw new Error('Failed to retrieve created passage');
    return created;
  },

  async getById(userId: number, id: number): Promise<Passage | null> {
    const db = await getDb();
    const row = await db
      .prepare(`SELECT * FROM passages WHERE id = ? AND user_id = ?`)
      .bind(id, userId)
      .first<PassageRow>();
    return row ? hydratePassage(row) : null;
  },

  async listByUser(
    userId: number,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<Passage[]> {
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;
    const db = await getDb();
    const result = await db
      .prepare(
        `SELECT * FROM passages
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(userId, limit, offset)
      .all<PassageRow>();
    return (result.results ?? []).map(hydratePassage);
  },

  /**
   * Partial update — only the fields present in `fields` are written.
   * When `content` is updated, char_count and word_count are recomputed
   * server-side so callers can never push inconsistent counts.
   * Returns the post-update row, or null if the row didn't belong to the user.
   */
  async update(
    userId: number,
    id: number,
    fields: Partial<{
      title: string;
      content: string;
      source_label: string | null;
      source_url: string | null;
      level_estimate: CefrLevel | null;
      level_verdict: LevelVerdict | null;
      level_suggestion: string | null;
      translate_reference: string | null;
      paraphrase_tips: string[] | null;
      last_step_viewed: number;
      completed_at: string | null;
    }>,
  ): Promise<Passage | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    if (fields.title !== undefined)            { sets.push('title = ?');            values.push(fields.title); }
    if (fields.content !== undefined)          { sets.push('content = ?', 'char_count = ?', 'word_count = ?');
                                                 values.push(fields.content, fields.content.length, countWords(fields.content)); }
    if (fields.source_label !== undefined)     { sets.push('source_label = ?');     values.push(fields.source_label); }
    if (fields.source_url !== undefined)       { sets.push('source_url = ?');       values.push(fields.source_url); }
    if (fields.level_estimate !== undefined)   { sets.push('level_estimate = ?');   values.push(fields.level_estimate); }
    if (fields.level_verdict !== undefined)    { sets.push('level_verdict = ?');    values.push(fields.level_verdict); }
    if (fields.level_suggestion !== undefined) { sets.push('level_suggestion = ?'); values.push(fields.level_suggestion); }
    if (fields.translate_reference !== undefined) { sets.push('translate_reference = ?'); values.push(fields.translate_reference); }
    if (fields.paraphrase_tips !== undefined)  { sets.push('paraphrase_tips_json = ?');
                                                 values.push(fields.paraphrase_tips ? JSON.stringify(fields.paraphrase_tips) : null); }
    if (fields.last_step_viewed !== undefined) { sets.push('last_step_viewed = ?'); values.push(fields.last_step_viewed); }
    if (fields.completed_at !== undefined)     { sets.push('completed_at = ?');     values.push(fields.completed_at); }
    if (sets.length === 0) return passagesDb.getById(userId, id);

    values.push(id, userId);
    const db = await getDb();
    await db
      .prepare(`UPDATE passages SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...values)
      .run();
    return passagesDb.getById(userId, id);
  },

  async deleteById(userId: number, id: number): Promise<boolean> {
    const db = await getDb();
    const result = await db
      .prepare(`DELETE FROM passages WHERE id = ? AND user_id = ?`)
      .bind(id, userId)
      .run();
    return (result.meta.changes ?? 0) > 0;
  },

  /**
   * Lazy backfill helper for the M5 content-hash column. SHA-256 isn't a
   * built-in D1 function, so the hash is computed in TypeScript (see
   * `@/lib/passages/hash`) and written on the next grammar-route call for
   * pre-M5 rows.
   */
  async setContentHash(userId: number, id: number, hash: string): Promise<void> {
    const db = await getDb();
    await db
      .prepare(`UPDATE passages SET content_hash = ? WHERE id = ? AND user_id = ?`)
      .bind(hash, id, userId)
      .run();
  },

  /**
   * Cross-user lookup of a cached grammar analysis by content hash. Returns
   * the raw JSON string so the route can `JSON.parse` it once and write the
   * same string to the consumer's row without a round-trip through
   * `JSON.stringify`. Intentional: the cache is keyed on content equality
   * (hash collision → same text), not ownership — see the result doc for
   * the multi-tenancy reasoning.
   */
  async findGrammarByContentHash(hash: string): Promise<string | null> {
    const db = await getDb();
    const row = await db
      .prepare(
        `SELECT grammar_analysis FROM passages
         WHERE content_hash = ? AND grammar_analysis IS NOT NULL
         LIMIT 1`,
      )
      .bind(hash)
      .first<{ grammar_analysis: string }>();
    return row?.grammar_analysis ?? null;
  },

  /**
   * Write a grammar analysis to a passage row. `analysisJson` must already
   * be a JSON string that round-trips through `JSON.parse`. `analyzed_at`
   * is stamped server-side so the wall clock is the DB's, not the route's.
   */
  async setGrammarAnalysis(
    userId: number,
    id: number,
    analysisJson: string,
  ): Promise<void> {
    const db = await getDb();
    await db
      .prepare(
        `UPDATE passages
         SET grammar_analysis = ?,
             grammar_analyzed_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
      )
      .bind(analysisJson, id, userId)
      .run();
  },
};

/**
 * passage_attempts wrapper. No M4a consumers — wired in M4b/M4c.
 * Every method is user-scoped (the table has its own user_id column AND a
 * FK to passages.id which is ON DELETE CASCADE, so deleting a passage clears
 * its attempts atomically).
 */
export const passageAttemptsDb = {
  async record(
    userId: number,
    passageId: number,
    data: {
      step_kind: PassageStepKind;
      user_input: string;
      ai_feedback: unknown;
      score?: number | null;
    },
  ): Promise<PassageAttempt> {
    const db = await getDb();
    const result = await db
      .prepare(
        `INSERT INTO passage_attempts
           (user_id, passage_id, step_kind, user_input, ai_feedback_json, score)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        userId,
        passageId,
        data.step_kind,
        data.user_input,
        JSON.stringify(data.ai_feedback),
        data.score ?? null,
      )
      .run();
    const id = Number(result.meta.last_row_id);
    const row = await db
      .prepare(`SELECT * FROM passage_attempts WHERE id = ? AND user_id = ?`)
      .bind(id, userId)
      .first<PassageAttemptRow>();
    if (!row) throw new Error('Failed to retrieve recorded attempt');
    return hydrateAttempt(row);
  },

  async getLatestByStep(
    userId: number,
    passageId: number,
    stepKind: PassageStepKind,
  ): Promise<PassageAttempt | null> {
    const db = await getDb();
    const row = await db
      .prepare(
        `SELECT * FROM passage_attempts
         WHERE user_id = ? AND passage_id = ? AND step_kind = ?
         ORDER BY created_at DESC
         LIMIT 1`,
      )
      .bind(userId, passageId, stepKind)
      .first<PassageAttemptRow>();
    return row ? hydrateAttempt(row) : null;
  },

  async listByPassage(userId: number, passageId: number): Promise<PassageAttempt[]> {
    const db = await getDb();
    const result = await db
      .prepare(
        `SELECT * FROM passage_attempts
         WHERE user_id = ? AND passage_id = ?
         ORDER BY created_at DESC`,
      )
      .bind(userId, passageId)
      .all<PassageAttemptRow>();
    return (result.results ?? []).map(hydrateAttempt);
  },
};
