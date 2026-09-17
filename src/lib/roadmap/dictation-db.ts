import { getDb } from '@/lib/db';

// Ngân hàng câu (dictation_sentences) là nội dung dùng chung, không user_id.

/**
 * targets     nghe-06  chấm từ chức năng mục tiêu (%)
 * links       nghe-07  câu đúng khi mọi chỗ nối đúng
 * stress      nghe-08  bấm từ được nhấn, trùng khít đáp án
 * words       nghe-15/16  % mọi từ của câu
 * fabrication nghe-13  đếm từ bịa (gõ ra mà không có, không gần âm)
 * accent      nghe-14  so % nghe ra giọng Anh/Úc với giọng Mỹ
 * reconstruct nghe-17  tự khai câu bị "dựng lại theo nghĩa"
 */
export type DictationMode = 'targets' | 'links' | 'stress' | 'words' | 'fabrication' | 'accent' | 'reconstruct';

const MODES: DictationMode[] = ['targets', 'links', 'stress', 'words', 'fabrication', 'accent', 'reconstruct'];

export interface DictationTestConfig {
  mode: DictationMode;
  sample: number;
  /** Lấy câu từ kho của các mục này (mặc định: chính mục đó). */
  pool: string[];
}

export interface DictationSentence {
  id: string;
  text: string;
  /** targets/stress: number[] · links: [number, number][] */
  key: number[] | [number, number][];
  note_vi: string | null;
}

interface Row {
  id: string;
  text: string;
  key_json: string;
  note_vi: string | null;
}

const hydrate = (r: Row): DictationSentence => ({
  id: r.id,
  text: r.text,
  key: JSON.parse(r.key_json) as DictationSentence['key'],
  note_vi: r.note_vi,
});

export const dictationDb = {
  async getTest(itemKey: string): Promise<DictationTestConfig | null> {
    const db = await getDb();
    const row = await db
      .prepare(`SELECT config_json FROM roadmap_item_tests WHERE item_key = ? AND tool IN ('T3', 'T3S')`)
      .bind(itemKey)
      .first<{ config_json: string }>();
    if (!row) return null;
    const cfg = JSON.parse(row.config_json) as { mode?: unknown; sample?: unknown; pool?: unknown };
    const mode = MODES.includes(cfg.mode as DictationMode) ? (cfg.mode as DictationMode) : 'targets';
    const pool = Array.isArray(cfg.pool) ? cfg.pool.filter((p): p is string => typeof p === 'string') : [];
    return {
      mode,
      sample: typeof cfg.sample === 'number' && cfg.sample > 0 ? cfg.sample : 10,
      pool: pool.length > 0 ? pool : [itemKey],
    };
  },

  async sample(pool: string[], n: number): Promise<DictationSentence[]> {
    const db = await getDb();
    const ph = pool.map(() => '?').join(', ');
    const result = await db
      .prepare(`SELECT id, text, key_json, note_vi FROM dictation_sentences WHERE item_key IN (${ph}) ORDER BY RANDOM() LIMIT ?`)
      .bind(...pool, n)
      .all<Row>();
    return (result.results ?? []).map(hydrate);
  },

  /** Lấy lại đúng các câu user đã làm để server tự chấm — chỉ câu thuộc kho của bài. */
  async getByIds(pool: string[], ids: string[]): Promise<Map<string, DictationSentence>> {
    const out = new Map<string, DictationSentence>();
    if (ids.length === 0) return out;
    const db = await getDb();
    const poolPh = pool.map(() => '?').join(', ');
    const idPh = ids.map(() => '?').join(', ');
    const result = await db
      .prepare(`SELECT id, text, key_json, note_vi FROM dictation_sentences WHERE item_key IN (${poolPh}) AND id IN (${idPh})`)
      .bind(...pool, ...ids)
      .all<Row>();
    for (const r of result.results ?? []) out.set(r.id, hydrate(r));
    return out;
  },
};
