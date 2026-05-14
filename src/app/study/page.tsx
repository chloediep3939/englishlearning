export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowLeft, BookOpen, ArrowRight, Plus } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import SessionFlow from '@/components/flashcard-session/SessionFlow';
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
        Tối đa {settings.daily_new_limit} từ mới mỗi ngày. Chọn từ rồi tự đánh giá độ thuộc.
      </p>

      {cards.length === 0 ? <StudyEmpty /> : <SessionFlow mode="study" initialCards={cards} />}
    </div>
  );
}

function StudyEmpty() {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '2.5rem 1rem',
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-lg)',
        boxShadow: 'var(--v-shadow-md)',
        maxWidth: 640,
        margin: '0 auto',
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
        Hôm nay chưa có từ mới
      </h2>
      <p style={{ color: 'var(--v-muted)', marginBottom: 20, fontSize: 'var(--v-text-md)' }}>
        Bún ngủ trưa thôi — bạn thêm vài từ rồi quay lại nha.
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
          <Plus size={14} /> THÊM TỪ
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
