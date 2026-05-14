import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardsDb, flashcardReviewsDb, getDb } from '@/lib/db';
import type { FlashcardStats } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await requireUserId();
    const db = await getDb();

    const counts = await flashcardsDb.countByStatus(userId);

    const dueRow = await db
      .prepare(
        `SELECT COUNT(*) as n FROM flashcards
         WHERE user_id = ?
         AND status != 'mastered'
         AND (next_review_at IS NULL OR next_review_at <= datetime('now'))`
      )
      .bind(userId)
      .first<{ n: number }>();
    const due_today = Number(dueRow?.n) || 0;

    const [reviews_today, streak_days, cards_per_day_last_30, retention_rate_7d] =
      await Promise.all([
        flashcardReviewsDb.getTodayCount(userId),
        flashcardReviewsDb.getStreakDays(userId),
        flashcardReviewsDb.getActivityLastDays(userId, 30),
        flashcardReviewsDb.getRetentionRate(userId, 7),
      ]);

    const stats: FlashcardStats = {
      total_cards: counts.new + counts.learning + counts.review + counts.mastered,
      new_count: counts.new,
      learning_count: counts.learning,
      review_count: counts.review,
      mastered_count: counts.mastered,
      due_today,
      reviews_today,
      streak_days,
      cards_per_day_last_30,
      retention_rate_7d,
    };
    return NextResponse.json(stats);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[stats] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
