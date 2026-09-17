'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Snail, Volume2 } from 'lucide-react';
import { useSentenceAudio } from './audio';
import { tokenizeReference } from './dictation-grade';
import type { DictationSentence } from './DictationCard';

interface Props {
  sentence: DictationSentence;
  needsStart: boolean;
  onStarted: () => void;
  onNext: (tapped: number[], ok: boolean) => void;
}

/**
 * nghe-08: nghe câu (được nghe lại thoải mái, như đề "nghe audio mẫu"), bấm
 * vào các từ nghe thấy được nhấn. Câu đúng khi tập từ đã bấm TRÙNG KHÍT đáp án.
 */
export default function StressTapCard({ sentence, needsStart, onStarted, onNext }: Props) {
  const audio = useSentenceAudio(sentence.text);
  const tokens = tokenizeReference(sentence.text);
  const key = new Set(sentence.key as number[]);
  const [tapped, setTapped] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  // Bấm "Bắt đầu nghe" đã phát câu đầu ngay trong cú bấm (Safari đòi vậy); đánh dấu
  // để effect chạy ngay sau đó (needsStart true→false) không phát lần hai.
  const skipAutoplay = useRef(false);

  useEffect(() => {
    setTapped(new Set());
    setChecked(false);
    if (needsStart) return;
    if (skipAutoplay.current) skipAutoplay.current = false;
    else audio.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence.id, needsStart]);

  useEffect(() => {
    if (checked) nextRef.current?.focus();
  }, [checked]);

  const toggle = (i: number) =>
    setTapped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const ok = tapped.size === key.size && [...tapped].every((i) => key.has(i));

  const card: React.CSSProperties = {
    padding: '24px 20px',
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
        <div style={{ fontFamily: 'var(--v-font-body)', color: 'var(--v-ink-soft)', fontSize: 'var(--v-text-md)', maxWidth: 400, lineHeight: 1.5, textAlign: 'center' }}>
          Nghe câu đọc bình thường, rồi bấm vào <strong>những từ được nhấn mạnh</strong>. Được nghe lại bao nhiêu lần cũng được. Bật loa lên nhé.
        </div>
        <button
          type="button"
          onClick={() => {
            onStarted();
            skipAutoplay.current = true;
            audio.play();
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" onClick={() => audio.play()} aria-label="Nghe lại" style={round(64, 'var(--v-blue)', '#fff')}>
            <Volume2 size={28} />
          </button>
          <button type="button" onClick={() => audio.play(0.75)} aria-label="Nghe chậm" title="Nghe chậm" style={round(46, 'var(--v-blue-soft)', 'var(--v-blue)')}>
            <Snail size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
          {tokens.map((t, i) => {
            const on = tapped.has(i);
            const stressed = key.has(i);
            let bg = on ? 'var(--v-ink)' : 'var(--v-panel)';
            let fg = on ? 'var(--v-bg)' : 'var(--v-ink)';
            let border = '2px solid transparent';
            let label: string | null = null;
            if (checked) {
              if (stressed && on) {
                bg = 'var(--v-primary)';
                fg = '#fff';
              } else if (stressed && !on) {
                bg = 'var(--v-surface)';
                fg = 'var(--v-orange)';
                border = '2px dashed var(--v-orange)';
                label = 'bỏ sót';
              } else if (!stressed && on) {
                bg = 'var(--v-red-soft)';
                fg = 'var(--v-red)';
                label = 'thừa';
              } else {
                bg = 'transparent';
                fg = 'var(--v-muted)';
              }
            }
            return (
              <button
                key={i}
                type="button"
                disabled={checked}
                onClick={() => toggle(i)}
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: bg,
                  color: fg,
                  border,
                  borderRadius: 'var(--v-radius-md)',
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 900,
                  fontSize: 'var(--v-text-lg)',
                  cursor: checked ? 'default' : 'pointer',
                }}
              >
                {t}
                {label && <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 10, fontWeight: 800 }}>{label}</span>}
              </button>
            );
          })}
        </div>

        {checked && (
          <>
            <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 'var(--v-text-lg)', color: ok ? 'var(--v-primary)' : 'var(--v-red)' }}>
              {ok ? 'Đúng rồi' : 'Chưa khớp'}
            </div>
            {sentence.note_vi && (
              <div style={{ padding: '10px 12px', background: 'var(--v-blue-soft)', borderRadius: 'var(--v-radius-md)', fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-ink)', lineHeight: 1.5, textAlign: 'center' }}>
                {sentence.note_vi}
              </div>
            )}
          </>
        )}
      </div>

      {checked ? (
        <button
          ref={nextRef}
          type="button"
          onClick={() => onNext([...tapped].sort((a, b) => a - b), ok)}
          style={primary('var(--v-ink)', 'var(--v-bg)')}
        >
          Tiếp <ArrowRight size={20} />
        </button>
      ) : (
        <button
          type="button"
          disabled={tapped.size === 0}
          onClick={() => setChecked(true)}
          style={primary(tapped.size ? 'var(--v-primary)' : 'var(--v-border)', '#fff')}
        >
          Kiểm tra
        </button>
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
  };
}

function primary(bg: string, fg: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '15px',
    background: bg,
    color: fg,
    border: 'none',
    borderRadius: 'var(--v-radius-lg)',
    fontFamily: 'var(--v-font-head)',
    fontWeight: 900,
    fontSize: 'var(--v-text-lg)',
    cursor: 'pointer',
  };
}
