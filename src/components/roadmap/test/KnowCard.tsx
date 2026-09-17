'use client';

import { useEffect, useState } from 'react';
import { Check, Eye, Undo2, Volume2, X } from 'lucide-react';
import Kbd from '@/components/flashcard-session/Kbd';
import type { TestWord } from './types';

interface Props {
  word: TestWord;
  canUndo: boolean;
  onAnswer: (known: boolean) => void;
  onUndo: () => void;
  onPlay: (word: TestWord) => void;
  /** Tắt phím tắt khi có hộp xác nhận chồng lên — không thì bấm ← → vẫn ghi đáp án sau lưng hộp. */
  disabled?: boolean;
}

/**
 * Chế độ "Biết / Chưa biết". Bấm "Xem nghĩa" để tự đối chiếu trước khi trả
 * lời — không có bước này thì người học bấm Biết theo cảm giác và điểm không
 * nói lên gì.
 */
export default function KnowCard({ word, canUndo, onAnswer, onUndo, onPlay, disabled = false }: Props) {
  const [revealed, setRevealed] = useState(false);

  // Sang từ mới thì gập nghĩa lại.
  useEffect(() => {
    setRevealed(false);
  }, [word.word]);

  useEffect(() => {
    if (disabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === '1') {
        e.preventDefault();
        onAnswer(true);
      } else if (e.key === 'ArrowLeft' || e.key === '2') {
        e.preventDefault();
        onAnswer(false);
      } else if (e.key === ' ') {
        e.preventDefault();
        setRevealed((r) => !r);
      } else if (e.key === 'Backspace' && canUndo) {
        e.preventDefault();
        onUndo();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAnswer, onUndo, canUndo, disabled]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      <div
        style={{
          position: 'relative',
          padding: '36px 24px 28px',
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-xl)',
          boxShadow: 'var(--v-shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          minHeight: 240,
          justifyContent: 'center',
        }}
      >
        <button
          type="button"
          onClick={() => onPlay(word)}
          aria-label="Nghe phát âm"
          style={iconBtn}
        >
          <Volume2 size={18} />
        </button>

        <div
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'clamp(34px, 8vw, 52px)',
            color: 'var(--v-ink)',
            textAlign: 'center',
            lineHeight: 1.1,
            wordBreak: 'break-word',
          }}
        >
          {word.word}
        </div>

        {word.ipa && (
          <div style={{ fontFamily: 'var(--v-font-mono)', fontSize: 'var(--v-text-md)', color: 'var(--v-muted)' }}>
            {word.ipa}
          </div>
        )}

        {revealed ? (
          <div
            style={{
              marginTop: 6,
              padding: '12px 16px',
              background: 'var(--v-blue-soft)',
              borderRadius: 'var(--v-radius-md)',
              maxWidth: 460,
              textAlign: 'center',
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-md)',
              color: 'var(--v-ink)',
              lineHeight: 1.5,
            }}
          >
            {word.vi ?? word.meaning_en ?? 'Từ điển chưa có nghĩa cho từ này.'}
            {word.vi && word.meaning_en && (
              <div style={{ marginTop: 6, fontSize: 'var(--v-text-sm)', color: 'var(--v-muted)' }}>
                {word.meaning_en}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            style={{
              marginTop: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              background: 'transparent',
              border: '1px dashed var(--v-border)',
              borderRadius: 'var(--v-radius-pill)',
              color: 'var(--v-muted)',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 700,
              fontSize: 'var(--v-text-sm)',
              cursor: 'pointer',
            }}
          >
            <Eye size={15} /> Xem nghĩa để đối chiếu
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <AnswerButton color="var(--v-red)" onClick={() => onAnswer(false)}>
          <X size={20} strokeWidth={3} /> Chưa biết
        </AnswerButton>
        <AnswerButton color="var(--v-primary)" onClick={() => onAnswer(true)}>
          <Check size={20} strokeWidth={3} /> Biết
        </AnswerButton>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 10px',
            background: 'transparent',
            border: 'none',
            color: canUndo ? 'var(--v-ink-soft)' : 'var(--v-border)',
            fontFamily: 'var(--v-font-body)',
            fontWeight: 700,
            fontSize: 'var(--v-text-sm)',
            cursor: canUndo ? 'pointer' : 'default',
          }}
        >
          <Undo2 size={15} /> Quay lại từ trước
        </button>
        <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>
          <Kbd>←</Kbd> chưa biết · <Kbd>→</Kbd> biết · <Kbd>Space</Kbd> xem nghĩa
        </span>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  position: 'absolute',
  top: 14,
  right: 14,
  width: 38,
  height: 38,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--v-blue-soft)',
  color: 'var(--v-blue)',
  border: 'none',
  borderRadius: '50%',
  cursor: 'pointer',
};

function AnswerButton({ color, onClick, children }: { color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '18px 12px',
        background: color,
        color: '#fff',
        border: 'none',
        borderRadius: 'var(--v-radius-lg)',
        boxShadow: 'var(--v-press)',
        fontFamily: 'var(--v-font-head)',
        fontWeight: 900,
        fontSize: 'var(--v-text-lg)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
