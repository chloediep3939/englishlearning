import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import type {
  CefrLevel,
  ClozeSentence,
  Feedback,
  Flashcard,
  FlashcardDeck,
  FlashcardDeckWithCounts,
  FlashcardSettings,
  FlashcardStatus,
  PracticeSentence,
  ReviewSource,
  SentenceDrill,
  TestMode,
  User,
} from './types';
import { LISTENING_SETTINGS, M4_SETTINGS, M6_SETTINGS, SENTENCE_STUDY_SETTINGS } from './types';

const CEFR_VALUES = M4_SETTINGS.user_cefr_level.values;
function parseCefr(raw: string | undefined): CefrLevel {
  if (raw && (CEFR_VALUES as readonly string[]).includes(raw)) return raw as CefrLevel;
  return M4_SETTINGS.user_cefr_level.default;
}
import { calculateFlashcardBoost, calculateNextReview, type SRSCardState, type SRSQuality } from './flashcards/srs';

/**
 * Returns the D1 database binding from the Cloudflare context.
 * Must be called inside a request handler or server component
 * (NOT at module top level).
 */
export async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as Record<string, unknown>).DB as D1Database | undefined;
  if (!db) {
    throw new Error('D1 binding "DB" not found. Check wrangler.jsonc.');
  }
  return db;
}

/**
 * Returns the R2 bucket binding used for stored pronunciation audio.
 * Must be called inside a request handler / server component.
 *
 * NOTE: the binding is absent under plain `next dev` — it only exists under
 * the Workers runtime (`npm run preview` / `wrangler dev`). Callers must treat
 * a thrown "not found" as a best-effort miss (fall back to TTS), never a
 * fatal error in the card-creation path.
 */
export async function getAudioBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  const bucket = (env as Record<string, unknown>).AUDIO_BUCKET as R2Bucket | undefined;
  if (!bucket) {
    throw new Error('R2 binding "AUDIO_BUCKET" not found. Check wrangler.jsonc.');
  }
  return bucket;
}

// ============================================================================
// JSON helpers
// ============================================================================

function safeParse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function hydrateCard(row: Record<string, unknown> | null): Flashcard | null {
  if (!row) return null;
  return {
    ...(row as unknown as Flashcard),
    examples: safeParse(row.examples as string | null, []),
    image_attribution: safeParse(row.image_attribution as string | null, null),
    collocations: safeParse(row.collocations as string | null, []),
  };
}

function hydrateDeck(row: Record<string, unknown> | null): FlashcardDeck | null {
  if (!row) return null;
  return {
    ...(row as unknown as FlashcardDeck),
    is_default: Number(row.is_default) === 1,
    recognition_only: Number(row.recognition_only) === 1,
  };
}

// ============================================================================
// Users
// ============================================================================

function hydrateUser(row: Record<string, unknown>): User {
  return {
    ...(row as unknown as User),
    is_admin: Number(row.is_admin) === 1,
    is_demo: Number(row.is_demo) === 1,
    demo_expires_at: row.demo_expires_at == null ? null : Number(row.demo_expires_at),
  };
}

export const usersDb = {
  async getById(id: number): Promise<User | null> {
    const db = await getDb();
    const row = await db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();
    if (!row) return null;
    return hydrateUser(row);
  },

  async getAll(): Promise<User[]> {
    const db = await getDb();
    const result = await db
      .prepare('SELECT * FROM users ORDER BY created_at ASC')
      .all<Record<string, unknown>>();
    return result.results.map(hydrateUser);
  },

  /**
   * Insert a demo user. `email` is a synthetic placeholder (e.g.
   * `demo-abc123@bun.local`) — never used to send mail, just satisfies the
   * UNIQUE constraint. `expiresAtSec` is unix seconds at which cleanup
   * may delete the row. Returns the new user id.
   */
  async createDemo(email: string, expiresAtSec: number): Promise<number> {
    const db = await getDb();
    const result = await db
      .prepare(
        `INSERT INTO users (email, name, picture_url, google_sub, is_admin, is_demo, demo_expires_at, last_login_at)
         VALUES (?, ?, NULL, NULL, 0, 1, ?, datetime('now'))`
      )
      .bind(email, 'Người trải nghiệm', expiresAtSec)
      .run();
    return Number(result.meta.last_row_id);
  },

  async deleteById(id: number): Promise<void> {
    const db = await getDb();
    await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  },
};

// ============================================================================
// Decks (user-scoped)
// ============================================================================

const DEFAULT_DECK_NAME = 'Mặc định';

