import { getDb } from '@/lib/db';

// Cặp từ phân biệt âm (phonetic_pairs) là nội dung dùng chung, không user_id.
// active = 0 cho cặp mà mp3 Oxford đọc lệch âm vị đang kiểm tra (migration 0031).

export interface PairTestConfig {
  contrasts: string[];
  per_group: number;
  /**
   * 'min_group' — ngưỡng dạng "≥ 18/20 MỖI NHÓM": điểm nộp = nhóm tệ nhất quy
   *               về thang pass_total. Đạt ⇔ mọi nhóm đều đạt tỉ lệ.
   * 'overall'   — ngưỡng dạng "≥ 90%": điểm nộp = % đúng trên toàn bài.
   */
  scoring: 'min_group' | 'overall';
}

export interface PairQuestion {
  id: number;
  contrast: string;
  contrast_label: string;
  word_a: string;
  word_b: string;
  ipa_a: string | null;
  ipa_b: string | null;
  audio_a: boolean;
  audio_b: boolean;
}

interface PairRow extends Omit<PairQuestion, 'audio_a' | 'audio_b'> {
  audio_a: number;
  audio_b: number;
}

function parseConfig(raw: string): PairTestConfig {
  const p = JSON.parse(raw) as Record<string, unknown>;
  const contrasts = Array.isArray(p.contrasts) ? p.contrasts.filter((c): c is string => typeof c === 'string') : [];
  const perGroup = typeof p.per_group === 'number' && p.per_group > 0 ? p.per_group : 10;
  return {
    contrasts,
    per_group: perGroup,
    scoring: p.scoring === 'overall' ? 'overall' : 'min_group',
  };
}

export const pairsDb = {
  async getTest(itemKey: string): Promise<PairTestConfig | null> {
    const db = await getDb();
    const row = await db
      .prepare(`SELECT config_json FROM roadmap_item_tests WHERE item_key = ? AND tool = 'T8'`)
      .bind(itemKey)
      .first<{ config_json: string }>();
    return row ? parseConfig(row.config_json) : null;
  },

  /**
   * Mỗi nhóm bốc riêng `per_group` cặp ngẫu nhiên. Bốc theo nhóm chứ không bốc
   * chung cả bể: ngưỡng tính "mỗi nhóm", nên nhóm nào cũng phải đủ số câu.
   */
  async sample(config: PairTestConfig): Promise<PairQuestion[]> {
    if (config.contrasts.length === 0) return [];
    const db = await getDb();
    const stmt = db.prepare(
      `SELECT p.id, p.contrast, p.contrast_label, p.word_a, p.word_b, p.ipa_a, p.ipa_b,
              CASE WHEN ga.audio_src IS NOT NULL THEN 1 ELSE 0 END AS audio_a,
              CASE WHEN gb.audio_src IS NOT NULL THEN 1 ELSE 0 END AS audio_b
       FROM phonetic_pairs p
       LEFT JOIN word_glossary ga ON ga.word = p.word_a
       LEFT JOIN word_glossary gb ON gb.word = p.word_b
       WHERE p.contrast = ? AND p.active = 1
       ORDER BY RANDOM()
       LIMIT ?`,
    );
    const results = await db.batch<PairRow>(config.contrasts.map((c) => stmt.bind(c, config.per_group)));
    return results.flatMap((r) =>
      (r.results ?? []).map((row) => ({ ...row, audio_a: row.audio_a === 1, audio_b: row.audio_b === 1 })),
    );
  },
};
