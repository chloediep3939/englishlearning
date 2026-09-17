'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Snail, Volume2 } from 'lucide-react';
import Kbd from '@/components/flashcard-session/Kbd';
import type { PairQuestion } from './types';

interface Props {
  question: PairQuestion;
  /** true ở câu đầu của lượt: phải bấm "Bắt đầu nghe" rồi mới tự phát. */
  needsStart: boolean;
  onStarted: () => void;
  /** Phát một từ cụ thể (có mp3 Oxford thì dùng, không thì giọng máy). */
  onPlay: (word: string, hasAudio: boolean, rate?: number) => void;
  onNext: (picked: 'a' | 'b', correct: boolean) => void;
  disabled?: boolean;
}

/**
 * Nghe một từ, chọn nó là từ nào trong cặp. Chọn xong KHÔNG nhảy câu ngay:
 * tô màu đúng/sai và cho nghe lại riêng từng từ — so hai âm cạnh nhau mới là
 * lúc tai học được, bỏ bước này thì bài chỉ đo chứ không dạy.
 */
export default function PairCard({ question, needsStart, onStarted, onPlay, onNext, disabled = false }: Props) {
  const [picked, setPicked] = useState<'a' | 'b' | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  // Bấm "Bắt đầu nghe" đã phát câu đầu ngay trong cú bấm (Safari đòi vậy); đánh dấu
  // để effect chạy ngay sau đó (needsStart true→false) không phát lần hai.
  const skipAutoplay = useRef(false);

  const target = question.target === 'a'
    ? { word: question.word_a, audio: question.audio_a }
    : { word: question.word_b, audio: question.audio_b };

  const playTarget = (rate?: number) => onPlay(target.word, target.audio, rate);

  // Câu mới: xoá lựa chọn, tự phát (trừ khi chưa bấm "Bắt đầu nghe").
  useEffect(() => {
    setPicked(null);
    if (needsStart) return;
    if (skipAutoplay.current) skipAutoplay.current = false;
    else playTarget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, needsStart]);

  useEffect(() => {
    if (picked) nextRef.current?.focus();
  }, [picked]);

  useEffect(() => {
    if (disabled || needsStart) return;
    function onKey(e: KeyboardEvent) {
      if (picked) return; // pha kết quả: Enter do nút Tiếp đang focus tự xử
      if (e.key === '1' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setPicked('a');
      } else if (e.key === '2' || e.key === 'ArrowRight') {
        e.preventDefault();
        setPicked('b');
      } else if (e.key === ' ') {
        e.preventDefault();
        playTarget();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, disabled, needsStart, question.id]);

  if (needsStart) {
    return (
      <div style={cardStyle}>
        <div style={{ fontFamily: 'var(--v-font-body)', color: 'var(--v-ink-soft)', fontSize: 'var(--v-text-md)', maxWidth: 380, lineHeight: 1.5, textAlign: 'center' }}>
          Mỗi câu mình đọc <strong>một</strong> từ. Bạn chọn xem đó là từ nào trong hai từ gần giống nhau. Bật loa lên nhé.
        </div>
        <button
          type="button"
          onClick={() => {
            // Chính cú bấm này cấp quyền phát âm cho cả lượt.
            onStarted();
            skipAutoplay.current = true;
            playTarget();
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

  const correctSide = question.target;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      <div style={cardStyle}>
        <span
          style={{
            padding: '3px 12px',
            background: 'var(--v-panel)',
            borderRadius: 'var(--v-radius-pill)',
            fontFamily: 'var(--v-font-mono)',
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-muted)',
          }}
        >
          {question.contrast_label}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button type="button" onClick={() => playTarget()} aria-label="Nghe lại" style={bigPlay}>
            <Volume2 size={38} />
          </button>
          <button type="button" onClick={() => playTarget(0.7)} aria-label="Nghe chậm" title="Nghe chậm" style={slowPlay}>
            <Snail size={22} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 440 }}>
          {(['a', 'b'] as const).map((side) => {
            const word = side === 'a' ? question.word_a : question.word_b;
            const ipa = side === 'a' ? question.ipa_a : question.ipa_b;
            const hasAudio = side === 'a' ? question.audio_a : question.audio_b;
            const isCorrect = side === correctSide;
            const isPicked = picked === side;

            let bg = 'var(--v-surface)';
            let border = 'var(--v-border)';
            let fg = 'var(--v-ink)';
            if (picked) {
              if (isCorrect) {
                bg = 'var(--v-primary-soft)';
                border = 'var(--v-primary)';
                fg = 'var(--v-primary)';
              } else if (isPicked) {
                bg = 'var(--v-red-soft)';
                border = 'var(--v-red)';
                fg = 'var(--v-red)';
              } else {
                fg = 'var(--v-muted)';
              }
            }

            return (
              <div key={side} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  type="button"
                  disabled={picked !== null}
                  onClick={() => setPicked(side)}
                  style={{
                    padding: '18px 10px',
                    background: bg,
                    border: `2px solid ${border}`,
                    borderRadius: 'var(--v-radius-lg)',
                    boxShadow: picked ? 'none' : 'var(--v-shadow-sm)',
                    cursor: picked ? 'default' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 28, color: fg }}>{word}</span>
                  {ipa && <span style={{ fontFamily: 'var(--v-font-mono)', fontSize: 'var(--v-text-sm)', color: 'var(--v-muted)' }}>{ipa}</span>}
                </button>
                {picked && (
                  <button
                    type="button"
                    onClick={() => onPlay(word, hasAudio)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      padding: '6px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--v-blue)',
                      fontFamily: 'var(--v-font-body)',
                      fontWeight: 800,
                      fontSize: 'var(--v-text-xs)',
                      cursor: 'pointer',
                    }}
                  >
                    <Volume2 size={13} /> nghe &ldquo;{word}&rdquo;
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {picked && (
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 'var(--v-text-lg)',
              color: picked === correctSide ? 'var(--v-primary)' : 'var(--v-red)',
            }}
          >
            {picked === correctSide ? 'Đúng rồi' : `Chưa đúng — mình đọc "${target.word}"`}
          </div>
        )}
      </div>

      {picked ? (
        <button
          ref={nextRef}
          type="button"
          onClick={() => onNext(picked, picked === correctSide)}
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
          <Kbd>1</Kbd> từ trái · <Kbd>2</Kbd> từ phải · <Kbd>Space</Kbd> nghe lại
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  padding: '26px 20px',
  background: 'var(--v-surface)',
  border: '1px solid var(--v-border)',
  borderRadius: 'var(--v-radius-xl)',
  boxShadow: 'var(--v-shadow-md)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 18,
};

const bigPlay: React.CSSProperties = {
  width: 88,
  height: 88,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--v-blue)',
  color: '#fff',
  border: 'none',
  borderRadius: '50%',
  boxShadow: 'var(--v-press)',
  cursor: 'pointer',
};

const slowPlay: React.CSSProperties = {
  width: 50,
  height: 50,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--v-blue-soft)',
  color: 'var(--v-blue)',
  border: 'none',
  borderRadius: '50%',
  cursor: 'pointer',
};
