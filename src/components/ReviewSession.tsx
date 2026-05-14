'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import FlashcardSession from './flashcard-session/FlashcardSession';
import type { SessionConfig, Quality } from './flashcard-session/types';
import type { Flashcard } from '@/lib/types';

interface Props {
  cards: Flashcard[];
}

/**
 * Review session — the typed-recall flow for due cards. Defers all
 * mechanics to FlashcardSession; this file is the page-flavored config
 * (eyebrow copy, gradient, summary). Kept as a thin wrapper rather than
 * a config object literal so the page imports `<ReviewSession />` as
 * before and the file stays grep-able by name.
 */
export default function ReviewSession({ cards }: Props) {
  const config: SessionConfig = {
    progressGradient: 'linear-gradient(90deg, var(--v-primary), var(--v-primary-deep))',
    promptEyebrow: 'Hãy dịch giúp mình',
    inputPlaceholder: 'Gõ tiếng Anh…',
    ratingRowLabel: 'Bạn thấy thế nào?',
    requeueOnFail: true,
    renderSummary: ({ total, ratings, startedAt }) => (
      <ReviewSummary total={total} ratings={ratings} startedAt={startedAt} />
    ),
  };

  return <FlashcardSession cards={cards} config={config} />;
}

function ReviewSummary({
  total, ratings, startedAt,
}: {
  total: number;
  ratings: Quality[];
  startedAt: number;
}) {
  const good = ratings.filter((q) => q >= 4).length;
  const hard = ratings.filter((q) => q < 4).length;
  const elapsedMs = Date.now() - startedAt;
  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const ratio = total > 0 ? good / total : 0;
  const pose = ratio >= 0.6 ? 'happy' : 'idle';

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
      <Mascot pose={pose} size={120} bob />
      <h2
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-3xl)',
          margin: '12px 0 18px',
          color: 'var(--v-ink)',
        }}
      >
        {ratio >= 0.6 ? 'Tuyệt vời!' : 'Xong rồi! 🎉'}
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 22,
        }}
      >
        <Stat label="Tổng số thẻ" value={String(total)} color="var(--v-ink)" />
        <Stat label="Nhớ tốt" value={String(good)} color="var(--v-primary)" />
        <Stat label="Cần luyện" value={String(hard)} color="var(--v-orange)" />
        <Stat label="Thời gian" value={`${minutes}m ${seconds}s`} color="var(--v-blue)" />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          href="/study"
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
          <BookOpen size={14} /> HỌC THÊM
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

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        padding: 14,
        background: 'var(--v-panel)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-md)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-xs)',
          fontWeight: 800,
          color: 'var(--v-muted)',
          letterSpacing: 'var(--v-tracking-wider)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-head)',
          fontSize: 'var(--v-text-2xl)',
          fontWeight: 900,
          color,
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  );
}
