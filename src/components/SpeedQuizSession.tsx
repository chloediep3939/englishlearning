'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Zap, Check, X, ArrowRight, BookOpen } from 'lucide-react';
import AudioButton from './AudioButton';
import WordReviewModal from './common/WordReviewModal';
import SummaryScreen, { type QuestionResult } from './speed-quiz/SummaryScreen';
import TimerBar from './speed-quiz/TimerBar';
import { speakTimes, getStoredVoicePreference } from '@/lib/tts';
import type { SpeedQuizQuestion, SpeedQuizMode } from '@/lib/types';

// Auto-read an English prompt this many times when a question appears.
const AUTO_READ_TIMES = 3;
// How long the green "correct" reveal lingers before auto-advancing.
const CORRECT_ADVANCE_MS = 900;

// English-side prompts (the word shown is English). Vietnamese-prompt mode
// (vi_to_en) is not auto-read.
function isEnglishPrompt(q: SpeedQuizQuestion): boolean {
  return q.question_mode === 'en_to_vi' || q.question_mode === 'spelling';
}

function longestStreak(results: ReadonlyArray<{ passed: boolean }>): number {
  let max = 0;
  let cur = 0;
  for (const r of results) {
    if (r.passed) {
      cur++;
      if (cur > max) max = cur;
    } else {
      cur = 0;
    }
  }
  return max;
}

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
  const [correct, setCorrect] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [questionStart, setQuestionStart] = useState(() => Date.now());
  const [done, setDone] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  // Pending auto-advance timer set after a correct answer.
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = questions[position];
  const isLast = position + 1 >= questions.length;
  // The timer is "soft": running out does NOT pick an answer. Feedback only
  // reveals once the learner actually selects an option.
  const showFeedback = selectedIdx !== null;
  const answeredWrong = selectedIdx !== null && current != null && selectedIdx !== current.correct_index;

  // Record the answer to the session results + fire the test-attempt log.
  const answer = useCallback(
    (idx: number) => {
      if (!current) return;
      const passed = idx === current.correct_index;
      const timeMs = Date.now() - questionStart;

      if (passed) setCorrect((c) => c + 1);
      setResults((r) => [
        ...r,
        { card_id: current.card_id, passed, timed_out: false, time_ms: timeMs },
      ]);

      // Log to /api/cards/:id/test-attempt (fire & forget)
      void fetch(`/api/cards/${current.card_id}/test-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'speed',
          passed,
          time_ms: timeMs,
          metadata: { quiz_mode: mode, selected_idx: idx, timed_out: false },
        }),
      }).catch(() => {});
    },
    [current, questionStart, mode]
  );

  const goNext = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    if (isLast) {
      setDone(true);
    } else {
      setPosition((p) => p + 1);
      setSelectedIdx(null);
      setQuestionStart(Date.now());
    }
  }, [isLast]);

  // Pick an option. Correct → brief green reveal, then auto-advance.
  // Wrong → reveal the right answer and stay put (learner studies, then
  // presses "Tiếp"). Ignores repeat picks once feedback is showing.
  const select = useCallback(
    (idx: number) => {
      if (selectedIdx !== null || !current) return;
      setSelectedIdx(idx);
      answer(idx);
      if (idx === current.correct_index) {
        advanceTimerRef.current = setTimeout(goNext, CORRECT_ADVANCE_MS);
      }
    },
    [selectedIdx, current, answer, goNext]
  );

  // Auto-read the English prompt a few times when the question appears.
  useEffect(() => {
    if (done || !current || !isEnglishPrompt(current)) return;
    const cancel = speakTimes(current.prompt, AUTO_READ_TIMES, {
      lang: 'en-US',
      rate: 0.95,
      voice_preference: getStoredVoicePreference(),
    });
    return cancel;
  }, [position, done, current]);

  // Clear a pending auto-advance timer if the session unmounts mid-reveal.
  useEffect(
    () => () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    },
    []
  );

  // Keyboard: 1-4 to pick while answering; Enter/Space to advance once
  // revealed. Disabled while the review modal is open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done || reviewOpen) return;
      if (!showFeedback) {
        const idx = ['1', '2', '3', '4'].indexOf(e.key);
        if (idx !== -1 && current && idx < current.options.length) {
          select(idx);
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goNext();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, done, showFeedback, reviewOpen, select, goNext]);

  if (done) {
    const total = questions.length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const wrong = results.filter((r) => !r.passed && !r.timed_out).length;
    const timedOutCount = results.filter((r) => r.timed_out).length;
    const streak = longestStreak(results);
    const showSparkles = accuracy >= 80;

    return <SummaryScreen
      accuracy={accuracy}
      correct={correct}
      wrong={wrong}
      timedOutCount={timedOutCount}
      streak={streak}
      results={results}
      showSparkles={showSparkles}
      onRestart={onRestart}
    />;
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
              onClick={() => select(idx)}
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

      {/* Feedback actions — only when the answer was WRONG. The session pauses
          here (no auto-advance) so the learner can study the right answer and
          re-study via "Xem lại từ" before pressing "Tiếp". A correct answer
          auto-advances instead, so no buttons are shown. */}
      {answeredWrong && (
        <div
          style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}
        >
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            style={{
              padding: '12px 18px',
              background: 'var(--v-surface)',
              color: 'var(--v-ink-soft)',
              border: '1px solid var(--v-border)',
              borderRadius: 'var(--v-radius-md)',
              boxShadow: 'var(--v-shadow-sm)',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 800,
              fontSize: 'var(--v-text-md)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <BookOpen size={14} /> Xem lại từ
          </button>
          <button
            type="button"
            onClick={goNext}
            style={{
              padding: '12px 24px',
              background: 'var(--v-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--v-radius-md)',
              boxShadow: 'var(--v-press), 0 6px 14px rgba(122,193,67,0.4)',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 'var(--v-text-base)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {isLast ? 'XEM KẾT QUẢ' : 'TIẾP'} <ArrowRight size={14} />
          </button>
        </div>
      )}

      {reviewOpen && current && (
        <WordReviewModal cardId={current.card_id} onClose={() => setReviewOpen(false)} />
      )}
    </div>
  );
}

