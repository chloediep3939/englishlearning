import { getDb } from '@/lib/db';
import type {
  FlashcardCollocation,
  FlashcardExample,
  FlashcardImageAttribution,
  PresetCard,
  PresetLevel,
  PresetLevelDetail,
} from '@/lib/types';

// preset_deck_levels / preset_decks / preset_deck_cards là nội dung dùng chung,
// không có user_id. Phần duy nhất đụng dữ liệu user là "từ nào user đã có" —
// truy vấn đó luôn lọc theo user_id.
//
// preset_decks (khối ≤ 30 từ) chỉ là đơn vị soạn nội dung. Mọi thứ đưa ra UI
// đều gom theo level, thứ tự = vị trí khối rồi vị trí thẻ trong khối.

const norm = (w: string) => w.trim().toLowerCase();

function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error('[preset-decks] bad JSON column:', err);
    return fallback;
  }
}

/** english (lowercase) → bộ đầu tiên của user chứa từ đó. */
async function ownedWords(userId: number): Promise<Map<string, { deck_id: number; deck_name: string }>> {
  const db = await getDb();
  const result = await db
    .prepare(
      `SELECT f.english, f.deck_id, d.name AS deck_name
       FROM flashcards f
       JOIN flashcard_decks d ON d.id = f.deck_id AND d.user_id = f.user_id
       WHERE f.user_id = ?
       ORDER BY f.id ASC`,
    )
    .bind(userId)
    .all<{ english: string; deck_id: number; deck_name: string }>();
  const map = new Map<string, { deck_id: number; deck_name: string }>();
  for (const r of result.results ?? []) {
    const key = norm(r.english);
    if (!map.has(key)) map.set(key, { deck_id: Number(r.deck_id), deck_name: r.deck_name });
  }
  return map;
}

interface CardRow {
  english: string;
  vietnamese: string;
  part_of_speech: string | null;
  examples: string;
  collocations: string;
  notes: string | null;
  ipa: string | null;
  glossary_ipa: string | null;
  audio_src: string | null;
  glossary_audio: string | null;
  image_url: string | null;
  image_attribution: string | null;
  ngsl_rank: number | null;
}

