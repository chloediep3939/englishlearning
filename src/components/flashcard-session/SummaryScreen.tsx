'use client';

import Link from 'next/link';
import { ArrowRight, RotateCcw } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import type { Quality } from './types';

interface Props {
  initialCount: number;
  masteredCount: number;
  qualityCounts: Record<Quality, number>;
  startedAt: number;
  onAnotherSession: () => void;
}

/**
 * Post-session completion screen. Shared between Study and Review since
 * the new picker→loop flow makes the two routes structurally identical.
 *
 * Stats shown: how many cards were mastered this session (q≥4 reached),
 * elapsed time, and per-quality click counts so the learner can see at a
 * glance how many "LẠI" attempts it took. "Học thêm phiên nữa" loops
 * back to the picker — the parent re-fetches candidates (some Tốt/Dễ'd
 * cards may now have their next_review_at pushed into the future, so
 * they'll be filtered out).
 */
export default function SummaryScreen({
  initialCount, masteredCount, qualityCounts, startedAt, onAnotherSession,
}: Props) {
  const elapsedMs = Date.now() - startedAt;
  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;

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
      <Mascot pose="happy" size={120} bob />
      <h2
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-3xl)',
          margin: '12px 0 8px',
          color: 'var(--v-ink)',
        }}
      >
        Hoàn tất phiên!
      </h2>
      <p
        style={{
          color: 'var(--v-muted)',
          marginBottom: 22,
          fontSize: 'var(--v-text-md)',
        }}
      >
        Bún đã cùng bạn nhớ {masteredCount} / {initialCount} từ trong {minutes}m {seconds}s.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: 8,
          marginBottom: 22,
          maxWidth: 520,
          margin: '0 auto 22px',
        }}
      >
        <QualityStat
          label="Lại"
          emoji="😵"
          value={qualityCounts[0]}
          color="var(--v-red)"
          soft="var(--v-red-soft)"
        />
        <QualityStat
          label="Khó"
          emoji="😬"
          value={qualityCounts[2]}
          color="var(--v-orange)"
          soft="var(--v-orange-soft)"
        />
        <QualityStat
          label="Tốt"
          emoji="😊"
          value={qualityCounts[4]}
          color="var(--v-primary)"
          soft="var(--v-primary-soft)"
        />
        <QualityStat
          label="Dễ"
          emoji="🎉"
          value={qualityCounts[5]}
          color="var(--v-blue)"
          soft="var(--v-blue-soft)"
        />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onAnotherSession}
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
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={14} /> HỌC THÊM PHIÊN NỮA
        </button>
        <Link
          href="/dashboard"
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

function QualityStat({
  label, emoji, value, color, soft,
}: {
  label: string;
  emoji: string;
  value: number;
  color: string;
  soft: string;
}) {
  return (
    <div
      style={{
        padding: '10px 8px',
        background: soft,
        border: `1px solid ${color}`,
        borderRadius: 'var(--v-radius-md)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{emoji}</span>
      <div
        style={{
          fontFamily: 'var(--v-font-head)',
          fontSize: 'var(--v-text-2xl)',
          fontWeight: 900,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-xs)',
          fontWeight: 800,
          color: 'var(--v-muted)',
          letterSpacing: 'var(--v-tracking-wide)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  );
}
