'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, X, ArrowRight, RotateCcw, Send } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import type { Flashcard, SentenceEvaluation } from '@/lib/types';

interface Props {
  cards: Flashcard[];
  timerSeconds: number;
  onFinish: () => void;
}

type Phase = 'writing' | 'submitting' | 'feedback' | 'summary' | 'error';

interface CardResult {
  cardId: number;
  passed: boolean;
  timedOut: boolean;
  evaluation: SentenceEvaluation;
  userSentence: string;
  timeMs: number;
}

interface EvaluateResponse {
  evaluation: SentenceEvaluation;
  passed: boolean;
  example_sentence: string | null;
}

function sentenceContainsTarget(sentence: string, target: string): boolean {
  const s = sentence.toLowerCase();
  const t = target.toLowerCase().trim();
  if (!t) return false;
  if (s.includes(t)) return true;
  // Stem-like fallback: any whitespace-separated token starts with target.
  // Helps detect inflections (run/runs/running) without a real stemmer.
  if (t.length < 3) return false;
  return s.split(/\s+/).some((w) => w.startsWith(t));
}

export default function SentenceSession({ cards, timerSeconds, onFinish }: Props) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('writing');
  const [text, setText] = useState('');
  const [timedOut, setTimedOut] = useState(false);
  const [evaluation, setEvaluation] = useState<SentenceEvaluation | null>(null);
  const [exampleSentence, setExampleSentence] = useState<string | null>(null);
  const [passedThisCard, setPassedThisCard] = useState(false);
  const [results, setResults] = useState<CardResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const cardStartTime = useRef<number>(Date.now());
  const [now, setNow] = useState<number>(Date.now());
  const timedOutFiredRef = useRef(false);

  const currentCard = cards[idx];

  // Tick every 100ms while writing.
  useEffect(() => {
    if (phase !== 'writing') return;
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [phase]);

  const elapsedMs = now - cardStartTime.current;
  const remainingMs = Math.max(0, timerSeconds * 1000 - elapsedMs);
  const remainingPct = (remainingMs / (timerSeconds * 1000)) * 100;

  // Per-card reset whenever idx changes.
  useEffect(() => {
    setText('');
    setTimedOut(false);
    setEvaluation(null);
    setExampleSentence(null);
    setPassedThisCard(false);
    setErrorMessage('');
    setPhase('writing');
    timedOutFiredRef.current = false;
    cardStartTime.current = Date.now();
    setNow(Date.now());
  }, [idx]);

  // Fire timeout ONCE per card.
  useEffect(() => {
    if (phase !== 'writing') return;
    if (remainingMs > 0) return;
    if (timedOutFiredRef.current) return;
    if (!currentCard) return;
    timedOutFiredRef.current = true;
    setTimedOut(true);
    void fetch('/api/sentence/timeout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flashcard_id: currentCard.id }),
    }).catch(() => {/* fire-and-forget */});
  }, [remainingMs, phase, currentCard]);

  const wordPresent = currentCard
    ? sentenceContainsTarget(text, currentCard.english)
    : false;
  const showWordWarning = !wordPresent && text.trim().length >= 10;
  const canSubmit = text.trim().length >= 5 && phase === 'writing';

  const handleSubmit = useCallback(async () => {
    if (!currentCard) return;
    const sentence = text.trim();
    if (sentence.length < 5) return;
    setPhase('submitting');
    const timeMs = Date.now() - cardStartTime.current;
    try {
      const res = await fetch('/api/sentence/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flashcard_id: currentCard.id,
          sentence,
          time_ms: timeMs,
          timed_out: timedOut,
        }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error ?? 'AI lỗi');
      }
      const data = (await res.json()) as EvaluateResponse;
      setEvaluation(data.evaluation);
      setExampleSentence(data.example_sentence);
      setPassedThisCard(data.passed);
      setResults((rs) => [
        ...rs,
        {
          cardId: currentCard.id,
          passed: data.passed,
          timedOut,
          evaluation: data.evaluation,
          userSentence: sentence,
          timeMs,
        },
      ]);
      setPhase('feedback');
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Lỗi không xác định');
      setPhase('error');
    }
  }, [currentCard, text, timedOut]);

  const advance = useCallback(() => {
    if (idx + 1 >= cards.length) {
      setPhase('summary');
    } else {
      setIdx((i) => i + 1);
    }
  }, [idx, cards.length]);

  const handleClose = useCallback(() => {
    if (window.confirm('Thoát luôn?')) onFinish();
  }, [onFinish]);

  // Keyboard: Enter in feedback advances; Esc anywhere confirms close.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }
      if (phase === 'feedback' && e.key === 'Enter') {
        // Only handle if no input/textarea focused (in feedback phase there
        // shouldn't be any, but guard anyway).
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        advance();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, advance, handleClose]);

  function handleTextareaKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (canSubmit) {
        e.preventDefault();
        void handleSubmit();
      }
    }
  }

  const passCount = useMemo(() => results.filter((r) => r.passed).length, [results]);
  const timedOutCount = useMemo(() => results.filter((r) => r.timedOut).length, [results]);
  const failCount = results.length - passCount;

  // ===== Render =====

  if (phase === 'summary') {
    return (
      <Summary
        total={cards.length}
        passCount={passCount}
        failCount={failCount}
        timedOutCount={timedOutCount}
        onRestart={() => {
          setIdx(0);
          setResults([]);
          setPhase('writing');
        }}
        onFinish={onFinish}
      />
    );
  }

  if (!currentCard) return null;

  const barColor =
    remainingPct > 50 ? 'var(--v-primary)'
    : remainingPct > 20 ? 'var(--v-orange)'
    : remainingPct > 0 ? 'var(--v-red)'
    : 'var(--v-muted)';

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <HeaderBar position={idx} total={cards.length} onClose={handleClose} />

      <div
        style={{
          background: 'var(--v-panel)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-md)',
          boxShadow: 'var(--v-shadow-md)',
          padding: 24,
          minHeight: 360,
        }}
      >
        {(phase === 'writing' || phase === 'submitting') && (
          <>
            {/* Countdown bar */}
            <div
              style={{
                height: 6,
                background: 'var(--v-border)',
                borderRadius: 'var(--v-radius-pill)',
                overflow: 'hidden',
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${remainingPct}%`,
                  background: barColor,
                  borderRadius: 'var(--v-radius-pill)',
                  transition: 'background-color 300ms ease, width 100ms linear',
                }}
              />
            </div>

            {/* Vietnamese gloss + POS */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div
                style={{
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 900,
                  fontSize: 'var(--v-text-4xl)',
                  color: 'var(--v-ink)',
                  letterSpacing: 'var(--v-tracking-tight)',
                  wordBreak: 'break-word',
                  lineHeight: 'var(--v-leading-snug)',
                }}
              >
                {currentCard.vietnamese}
              </div>
              {currentCard.part_of_speech && (
                <div
                  style={{
                    display: 'inline-block',
                    marginTop: 8,
                    padding: '3px 10px',
                    background: 'var(--v-surface)',
                    border: '1px solid var(--v-border)',
                    borderRadius: 'var(--v-radius-pill)',
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 'var(--v-text-xs)',
                    fontWeight: 800,
                    color: 'var(--v-muted)',
                    letterSpacing: 'var(--v-tracking-wider)',
                    textTransform: 'uppercase',
                  }}
                >
                  {currentCard.part_of_speech}
                </div>
              )}
            </div>

            {/* Timeout banner */}
            {timedOut && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255,154,60,0.12)',
                  border: '1px solid rgba(255,154,60,0.35)',
                  borderRadius: 'var(--v-radius-md)',
                  color: 'var(--v-orange)',
                  fontSize: 'var(--v-text-sm)',
                  fontWeight: 700,
                  marginBottom: 10,
                }}
              >
                ⏰ Hết giờ — đã đánh dấu chưa thuộc. Cứ gõ tiếp để học.
              </div>
            )}

            {/* Textarea */}
            <div style={{ position: 'relative' }}>
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 1000))}
                onKeyDown={handleTextareaKey}
                disabled={phase === 'submitting'}
                placeholder={`Viết một câu tiếng Anh có dùng từ này…`}
                rows={5}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'var(--v-surface)',
                  border: '1.5px solid var(--v-border)',
                  borderRadius: 'var(--v-radius-md)',
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-lg)',
                  fontWeight: 600,
                  color: 'var(--v-ink)',
                  outline: 'none',
                  resize: 'vertical',
                  lineHeight: 'var(--v-leading-normal)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: 10,
                  bottom: 8,
                  fontFamily: 'var(--v-font-mono)',
                  fontSize: 11,
                  color: 'var(--v-muted)',
                  pointerEvents: 'none',
                }}
              >
                {text.length} / 1000
              </div>
            </div>

            {/* Soft warning */}
            {showWordWarning && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 'var(--v-text-sm)',
                  color: 'var(--v-muted)',
                  fontFamily: 'var(--v-font-body)',
                }}
              >
                💡 Câu của bạn có vẻ chưa dùng từ <strong>&ldquo;{currentCard.english}&rdquo;</strong> nhé
              </div>
            )}

            {phase === 'submitting' && (
              <div
                style={{
                  marginTop: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  color: 'var(--v-muted)',
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-md)',
                  fontWeight: 700,
                }}
              >
                <Spinner /> Bún đang chấm bài… (~3s)
              </div>
            )}

            {/* Submit button */}
            {phase === 'writing' && (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!canSubmit}
                style={{
                  marginTop: 18,
                  width: '100%',
                  padding: '13px 22px',
                  background: canSubmit ? 'var(--v-orange)' : 'var(--v-border)',
                  color: canSubmit ? '#fff' : 'var(--v-muted)',
                  border: 'none',
                  borderRadius: 'var(--v-radius-md)',
                  boxShadow: canSubmit ? 'var(--v-press), 0 6px 14px rgba(255,154,60,0.4)' : 'none',
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 900,
                  fontSize: 'var(--v-text-lg)',
                  letterSpacing: '0.03em',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Send size={16} strokeWidth={2.6} /> Gửi cho Bún chấm
              </button>
            )}
          </>
        )}

        {phase === 'feedback' && evaluation && (
          <Feedback
            evaluation={evaluation}
            userSentence={text.trim()}
            exampleSentence={exampleSentence}
            timedOut={timedOut}
            passed={passedThisCard}
            isLast={idx + 1 >= cards.length}
            onAdvance={advance}
          />
        )}

        {phase === 'error' && (
          <ErrorView
            message={errorMessage}
            onRetry={() => void handleSubmit()}
            onSkip={advance}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function HeaderBar({
  position, total, onClose,
}: {
  position: number; total: number; onClose: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
      }}
    >
      <span
        style={{
          fontSize: 'var(--v-text-xs)',
          color: 'var(--v-muted)',
          fontFamily: 'var(--v-font-head)',
          fontWeight: 800,
          letterSpacing: 'var(--v-tracking-wide)',
          textTransform: 'uppercase',
          flex: 1,
        }}
      >
        Thẻ {position + 1} / {total}
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng"
        style={iconBtn()}
      >
        <X size={16} />
      </button>
    </div>
  );
}

function Feedback({
  evaluation, userSentence, exampleSentence, timedOut, passed, isLast, onAdvance,
}: {
  evaluation: SentenceEvaluation;
  userSentence: string;
  exampleSentence: string | null;
  timedOut: boolean;
  passed: boolean;
  isLast: boolean;
  onAdvance: () => void;
}) {
  return (
    <div>
      {/* User sentence */}
      <div
        style={{
          padding: '12px 16px',
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderLeft: '4px solid var(--v-muted)',
          borderRadius: 'var(--v-radius-sm)',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-base)',
          fontStyle: 'italic',
          color: 'var(--v-ink-soft)',
          marginBottom: 14,
        }}
      >
        &ldquo;{userSentence}&rdquo;
      </div>

      {/* 3 chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <Chip ok={evaluation.used_correctly} label="Dùng đúng từ" />
        <Chip ok={evaluation.grammar_ok} label="Ngữ pháp" />
        <Chip ok={evaluation.semantic_ok} label="Nghĩa hợp lý" />
      </div>

      {/* AI feedback */}
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-base)',
          color: 'var(--v-ink)',
          lineHeight: 'var(--v-leading-normal)',
          marginBottom: 14,
        }}
      >
        {evaluation.feedback}
      </div>

      {/* Example sentence */}
      {exampleSentence && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-xs)',
              fontWeight: 800,
              color: 'var(--v-muted)',
              letterSpacing: 'var(--v-tracking-wider)',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Ví dụ
          </div>
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-md)',
              color: 'var(--v-ink-soft)',
            }}
          >
            {exampleSentence}
          </div>
        </div>
      )}

      {/* Timeout reminder */}
      {timedOut && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(255,154,60,0.10)',
            border: '1px solid rgba(255,154,60,0.30)',
            borderRadius: 'var(--v-radius-sm)',
            color: 'var(--v-orange)',
            fontSize: 'var(--v-text-sm)',
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          Thẻ đã đánh dấu cần ôn lại
        </div>
      )}

      {/* Verdict */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 14,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Mascot pose={passed ? 'happy' : 'idle'} size={96} bob={passed} />
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            background: passed ? 'var(--v-primary)' : 'var(--v-surface)',
            color: passed ? '#fff' : 'var(--v-ink-soft)',
            border: passed ? 'none' : '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-pill)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-md)',
          }}
        >
          {passed ? <><Check size={14} strokeWidth={3} /> Tốt!</> : 'Cần luyện thêm'}
        </div>
      </div>

      {/* Advance */}
      <button
        type="button"
        onClick={onAdvance}
        style={{
          width: '100%',
          padding: '12px 18px',
          background: 'var(--v-ink)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--v-radius-md)',
          boxShadow: 'var(--v-press), 0 4px 12px rgba(40,30,15,0.2)',
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-base)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {isLast ? 'Xem kết quả' : 'Tiếp'} <ArrowRight size={16} strokeWidth={2.6} />
      </button>
    </div>
  );
}

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 12px',
        background: ok ? 'rgba(122,193,67,0.14)' : 'rgba(255,87,87,0.10)',
        border: `1px solid ${ok ? 'rgba(122,193,67,0.45)' : 'rgba(255,87,87,0.35)'}`,
        borderRadius: 'var(--v-radius-pill)',
        color: ok ? 'var(--v-primary)' : 'var(--v-red)',
        fontFamily: 'var(--v-font-head)',
        fontWeight: 800,
        fontSize: 'var(--v-text-sm)',
      }}
    >
      {ok ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
      {label}
    </div>
  );
}

function ErrorView({
  message, onRetry, onSkip,
}: {
  message: string; onRetry: () => void; onSkip: () => void;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '16px 8px' }}>
      <Mascot pose="idle" size={96} />
      <h3
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-xl)',
          margin: '12px 0 6px',
          color: 'var(--v-ink)',
        }}
      >
        Bún chấm chưa được
      </h3>
      <p
        style={{
          color: 'var(--v-muted)',
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-md)',
          margin: '0 0 18px',
        }}
      >
        {message}
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={onRetry} style={primaryBtn()}>
          Thử lại
        </button>
        <button type="button" onClick={onSkip} style={secondaryBtn()}>
          Bỏ qua thẻ này
        </button>
      </div>
    </div>
  );
}

function Summary({
  total, passCount, failCount, timedOutCount, onRestart, onFinish,
}: {
  total: number;
  passCount: number;
  failCount: number;
  timedOutCount: number;
  onRestart: () => void;
  onFinish: () => void;
}) {
  const ratio = total > 0 ? passCount / total : 0;
  const pose: 'happy' | 'idle' = ratio >= 0.5 ? 'happy' : 'idle';
  return (
    <div
      style={{
        maxWidth: 560,
        margin: '0 auto',
        textAlign: 'center',
        padding: '32px 24px',
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-lg)',
        boxShadow: 'var(--v-shadow-md)',
      }}
    >
      <Mascot pose={pose} size={120} bob={pose === 'happy'} />
      <h2
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-3xl)',
          margin: '12px 0 18px',
          color: 'var(--v-ink)',
        }}
      >
        🎉 Xong rồi!
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 10,
          marginBottom: 18,
        }}
      >
        <Stat label="Tổng số câu" value={String(total)} color="var(--v-ink)" />
        <Stat label="Đạt" value={String(passCount)} color="var(--v-primary)" />
        <Stat label="Cần luyện thêm" value={String(failCount)} color="var(--v-orange)" />
        <Stat label="Hết giờ" value={String(timedOutCount)} color="var(--v-red)" />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={onRestart} style={primaryBtn()}>
          <RotateCcw size={14} /> Làm lại
        </button>
        <button type="button" onClick={onFinish} style={secondaryBtn()}>
          Về dashboard <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        padding: 12,
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

function Spinner() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        border: '2px solid var(--v-border)',
        borderTopColor: 'var(--v-orange)',
        borderRadius: '50%',
        animation: 'v-sentence-spin 800ms linear infinite',
      }}
    >
      <style jsx>{`
        @keyframes v-sentence-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </span>
  );
}

function iconBtn(): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--v-radius-sm)',
    background: 'var(--v-surface)',
    border: '1px solid var(--v-border)',
    color: 'var(--v-ink-soft)',
    cursor: 'pointer',
  };
}

function primaryBtn(): React.CSSProperties {
  return {
    padding: '11px 18px',
    background: 'var(--v-orange)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--v-radius-md)',
    boxShadow: 'var(--v-press), 0 6px 14px rgba(255,154,60,0.4)',
    fontFamily: 'var(--v-font-head)',
    fontWeight: 900,
    fontSize: 'var(--v-text-base)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    padding: '10px 18px',
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
  };
}
