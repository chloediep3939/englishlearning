import { getDb } from '@/lib/db';

// Bộ từ chuẩn (word_lists / word_list_entries) là nội dung dùng chung, không
// có user_id. Chỉ user_word_known là dữ liệu của user và mọi truy vấn vào nó
// đều lọc theo user_id.

export interface WordListEntry {
  word: string;
  rank: number | null;
  sublist: number | null;
  meaning_en: string | null;
  // Từ word_glossary (cache Oxford dùng chung với trình đọc). NULL khi chưa
  // từng tra Oxford cho từ này.
  ipa: string | null;
  has_audio: boolean;
}

interface EntryRow extends Omit<WordListEntry, 'has_audio'> {
  has_audio: number;
}

/** Cấu hình một bài T1, đọc từ roadmap_item_tests.config_json. */
export interface WordListTestConfig {
  rank_min?: number;
  rank_max?: number;
  sublist_min?: number;
  sublist_max?: number;
  sample: number;
  mode: 'know' | 'listen';
}

export interface WordListTest {
  item_key: string;
  list_code: string;
  list_label: string;
  config: WordListTestConfig;
}

function parseConfig(raw: string): WordListTestConfig {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const num = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  return {
    rank_min: num(parsed.rank_min),
    rank_max: num(parsed.rank_max),
    sublist_min: num(parsed.sublist_min),
    sublist_max: num(parsed.sublist_max),
    sample: num(parsed.sample) ?? 30,
    mode: parsed.mode === 'listen' ? 'listen' : 'know',
  };
}

export const wordListsDb = {
  /** Mục roadmap này có bài T1 không, và cấu hình ra sao. */
  async getTest(itemKey: string): Promise<WordListTest | null> {
    const db = await getDb();
    const row = await db
      .prepare(
        `SELECT t.item_key, t.list_code, t.config_json, l.label
         FROM roadmap_item_tests t
         JOIN word_lists l ON l.code = t.list_code
         WHERE t.item_key = ? AND t.tool = 'T1'`,
      )
      .bind(itemKey)
      .first<{ item_key: string; list_code: string; config_json: string; label: string }>();
    if (!row) return null;
    return {
      item_key: row.item_key,
      list_code: row.list_code,
      list_label: row.label,
      config: parseConfig(row.config_json),
    };
  },

  /**
   * Bốc ngẫu nhiên N từ trong phạm vi cấu hình, **bỏ những từ user đã tick
   * "biết rồi"**. Nếu số từ còn lại ít hơn N thì trả về hết — bên gọi tự quyết
   * (không âm thầm lặp từ để cho đủ số).
   */
  async sample(
    userId: number,
    listCode: string,
    config: WordListTestConfig,
    opts: { includeKnown?: boolean } = {},
  ): Promise<WordListEntry[]> {
    const db = await getDb();
    const where: string[] = ['e.list_code = ?'];
    const binds: unknown[] = [listCode];

    if (config.rank_min !== undefined) {
      where.push('e.rank >= ?');
      binds.push(config.rank_min);
    }
    if (config.rank_max !== undefined) {
      where.push('e.rank <= ?');
      binds.push(config.rank_max);
    }
    if (config.sublist_min !== undefined) {
      where.push('e.sublist >= ?');
      binds.push(config.sublist_min);
    }
    if (config.sublist_max !== undefined) {
      where.push('e.sublist <= ?');
      binds.push(config.sublist_max);
    }
    if (!opts.includeKnown) {
      where.push(
        `NOT EXISTS (SELECT 1 FROM user_word_known k
                     WHERE k.user_id = ? AND k.list_code = e.list_code AND k.word = e.word)`,
      );
      binds.push(userId);
    }

    const result = await db
      .prepare(
        `SELECT e.word, e.rank, e.sublist, e.meaning_en,
                g.ipa,
                CASE WHEN g.audio_src IS NOT NULL THEN 1 ELSE 0 END AS has_audio
         FROM word_list_entries e
         LEFT JOIN word_glossary g ON g.word = e.word
         WHERE ${where.join(' AND ')}
         ORDER BY RANDOM()
         LIMIT ?`,
      )
      .bind(...binds, config.sample)
      .all<EntryRow>();
    return (result.results ?? []).map((r) => ({ ...r, has_audio: r.has_audio === 1 }));
  },

  /** Số từ còn lại (chưa tick biết) trong phạm vi — để báo khi sắp cạn. */
  async countRemaining(
    userId: number,
    listCode: string,
    config: WordListTestConfig,
  ): Promise<{ remaining: number; total: number }> {
    const db = await getDb();
    const rangeWhere: string[] = ['list_code = ?'];
    const rangeBinds: unknown[] = [listCode];
    if (config.rank_min !== undefined) {
      rangeWhere.push('rank >= ?');
      rangeBinds.push(config.rank_min);
    }
    if (config.rank_max !== undefined) {
      rangeWhere.push('rank <= ?');
      rangeBinds.push(config.rank_max);
    }
    if (config.sublist_min !== undefined) {
      rangeWhere.push('sublist >= ?');
      rangeBinds.push(config.sublist_min);
    }
    if (config.sublist_max !== undefined) {
      rangeWhere.push('sublist <= ?');
      rangeBinds.push(config.sublist_max);
    }

    const row = await db
      .prepare(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN EXISTS (
                  SELECT 1 FROM user_word_known k
                  WHERE k.user_id = ? AND k.list_code = word_list_entries.list_code
                    AND k.word = word_list_entries.word
                ) THEN 1 ELSE 0 END) AS known
         FROM word_list_entries
         WHERE ${rangeWhere.join(' AND ')}`,
      )
      .bind(userId, ...rangeBinds)
      .first<{ total: number; known: number }>();

    const total = Number(row?.total) || 0;
    const known = Number(row?.known) || 0;
    return { remaining: total - known, total };
  },

  /** Tick "từ này biết rồi" cho nhiều từ một lượt. */
  async markKnown(userId: number, listCode: string, words: string[]): Promise<void> {
    if (words.length === 0) return;
    const db = await getDb();
    const stmt = db.prepare(
      `INSERT INTO user_word_known (user_id, list_code, word) VALUES (?, ?, ?)
       ON CONFLICT (user_id, list_code, word) DO NOTHING`,
    );
    await db.batch(words.map((w) => stmt.bind(userId, listCode, w)));
  },

  /** Bỏ tick — dùng khi user muốn đưa từ đã biết quay lại vòng kiểm tra. */
  async unmarkKnown(userId: number, listCode: string, words: string[]): Promise<void> {
    if (words.length === 0) return;
    const db = await getDb();
    const stmt = db.prepare(
      `DELETE FROM user_word_known WHERE user_id = ? AND list_code = ? AND word = ?`,
    );
    await db.batch(words.map((w) => stmt.bind(userId, listCode, w)));
  },
};
