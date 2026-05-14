// Demo account seeding. Called once by POST /api/auth/demo right after
// usersDb.createDemo() returns. Inserts:
//   • One default deck per DEMO_DECKS entry
//   • All cards inside each deck
//   • Cloze pool entries for every card (gated by countByWord to avoid
//     duplicating shared pool rows when re-seeding the same words)
//   • A few "already studied" review rows + status updates so the dashboard
//     doesn't look empty
//   • Two sample passages
//   • The same default settings rows a fresh Google-OAuth user gets
//
// Everything except the cloze-pool bulkInsert runs in a single d1 .batch()
// so the demo user either lands on a fully-populated home page or the route
// rolls back via usersDb.deleteById().

import { getDb, flashcardDecksDb, flashcardClozePoolDb } from '@/lib/db';
import { DEMO_DECKS, DEMO_PASSAGES, DEMO_SEED_HISTORY } from './seed-data';

function isoDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

function isoDaysFromNow(daysFromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

export async function seedDemoUser(userId: number): Promise<void> {
  const db = await getDb();

  // ── 1. Decks + ensure-default ────────────────────────────────────────────
  // The first deck doubles as the user's default deck so flashcardsDb.create
  // calls elsewhere have a target. We mark it directly here instead of
  // calling ensureDefault() (which would create a separate "Mặc định" deck).
  const deckIds: number[] = [];
  for (let i = 0; i < DEMO_DECKS.length; i++) {
    const deck = DEMO_DECKS[i];
    const id = await flashcardDecksDb.create(userId, {
      name: deck.name,
      description: deck.description,
      color: deck.color,
      icon: deck.icon,
      subtitle: deck.subtitle,
    });
    deckIds.push(id);
  }
  // Flip the first seeded deck to is_default so future card creates land in it.
  if (deckIds.length > 0) {
    await db
      .prepare('UPDATE flashcard_decks SET is_default = 1 WHERE id = ? AND user_id = ?')
      .bind(deckIds[0], userId)
      .run();
  }

  // ── 2. Cards ─────────────────────────────────────────────────────────────
  // Track card IDs in the same shape as DEMO_DECKS so DEMO_SEED_HISTORY can
  // address them by (deckIdx, cardIdx).
  const cardIds: number[][] = [];
  for (let d = 0; d < DEMO_DECKS.length; d++) {
    const deck = DEMO_DECKS[d];
    const ids: number[] = [];
    for (const card of deck.cards) {
      const result = await db
        .prepare(
          `INSERT INTO flashcards (
             user_id, deck_id, english, vietnamese, ipa, part_of_speech, audio_url,
             examples, image_url, image_attribution, notes, collocations,
             status, source_passage_id, source_context
           ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, NULL, ?, 'new', NULL, NULL)`
        )
        .bind(
          userId,
          deckIds[d],
          card.english,
          card.vn_meaning,
          card.ipa,
          card.part_of_speech,
          card.audio_url,
          card.image_url,
          // collocations: stored as JSON array of {phrase} objects matching FlashcardCollocation
          JSON.stringify(card.collocations.map((phrase) => ({ phrase }))),
        )
        .run();
      ids.push(Number(result.meta.last_row_id));
    }
    cardIds.push(ids);
  }

  // ── 3. Cloze pool — shared across users, gated by word count ─────────────
  // Seed once per word: if another demo user already filled this word's
  // pool we skip the insert to avoid duplicates.
  for (const deck of DEMO_DECKS) {
    for (const card of deck.cards) {
      const existing = await flashcardClozePoolDb.countByWord(card.english);
      if (existing === 0) {
        await flashcardClozePoolDb.bulkInsert(
          card.english,
          card.cloze_sentences.map((s) => ({
            word: card.english.toLowerCase(),
            pos: s.pos ?? null,
            sentence: s.sentence,
            blank_word: s.blank_word,
            difficulty: s.difficulty ?? null,
          })),
        );
      }
    }
  }

  // ── 4. Fake review history ───────────────────────────────────────────────
  // For each entry in DEMO_SEED_HISTORY:
  //   • learning → 1 review row dated yesterday, quality 4, interval 1 day
  //   • review   → 2 review rows (yesterday + today), quality 4 then 5,
  //                final interval 3 days
  const yesterdayIso = isoDaysAgo(1);
  const todayIso = isoDaysAgo(0);
  for (const h of DEMO_SEED_HISTORY) {
    const cardId = cardIds[h.deckIdx]?.[h.cardIdx];
    if (!cardId) continue;

    if (h.status === 'learning') {
      await db
        .prepare(
          `INSERT INTO flashcard_reviews (flashcard_id, user_id, quality, prev_interval, new_interval, reviewed_at)
           VALUES (?, ?, 4, 0, 1, ?)`
        )
        .bind(cardId, userId, yesterdayIso)
        .run();
      await db
        .prepare(
          `UPDATE flashcards
           SET status = 'learning',
               repetitions = 1,
               interval_days = 1,
               ease_factor = 2.5,
               last_reviewed_at = ?,
               next_review_at = ?,
               updated_at = datetime('now')
           WHERE id = ? AND user_id = ?`
        )
        .bind(yesterdayIso, todayIso, cardId, userId)
        .run();
    } else {
      // review status — two history rows, second one today
      await db
        .prepare(
          `INSERT INTO flashcard_reviews (flashcard_id, user_id, quality, prev_interval, new_interval, reviewed_at)
           VALUES (?, ?, 4, 0, 1, ?)`
        )
        .bind(cardId, userId, yesterdayIso)
        .run();
      await db
        .prepare(
          `INSERT INTO flashcard_reviews (flashcard_id, user_id, quality, prev_interval, new_interval, reviewed_at)
           VALUES (?, ?, 5, 1, 3, ?)`
        )
        .bind(cardId, userId, todayIso)
        .run();
      const nextReview = isoDaysFromNow(3);
      await db
        .prepare(
          `UPDATE flashcards
           SET status = 'review',
               repetitions = 2,
               interval_days = 3,
               ease_factor = 2.6,
               last_reviewed_at = ?,
               next_review_at = ?,
               updated_at = datetime('now')
           WHERE id = ? AND user_id = ?`
        )
        .bind(todayIso, nextReview, cardId, userId)
        .run();
    }
  }

  // ── 5. Sample passages ───────────────────────────────────────────────────
  for (const p of DEMO_PASSAGES) {
    const charCount = p.content.length;
    const wordCount = p.content.split(/\s+/).filter(Boolean).length;
    await db
      .prepare(
        `INSERT INTO passages (user_id, title, content, source_label, source_url, char_count, word_count)
         VALUES (?, ?, ?, ?, NULL, ?, ?)`
      )
      .bind(userId, p.title, p.content, p.source_label, charCount, wordCount)
      .run();
  }

  // ── 6. Default user_settings rows (matches Google-OAuth bootstrap) ───────
  await db.batch([
    db.prepare(`INSERT INTO user_settings (user_id, key, value) VALUES (?, 'flashcard_daily_goal_new', '10')`).bind(userId),
    db.prepare(`INSERT INTO user_settings (user_id, key, value) VALUES (?, 'flashcard_daily_goal_review', '50')`).bind(userId),
    db.prepare(`INSERT INTO user_settings (user_id, key, value) VALUES (?, 'flashcard_reminder_time', '20:00')`).bind(userId),
    db.prepare(`INSERT INTO user_settings (user_id, key, value) VALUES (?, 'flashcard_reminder_enabled', '0')`).bind(userId),
    db.prepare(`INSERT INTO user_settings (user_id, key, value) VALUES (?, 'flashcard_mastered_hide_from_review', '1')`).bind(userId),
    db.prepare(`INSERT INTO user_settings (user_id, key, value) VALUES (?, 'flashcard_daily_new_limit', '10')`).bind(userId),
  ]);
}
