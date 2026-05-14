import { getDb } from '@/lib/db';
import type {
  Composition,
  CompositionAiFeedback,
  CompositionRow,
  CompositionSource,
} from '@/lib/types';

function hydrate(row: CompositionRow): Composition {
  return {
    id: row.id,
    user_id: row.user_id,
    source: row.source,
    source_deck_id: row.source_deck_id,
    pool_word_ids: JSON.parse(row.pool_word_ids_json) as number[],
    content: row.content,
    ai_feedback: JSON.parse(row.ai_feedback_json) as CompositionAiFeedback,
    word_usage: JSON.parse(row.word_usage_json) as Record<string, boolean>,
    coherence_score: row.coherence_score,
    passed: row.passed === 1,
    created_at: row.created_at,
  };
}

export const compositionsDb = {
  async create(
    userId: number,
    data: {
      source: CompositionSource;
      source_deck_id: number | null;
      pool_word_ids: number[];
      content: string;
      ai_feedback: CompositionAiFeedback;
      word_usage: Record<string, boolean>;
      coherence_score: number | null;
      passed: boolean;
    }
  ): Promise<Composition> {
    const db = await getDb();
    const result = await db
      .prepare(
        `INSERT INTO compositions
           (user_id, source, source_deck_id, pool_word_ids_json, content,
            ai_feedback_json, word_usage_json, coherence_score, passed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        userId,
        data.source,
        data.source_deck_id,
        JSON.stringify(data.pool_word_ids),
        data.content,
        JSON.stringify(data.ai_feedback),
        JSON.stringify(data.word_usage),
        data.coherence_score,
        data.passed ? 1 : 0
      )
      .run();

    const id = Number(result.meta.last_row_id);
    const created = await compositionsDb.getById(userId, id);
    if (!created) throw new Error('Failed to retrieve created composition');
    return created;
  },

  async getById(userId: number, id: number): Promise<Composition | null> {
    const db = await getDb();
    const row = await db
      .prepare(`SELECT * FROM compositions WHERE id = ? AND user_id = ?`)
      .bind(id, userId)
      .first<CompositionRow>();
    return row ? hydrate(row) : null;
  },

  async listByUser(
    userId: number,
    opts: { limit?: number; offset?: number } = {}
  ): Promise<Composition[]> {
    const limit = opts.limit ?? 20;
    const offset = opts.offset ?? 0;
    const db = await getDb();
    const result = await db
      .prepare(
        `SELECT * FROM compositions
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(userId, limit, offset)
      .all<CompositionRow>();
    return (result.results ?? []).map(hydrate);
  },

  async deleteById(userId: number, id: number): Promise<boolean> {
    const db = await getDb();
    const result = await db
      .prepare(`DELETE FROM compositions WHERE id = ? AND user_id = ?`)
      .bind(id, userId)
      .run();
    return (result.meta.changes ?? 0) > 0;
  },
};
