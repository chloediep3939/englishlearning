export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import StatsCharts from '@/components/StatsCharts';
import { requireUserId } from '@/lib/current-user';
import { flashcardsDb, flashcardReviewsDb, getDb } from '@/lib/db';
import type { FlashcardStats } from '@/lib/types';

export default async function StatsPage() {
  const userId = await requireUserId();
  const db = await getDb();

  const counts = await flashcardsDb.countByStatus(userId);
  const dueRow = await db
    .prepare(
      `SELECT COUNT(*) as n FROM flashcards
       WHERE user_id = ? AND status != 'mastered'
       AND (next_review_at IS NULL OR next_review_at <= datetime('now'))`
    )
    .bind(userId)
    .first<{ n: number }>();

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
    due_today: Number(dueRow?.n) || 0,
    reviews_today,
    streak_days,
    cards_per_day_last_30,
    retention_rate_7d,
  };

  return (
    <div>
      <Link
        href="/dashboard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 'var(--v-text-sm)',
          color: 'var(--v-muted)',
          textDecoration: 'none',
          marginBottom: 12,
        }}
      >
        <ArrowLeft size={14} /> Dashboard
      </Link>

      <h1
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-3xl)',
          letterSpacing: 'var(--v-tracking-tight)',
          margin: '0 0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: 'var(--v-ink)',
        }}
      >
        <BarChart3 size={24} style={{ color: 'var(--v-primary)' }} /> Thống kê
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 18,
        }}
      >
        <Tile value={stats.total_cards}     label="Tổng từ"     color="var(--v-ink)" />
        <Tile value={stats.new_count}        label="Mới"         color="var(--v-blue)" />
        <Tile value={stats.learning_count}   label="Đang học"    color="var(--v-orange)" />
        <Tile value={stats.review_count}     label="Đang ôn"     color="var(--v-primary)" />
        <Tile value={stats.mastered_count}   label="Master"      color="var(--v-purple)" />
        <Tile value={stats.due_today}        label="Đến hạn"     color="var(--v-red)" />
      </div>

      <StatsCharts stats={stats} />
    </div>
  );
}

function Tile({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div
      style={{
        padding: 14,
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-md)',
        boxShadow: 'var(--v-shadow-sm)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-xs)',
          fontWeight: 800,
          color: 'var(--v-muted)',
          letterSpacing: 'var(--v-tracking-wide)',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-3xl)',
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}
