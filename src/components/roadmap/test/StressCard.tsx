'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Snail, Volume2 } from 'lucide-react';
import Kbd from '@/components/flashcard-session/Kbd';

export interface StressQuestion {
  word: string;
  ipa: string;
  syllables: number;
  stress_index: number;
  has_audio: boolean;
}

interface Props {
  question: StressQuestion;
  needsStart: boolean;
  onStarted: () => void;
  onPlay: (q: StressQuestion, rate?: number) => void;
  onNext: (picked: number, correct: boolean) => void;
  disabled?: boolean;
}

/**
 * Nghe một từ, bấm vào NHỊP được nhấn. Hiện số âm tiết thành các chấm tròn
 * chứ không tách chữ thành âm tiết — phần tách âm tiết của từ điển nguồn sai
 * nhiều (computer → /kəˈmpjuːtər/), còn số âm tiết và vị trí nhấn thì đúng.
 * Phiên âm giấu tới khi trả lời, vì dấu ˈ trong phiên âm chính là đáp án.
 */
export default function StressCard({ question, needsStart, onStarted, onPlay, onNext, disabled = false }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  // Bấm "Bắt đầu nghe" đã phát câu đầu ngay trong cú bấm (Safari đòi vậy); đánh dấu
  // để effect chạy ngay sau đó (needsStart true→false) không phát lần hai.
  const skipAutoplay = useRef(false);

  useEffect(() => {
    setPicked(null);
    if (needsStart) return;
    if (skipAutoplay.current) skipAutoplay.current = false;
    else onPlay(question);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.word, needsStart]);

  useEffect(() => {
    if (picked !== null) nextRef.current?.focus();
  }, [picked]);

  useEffect(() => {
    if (disabled || needsStart || picked !== null) return;
    function onKey(e: KeyboardEvent) {
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= question.syllables) {
        e.preventDefault();
        setPicked(n - 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        onPlay(question);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, needsStart, picked, question.word]);

  const card: React.CSSProperties = {
    padding: '28px 20px',
    background: 'var(--v-surface)',
    border: '1px solid var(--v-border)',
    borderRadius: 'var(--v-radius-xl)',
    boxShadow: 'var(--v-shadow-md)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 18,
  };

  if (needsStart) {
    return (
      <div style={card}>
        <div style={{ fontFamily: 'var(--v-font-body)', color: 'var(--v-ink-soft)', fontSize: 'var(--v-text-md)', maxWidth: 380, lineHeight: 1.5, textAlign: 'center' }}>
          Mình đọc một từ dài. Mỗi chấm tròn là một âm tiết — bạn bấm vào chấm được <strong>nhấn mạnh nhất</strong>. Bật loa lên nhé.
        </div>
        <button
          type="button"
          onClick={() => {
            // Chính cú bấm này cấp quyền phát âm cho cả lượt.
            onStarted();
            skipAutoplay.current = true;
            onPlay(question);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '16px 28px',
            background: 'var(--v-blue)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--v-radius-pill)',
            boxShadow: 'var(--v-press)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-lg)',
            cursor: 'pointer',
          }}
        >
          <Volume2 size={24} /> Bắt đầu nghe
        </button>
      </div>
    );
  }

  const correct = picked !== null && picked === question.stress_index;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      <div style={card}>
        <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'clamp(32px, 7vw, 46px)', color: 'var(--v-ink)', lineHeight: 1.1 }}>
          {question.word}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" onClick={() => onPlay(question)} aria-label="Nghe lại" style={round(64, 'var(--v-blue)', '#fff')}>
            <Volume2 size={28} />
          </button>
          <button type="button" onClick={() => onPlay(question, 0.7)} aria-label="Nghe chậm" title="Nghe chậm" style={round(46, 'var(--v-blue-soft)', 'var(--v-blue)')}>
            <Snail size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          {Array.from({ length: question.syllables }, (_, i) => {
            const isAnswer = i === question.stress_index;
            const isPicked = picked === i;
            let bg = 'var(--v-panel)';
            let fg = 'var(--v-ink-soft)';
            let size = 56;
            if (picked !== null) {
              if (isAnswer) {
                bg = 'var(--v-primary)';
                fg = '#fff';
                size = 70;
              } else if (isPicked) {
                bg = 'var(--v-red)';
                fg = '#fff';
              }
            }
            return (
              <button
                key={i}
                type="button"
                disabled={picked !== null}
                onClick={() => setPicked(i)}
                aria-label={`Âm tiết ${i + 1}`}
                style={{
                  ...round(size, bg, fg),
                  border: picked === null ? '2px solid var(--v-border)' : 'none',
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 900,
                  fontSize: 'var(--v-text-lg)',
                  cursor: picked === null ? 'pointer' : 'default',
                  transition: 'width 150ms var(--v-ease), height 150ms var(--v-ease)',
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-lg)', color: correct ? 'var(--v-primary)' : 'var(--v-red)' }}>
              {correct ? 'Đúng rồi' : `Nhấn ở âm tiết thứ ${question.stress_index + 1}`}
            </div>
            <div style={{ fontFamily: 'var(--v-font-mono)', fontSize: 'var(--v-text-md)', color: 'var(--v-ink-soft)' }}>{question.ipa}</div>
          </div>
        )}
      </div>

      {picked !== null ? (
        <button
          ref={nextRef}
          type="button"
          onClick={() => onNext(picked, correct)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '16px',
            background: 'var(--v-ink)',
            color: 'var(--v-bg)',
            border: 'none',
            borderRadius: 'var(--v-radius-lg)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-lg)',
            cursor: 'pointer',
          }}
        >
          Tiếp <ArrowRight size={20} />
        </button>
      ) : (
        <div style={{ textAlign: 'center', fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>
          <Kbd>1</Kbd>…<Kbd>{question.syllables}</Kbd> chọn âm tiết · <Kbd>Space</Kbd> nghe lại
        </div>
      )}
    </div>
  );
}

function round(size: number, bg: string, fg: string): React.CSSProperties {
  return {
    width: size,
    height: size,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: bg,
    color: fg,
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    flexShrink: 0,
  };
}
