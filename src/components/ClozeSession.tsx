'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { FileText, RotateCcw, ArrowRight, Check, X, Lightbulb, BookOpen } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import AudioButton from './AudioButton';
import LoadingState from '@/components/common/LoadingState';
import WordReviewModal from '@/components/common/WordReviewModal';
import type { ClozeChallenge } from '@/lib/types';

export type ClozeMode = 'typing' | 'multiple_choice';

interface Props {
  cardIds: number[];
  mode: ClozeMode;
  onRestart: () => void;
}

interface QuestionState {
  challenge: ClozeChallenge;
  distractors?: string[];
}

export default function ClozeSession({ cardIds, mode, onRestart }: Props) {
  const [position, setPosition] = useState(0);
  const [state, setState] = useState<QuestionState | null>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [helpedThisCard, setHelpedThisCard] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [done, setDone] = useState(cardIds.length === 0);
  const [startTime] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  const currentCardId = cardIds[position];
  const isLast = position + 1 >= cardIds.length;

  // Fetch challenge when position changes
  useEffect(() => {
    if (currentCardId === undefined) return;
    let cancelled = false;
    setLoading(true);
    setRevealed(false);
    setHintOpen(false);
    setHelpedThisCard(false);
    setInput('');
    setSelectedIdx(null);
    (async () => {
      try {
        const res = await fetch(`/api/cards/${currentCardId}/cloze`);
        if (!res.ok) {
          setState(null);
          return;
        }
        const challenge = (await res.json()) as ClozeChallenge;
        let distractors: string[] | undefined;
        if (mode === 'multiple_choice') {
          // Pick 3 distractors from other cards' english words.
          const other = (await fetch(`/api/cards?limit=50`)
            .then((r) => r.json())
            .catch(() => ({ cards: [] }))) as { cards?: Array<{ english: string }> };
          const pool: string[] = (other.cards ?? [])
            .map((c) => c.english)
            .filter((w) => w.toLowerCase() !== challenge.english.toLowerCase());
          distractors = [];
          while (distractors.length < 3 && pool.length > 0) {
            const idx = Math.floor(Math.random() * pool.length);
            distractors.push(pool.splice(idx, 1)[0]);
          }
          while (distractors.length < 3) distractors.push(`option ${distractors.length + 1}`);
        }
        if (!cancelled) {
          setState({ challenge, distractors });
        }
      } catch {
        if (!cancelled) setState(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
          if (mode === 'typing') {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentCardId, mode]);

  const handleSubmit = useCallback(
    async (passed: boolean) => {
      if (!state || !currentCardId) return;
      if (passed) setCorrect((c) => c + 1);
      setRevealed(true);

      void fetch(`/api/cards/${currentCardId}/test-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'cloze',
          passed,
          time_ms: null,
          metadata: { cloze_mode: mode, helped: helpedThisCard },
        }),
      }).catch(() => {});
    },
    [state, currentCardId, mode, helpedThisCard]
  );

  const handleNext = useCallback(() => {
    if (isLast) {
      setDone(true);
    } else {
      setPosition((p) => p + 1);
    }
  }, [isLast]);

  // Keyboard: Enter to submit / next
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done || loading || !state || reviewOpen) return;
      if (!revealed) {
        if (mode === 'typing' && e.key === 'Enter') {
          const guess = input.trim().toLowerCase();
          const ans = state.challenge.english.trim().toLowerCase();
          void handleSubmit(guess === ans);
        } else if (mode === 'multiple_choice') {
          const idx = ['1', '2', '3', '4'].indexOf(e.key);
          if (idx !== -1 && state.distractors && idx < 4) {
            const options = buildOptions(state.challenge.english, state.distractors);
            setSelectedIdx(idx);
            void handleSubmit(options[idx] === state.challenge.english);
          }
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (done) {
    const total = cardIds.length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
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
          {total === 0 ? 'Chưa có từ nào để điền chỗ trống' : 'Xong rồi! 🎉'}
        </h2>
        {total > 0 && (
          <>
            <div
              style={{
                fontFamily: 'var(--v-font-head)',
                fontSize: 64,
                fontWeight: 900,
                color: 'var(--v-primary)',
                margin: '8px 0',
                lineHeight: 1,
              }}
            >
              {accuracy}%
            </div>
            <p style={{ color: 'var(--v-muted)', fontSize: 'var(--v-text-md)', marginBottom: 20 }}>
              {correct} / {total} đúng · {elapsed}s
            </p>
          </>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {total > 0 && (
            <button
              type="button"
              onClick={onRestart}
              style={{
                padding: '11px 20px',
                background: 'var(--v-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--v-radius-md)',
                boxShadow: 'var(--v-press), 0 6px 14px rgba(122,193,67,0.4)',
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
          )}
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

  if (loading || !state) {
    return <LoadingState message="Đang tải câu…" />;
  }

  const { challenge, distractors } = state;
  const options =
    mode === 'multiple_choice' && distractors
      ? buildOptions(challenge.english, distractors)
      : [];

  return (
    <div>
      {/* Progress */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 'var(--v-text-xs)',
            color: 'var(--v-muted)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            letterSpacing: 'var(--v-tracking-wide)',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          <span>
            <FileText size={12} style={{ display: 'inline', verticalAlign: -2 }} /> {position + 1} /{' '}
            {cardIds.length}
          </span>
          <span style={{ color: 'var(--v-primary)' }}>{correct} đúng</span>
        </div>
        <div
          style={{
            height: 8,
            background: 'var(--v-panel)',
            border: '1px solid var(--v-border)',
            borderRadius: 'var(--v-radius-pill)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${((position + 1) / cardIds.length) * 100}%`,
              background: 'linear-gradient(90deg, var(--v-primary), var(--v-primary-deep))',
              borderRadius: 'var(--v-radius-pill)',
              transition: 'width 200ms var(--v-ease)',
            }}
          />
        </div>
      </div>

      {/* Sentence card */}
      <div
        style={{
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-lg)',
          boxShadow: 'var(--v-shadow-md)',
          padding: 24,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <AudioButton
            audioUrl={challenge.audio_url}
            fallbackText={challenge.english}
            variant="inline"
          />
          {!revealed && (
            <button
              type="button"
              onClick={() => {
                setHintOpen((o) => !o);
                setHelpedThisCard(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                background: hintOpen ? 'var(--v-accent-soft)' : 'var(--v-surface)',
                color: hintOpen ? 'var(--v-accent)' : 'var(--v-ink-soft)',
                border: `1px solid ${hintOpen ? 'var(--v-accent)' : 'var(--v-border)'}`,
                borderRadius: 'var(--v-radius-pill)',
                fontFamily: 'var(--v-font-head)',
                fontWeight: 800,
                fontSize: 'var(--v-text-xs)',
                cursor: 'pointer',
              }}
            >
              <Lightbulb size={12} /> {hintOpen ? 'Ẩn gợi ý' : 'Trợ giúp'}
            </button>
          )}
          {hintOpen && !revealed && (
            <span
              style={{
                padding: '3px 10px',
                background: 'var(--v-accent-soft)',
                color: 'var(--v-accent)',
                borderRadius: 'var(--v-radius-pill)',
                fontFamily: 'var(--v-font-mono)',
                fontSize: 'var(--v-text-xs)',
                fontWeight: 800,
                letterSpacing: 'var(--v-tracking-wide)',
              }}
            >
              {challenge.english}
            </span>
          )}
        </div>

        <div
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 'var(--v-text-2xl)',
            lineHeight: 1.5,
            color: 'var(--v-ink)',
            marginBottom: 8,
          }}
        >
          {revealed ? (
            <SentenceWithHighlight
              sentence={challenge.full_sentence}
              targetWord={challenge.english}
              correct={
                mode === 'typing'
                  ? input.trim().toLowerCase() === challenge.english.toLowerCase()
                  : selectedIdx !== null && options[selectedIdx] === challenge.english
              }
            />
          ) : (
            challenge.blanked_sentence
          )}
        </div>

        {challenge.vi_sentence && (
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 'var(--v-text-md)',
              color: 'var(--v-muted)',
              fontStyle: 'italic',
            }}
          >
            {challenge.vi_sentence}
          </div>
        )}
      </div>

      {/* Input or options */}
      {!revealed ? (
        mode === 'typing' ? (
          <div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Điền từ..."
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-xl)',
                  fontWeight: 700,
                  background: 'var(--v-bg)',
                  border: '2px solid var(--v-primary)',
                  borderRadius: 'var(--v-radius-md)',
                  color: 'var(--v-ink)',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const guess = input.trim().toLowerCase();
                  const ans = challenge.english.trim().toLowerCase();
                  void handleSubmit(guess === ans);
                }}
                style={{
                  padding: '14px 22px',
                  background: 'var(--v-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--v-radius-md)',
                  boxShadow: 'var(--v-press), 0 6px 14px rgba(122,193,67,0.4)',
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 900,
                  fontSize: 'var(--v-text-base)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                KIỂM TRA
              </button>
            </div>
            <p
              style={{
                textAlign: 'center',
                color: 'var(--v-muted)',
                fontSize: 'var(--v-text-xs)',
                marginTop: 10,
              }}
            >
              Enter để kiểm tra
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSelectedIdx(idx);
                  void handleSubmit(opt === challenge.english);
                }}
                style={{
                  padding: '18px 14px',
                  background: 'var(--v-surface)',
                  color: 'var(--v-ink)',
                  border: '2px solid var(--v-primary)',
                  borderRadius: 'var(--v-radius-md)',
                  boxShadow: 'var(--v-shadow-sm)',
                  fontFamily: 'var(--v-font-head)',
                  fontWeight: 800,
                  fontSize: 'var(--v-text-lg)',
                  cursor: 'pointer',
                  minHeight: 64,
                  position: 'relative',
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
              </button>
            ))}
          </div>
        )
      ) : (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
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
            onClick={handleNext}
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

      {reviewOpen && currentCardId !== undefined && (
        <WordReviewModal cardId={currentCardId} onClose={() => setReviewOpen(false)} />
      )}
    </div>
  );
}

function buildOptions(correct: string, distractors: string[]): string[] {
  const all = [correct, ...distractors];
  // Deterministic shuffle by correct word hash so re-render doesn't reshuffle
  const seed = correct.length * 7 + correct.charCodeAt(0);
  return all
    .map((v, i) => ({ v, k: (i + 1) * ((seed % 13) + 1) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.v);
}

function SentenceWithHighlight({
  sentence,
  targetWord,
  correct,
}: {
  sentence: string;
  targetWord: string;
  correct: boolean;
}) {
  const idx = sentence.toLowerCase().indexOf(targetWord.toLowerCase());
  if (idx === -1) return <>{sentence}</>;
  const before = sentence.slice(0, idx);
  const match = sentence.slice(idx, idx + targetWord.length);
  const after = sentence.slice(idx + targetWord.length);
  return (
    <>
      {before}
      <span
        style={{
          padding: '2px 8px',
          background: correct ? 'var(--v-primary)' : 'var(--v-red)',
          color: '#fff',
          borderRadius: 'var(--v-radius-sm)',
          fontWeight: 900,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {correct ? <Check size={14} /> : <X size={14} />}
        {match}
      </span>
      {after}
    </>
  );
}
