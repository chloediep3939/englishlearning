import { getDb } from '@/lib/db';

// Trọng âm từ (word_stress) là nội dung dùng chung, không user_id.

export interface StressQuestion {
  word: string;
  ipa: string;
  syllables: number;
  stress_index: number;
  has_audio: boolean;
}

export const stressDb = {
  async getTest(itemKey: string): Promise<{ sample: number } | null> {
    const db = await getDb();
    const row = await db
      .prepare(`SELECT config_json FROM roadmap_item_tests WHERE item_key = ? AND tool = 'T8S'`)
      .bind(itemKey)
      .first<{ config_json: string }>();
    if (!row) return null;
    const cfg = JSON.parse(row.config_json) as { sample?: unknown };
    return { sample: typeof cfg.sample === 'number' && cfg.sample > 0 ? cfg.sample : 20 };
  },

  async sample(n: number): Promise<StressQuestion[]> {
    const db = await getDb();
    const result = await db
      .prepare(
        `SELECT s.word, s.ipa, s.syllables, s.stress_index,
                CASE WHEN g.audio_src IS NOT NULL THEN 1 ELSE 0 END AS has_audio
         FROM word_stress s
         LEFT JOIN word_glossary g ON g.word = s.word
         ORDER BY RANDOM()
         LIMIT ?`,
      )
      .bind(n)
      .all<Omit<StressQuestion, 'has_audio'> & { has_audio: number }>();
    return (result.results ?? []).map((r) => ({ ...r, has_audio: r.has_audio === 1 }));
  },
};
