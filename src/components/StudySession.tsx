'use client';

import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import FlashcardSession from './flashcard-session/FlashcardSession';
import type { SessionConfig, Quality } from './flashcard-session/types';
import type { Flashcard } from '@/lib/types';

interface Props {
  cards: Flashcard[];
}

/**
 * Study session — the typed-recall flow for newly-introduced cards. Same
 * underlying mechanics as Review; differences are page-flavored (blue→green
 * gradient for the "new → learned" arc, "first encounter" eyebrow copy,
 * learned-count summary, and no requeue-on-fail because Study historically
 * lets the user move on after one attempt).
 */
export default function StudySession({ cards }: Props) {
  const config: SessionConfig = {
    progressGradient: 'linear-gradient(90deg, var(--v-blue), var(--v-primary))',
    promptEyebrow: 'Từ mới — thử đoán nhé',
    inputPlaceholder: 'Gõ tiếng Anh — đoán cũng được',
    ratingRowLabel: 'Mức độ nhớ?',
    requeueOnFail: false,
    renderSummary: ({ total, ratings, startedAt }) => (
      <StudySummary total={total} ratings={ratings} startedAt={startedAt} />
    ),
  };

  return <FlashcardSession cards={cards} config={config} />;
}

function StudySummary({
  total, ratings, startedAt,
}: {
  total: number;
  ratings: Quality[];
  startedAt: number;
}) {
  const learned = ratings.filter((q) => q !== 0).length;
  const elapsedMs = Date.now() - startedAt;
  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const pose = learned > 0 ? 'happy' : 'idle';

  if (total === 0) {
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
        Hoàn thành! 🎉
      </h2>
      <p
        style={{
          color: 'var(--v-muted)',
          marginBottom: 20,
          fontSize: 'var(--v-text-md)',
        }}
      >
        Bún đã cùng bạn học {learned}/{total} từ trong {minutes}m {seconds}s. Mai gặp lại để ôn nha!
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          href="/review"
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
          ÔN LUÔN <ArrowRight size={14} />
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
          Về dashboard
        </Link>
      </div>
    </div>
  );
}
