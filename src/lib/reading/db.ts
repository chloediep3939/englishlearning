import { getDb } from '@/lib/db';
import type {
  GlossaryEntry,
  PassageTranslationRow,
  WordGlossaryRow,
} from '@/lib/types';

/**
 * Read-Along caches. Two stores:
 *   passage_translations — sentence-level EN→VI, scoped per passage.
 *   word_glossary        — GLOBAL word-level cache (no user_id), shared across
 *                          users like flashcard_cloze_pool. Generic dictionary
 *                          data; ownership is enforced at the passage level by
 *                          the caller, never here.
 */

export const passageTranslationsDb = {
  /** All cached rows for a passage, keyed by sentence_index. */
  async getByPassage(passageId: number): Promise<Map<number, PassageTranslationRow>> {
    const db = await getDb();
    const result = await db
      .prepare(
        `SELECT * FROM passage_translations WHERE passage_id = ? ORDER BY sentence_index ASC`,
      )
      .bind(passageId)
      .all<PassageTranslationRow>();
    const map = new Map<number, PassageTranslationRow>();
    for (const row of result.results ?? []) map.set(row.sentence_index, row);
    return map;
  },

  /**
   * Upsert a batch of (index, en, vn) rows for a passage. Run transactionally
   * via D1 batch. On conflict (passage_id, sentence_index) the en/vn text is
   * overwritten — so editing a passage and re-translating refreshes the cache.
   */
  async upsertMany(
    passageId: number,
    rows: { index: number; en: string; vn: string }[],
  ): Promise<void> {
    if (rows.length === 0) return;
    const db = await getDb();
    const stmts = rows.map((r) =>
      db
        .prepare(
          `INSERT INTO passage_translations (passage_id, sentence_index, en_text, vn_text)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(passage_id, sentence_index)
           DO UPDATE SET en_text = excluded.en_text, vn_text = excluded.vn_text`,
        )
        .bind(passageId, r.index, r.en, r.vn),
    );
    await db.batch(stmts);
  },
};

export const wordGlossaryDb = {
  /** Look up many cleaned words at once. Returns a word→entry map (only hits). */
  async getMany(words: string[]): Promise<Record<string, GlossaryEntry>> {
    const out: Record<string, GlossaryEntry> = {};
    if (words.length === 0) return out;
    const db = await getDb();
    const placeholders = words.map(() => '?').join(',');
    const result = await db
      .prepare(`SELECT * FROM word_glossary WHERE word IN (${placeholders})`)
      .bind(...words)
      .all<WordGlossaryRow>();
    for (const row of result.results ?? []) {
      out[row.word] = {
        vn: row.vn,
        pos: row.pos,
        ipa: row.ipa,
        audioUrl: row.audio_src ? `/api/words/audio/${encodeURIComponent(row.word)}` : null,
      };
    }
    return out;
  },

  /** Single cleaned word. Returns the row or null. */
  async getOne(word: string): Promise<WordGlossaryRow | null> {
    const db = await getDb();
    const row = await db
      .prepare(`SELECT * FROM word_glossary WHERE word = ?`)
      .bind(word)
      .first<WordGlossaryRow>();
    return row ?? null;
  },

  /**
   * Cache a word entry. Idempotent: on conflict the vn/pos/ipa/source/audio_src
   * are overwritten so a later, richer lookup can upgrade a partial cache row.
   */
  async upsert(
    word: string,
    data: {
      vn: string | null;
      pos: string | null;
      ipa: string | null;
      source?: string;
      audioSrc?: string | null;
    },
  ): Promise<void> {
    const db = await getDb();
    await db
      .prepare(
        `INSERT INTO word_glossary (word, vn, pos, ipa, source, audio_src)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(word)
         DO UPDATE SET vn = excluded.vn, pos = excluded.pos, ipa = excluded.ipa,
                       source = excluded.source, audio_src = excluded.audio_src`,
      )
      .bind(word, data.vn, data.pos, data.ipa, data.source ?? 'ms', data.audioSrc ?? null)
      .run();
  },
};
