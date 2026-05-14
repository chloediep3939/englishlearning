'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import type { CefrLevel, FlashcardSettings, LevelVerdict, Passage } from '@/lib/types';
import { apiJson } from '@/lib/common/api-json';

interface Props {
  passage: Passage;
  onAnalyzed: () => void | Promise<void>;
}

const VERDICT_COPY: Record<LevelVerdict, { label: string; color: string }> = {
  too_easy: { label: 'Quá dễ', color: 'var(--v-orange)' },
  just_right: { label: 'Phù hợp', color: 'var(--v-primary)' },
  too_hard: { label: 'Quá khó', color: 'var(--v-red)' },
};

export default function PassageStep2Difficulty({ passage, onAnalyzed }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [userLevel, setUserLevel] = useState<CefrLevel | null>(null);

  // Best-effort fetch of the learner's CEFR level for the inline label.
  // Non-blocking — if the call fails the link still works as a fallback.
  useEffect(() => {
    let cancelled = false;
    apiJson<FlashcardSettings>('/api/settings')
      .then((s) => {
        if (!cancelled && s.user_cefr_level) setUserLevel(s.user_cefr_level);
      })
      .catch(() => {/* fall back to no inline label */});
    return () => {
      cancelled = true;
    };
  }, []);

  const runAnalyze = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/passages/${passage.id}/analyze`, { method: 'POST' });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? 'Lỗi không xác định');
      }
      await onAnalyzed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi');
    } finally {
      setLoading(false);
    }
  }, [passage.id, onAnalyzed]);

  // Auto-fire on first mount when the passage hasn't been analysed yet.
  // We deliberately key off the *initial* level_estimate so re-renders from
  // the parent (after onAnalyzed flips the value) don't re-trigger us.
  const autoFiredRef = useRef(false);
  useEffect(() => {
    if (autoFiredRef.current) return;
    if (passage.level_estimate === null) {
      autoFiredRef.current = true;
      void runAnalyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || (passage.level_estimate === null && !error)) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Mascot pose="idle" size={120} bob />
        </div>
        <p style={{ color: 'var(--v-ink-soft)' }}>
          Bún đang đọc bài để chấm độ khó… (~5s)
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <p style={{ color: 'var(--v-red)', marginBottom: 16 }}>{error}</p>
        <button
          onClick={runAnalyze}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--v-radius-md)',
            background: 'var(--v-primary)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--v-font-body)',
            fontWeight: 700,
          }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  const verdict = passage.level_verdict ? VERDICT_COPY[passage.level_verdict] : null;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          style={{
            display: 'inline-block',
            fontSize: 64,
            fontWeight: 900,
            fontFamily: 'var(--v-font-head)',
            color: verdict?.color ?? 'var(--v-muted)',
            padding: '8px 32px',
            borderRadius: 'var(--v-radius-lg)',
            background: 'var(--v-panel)',
            boxShadow: 'var(--v-shadow-md)',
          }}
        >
          {passage.level_estimate}
        </div>
        {verdict && (
          <div
            style={{
              marginTop: 12,
              fontSize: 'var(--v-text-lg)',
              fontWeight: 700,
              color: verdict.color,
              fontFamily: 'var(--v-font-head)',
            }}
          >
            {verdict.label} với bạn
          </div>
        )}
      </div>

      {passage.level_suggestion && (
        <div
          style={{
            background: 'var(--v-panel)',
            padding: 16,
            borderRadius: 'var(--v-radius-md)',
            marginBottom: 16,
            boxShadow: 'var(--v-shadow-sm)',
          }}
        >
          <p style={{ color: 'var(--v-ink)', margin: 0, lineHeight: 1.6 }}>
            {passage.level_suggestion}
          </p>
        </div>
      )}

      <div
        style={{
          fontSize: 'var(--v-text-sm)',
          color: 'var(--v-ink-soft)',
          marginBottom: 24,
          textAlign: 'center',
        }}
      >
        Trình độ của bạn:{' '}
        <strong style={{ color: 'var(--v-ink)' }}>{userLevel ?? '(đọc trong cài đặt)'}</strong>
        {' · '}
        <Link
          href="/settings"
          style={{ color: 'var(--v-primary)', textDecoration: 'underline' }}
        >
          Đổi
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button
          onClick={runAnalyze}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 'var(--v-radius-md)',
            background: 'var(--v-panel)',
            border: '1px solid var(--v-border)',
            color: 'var(--v-ink-soft)',
            cursor: 'pointer',
            fontFamily: 'var(--v-font-body)',
            fontWeight: 600,
          }}
        >
          <RefreshCw size={16} /> Đánh giá lại
        </button>
      </div>
    </div>
  );
}