export const presetDecksDb = {
  /** Mọi level (card_count = 0 → đang soạn), kèm tổng số từ và số từ user đã có. */
  async listLevels(userId: number): Promise<PresetLevel[]> {
    const db = await getDb();
    const [levels, words, owned] = await Promise.all([
      db
        .prepare(
          `SELECT l.code, l.list_code, l.label, l.description, l.position,
                  (SELECT d.color FROM preset_decks d WHERE d.level_code = l.code ORDER BY d.position LIMIT 1) AS color,
                  (SELECT d.icon FROM preset_decks d WHERE d.level_code = l.code ORDER BY d.position LIMIT 1) AS icon
           FROM preset_deck_levels l
           ORDER BY l.position ASC`,
        )
        .all<Omit<PresetLevel, 'card_count' | 'owned_count'>>(),
      db
        .prepare(
          `SELECT d.level_code, c.english
           FROM preset_deck_cards c JOIN preset_decks d ON d.code = c.deck_code`,
        )
        .all<{ level_code: string; english: string }>(),
      ownedWords(userId),
    ]);

    const counts = new Map<string, { card_count: number; owned_count: number }>();
    for (const w of words.results ?? []) {
      const c = counts.get(w.level_code) ?? { card_count: 0, owned_count: 0 };
      c.card_count++;
      if (owned.has(norm(w.english))) c.owned_count++;
      counts.set(w.level_code, c);
    }

    return (levels.results ?? []).map((l) => ({
      ...l,
      position: Number(l.position),
      ...(counts.get(l.code) ?? { card_count: 0, owned_count: 0 }),
    }));
  },

  async getLevel(userId: number, code: string): Promise<PresetLevelDetail | null> {
    const db = await getDb();
    const level = await db
      .prepare(
        `SELECT l.code, l.list_code, l.label, l.description, l.position,
                (SELECT d.color FROM preset_decks d WHERE d.level_code = l.code ORDER BY d.position LIMIT 1) AS color,
                (SELECT d.icon FROM preset_decks d WHERE d.level_code = l.code ORDER BY d.position LIMIT 1) AS icon
         FROM preset_deck_levels l
         WHERE l.code = ?`,
      )
      .bind(code)
      .first<Omit<PresetLevelDetail, 'cards'>>();
    if (!level) return null;

    const [cards, owned] = await Promise.all([this.getLevelCards(code), ownedWords(userId)]);
    return {
      ...level,
      position: Number(level.position),
      cards: cards.map((c) => ({ ...c, owned_in: owned.get(norm(c.english)) ?? null })),
    };
  },

  /**
   * Tìm cụm/từ trong toàn thư viện theo english hoặc vietnamese. Trả về kèm
   * level để link tới. Không đụng dữ liệu user nên không cần userId.
   */
  async search(q: string, limit = 40): Promise<
    Array<{ english: string; vietnamese: string; part_of_speech: string | null; level_code: string; level_label: string; list_code: string }>
  > {
    const term = q.trim();
    if (term.length < 2) return [];
    const db = await getDb();
    const like = `%${term.replace(/[%_]/g, (m) => '\\' + m)}%`;
    const result = await db
      .prepare(
        `SELECT c.english, c.vietnamese, c.part_of_speech,
                d.level_code, l.label AS level_label, l.list_code
         FROM preset_deck_cards c
         JOIN preset_decks d ON d.code = c.deck_code
         JOIN preset_deck_levels l ON l.code = d.level_code
         WHERE c.english LIKE ?1 ESCAPE '\\' OR c.vietnamese LIKE ?1 ESCAPE '\\'
         ORDER BY CASE WHEN c.english LIKE ?2 ESCAPE '\\' THEN 0 ELSE 1 END, c.english
         LIMIT ?3`,
      )
      .bind(like, `${term.replace(/[%_]/g, (m) => '\\' + m)}%`, limit)
      .all<{ english: string; vietnamese: string; part_of_speech: string | null; level_code: string; level_label: string; list_code: string }>();
    return result.results ?? [];
  },

  /**
   * Thẻ của một level theo thứ tự soạn. IPA / audio: cột đã bổ sung của bộ gốc,
   * rơi về word_glossary (Oxford US dùng chung) khi cột còn trống.
   */
  async getLevelCards(code: string): Promise<PresetCard[]> {
    const db = await getDb();
    const result = await db
      .prepare(
        `SELECT c.english, c.vietnamese, c.part_of_speech, c.examples, c.collocations, c.notes,
                c.ipa, g.ipa AS glossary_ipa, c.audio_src, g.audio_src AS glossary_audio,
                c.image_url, c.image_attribution, e.rank AS ngsl_rank
         FROM preset_deck_cards c
         JOIN preset_decks d ON d.code = c.deck_code
         LEFT JOIN word_glossary g ON g.word = c.english
         LEFT JOIN word_list_entries e ON e.list_code = 'ngsl' AND e.word = c.english
         WHERE d.level_code = ?
         ORDER BY d.position ASC, c.position ASC`,
      )
      .bind(code)
      .all<CardRow>();
    return (result.results ?? []).map((r) => ({
      english: r.english,
      vietnamese: r.vietnamese,
      part_of_speech: r.part_of_speech,
      ipa: r.ipa ?? r.glossary_ipa,
      audio_src: r.audio_src ?? r.glossary_audio,
      image_url: r.image_url,
      image_attribution: parseJson<FlashcardImageAttribution | null>(r.image_attribution, null),
      examples: parseJson<FlashcardExample[]>(r.examples, []),
      collocations: parseJson<FlashcardCollocation[]>(r.collocations, []),
      notes: r.notes,
      ngsl_rank: r.ngsl_rank === null ? null : Number(r.ngsl_rank),
    }));
  },
};
