'use client';

import Link from 'next/link';
import { RotateCcw, ArrowRight } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import StatTile from './StatTile';
import SparkleBurst from './SparkleBurst';

export interface QuestionResult {
  card_id: number;
  passed: boolean;
  timed_out: boolean;
  time_ms: number;
}

interface Props {
  accuracy: number;
  correct: number;
  wrong: number;
  timedOutCount: number;
  streak: number;
  results: QuestionResult[];
  showSparkles: boolean;
  onRestart: () => void;
}

/**
 * Post-session summary card for the speed quiz. Shows 4 stat tiles, a
 * per-question speed bar chart, optional sparkle burst when accuracy is
 * high, and Làm lại / Về dashboard CTAs.
 */
export default function SummaryScreen({
  accuracy,
  correct,
  wrong,
  timedOutCount,
  streak,
  results,
  showSparkles,
  onRestart,
}: Props) {
  const maxTime = Math.max(...results.map((r) => r.time_ms), 1);

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
      <Mascot pose={accuracy >= 70 ? 'happy' : 'idle'} size={120} bob />

      <div style={{ position: 'relative', display: 'inline-block', margin: '12px 0 18px' }}>
        {showSparkles && <SparkleBurst />}
        <h2
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-3xl)',
            margin: 0,
            color: 'var(--v-ink)',
            position: 'relative',
          }}
        >
          🎉 Xong rồi!
        </h2>
      </div>

      {/* 4 stat tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 10,
          marginBottom: 20,
          maxWidth: 560,
          margin: '0 auto 20px',
        }}
      >
        <StatTile label="Đúng" value={correct} color="var(--v-primary)" />
        <StatTile label="Sai" value={wrong} color="var(--v-red)" />
        <StatTile label="Hết giờ" value={timedOutCount} color="var(--v-orange)" />
        <StatTile label="Chuỗi dài nhất" value={streak} color="var(--v-blue)" />
      </div>

      {/* Per-question speed bars */}
      {results.length > 0 && (
        <div
          style={{
            textAlign: 'left',
            background: 'var(--v-panel)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-md)',
            padding: 16,
            marginBottom: 20,
            maxWidth: 560,
            margin: '0 auto 20px',
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
              marginBottom: 10,
            }}
          >
            Tốc độ trả lời
          </div>
          {results.map((r, i) => {
            const seconds = r.time_ms / 1000;
            const pct = (r.time_ms / maxTime) * 100;
            // Red if wrong OR timed out, primary otherwise.
            const barColor = r.passed ? 'var(--v-primary)' : 'var(--v-red)';
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    width: 50,
                    fontSize: 'var(--v-text-sm)',
                    color: 'var(--v-ink-soft)',
                    fontFamily: 'var(--v-font-body)',
                  }}
                >
                  Câu {i + 1}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    background: 'var(--v-border)',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: barColor,
                      borderRadius: 4,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <span
                  style={{
                    width: 44,
                    fontSize: 'var(--v-text-xs)',
                    color: 'var(--v-ink-soft)',
                    fontFamily: 'var(--v-font-mono)',
                    textAlign: 'right',
                  }}
                >
                  {seconds.toFixed(1)}s
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onRestart}
          style={{
            padding: '11px 20px',
            background: 'var(--v-yellow)',
            color: 'var(--v-ink)',
            border: 'none',
            borderRadius: 'var(--v-radius-md)',
            boxShadow: 'var(--v-press), 0 6px 14px rgba(255,209,67,0.5)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-base)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={14} /> LÀM LẠI
        </button>
        <Link
          href="/dashboard"
          style={{
            padding: '11px 20px',
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
