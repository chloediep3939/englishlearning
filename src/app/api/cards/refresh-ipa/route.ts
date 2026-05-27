import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { getDb } from '@/lib/db';
import { lookupCmuIpa } from '@/lib/flashcards/cmu-ipa';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One-shot bulk refresh: rewrite the `ipa` column for every flashcard of
 * the current user using the bundled CMU Pronouncing Dictionary. Cards
 * whose `english` headword isn't in CMU (proper nouns, slang, brand new
 * vocab, most multi-word phrases) are left alone — their existing IPA
 * isn't overwritten with null. Cards where CMU already matches the
 * current IPA are also skipped (no `updated_at` churn for nothing).
 *
 * Scoped strictly by `user_id` — multi-tenant safe.
 *
 * Updates are run as a single D1 batch when ≤500 changes, or chunked
 * batches otherwise. D1's batch is atomic per Cloudflare docs.
 */
export async function POST() {
  try {
    const userId = await requireUserId();
    const db = await getDb();

    const rows = await db
      .prepare(
        'SELECT id, english, ipa FROM flashcards WHERE user_id = ? ORDER BY id ASC',
      )
      .bind(userId)
      .all<{ id: number; english: string; ipa: string | null }>();
    const cards = rows.results;

    const updates: ReturnType<typeof db.prepare>[] = [];
    let unchanged = 0;
    let missing = 0;

    for (const card of cards) {
      const newIpa = await lookupCmuIpa(card.english);
      if (!newIpa) {
        missing++;
        continue;
      }
      if (newIpa === card.ipa) {
        unchanged++;
        continue;
      }
      updates.push(
        db
          .prepare(
            "UPDATE flashcards SET ipa = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
          )
          .bind(newIpa, card.id, userId),
      );
    }

    // Chunk batches to keep each below D1's per-batch statement limit.
    const CHUNK = 100;
    for (let i = 0; i < updates.length; i += CHUNK) {
      await db.batch(updates.slice(i, i + CHUNK));
    }

    return NextResponse.json({
      total: cards.length,
      updated: updates.length,
      unchanged,
      missing,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[refresh-ipa] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
