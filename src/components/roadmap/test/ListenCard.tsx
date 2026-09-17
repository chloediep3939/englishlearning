'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Snail, Volume2, X } from 'lucide-react';
import CharDiffBox from '@/components/flashcard-session/CharDiffBox';
import Kbd from '@/components/flashcard-session/Kbd';
import { isCorrectSpelling } from './spelling';
import type { TestWord } from './types';

interface Props {
  word: TestWord;
  /** true ở từ đầu tiên của lượt: phải bấm "Bắt đầu nghe" rồi mới tự phát. */
  needsStart: boolean;
  onStarted: () => void;
  onPlay: (word: TestWord, rate?: number) => void;
  /** Gọi khi user bấm "Tiếp" sau khi đã xem kết quả của từ này. */
  onNext: (correct: boolean, typed: string) => void;
}

type Phase = { kind: 'answering' } | { kind: 'feedback'; correct: boolean; typed: string };

/**
 * Chế độ nghe rồi gõ. Hai pha cho mỗi từ: gõ → XEM KẾT QUẢ → tiếp.
 * Bản cũ gõ xong nhảy luôn sang từ sau, người học không biết mình đúng hay
 * sai — đó là lý do chính màn này "khó dùng".
 */
export default function ListenCard({ word, needsStart, onStarted, onPlay, onNext }: Props) {
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'answering' });
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // Từ mới: reset, tự phát, đặt con trỏ vào ô gõ. Không tự phát khi chưa bấm
  // "Bắt đầu nghe" — mở thẳng link bài test thì trang chưa có cú bấm nào, và
  // trình duyệt có quyền chặn âm thanh tự phát trước tương tác đầu tiên.
  // Bấm "Bắt đầu nghe" đã phát câu đầu ngay trong cú bấm (Safari đòi vậy); đánh dấu
  // để effect chạy ngay sau đó (needsStart true→false) không phát lần hai.
  const skipAutoplay = useRef(false);

  useEffect(() => {
    setTyped('');
    setPhase({ kind: 'answering' });
    if (needsStart) return;
    if (skipAutoplay.current) skipAutoplay.current = false;
    else onPlay(word);
    inputRef.current?.focus();
    // onPlay cố ý không nằm trong deps: chỉ phát lại khi đổi TỪ, không phải
    // khi component cha render lại.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.word, needsStart]);

  // Sang pha kết quả thì chuyển focus sang nút Tiếp để Enter đi tiếp luôn.
  useEffect(() => {
    if (phase.kind === 'feedback') nextRef.current?.focus();
  }, [phase.kind]);

  function check(giveUp = false) {
    const correct = !giveUp && isCorrectSpelling(typed, word.word);
    setPhase({ kind: 'feedback', correct, typed: giveUp ? '' : typed.trim() });
  }

  const answering = phase.kind === 'answering';

  if (needsStart) {
    return (
      <div
        style={{
          padding: '36px 20px',
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-xl)',
          boxShadow: 'var(--v-shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          textAlign: 'center',
        }}
      >
        <div style={{ fontFamily: 'var(--v-font-body)', color: 'var(--v-ink-soft)', fontSize: 'var(--v-text-md)', maxWidth: 360, lineHeight: 1.5 }}>
          Mỗi từ sẽ được đọc to. Nghe xong bạn gõ lại đúng chính tả. Bật loa lên nhé.
        </div>
        <button
          type="button"
          onClick={() => {
            // Chính cú bấm này cấp quyền phát âm cho cả lượt làm bài.
            onStarted();
            skipAutoplay.current = true;
            onPlay(word);
            requestAnimationFrame(() => inputRef.current?.focus());
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
      <div
        style={{
          padding: '28px 20px',
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-xl)',
          boxShadow: 'var(--v-shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={() => onPlay(word)}
            aria-label="Nghe lại"
            style={{
              width: 96,
              height: 96,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--v-blue)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              boxShadow: 'var(--v-press)',
              cursor: 'pointer',
            }}
          >
            <Volume2 size={40} />
          </button>
          <button
            type="button"
            onClick={() => onPlay(word, 0.7)}
            aria-label="Nghe chậm"
            title="Nghe chậm"
            style={{
              width: 52,
              height: 52,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--v-blue-soft)',
              color: 'var(--v-blue)',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
            }}
          >
            <Snail size={22} />
          </button>
        </div>

        {!word.has_audio && (
          <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>
            Từ này chưa có bản ghi Oxford, đang đọc bằng giọng máy.
          </div>
        )}

        {answering ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (typed.trim()) check();
            }}
            style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <input
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Gõ từ bạn nghe được"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              style={{
                width: '100%',
                padding: '14px 16px',
                textAlign: 'center',
                background: 'var(--v-bg)',
                border: '2px solid var(--v-border)',
                borderRadius: 'var(--v-radius-md)',
                color: 'var(--v-ink)',
                fontFamily: 'var(--v-font-head)',
                fontSize: 24,
                fontWeight: 800,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!typed.trim()}
              style={{
                padding: '14px',
                background: typed.trim() ? 'var(--v-primary)' : 'var(--v-border)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--v-radius-md)',
                boxShadow: typed.trim() ? 'var(--v-press)' : 'none',
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-lg)',
                cursor: typed.trim() ? 'pointer' : 'default',
              }}
            >
              Kiểm tra
            </button>
          </form>
        ) : (
          <Feedback word={word} correct={phase.correct} typed={phase.typed} />
        )}
      </div>

      {answering ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => check(true)}
            style={{
              padding: '6px 10px',
              background: 'transparent',
              border: 'none',
              color: 'var(--v-ink-soft)',
              fontFamily: 'var(--v-font-body)',
              fontWeight: 700,
              fontSize: 'var(--v-text-sm)',
              cursor: 'pointer',
            }}
          >
            Không nghe ra — xem đáp án
          </button>
          <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-xs)', color: 'var(--v-muted)' }}>
            <Kbd>Enter</Kbd> kiểm tra
          </span>
        </div>
      ) : (
        <button
          ref={nextRef}
          type="button"
          onClick={() => {
            if (phase.kind === 'feedback') onNext(phase.correct, phase.typed);
          }}
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
      )}
    </div>
  );
}

function Feedback({ word, correct, typed }: { word: TestWord; correct: boolean; typed: string }) {
  return (
    <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 18px',
          background: correct ? 'var(--v-primary-soft)' : 'var(--v-red-soft)',
          color: correct ? 'var(--v-primary)' : 'var(--v-red)',
          borderRadius: 'var(--v-radius-pill)',
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-lg)',
        }}
      >
        {correct ? <Check size={20} strokeWidth={3} /> : <X size={20} strokeWidth={3} />}
        {correct ? 'Đúng rồi' : typed ? 'Chưa đúng' : 'Đáp án'}
      </div>

      {!correct && typed ? (
        <CharDiffBox guess={typed} answer={word.word} />
      ) : (
        <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 36, color: 'var(--v-ink)' }}>
          {word.word}
        </div>
      )}

      {(word.ipa || word.vi) && (
        <div style={{ textAlign: 'center', fontFamily: 'var(--v-font-body)', fontSize: 'var(--v-text-sm)', color: 'var(--v-ink-soft)', lineHeight: 1.5 }}>
          {word.ipa && <div style={{ fontFamily: 'var(--v-font-mono)', color: 'var(--v-muted)' }}>{word.ipa}</div>}
          {word.vi && <div>{word.vi}</div>}
        </div>
      )}
    </div>
  );
}
