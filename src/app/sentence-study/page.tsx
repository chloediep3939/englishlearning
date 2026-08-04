export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowLeft, NotebookPen } from 'lucide-react';
import SentenceStudyClient from '@/components/sentence-study/SentenceStudyClient';
import { requireUserId } from '@/lib/current-user';
import { flashcardDecksDb, userSettingsDb } from '@/lib/db';

/**
 * "Học câu" entry — SRS drill over example sentences (VI → typed EN).
 * Thin server shell like /study: deck list + settings defaults;
 * SentenceStudyClient owns the setup → session state machine.
 */
export default async function SentenceStudyPage() {
  const userId = await requireUserId();
  const settings = await userSettingsDb.getFlashcardSettings(userId);
  const decks = await flashcardDecksDb.getAllWithCounts(userId);

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
          margin: '0 0 6px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: 'var(--v-ink)',
        }}
      >
        <NotebookPen size={24} style={{ color: 'var(--v-teal)' }} /> Học câu
      </h1>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 24px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
        }}
      >
        Nhìn nghĩa tiếng Việt của câu ví dụ → gõ lại nguyên câu tiếng Anh. Lịch ôn từng câu tự điều chỉnh như học từ.
      </p>

      <SentenceStudyClient
        decks={decks}
        defaultReviewLimit={settings.session_review_limit}
        defaultNewLimit={settings.session_new_limit}
      />
    </div>
  );
}
