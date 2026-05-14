'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Zap, RotateCcw, ArrowRight, Check, X } from 'lucide-react';
import Mascot from './Mascot';
import AudioButton from './AudioButton';
import type { SpeedQuizQuestion, SpeedQuizMode } from '@/lib/types';

interface Props {
  questions: SpeedQuizQuestion[];
  mode: SpeedQuizMode;
  onRestart: () => void;
}

const TIME_PER_Q_MS = 8000;
const OPTION_COLORS = ['var(--v-pink)', 'var(--v-primary)', 'var(--v-purple)', 'var(--v-blue)'];

export default function SpeedQuizSession({ questions, mode, onRestart }: Props) {
  const [position, setPosition] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [results, setResults] = useState<{ card_id: number; passed: boolean }[]>([]);
  const [startTime] = useState(() => Date.now());
  const [questionStart, setQuestionStart] = useState(() => Date.now());
  const [done, setDone] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = questions[position];
  const isLast = position + 1 >= questions.length;
  const showFeedback = selectedIdx !== null || timedOut;

  const advance = useCallback(
    async (idx: number | null) => {
      if (!current) return;
      const passed = idx !== null && idx === current.correct_index;
      const timeMs = Date.now() - questionStart;

      if (passed) setCorrect((c) => c + 1);
      setResults((r) => [...r, { card_id: current.card_id, passed }]);

      // Log to /api/cards/:id/test-attempt (fire & forget)
      void fetch(`/api/cards/${current.card_id}/test-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'speed',
          passed,
          time_ms: timeMs,
          metadata: { quiz_mode: mode, selected_idx: idx, timed_out: idx === null },
        }),
      }).catch(() => {});

      // Show feedback briefly, then next
      await new Promise((r) => setTimeout(r, 700));

      if (isLast) {
        setDone(true);
      } else {
        setPosition((p) => p + 1);
        setSelectedIdx(null);
        setTimedOut(false);
        setQuestionStart(Date.now());
      }
    },
    [current, isLast, questionStart, mode]
  );

  // Auto-timeout
  useEffect(() => {
    if (done || showFeedback) return;
    timeoutRef.current = setTimeout(() => {
      setTimedOut(true);
      void advance(null);
    }, TIME_PER_Q_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [position, done, showFeedback, advance]);

  // Keyboard: 1-4 to pick
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done || showFeedback) return;
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx !== -1 && current && idx < current.options.length) {
        setSelectedIdx(idx);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        void advance(idx);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, done, showFeedback, advance]);

  if (done) {
    const total = questions.length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const message =
      accuracy >= 90 ? 'Tuyệt vời! 🎉' : accuracy >= 70 ? 'Khá tốt! 👍' : accuracy >= 50 ? 'Cố gắng nha!' : 'Đừng nản, ôn lại thôi 💪';

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
        <h2
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-3xl)',
            margin: '12px 0 6px',
            color: 'var(--v-ink)',
          }}
        >
          {message}
        </h2>
        <div
          style={{
            fontFamily: 'var(--v-font-head)',
            fontSize: 64,
            fontWeight: 900,
            color: 'var(--v-yellow-deep)',
            margin: '8px 0',
            lineHeight: 1,
            textShadow: '0 2px 0 var(--v-yellow)',
          }}
        >
          {accuracy}%
        </div>
        <p style={{ color: 'var(--v-muted)', fontSize: 'var(--v-text-md)', marginBottom: 20 }}>
          {correct} / {total} đúng · {elapsed}s
        </p>
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
            <RotateCcw size={14} /> LẦN NỮA
          </button>
          <Link
            href="/"
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

  if (!current) return null;

  return (
    <div>
      {/* Session counter (text eyebrow only — the per-question timer is the
          dominant progress bar, no need for a second one). */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 'var(--v-text-xs)',
          color: 'var(--v-muted)',
          fontFamily: 'var(--v-font-head)',
          fontWeight: 800,
          letterSpacing: 'var(--v-tracking-wide)',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        <span>
          <Zap size={12} style={{ display: 'inline', verticalAlign: -2, color: 'var(--v-yellow)' }} /> {position + 1} / {questions.length}
        </span>
        <span style={{ color: 'var(--v-primary)' }}>{correct} đúng</span>
      </div>

      {/* Prompt card */}
      <div
        style={{
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-lg)',
          boxShadow: 'var(--v-shadow-md)',
          padding: 24,
          marginBottom: 16,
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Timer ring */}
        <TimerBar key={position} duration={TIME_PER_Q_MS} paused={showFeedback} />

        <div
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: current.question_mode === 'vi_to_en' ? 'var(--v-text-3xl)' : 'var(--v-text-5xl)',
            letterSpacing: 'var(--v-tracking-tight)',
            color: 'var(--v-ink)',
            lineHeight: 1.1,
            position: 'relative',
            display: 'inline-block',
            padding: '8px 4px',
          }}
        >
          {current.prompt}
          {(current.question_mode === 'en_to_vi' || current.question_mode === 'spelling') && (
            <span
              style={{
                position: 'absolute',
                left: 4,
                right: 4,
                bottom: 4,
                height: 12,
                background: 'var(--v-yellow)',
                opacity: 0.45,
                zIndex: -1,
                borderRadius: 4,
              }}
              aria-hidden
            />
          )}
        </div>

        {current.show_ipa && current.prompt_ipa && (
          <div
            style={{
              fontFamily: 'var(--v-font-mono)',
              fontSize: 'var(--v-text-base)',
              color: 'var(--v-accent)',
              marginTop: 6,
            }}
          >
            {current.prompt_ipa}
          </div>
        )}

        {current.show_audio && (
          <div style={{ marginTop: 10 }}>
            <AudioButton audioUrl={current.prompt_audio} fallbackText={current.prompt} size={40} />
          </div>
        )}
      </div>

      {/* Options 2x2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {current.options.map((opt, idx) => {
          const isCorrect = idx === current.correct_index;
          const isSelected = idx === selectedIdx;
          const reveal = showFeedback;
          let bg = 'var(--v-surface)';
          let color = 'var(--v-ink)';
          let border = `2px solid ${OPTION_COLORS[idx]}`;
          let shadow = 'var(--v-shadow-sm)';
          if (reveal && isCorrect) {
            bg = 'var(--v-primary)';
            color = '#fff';
            border = 'none';
            shadow = 'var(--v-press), 0 4px 10px rgba(122,193,67,0.4)';
          } else if (reveal && isSelected && !isCorrect) {
            bg = 'var(--v-red)';
            color = '#fff';
            border = 'none';
            shadow = 'var(--v-press), 0 4px 10px rgba(255,87,87,0.4)';
          } else if (reveal) {
            bg = 'var(--v-panel)';
            color = 'var(--v-muted)';
            border = '2px solid var(--v-border)';
            shadow = 'none';
          }
          return (
            <button
              key={idx}
              type="button"
              disabled={showFeedback}
              onClick={() => {
                if (showFeedback) return;
                setSelectedIdx(idx);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                void advance(idx);
              }}
              style={{
                position: 'relative',
                padding: '18px 14px',
                background: bg,
                color,
                border,
                borderRadius: 'var(--v-radius-md)',
                boxShadow: shadow,
                fontFamily: 'var(--v-font-head)',
                fontWeight: 800,
                fontSize: 'var(--v-text-lg)',
                cursor: showFeedback ? 'default' : 'pointer',
                textAlign: 'center',
                minHeight: 64,
                transition: 'all 200ms var(--v-ease)',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 8,
                  fontFamily: 'var(--v-font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  opacity: 0.5,
                }}
              >
                {idx + 1}
              </span>
              {opt}
              {reveal && isCorrect && (
                <Check size={18} style={{ marginLeft: 6, verticalAlign: -2 }} />
              )}
              {reveal && isSelected && !isCorrect && (
                <X size={18} style={{ marginLeft: 6, verticalAlign: -2 }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimerBar({ duration, paused }: { duration: number; paused: boolean }) {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setNow(Date.now()), 60);
    return () => clearInterval(id);
  }, [paused]);
  const elapsed = paused ? 0 : now - start;
  const remaining = Math.max(0, duration - elapsed);
  const pct = (remaining / duration) * 100;
  const color = pct > 50 ? 'var(--v-primary)' : pct > 20 ? 'var(--v-orange)' : 'var(--v-red)';
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: 'var(--v-panel)',
        borderRadius: '8px 8px 0 0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          transition: 'width 80ms linear, background-color 200ms var(--v-ease)',
        }}
      />
    </div>
  );
}
