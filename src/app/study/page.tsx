export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import StudySession from '@/components/StudySession';
import { requireUserId } from '@/lib/current-user';
import { flashcardsDb, userSettingsDb } from '@/lib/db';

export default async function StudyPage() {
  const userId = await requireUserId();
  const settings = await userSettingsDb.getFlashcardSettings(userId);
  const cards = await flashcardsDb.getNewForToday(userId, settings.daily_new_limit);

  return (
    <div>
      <Link
        href="/"
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
          margin: '0 0 6px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: 'var(--v-ink)',
        }}
      >
        <BookOpen size={24} style={{ color: 'var(--v-blue)' }} /> Học hôm nay
      </h1>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 24px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
        }}
      >
        Tối đa {settings.daily_new_limit} từ mới mỗi ngày. Đọc kỹ rồi tự đánh giá độ thuộc.
      </p>

      <StudySession cards={cards} />
    </div>
  );
}