export const flashcardDecksDb = {
  /**
   * Ensure the user has a default deck. Returns deck ID.
   * Called automatically by `flashcardsDb.create` when no deck_id given.
   */
  async ensureDefault(userId: number): Promise<number> {
    const db = await getDb();
    const existing = await db
      .prepare('SELECT id FROM flashcard_decks WHERE user_id = ? AND is_default = 1 LIMIT 1')
      .bind(userId)
      .first<{ id: number }>();
    if (existing) return existing.id;
    const result = await db
      .prepare(
        `INSERT INTO flashcard_decks (user_id, name, description, color, position, is_default, recognition_only)
         VALUES (?, ?, ?, ?, 0, 1, 0)`
      )
      .bind(userId, DEFAULT_DECK_NAME, 'Bộ từ mặc định', '#7ac143')
      .run();
    return Number(result.meta.last_row_id);
  },

  async getAll(userId: number): Promise<FlashcardDeck[]> {
    const db = await getDb();
    const result = await db
      .prepare('SELECT * FROM flashcard_decks WHERE user_id = ? ORDER BY position ASC, id ASC')
      .bind(userId)
      .all<Record<string, unknown>>();
    return result.results.map((r) => hydrateDeck(r)!).filter(Boolean);
  },

  async getById(userId: number, id: number): Promise<FlashcardDeck | null> {
    const db = await getDb();
    const row = await db
      .prepare('SELECT * FROM flashcard_decks WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first<Record<string, unknown>>();
    return hydrateDeck(row);
  },

  async getAllWithCounts(userId: number): Promise<FlashcardDeckWithCounts[]> {
    const db = await getDb();
    const result = await db
      .prepare(
        `SELECT
           d.*,
           COUNT(c.id) as total,
           SUM(CASE WHEN c.status = 'new' THEN 1 ELSE 0 END) as new_count,
           SUM(CASE WHEN c.status = 'learning' THEN 1 ELSE 0 END) as learning_count,
           SUM(CASE WHEN c.status = 'review' THEN 1 ELSE 0 END) as review_count,
           SUM(CASE WHEN c.status = 'mastered' THEN 1 ELSE 0 END) as mastered_count,
           SUM(CASE WHEN c.id IS NOT NULL AND (c.next_review_at IS NULL OR c.next_review_at <= datetime('now')) THEN 1 ELSE 0 END) as due_count
         FROM flashcard_decks d
         LEFT JOIN flashcards c ON c.deck_id = d.id AND c.user_id = d.user_id
         WHERE d.user_id = ?
         GROUP BY d.id
         ORDER BY d.position ASC, d.id ASC`
      )
      .bind(userId)
      .all<Record<string, unknown>>();
    return result.results.map((r) => ({
      ...(r as unknown as FlashcardDeckWithCounts),
      is_default: Number(r.is_default) === 1,
      recognition_only: Number(r.recognition_only) === 1,
      total: Number(r.total) || 0,
      new_count: Number(r.new_count) || 0,
      learning_count: Number(r.learning_count) || 0,
      review_count: Number(r.review_count) || 0,
      mastered_count: Number(r.mastered_count) || 0,
      due_count: Number(r.due_count) || 0,
    }));
  },

  async create(userId: number, input: { name: string; description?: string | null; color?: string; icon?: string | null; subtitle?: string | null; recognition_only?: boolean }): Promise<number> {
    const db = await getDb();
    const maxRow = await db
      .prepare('SELECT COALESCE(MAX(position), -1) as m FROM flashcard_decks WHERE user_id = ?')
      .bind(userId)
      .first<{ m: number }>();
    const position = (maxRow?.m ?? -1) + 1;
    const result = await db
      .prepare(
        `INSERT INTO flashcard_decks (user_id, name, description, color, position, is_default, icon, subtitle, recognition_only)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`
      )
      .bind(
        userId,
        input.name,
        input.description ?? null,
        input.color ?? '#7ac143',
        position,
        input.icon ?? null,
        input.subtitle ?? null,
        input.recognition_only ? 1 : 0,
      )
      .run();
    return Number(result.meta.last_row_id);
  },

  async update(userId: number, id: number, fields: Partial<Pick<FlashcardDeck, 'name' | 'description' | 'color' | 'position' | 'icon' | 'subtitle' | 'recognition_only'>>): Promise<void> {
    const db = await getDb();
    const sets: string[] = [];
    const values: unknown[] = [];
    if (fields.name !== undefined)        { sets.push('name = ?');        values.push(fields.name); }
    if (fields.description !== undefined) { sets.push('description = ?'); values.push(fields.description); }
    if (fields.color !== undefined)       { sets.push('color = ?');       values.push(fields.color); }
    if (fields.position !== undefined)    { sets.push('position = ?');    values.push(fields.position); }
    if (fields.icon !== undefined)        { sets.push('icon = ?');        values.push(fields.icon); }
    if (fields.subtitle !== undefined)    { sets.push('subtitle = ?');    values.push(fields.subtitle); }
    if (fields.recognition_only !== undefined) { sets.push('recognition_only = ?'); values.push(fields.recognition_only ? 1 : 0); }
    if (sets.length === 0) return;
    values.push(id, userId);
    await db
      .prepare(`UPDATE flashcard_decks SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...values)
      .run();
  },

  /**
   * Flip the user's "default" deck to `id`. Clears the existing default
   * deck's flag first, then sets the new one — in one D1 batch so the
   * single-default-per-user invariant is preserved even on partial
   * failure. No-op if the deck isn't owned by `userId`.
   */
  async setDefault(userId: number, id: number): Promise<void> {
    const db = await getDb();
    const target = await db
      .prepare('SELECT id FROM flashcard_decks WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first<{ id: number }>();
    if (!target) return;
    await db.batch([
      db
        .prepare('UPDATE flashcard_decks SET is_default = 0 WHERE user_id = ? AND is_default = 1')
        .bind(userId),
      db
        .prepare('UPDATE flashcard_decks SET is_default = 1 WHERE id = ? AND user_id = ?')
        .bind(id, userId),
    ]);
  },

  /**
   * Deletes a deck. Default behavior moves the deck's cards to the user's
   * default deck so they aren't lost. Pass `{ deleteCards: true }` to delete
   * the cards instead — flashcard_reviews / flashcard_test_attempts /
   * flashcard_practice_sentences cascade via the schema's ON DELETE CASCADE.
   */
  async delete(userId: number, id: number, opts: { deleteCards?: boolean } = {}): Promise<void> {
    const db = await getDb();
    const deck = await db
      .prepare('SELECT id, is_default FROM flashcard_decks WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first<{ id: number; is_default: number }>();
    if (!deck) return; // not owned by user → no-op
    if (Number(deck.is_default) === 1) {
      throw new Error('Không thể xoá bộ từ mặc định.');
    }
    if (opts.deleteCards) {
      await db.batch([
        db.prepare('DELETE FROM flashcards WHERE deck_id = ? AND user_id = ?').bind(id, userId),
        db.prepare('DELETE FROM flashcard_decks WHERE id = ? AND user_id = ?').bind(id, userId),
      ]);
      return;
    }
    // Move cards to default deck, then delete this deck
    const defaultId = await flashcardDecksDb.ensureDefault(userId);
    await db.batch([
      db.prepare('UPDATE flashcards SET deck_id = ? WHERE deck_id = ? AND user_id = ?').bind(defaultId, id, userId),
      db.prepare('DELETE FROM flashcard_decks WHERE id = ? AND user_id = ?').bind(id, userId),
    ]);
  },
};

// ============================================================================
// Cards (user-scoped)
// ============================================================================

export const flashcardsDb = {
  async getById(userId: number, id: number): Promise<Flashcard | null> {
    const db = await getDb();
    const row = await db
      .prepare('SELECT * FROM flashcards WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first<Record<string, unknown>>();
    return hydrateCard(row);
  },

  /**
   * Find an existing card in a deck by (case-insensitive) headword. Used to
   * dedup saves from the Read-Along reader (E5.7) so re-saving a word returns
   * the existing card instead of creating a duplicate.
   */
  async findByEnglishInDeck(
    userId: number,
    deck_id: number,
    english: string,
  ): Promise<Flashcard | null> {
    const db = await getDb();
    const row = await db
      .prepare(
        'SELECT * FROM flashcards WHERE user_id = ? AND deck_id = ? AND LOWER(english) = LOWER(?) LIMIT 1',
      )
      .bind(userId, deck_id, english)
      .first<Record<string, unknown>>();
    return hydrateCard(row);
  },

  /**
   * Returns the user's cards matching the given IDs. Order of results is not
   * guaranteed to match the input order. IDs not owned by the user are silently
   * dropped (so callers can use this to filter a client-supplied pool down to
   * owned cards). Used by F3 compose evaluation.
   */
  async getByIds(userId: number, ids: number[]): Promise<Flashcard[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    const db = await getDb();
    const result = await db
      .prepare(`SELECT * FROM flashcards WHERE user_id = ? AND id IN (${placeholders})`)
      .bind(userId, ...ids)
      .all<Record<string, unknown>>();
    return (result.results ?? []).map((r) => hydrateCard(r)!).filter(Boolean);
  },

  async getByDeck(userId: number, deck_id: number, limit: number = 200): Promise<Flashcard[]> {
    const db = await getDb();
    const result = await db
      .prepare(
        'SELECT * FROM flashcards WHERE user_id = ? AND deck_id = ? ORDER BY created_at DESC LIMIT ?'
      )
      .bind(userId, deck_id, limit)
      .all<Record<string, unknown>>();
    return result.results.map((r) => hydrateCard(r)!).filter(Boolean);
  },

  /**
   * M5: alias for getByDeck with `{ limit }` option object. Used by the
   * /decks/[id] detail page so callers can omit limit naturally.
   */
  async listByDeck(userId: number, deck_id: number, opts: { limit?: number } = {}): Promise<Flashcard[]> {
    return flashcardsDb.getByDeck(userId, deck_id, opts.limit ?? 200);
  },

  async getDueForReview(
    userId: number,
    limit: number = 50,
    exclude_mastered: boolean = false,
    deck_id: number | null = null,
  ): Promise<Flashcard[]> {
    const db = await getDb();
    const masteredClause = exclude_mastered ? "AND status != 'mastered'" : '';
    const deckClause = deck_id ? 'AND deck_id = ?' : '';
    // NULL next_review_at = brand-new card never reviewed → treat as "due now"
    // so it shows in /review. The previous `IS NOT NULL` filter excluded these
    // entirely, which is why /review appeared empty for users whose only cards
    // were freshly added. NULLS FIRST is the natural ordering since they
    // haven't been scheduled yet.
    const stmt = db.prepare(
      `SELECT * FROM flashcards
       WHERE user_id = ?
       AND (next_review_at IS NULL OR next_review_at <= datetime('now'))
       ${masteredClause}
       ${deckClause}
       ORDER BY next_review_at IS NULL DESC, next_review_at ASC
       LIMIT ?`,
    );
    const result = deck_id
      ? await stmt.bind(userId, deck_id, limit).all<Record<string, unknown>>()
      : await stmt.bind(userId, limit).all<Record<string, unknown>>();
    return result.results.map((r) => hydrateCard(r)!).filter(Boolean);
  },

  /**
   * Returns flashcards the user has reviewed since the given ISO timestamp.
   * "Since" semantics: the CALLER (typically the client) computes start-of-today
   * in the USER'S LOCAL timezone, converts to ISO, and passes it. The server
   * treats `sinceIso` as an opaque cutoff. Do not interpret as UTC midnight.
   *
   * Excludes mastered cards. Ordered most-recent-first.
   */
  async getReviewedSince(
    userId: number,
    sinceIso: string,
    opts: { limit?: number } = {}
  ): Promise<Flashcard[]> {
    const limit = opts.limit ?? 30;
    const db = await getDb();
    const result = await db
      .prepare(
        `SELECT * FROM flashcards
         WHERE user_id = ?
           AND last_reviewed_at IS NOT NULL
           AND last_reviewed_at >= ?
           AND status != 'mastered'
         ORDER BY last_reviewed_at DESC
         LIMIT ?`
      )
      .bind(userId, sinceIso, limit)
      .all<Record<string, unknown>>();
    return (result.results ?? []).map((r) => hydrateCard(r)!).filter(Boolean);
  },

  /**
   * Returns the user's most recently created cards regardless of deck.
   * Used by `/api/cards?limit=N` when no other filter is given (e.g. F1 pronounce).
   */
  async getAll(userId: number, limit: number = 50): Promise<Flashcard[]> {
    const db = await getDb();
    const result = await db
      .prepare(
        'SELECT * FROM flashcards WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
      )
      .bind(userId, limit)
      .all<Record<string, unknown>>();
    return result.results.map((r) => hydrateCard(r)!).filter(Boolean);
  },

  async getNewForToday(userId: number, limit: number = 10, deck_id: number | null = null): Promise<Flashcard[]> {
    const db = await getDb();
    const sql = deck_id
      ? `SELECT * FROM flashcards WHERE user_id = ? AND status = 'new' AND deck_id = ? ORDER BY created_at ASC LIMIT ?`
      : `SELECT * FROM flashcards WHERE user_id = ? AND status = 'new' ORDER BY created_at ASC LIMIT ?`;
    const stmt = db.prepare(sql);
    const result = deck_id
      ? await stmt.bind(userId, deck_id, limit).all<Record<string, unknown>>()
      : await stmt.bind(userId, limit).all<Record<string, unknown>>();
    return result.results.map((r) => hydrateCard(r)!).filter(Boolean);
  },

  /**
   * Unified /study pool counts for a set of decks (already filtered to one
   * deck group by the caller). "Due" = has SRS state (status != 'new') and
   * next_review_at <= now — same due predicate the rest of the app uses.
   * "New" = status = 'new' (never rated in a study session).
   */
  async countStudyPool(
    userId: number,
    deckIds: number[],
    excludeMastered: boolean,
  ): Promise<{ due: number; fresh: number }> {
    if (deckIds.length === 0) return { due: 0, fresh: 0 };
    const db = await getDb();
    const placeholders = deckIds.map(() => '?').join(',');
    const masteredClause = excludeMastered ? "AND status != 'mastered'" : '';
    const row = await db
      .prepare(
        `SELECT
           SUM(CASE WHEN status != 'new' AND next_review_at IS NOT NULL
                     AND next_review_at <= datetime('now') ${masteredClause}
                    THEN 1 ELSE 0 END) as due,
           SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as fresh
         FROM flashcards
         WHERE user_id = ? AND deck_id IN (${placeholders})`,
      )
      .bind(userId, ...deckIds)
      .first<{ due: number; fresh: number }>();
    return { due: Number(row?.due) || 0, fresh: Number(row?.fresh) || 0 };
  },

  /** Due cards across a set of decks, most overdue first. */
  async getDueInDecks(
    userId: number,
    deckIds: number[],
    limit: number,
    excludeMastered: boolean,
  ): Promise<Flashcard[]> {
    if (deckIds.length === 0) return [];
    const db = await getDb();
    const placeholders = deckIds.map(() => '?').join(',');
    const masteredClause = excludeMastered ? "AND status != 'mastered'" : '';
    const result = await db
      .prepare(
        `SELECT * FROM flashcards
         WHERE user_id = ? AND deck_id IN (${placeholders})
           AND status != 'new'
           AND next_review_at IS NOT NULL
           AND next_review_at <= datetime('now')
           ${masteredClause}
         ORDER BY next_review_at ASC
         LIMIT ?`,
      )
      .bind(userId, ...deckIds, limit)
      .all<Record<string, unknown>>();
    return result.results.map((r) => hydrateCard(r)!).filter(Boolean);
  },

  /**
   * Random sample from the new pool across a set of decks. RANDOM() is
   * intentional per the study-unified spec ("Học": random sample) — the
   * queue is not meant to be reproducible.
   */
  /**
   * Cards in the given decks that have at least one example sentence.
   * Coarse SQL filter (JSON column) — callers must still check the specific
   * example index / vi presence after hydrate. Used by the "Học câu" session.
   */
  async getWithExamplesInDecks(userId: number, deckIds: number[], limit: number = 2000): Promise<Flashcard[]> {
    if (deckIds.length === 0) return [];
    const db = await getDb();
    const placeholders = deckIds.map(() => '?').join(',');
    const result = await db
      .prepare(
        `SELECT * FROM flashcards
         WHERE user_id = ? AND deck_id IN (${placeholders})
           AND examples IS NOT NULL AND examples != '[]' AND examples != ''
         LIMIT ?`,
      )
      .bind(userId, ...deckIds, limit)
      .all<Record<string, unknown>>();
    return result.results.map((r) => hydrateCard(r)!).filter(Boolean);
  },

  async getNewRandomInDecks(userId: number, deckIds: number[], limit: number): Promise<Flashcard[]> {
    if (deckIds.length === 0) return [];
    const db = await getDb();
    const placeholders = deckIds.map(() => '?').join(',');
    const result = await db
      .prepare(
        `SELECT * FROM flashcards
         WHERE user_id = ? AND deck_id IN (${placeholders})
           AND status = 'new'
         ORDER BY RANDOM()
         LIMIT ?`,
      )
      .bind(userId, ...deckIds, limit)
      .all<Record<string, unknown>>();
    return result.results.map((r) => hydrateCard(r)!).filter(Boolean);
  },

  async search(userId: number, query: string, limit: number = 50): Promise<Flashcard[]> {
    const db = await getDb();
    const like = `%${query.toLowerCase()}%`;
    const result = await db
      .prepare(
        `SELECT * FROM flashcards
         WHERE user_id = ?
         AND (LOWER(english) LIKE ? OR LOWER(vietnamese) LIKE ?)
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(userId, like, like, limit)
      .all<Record<string, unknown>>();
    return result.results.map((r) => hydrateCard(r)!).filter(Boolean);
  },

  async create(userId: number, input: Partial<Flashcard> & { english: string; vietnamese: string }): Promise<number> {
    const db = await getDb();
    // Resolve deck_id: use provided, else user's default
    const deckId = input.deck_id ?? (await flashcardDecksDb.ensureDefault(userId));
    const result = await db
      .prepare(
        `INSERT INTO flashcards (
           user_id, deck_id, english, vietnamese, ipa, part_of_speech, audio_url,
           audio_us_key, audio_us_status,
           examples, image_url, image_attribution, notes, collocations,
           status, source_passage_id, source_context
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        userId,
        deckId,
        input.english,
        input.vietnamese,
        input.ipa ?? null,
        input.part_of_speech ?? null,
        input.audio_url ?? null,
        input.audio_us_key ?? null,
        input.audio_us_status ?? null,
        input.examples ? JSON.stringify(input.examples) : null,
        input.image_url ?? null,
        input.image_attribution ? JSON.stringify(input.image_attribution) : null,
        input.notes ?? null,
        input.collocations ? JSON.stringify(input.collocations) : null,
        input.status ?? 'new',
        input.source_passage_id ?? null,
        input.source_context ?? null
      )
      .run();
    return Number(result.meta.last_row_id);
  },

  /**
   * List all cards saved from a specific passage. Used by Step 3 reader to
   * paint "already saved" markers on tokens. Returns empty array if the
   * passage isn't owned by `userId` (the WHERE filter handles ownership).
   */
  async listBySourcePassage(userId: number, passageId: number): Promise<Flashcard[]> {
    const db = await getDb();
    const result = await db
      .prepare(
        `SELECT * FROM flashcards
         WHERE user_id = ? AND source_passage_id = ?
         ORDER BY created_at DESC`
      )
      .bind(userId, passageId)
      .all<Record<string, unknown>>();
    return result.results.map((r) => hydrateCard(r)!).filter(Boolean);
  },

  async update(userId: number, id: number, fields: Partial<Flashcard>): Promise<void> {
    const db = await getDb();
    const sets: string[] = [];
    const values: unknown[] = [];
    const map: Record<string, unknown> = {
      english: fields.english,
      vietnamese: fields.vietnamese,
      ipa: fields.ipa,
      part_of_speech: fields.part_of_speech,
      audio_url: fields.audio_url,
      audio_us_key: fields.audio_us_key,
      audio_us_status: fields.audio_us_status,
      image_url: fields.image_url,
      notes: fields.notes,
      deck_id: fields.deck_id,
      status: fields.status,
    };
    for (const [k, v] of Object.entries(map)) {
      if (v !== undefined) { sets.push(`${k} = ?`); values.push(v); }
    }
    if (fields.examples !== undefined)          { sets.push('examples = ?');          values.push(fields.examples ? JSON.stringify(fields.examples) : null); }
    if (fields.image_attribution !== undefined) { sets.push('image_attribution = ?'); values.push(fields.image_attribution ? JSON.stringify(fields.image_attribution) : null); }
    if (fields.collocations !== undefined)      { sets.push('collocations = ?');      values.push(fields.collocations ? JSON.stringify(fields.collocations) : null); }
    sets.push("updated_at = datetime('now')");
    if (sets.length === 1) return;
    values.push(id, userId);
    await db
      .prepare(`UPDATE flashcards SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...values)
      .run();
  },

  async updateSRS(userId: number, id: number, fields: { status?: FlashcardStatus; ease_factor: number; interval_days: number; repetitions: number; next_review_at: string; last_reviewed_at: string }): Promise<void> {
    const db = await getDb();
    await db
      .prepare(
        `UPDATE flashcards
         SET status = COALESCE(?, status),
             ease_factor = ?,
             interval_days = ?,
             repetitions = ?,
             next_review_at = ?,
             last_reviewed_at = ?,
             updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`
      )
      .bind(
        fields.status ?? null,
        fields.ease_factor,
        fields.interval_days,
        fields.repetitions,
        fields.next_review_at,
        fields.last_reviewed_at,
        id,
        userId
      )
      .run();
  },

  async delete(userId: number, id: number): Promise<void> {
    const db = await getDb();
    await db
      .prepare('DELETE FROM flashcards WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .run();
  },

  /**
   * Per-status card counts. `excludeRecognitionOnly` drops cards living in
   * "chỉ hiểu nghĩa" decks (recognition_only = 1) — the dashboard uses
   * this so its learning stats only reflect full-study decks.
   */
  async countByStatus(
    userId: number,
    opts: { excludeRecognitionOnly?: boolean } = {},
  ): Promise<Record<FlashcardStatus, number>> {
    const db = await getDb();
    const sql = opts.excludeRecognitionOnly
      ? `SELECT c.status, COUNT(*) as n FROM flashcards c
         JOIN flashcard_decks d ON d.id = c.deck_id AND d.user_id = c.user_id
         WHERE c.user_id = ? AND d.recognition_only = 0
         GROUP BY c.status`
      : `SELECT status, COUNT(*) as n FROM flashcards WHERE user_id = ? GROUP BY status`;
    const result = await db
      .prepare(sql)
      .bind(userId)
      .all<{ status: FlashcardStatus; n: number }>();
    const counts: Record<FlashcardStatus, number> = { new: 0, learning: 0, review: 0, mastered: 0 };
    for (const r of result.results) counts[r.status] = Number(r.n);
    return counts;
  },
};

// ============================================================================
// Reviews
// ============================================================================

export class CardNotFoundError extends Error {
  constructor() {
    super('Card not found');
    this.name = 'CardNotFoundError';
  }
}

export const flashcardReviewsDb = {
  async create(userId: number, input: { flashcard_id: number; quality: 0 | 2 | 4 | 5; prev_interval: number; new_interval: number; source?: ReviewSource; srs_applied?: boolean }): Promise<number> {
    const db = await getDb();
    const result = await db
      .prepare(
        `INSERT INTO flashcard_reviews (user_id, flashcard_id, quality, prev_interval, new_interval, source, srs_applied)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        userId,
        input.flashcard_id,
        input.quality,
        input.prev_interval,
        input.new_interval,
        input.source ?? 'study',
        input.srs_applied === false ? 0 : 1,
      )
      .run();
    return Number(result.meta.last_row_id);
  },

  /**
   * Apply an SM-2 rating to a card: compute next interval, insert a
   * flashcard_reviews row, and update the card's SRS state. Single source of
   * truth for both `/api/cards/[id]/rate` and `/api/sentence/timeout`.
   * Throws CardNotFoundError when the card is missing / not owned by user.
   */
  async recordRating(
    userId: number,
    flashcardId: number,
    quality: SRSQuality,
    opts: { failedThisSession?: boolean; srsUpdate?: boolean; source?: ReviewSource } = {},
  ): Promise<{ prev_interval: number; new_interval: number; next_review_at: string; new_status: FlashcardStatus }> {
    const card = await flashcardsDb.getById(userId, flashcardId);
    if (!card) throw new CardNotFoundError();

    // Compute next state (used for both logging and possible apply).
    const update = calculateNextReview(card, quality, opts);

    // Only apply SRS state mutation if requested.
    // Default true so non-session callers (e.g. /api/sentence/timeout) work
    // exactly as before. Session UI passes `srsUpdate: false` for re-ratings
    // on the same card within a single session.
    const shouldUpdateSRS = opts.srsUpdate !== false;

    // Always log the review event (srs_applied mirrors whether we mutate).
    await flashcardReviewsDb.create(userId, {
      flashcard_id: flashcardId,
      quality,
      prev_interval: update.prev_interval,
      new_interval: update.interval_days,
      source: opts.source ?? 'study',
      srs_applied: shouldUpdateSRS,
    });

    if (shouldUpdateSRS) {
      await flashcardsDb.updateSRS(userId, flashcardId, {
        status: update.status,
        ease_factor: update.ease_factor,
        interval_days: update.interval_days,
        repetitions: update.repetitions,
        next_review_at: update.next_review_at,
        last_reviewed_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      });
    }

    return {
      prev_interval: update.prev_interval,
      new_interval: update.interval_days,
      next_review_at: shouldUpdateSRS ? update.next_review_at : (card.next_review_at ?? update.next_review_at),
      new_status: shouldUpdateSRS ? update.status : card.status,
    };
  },

  /**
   * Timed Flashcard-nhanh answer → SRS transition (study-unified Part B).
   * The game only reports correct/wrong + card id; all rules live here:
   *
   *   - New card (status='new')      → log-only. First learning happens in
   *                                    study sessions.
   *   - Correct AND due              → interval ×1.2 boost (calculateFlashcardBoost);
   *                                    ease & repetitions untouched.
   *   - Correct AND not due          → log-only (no interval farming).
   *   - Wrong                       → full "Lại" lapse via the SAME path as
   *                                    study sessions (calculateNextReview q=0).
   *   - Daily cap: max ONE srs_applied=1 flashcard event per card per local
   *     day. Exception: if today's applied event was a CORRECT boost and the
   *     user later answers wrong, the lapse still applies (once). After an
   *     applied lapse, everything else that day is log-only.
   *
   * Every answer writes a flashcard_reviews row (source='flashcard') either
   * way, so timed play always counts as review activity for stats/streak.
   */
  async recordFlashcardResult(
    userId: number,
    flashcardId: number,
    correct: boolean,
  ): Promise<{ srs_applied: boolean }> {
    const card = await flashcardsDb.getById(userId, flashcardId);
    if (!card) throw new CardNotFoundError();

    const db = await getDb();
    const quality: SRSQuality = correct ? 4 : 0;

    const logOnly = async () => {
      await flashcardReviewsDb.create(userId, {
        flashcard_id: flashcardId,
        quality,
        prev_interval: card.interval_days,
        new_interval: card.interval_days,
        source: 'flashcard',
        srs_applied: false,
      });
      return { srs_applied: false };
    };

    // New cards never mutate from game play.
    if (card.status === 'new') return logOnly();

    // Today's already-applied flashcard events for this card (local day,
    // same boundary as the streak queries).
    const appliedToday = await db
      .prepare(
        `SELECT quality FROM flashcard_reviews
         WHERE user_id = ? AND flashcard_id = ?
           AND source = 'flashcard' AND srs_applied = 1
           AND date(reviewed_at, 'localtime') = date('now', 'localtime')`,
      )
      .bind(userId, flashcardId)
      .all<{ quality: number }>();
    const hasAppliedToday = appliedToday.results.length > 0;
    const hasAppliedLapseToday = appliedToday.results.some((r) => Number(r.quality) === 0);

    const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (correct) {
      const isDue = card.next_review_at !== null && card.next_review_at <= nowIso;
      if (hasAppliedToday || !isDue) return logOnly();

      const boost = calculateFlashcardBoost(card);
      await flashcardReviewsDb.create(userId, {
        flashcard_id: flashcardId,
        quality: 4,
        prev_interval: boost.prev_interval,
        new_interval: boost.interval_days,
        source: 'flashcard',
        srs_applied: true,
      });
      // Ease, repetitions, and status stay untouched — only the schedule moves.
      await flashcardsDb.updateSRS(userId, flashcardId, {
        ease_factor: card.ease_factor,
        interval_days: boost.interval_days,
        repetitions: card.repetitions,
        next_review_at: boost.next_review_at,
        last_reviewed_at: nowIso,
      });
      return { srs_applied: true };
    }

    // Wrong: full lapse unless one was already applied today. A correct
    // boost earlier today does NOT block the lapse (wrong-overrides-correct).
    if (hasAppliedLapseToday) return logOnly();

    const update = calculateNextReview(card, 0);
    await flashcardReviewsDb.create(userId, {
      flashcard_id: flashcardId,
      quality: 0,
      prev_interval: update.prev_interval,
      new_interval: update.interval_days,
      source: 'flashcard',
      srs_applied: true,
    });
    await flashcardsDb.updateSRS(userId, flashcardId, {
      status: update.status,
      ease_factor: update.ease_factor,
      interval_days: update.interval_days,
      repetitions: update.repetitions,
      next_review_at: update.next_review_at,
      last_reviewed_at: nowIso,
    });
    return { srs_applied: true };
  },

  async getTodayCount(userId: number): Promise<number> {
    const db = await getDb();
    const row = await db
      .prepare(
        `SELECT COUNT(*) as n FROM flashcard_reviews
         WHERE user_id = ? AND date(reviewed_at, 'localtime') = date('now', 'localtime')`
      )
      .bind(userId)
      .first<{ n: number }>();
    return Number(row?.n) || 0;
  },

  async getStreakDays(userId: number): Promise<number> {
    const db = await getDb();
    const result = await db
      .prepare(
        `SELECT date(reviewed_at, 'localtime') as d
         FROM flashcard_reviews
         WHERE user_id = ?
         GROUP BY date(reviewed_at, 'localtime')
         ORDER BY d DESC
         LIMIT 365`
      )
      .bind(userId)
      .all<{ d: string }>();
    if (result.results.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const DAY_MS = 24 * 60 * 60 * 1000;
    let streak = 0;
    let cursor = today.getTime();
    for (let i = 0; i < result.results.length; i++) {
      const date = new Date(result.results[i].d);
      date.setHours(0, 0, 0, 0);
      const diff = Math.round((cursor - date.getTime()) / DAY_MS);
      // A streak is unbroken through YESTERDAY — not reviewing yet today
      // must not zero it out (the dashboard shows today as "pending").
      // So the newest review day may be today (diff 0) or yesterday
      // (diff 1, first row only); every following row must be consecutive.
      if (diff === 0 || (i === 0 && diff === 1)) {
        streak++;
        cursor = date.getTime() - DAY_MS;
      } else {
        break;
      }
    }
    return streak;
  },

  async getActivityLastDays(userId: number, days: number = 30): Promise<Array<{ date: string; new: number; review: number }>> {
    const db = await getDb();
    const result = await db
      .prepare(
        `SELECT date(reviewed_at, 'localtime') as d,
                SUM(CASE WHEN prev_interval = 0 THEN 1 ELSE 0 END) as new_count,
                SUM(CASE WHEN prev_interval > 0 THEN 1 ELSE 0 END) as review_count
         FROM flashcard_reviews
         WHERE user_id = ?
         AND date(reviewed_at, 'localtime') >= date('now', 'localtime', '-' || ? || ' days')
         GROUP BY date(reviewed_at, 'localtime')
         ORDER BY d ASC`
      )
      .bind(userId, days)
      .all<{ d: string; new_count: number; review_count: number }>();
    return result.results.map((r) => ({
      date: r.d,
      new: Number(r.new_count) || 0,
      review: Number(r.review_count) || 0,
    }));
  },

  /**
   * Returns the user's longest historical streak (in days) — the max-consecutive-day
   * count across all their review activity. Used by the dashboard streak bar's
   * "kỷ lục: N" subtitle. Reads the same `flashcard_reviews` table as
   * `getStreakDays` and walks distinct review-dates ascending. O(unique-days).
   */
  async getLongestStreak(userId: number): Promise<number> {
    const db = await getDb();
    const result = await db
      .prepare(
        `SELECT date(reviewed_at, 'localtime') as d
         FROM flashcard_reviews
         WHERE user_id = ?
         GROUP BY date(reviewed_at, 'localtime')
         ORDER BY d ASC`
      )
      .bind(userId)
      .all<{ d: string }>();
    if (result.results.length === 0) return 0;
    let longest = 1;
    let current = 1;
    let prevTime: number | null = null;
    const DAY_MS = 24 * 60 * 60 * 1000;
    for (const row of result.results) {
      const t = new Date(row.d).setHours(0, 0, 0, 0);
      if (prevTime !== null) {
        const diff = Math.round((t - prevTime) / DAY_MS);
        if (diff === 1) {
          current += 1;
        } else if (diff > 1) {
          current = 1;
        }
        // diff === 0 should not happen because of GROUP BY, but treat as no-op.
      }
      if (current > longest) longest = current;
      prevTime = t;
    }
    return longest;
  },

  async getRetentionRate(userId: number, days: number = 7): Promise<number> {
    const db = await getDb();
    const row = await db
      .prepare(
        `SELECT
           SUM(CASE WHEN quality >= 4 THEN 1 ELSE 0 END) as ok,
           COUNT(*) as total
         FROM flashcard_reviews
         WHERE user_id = ?
         AND reviewed_at >= datetime('now', '-' || ? || ' days')
         AND prev_interval > 0`
      )
      .bind(userId, days)
      .first<{ ok: number; total: number }>();
    if (!row || !row.total) return 0;
    return Number(row.ok) / Number(row.total);
  },
};

// ============================================================================
// Sentence drills ("Học câu") — per-sentence SRS
// ============================================================================

export const sentenceDrillsDb = {
  /**
   * Drill rows for a set of cards at one example index, keyed by
   * flashcard_id. Cards without a row are "new" sentences.
   */
  async getForCards(
    userId: number,
    cardIds: number[],
    exampleIndex: number,
  ): Promise<Map<number, SentenceDrill>> {
    if (cardIds.length === 0) return new Map();
    const db = await getDb();
    const placeholders = cardIds.map(() => '?').join(',');
    const result = await db
      .prepare(
        `SELECT * FROM sentence_drills
         WHERE user_id = ? AND example_index = ? AND flashcard_id IN (${placeholders})`
      )
      .bind(userId, exampleIndex, ...cardIds)
      .all<Record<string, unknown>>();
    const map = new Map<number, SentenceDrill>();
    for (const row of result.results) {
      map.set(Number(row.flashcard_id), row as unknown as SentenceDrill);
    }
    return map;
  },

  /**
   * Apply an SM-2 rating to one sentence (card × example index). The row is
   * created lazily on first rating (upsert). Mirrors
   * flashcardReviewsDb.recordRating but mutates sentence_drills, NEVER the
   * word's SRS state. Every rating also logs a flashcard_reviews row with
   * source='sentence', srs_applied=0 — pure activity signal for
   * streak/stats.
   */
  async recordRating(
    userId: number,
    flashcardId: number,
    exampleIndex: number,
    quality: SRSQuality,
    opts: { failedThisSession?: boolean; srsUpdate?: boolean } = {},
  ): Promise<{ prev_interval: number; new_interval: number; next_review_at: string; new_status: FlashcardStatus }> {
    const card = await flashcardsDb.getById(userId, flashcardId);
    if (!card) throw new CardNotFoundError();

    const db = await getDb();
    const existing = await db
      .prepare(
        `SELECT * FROM sentence_drills
         WHERE user_id = ? AND flashcard_id = ? AND example_index = ?`
      )
      .bind(userId, flashcardId, exampleIndex)
      .first<Record<string, unknown>>();

    const state: SRSCardState = existing
      ? {
          status: existing.status as FlashcardStatus,
          ease_factor: Number(existing.ease_factor),
          interval_days: Number(existing.interval_days),
          repetitions: Number(existing.repetitions),
        }
      : { status: 'new', ease_factor: 2.5, interval_days: 0, repetitions: 0 };

    const update = calculateNextReview(state, quality, {
      failedThisSession: opts.failedThisSession,
    });
    // Same first-rating-per-session protocol as the word session: re-ratings
    // of the same sentence in one session are log-only.
    const shouldUpdateSRS = opts.srsUpdate !== false;

    await flashcardReviewsDb.create(userId, {
      flashcard_id: flashcardId,
      quality,
      prev_interval: update.prev_interval,
      new_interval: update.interval_days,
      source: 'sentence',
      srs_applied: false,
    });

    if (shouldUpdateSRS) {
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      await db
        .prepare(
          `INSERT INTO sentence_drills (
             user_id, flashcard_id, example_index,
             status, ease_factor, interval_days, repetitions,
             next_review_at, last_reviewed_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id, flashcard_id, example_index) DO UPDATE SET
             status = excluded.status,
             ease_factor = excluded.ease_factor,
             interval_days = excluded.interval_days,
             repetitions = excluded.repetitions,
             next_review_at = excluded.next_review_at,
             last_reviewed_at = excluded.last_reviewed_at`
        )
        .bind(
          userId,
          flashcardId,
          exampleIndex,
          update.status,
          update.ease_factor,
          update.interval_days,
          update.repetitions,
          update.next_review_at,
          now,
        )
        .run();
    }

    return {
      prev_interval: update.prev_interval,
      new_interval: update.interval_days,
      next_review_at: update.next_review_at,
      new_status: update.status,
    };
  },
};

// ============================================================================
// Test attempts
// ============================================================================

export const flashcardTestAttemptsDb = {
  async create(userId: number, input: { flashcard_id: number; mode: TestMode; passed: boolean; time_ms?: number | null; metadata?: Record<string, unknown> | null }): Promise<number> {
    const db = await getDb();
    const result = await db
      .prepare(
        `INSERT INTO flashcard_test_attempts (user_id, flashcard_id, mode, passed, time_ms, metadata)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        userId,
        input.flashcard_id,
        input.mode,
        input.passed ? 1 : 0,
        input.time_ms ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null
      )
      .run();
    return Number(result.meta.last_row_id);
  },
};

// ============================================================================
// Practice sentences (no user_id — derives via card; routes must check ownership of card first)
// ============================================================================

export const flashcardPracticeSentencesDb = {
  async createMany(flashcard_id: number, sentences: Array<{ en: string; vi: string | null }>): Promise<void> {
    if (sentences.length === 0) return;
    const db = await getDb();
    const stmts = sentences.map((s) =>
      db
        .prepare(
          `INSERT INTO flashcard_practice_sentences (flashcard_id, sentence, vi_translation) VALUES (?, ?, ?)`
        )
        .bind(flashcard_id, s.en, s.vi)
    );
    await db.batch(stmts);
  },

  async pickLeastShown(flashcard_id: number): Promise<PracticeSentence | null> {
    const db = await getDb();
    return await db
      .prepare(
        `SELECT * FROM flashcard_practice_sentences
         WHERE flashcard_id = ?
         ORDER BY times_shown ASC, RANDOM()
         LIMIT 1`
      )
      .bind(flashcard_id)
      .first<PracticeSentence>();
  },

  async markShown(id: number): Promise<void> {
    const db = await getDb();
    await db
      .prepare(
        `UPDATE flashcard_practice_sentences
         SET times_shown = times_shown + 1, last_shown_at = datetime('now')
         WHERE id = ?`
      )
      .bind(id)
      .run();
  },

  async countByCard(flashcard_id: number): Promise<number> {
    const db = await getDb();
    const row = await db
      .prepare('SELECT COUNT(*) as n FROM flashcard_practice_sentences WHERE flashcard_id = ?')
      .bind(flashcard_id)
      .first<{ n: number }>();
    return Number(row?.n) || 0;
  },

  async countShown(flashcard_id: number): Promise<number> {
    const db = await getDb();
    const row = await db
      .prepare('SELECT COUNT(*) as n FROM flashcard_practice_sentences WHERE flashcard_id = ? AND times_shown >= 1')
      .bind(flashcard_id)
      .first<{ n: number }>();
    return Number(row?.n) || 0;
  },
};

// ============================================================================
// Cloze sentence pool (shared across users)
// ============================================================================

// flashcard_cloze_pool — shared across users, like flashcard_practice_sentences.
// Sentences are word-specific generic linguistic content (no PII).
// Read by any authed user; written by background ensureClozePool() only.
export const flashcardClozePoolDb = {
  async countByWord(word: string): Promise<number> {
    const db = await getDb();
    const row = await db
      .prepare('SELECT COUNT(*) AS n FROM flashcard_cloze_pool WHERE word = ?')
      .bind(word.toLowerCase())
      .first<{ n: number }>();
    return row?.n ?? 0;
  },

  async hasMinimum(word: string, min: number): Promise<boolean> {
    return (await flashcardClozePoolDb.countByWord(word)) >= min;
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
};

// ============================================================================
// User settings (per-user)
// ============================================================================

const SETTINGS_KEYS = [
  'flashcard_daily_goal_review',
  'flashcard_mastered_hide_from_review',
  // M3 keys — stored under their bare names (no `flashcard_` prefix) so they
  // can later be reused for non-flashcard practice modes without rename pain.
  'f1_max_attempts',
  'f2_timer_seconds',
  'f3_max_words_per_composition',
  'speed_timer_seconds',
  // M4 keys
  'user_cefr_level',
  'passage_tts_rate',
  'passage_pre_fetch',
  // M5 keys
  'autoplay_audio',
  'voice_preference',
  'theme',
  // Pomodoro keys
  'pomodoro_work_minutes',
  'pomodoro_break_minutes',
  // Read-Along / Karaoke reader keys
  'reading_speed',
  'reading_auto_continue',
  'reading_deck_id',
  // Unified study session (study-unified)
  'session_review_limit',
  'session_new_limit',
  // M6 keys (settings overhaul)
  'reveal_read_count',
  'reveal_read_gap_ms',
  'word_tts_rate',
  'speed_read_count',
  'chunk_pause_ms',
  'default_session_size',
  // Listening question mode
  'listening_enabled',
  'listening_ratio',
  // "Học câu" sentence study
  'sentence_read_count',
] as const;

const THEME_VALUES: ReadonlyArray<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
function parseTheme(raw: string | undefined): 'light' | 'dark' | 'system' {
  if (raw && THEME_VALUES.includes(raw as 'light' | 'dark' | 'system')) {
    return raw as 'light' | 'dark' | 'system';
  }
  return 'system';
}

export const userSettingsDb = {
  async getFlashcardSettings(userId: number): Promise<FlashcardSettings> {
    const db = await getDb();
    const result = await db
      .prepare(
        `SELECT key, value FROM user_settings
         WHERE user_id = ? AND key IN (${SETTINGS_KEYS.map(() => '?').join(',')})`
      )
      .bind(userId, ...SETTINGS_KEYS)
      .all<{ key: string; value: string }>();
    const map = new Map(result.results.map((r) => [r.key, r.value]));
    // Absent key → default; present key → its numeric value, even when that
    // value is legitimately 0 (f1_max_attempts "Không giới hạn", speed timer
    // "Tắt", speed_read_count off…). `Number(x) || default` would swallow 0.
    const numOr = (key: string, def: number): number => {
      const raw = map.get(key);
      if (raw === undefined) return def;
      const n = Number(raw);
      return Number.isFinite(n) ? n : def;
    };
    return {
      daily_goal_review: numOr('flashcard_daily_goal_review', 50),
      mastered_hide_from_review: (map.get('flashcard_mastered_hide_from_review') ?? '1') === '1',
      // M3 keys (defaults pulled from M3_SETTINGS in @/lib/types).
      f1_max_attempts: numOr('f1_max_attempts', 3),
      f2_timer_seconds: numOr('f2_timer_seconds', 60),
      f3_max_words_per_composition: numOr('f3_max_words_per_composition', 30),
      speed_timer_seconds: numOr('speed_timer_seconds', 8),
      // M4 keys — defaults from M4_SETTINGS so they stay in lockstep with
      // the validator and UI ranges.
      user_cefr_level: parseCefr(map.get('user_cefr_level')),
      passage_tts_rate: numOr('passage_tts_rate', M4_SETTINGS.passage_tts_rate.default),
      passage_pre_fetch: (map.get('passage_pre_fetch') ?? (M4_SETTINGS.passage_pre_fetch.default ? '1' : '0')) === '1',
      // M5 keys
      autoplay_audio: (map.get('autoplay_audio') ?? '1') === '1',
      voice_preference: map.get('voice_preference') ?? 'auto',
      theme: parseTheme(map.get('theme')),
      // Pomodoro defaults — 25/5 (standard Pomodoro technique).
      pomodoro_work_minutes: numOr('pomodoro_work_minutes', 25),
      pomodoro_break_minutes: numOr('pomodoro_break_minutes', 5),
      // Read-Along defaults (BR7–BR10). reading_deck_id absent → null (no
      // last-used deck yet); the reader falls back to first/auto-created deck.
      reading_speed: numOr('reading_speed', 1.0),
      reading_auto_continue: (map.get('reading_auto_continue') ?? '1') === '1',
      reading_deck_id: map.get('reading_deck_id') ? Number(map.get('reading_deck_id')) : null,
      // Unified study session defaults — 20 thẻ ôn / 20 thẻ mới mỗi phiên.
      session_review_limit: numOr('session_review_limit', 20),
      session_new_limit: numOr('session_new_limit', 20),
      // M6 keys — defaults from M6_SETTINGS.
      reveal_read_count: numOr('reveal_read_count', M6_SETTINGS.reveal_read_count.default),
      reveal_read_gap_ms: numOr('reveal_read_gap_ms', M6_SETTINGS.reveal_read_gap_ms.default),
      word_tts_rate: numOr('word_tts_rate', M6_SETTINGS.word_tts_rate.default),
      speed_read_count: numOr('speed_read_count', M6_SETTINGS.speed_read_count.default),
      chunk_pause_ms: numOr('chunk_pause_ms', M6_SETTINGS.chunk_pause_ms.default),
      default_session_size: numOr('default_session_size', M6_SETTINGS.default_session_size.default),
      // Listening question mode — on by default, 50/50 split.
      listening_enabled: (map.get('listening_enabled') ?? '1') === '1',
      listening_ratio: numOr('listening_ratio', LISTENING_SETTINGS.listening_ratio.default),
      // "Học câu" reveal auto-read (0 = off).
      sentence_read_count: numOr('sentence_read_count', SENTENCE_STUDY_SETTINGS.sentence_read_count.default),
    };
  },

  async updateFlashcardSettings(userId: number, partial: Partial<FlashcardSettings>): Promise<void> {
    const db = await getDb();
    const stmts: ReturnType<typeof db.prepare>[] = [];
    const upsert = (key: string, value: string) => {
      stmts.push(
        db
          .prepare(
            `INSERT INTO user_settings (user_id, key, value, updated_at)
             VALUES (?, ?, ?, datetime('now'))
             ON CONFLICT(user_id, key)
             DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
          )
          .bind(userId, key, value)
      );
    };
    if (partial.daily_goal_review !== undefined)         upsert('flashcard_daily_goal_review', String(partial.daily_goal_review));
    if (partial.mastered_hide_from_review !== undefined) upsert('flashcard_mastered_hide_from_review', partial.mastered_hide_from_review ? '1' : '0');
    if (partial.f1_max_attempts !== undefined)              upsert('f1_max_attempts', String(partial.f1_max_attempts));
    if (partial.f2_timer_seconds !== undefined)             upsert('f2_timer_seconds', String(partial.f2_timer_seconds));
    if (partial.f3_max_words_per_composition !== undefined) upsert('f3_max_words_per_composition', String(partial.f3_max_words_per_composition));
    if (partial.speed_timer_seconds !== undefined)          upsert('speed_timer_seconds', String(partial.speed_timer_seconds));
    if (partial.user_cefr_level !== undefined)              upsert('user_cefr_level', partial.user_cefr_level);
    if (partial.passage_tts_rate !== undefined)             upsert('passage_tts_rate', String(partial.passage_tts_rate));
    if (partial.passage_pre_fetch !== undefined)            upsert('passage_pre_fetch', partial.passage_pre_fetch ? '1' : '0');
    if (partial.autoplay_audio !== undefined)               upsert('autoplay_audio', partial.autoplay_audio ? '1' : '0');
    if (partial.voice_preference !== undefined)             upsert('voice_preference', partial.voice_preference);
    if (partial.theme !== undefined)                        upsert('theme', partial.theme);
    if (partial.pomodoro_work_minutes !== undefined)        upsert('pomodoro_work_minutes', String(partial.pomodoro_work_minutes));
    if (partial.pomodoro_break_minutes !== undefined)       upsert('pomodoro_break_minutes', String(partial.pomodoro_break_minutes));
    if (partial.reading_speed !== undefined)                upsert('reading_speed', String(partial.reading_speed));
    if (partial.reading_auto_continue !== undefined)        upsert('reading_auto_continue', partial.reading_auto_continue ? '1' : '0');
    // reading_deck_id: null means "clear" — store empty so the reader reverts to its fallback.
    if (partial.reading_deck_id !== undefined)              upsert('reading_deck_id', partial.reading_deck_id == null ? '' : String(partial.reading_deck_id));
    if (partial.session_review_limit !== undefined)         upsert('session_review_limit', String(partial.session_review_limit));
    if (partial.session_new_limit !== undefined)            upsert('session_new_limit', String(partial.session_new_limit));
    if (partial.reveal_read_count !== undefined)            upsert('reveal_read_count', String(partial.reveal_read_count));
    if (partial.reveal_read_gap_ms !== undefined)           upsert('reveal_read_gap_ms', String(partial.reveal_read_gap_ms));
    if (partial.word_tts_rate !== undefined)                upsert('word_tts_rate', String(partial.word_tts_rate));
    if (partial.speed_read_count !== undefined)             upsert('speed_read_count', String(partial.speed_read_count));
    if (partial.chunk_pause_ms !== undefined)               upsert('chunk_pause_ms', String(partial.chunk_pause_ms));
    if (partial.default_session_size !== undefined)         upsert('default_session_size', String(partial.default_session_size));
    if (partial.listening_enabled !== undefined)            upsert('listening_enabled', partial.listening_enabled ? '1' : '0');
    if (partial.listening_ratio !== undefined)              upsert('listening_ratio', String(partial.listening_ratio));
    if (partial.sentence_read_count !== undefined)          upsert('sentence_read_count', String(partial.sentence_read_count));
    if (stmts.length === 0) return;
    await db.batch(stmts);
  },
};

// ============================================================================
// Feedback (in-app góp ý popup)
// ============================================================================

export const feedbackDb = {
  /**
   * Insert one feedback row. `user_id` may be null if we ever support
   * anonymous submissions; today routes always pass a logged-in id (incl.
   * demo users). `created_at` is unix seconds — chosen to match
   * `demo_expires_at` and to keep server clocks unambiguous.
   */
  async create(input: {
    user_id: number | null;
    email: string | null;
    rating: number | null;
    content: string;
    page_url: string | null;
    user_agent: string | null;
    is_demo_user: boolean;
  }): Promise<number> {
    const db = await getDb();
    const nowSec = Math.floor(Date.now() / 1000);
    const result = await db
      .prepare(
        `INSERT INTO feedback (user_id, email, rating, content, page_url, user_agent, is_demo_user, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        input.user_id,
        input.email,
        input.rating,
        input.content,
        input.page_url,
        input.user_agent,
        input.is_demo_user ? 1 : 0,
        nowSec,
      )
      .run();
    return Number(result.meta.last_row_id);
  },

  async listRecent(limit = 100): Promise<Feedback[]> {
    const db = await getDb();
    const result = await db
      .prepare('SELECT * FROM feedback ORDER BY created_at DESC LIMIT ?')
      .bind(limit)
      .all<Record<string, unknown>>();
    return result.results.map((row) => ({
      ...(row as unknown as Feedback),
      is_demo_user: Number(row.is_demo_user) === 1,
    }));
  },
};
