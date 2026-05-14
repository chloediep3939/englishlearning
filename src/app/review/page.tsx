export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowLeft, RotateCcw, Plus, ArrowRight } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import SessionFlow from '@/components/flashcard-session/SessionFlow';
import { requireUserId } from '@/lib/current-user';
import { flashcardsDb, userSettingsDb } from '@/lib/db';

export default async function ReviewPage() {
  const userId = await requireUserId();
  const settings = await userSettingsDb.getFlashcardSettings(userId);
  const cards = await flashcardsDb.getDueForReview(userId, 50, settings.mastered_hide_from_review);

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
        <RotateCcw size={24} style={{ color: 'var(--v-stage-review)' }} /> Ôn tập
      </h1>
      <p
        style={{
          color: 'var(--v-muted)',
          margin: '0 0 24px',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
        }}
      >
        Gõ lại nghĩa tiếng Anh, mình sẽ chấm và gợi ý độ thuộc cho bạn.
      </p>

      {cards.length === 0 ? <ReviewEmpty /> : <SessionFlow mode="review" initialCards={cards} />}
    </div>
  );
}

function ReviewEmpty() {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '2.5rem 1rem',
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-lg)',
        boxShadow: 'var(--v-shadow-md)',
      }}
    >
      <Mascot pose="sleep" size={120} />
      <h2
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-2xl)',
          margin: '12px 0 8px',
          color: 'var(--v-ink)',
        }}
      >
        Bún đang ngủ — hôm nay chưa có thẻ nào cần ôn tập 💤
      </h2>
      <p style={{ color: 'var(--v-muted)', marginBottom: 20, fontSize: 'var(--v-text-md)' }}>
        Bạn có thể thêm thẻ mới hoặc quay lại sau.
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          href="/add"
          style={{
            padding: '11px 18px',
            background: 'var(--v-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--v-radius-md)',
            boxShadow: 'var(--v-press), 0 6px 14px rgba(122,193,67,0.4)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-base)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Plus size={14} /> THÊM THẺ
        </Link>
        <Link
          href="/"
          style={{
            padding: '10px 18px',
            background: 'var(--v-surface)',
            color: 'var(--v-ink-soft)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            boxShadow: 'var(--v-shadow-sm)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 'var(--v-text-md)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Về dashboard <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
