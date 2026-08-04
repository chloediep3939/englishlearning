'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import SentencePrompt from './SentencePrompt';
import SentenceReveal from './SentenceReveal';
import { sentencesMatch } from './compare';
import SummaryScreen from '@/components/flashcard-session/SummaryScreen';
import { RATINGS, REQUEUE_OFFSET, type Phase, type Quality } from '@/components/flashcard-session/types';
import { speakTimes } from '@/lib/tts';
import type { SentenceStudyItem } from '@/lib/types';

interface Props {
  /** Server-built queue from /api/sentence-drill/session. */
  items: SentenceStudyItem[];
  /** `sentence_read_count` setting — reveal auto-read repetitions, 0 = off. */
  readCount: number;
  /** "Học thêm phiên nữa" on the summary — parent re-mounts the setup. */
  onAnotherSession: () => void;
}

/**
 * "Học câu" session orchestrator — FlashcardSession's queue machine over
 * sentences, minus the word-only stages (Oxford audio / listening / flip):
 *   - queue read from front; q=0 reinserts at +2, q=2 at +4, q≥4 removes
 *   - first rating of a sentence per session applies SRS, later ones are
 *     log-only (apply_srs=false) — same protocol as the word session
 *   - keys: 1-4 rate, Enter = smart default (correct → TỐT, wrong → LẠI)
 *   - POST /api/sentence-drill/rate per rating
 */
export default function SentenceStudySession({ items, readCount, onAnotherSession }: Props) {
  const [initialCount] = useState(items.length);
  const [queue, setQueue] = useState<SentenceStudyItem[]>(items);
  const [mastered, setMastered] = useState<Set<number>>(new Set());
  const [qualityCounts, setQualityCounts] = useState<Record<Quality, number>>({
    0: 0, 2: 0, 4: 0, 5: 0,
  });
  const failedThisSessionRef = useRef<Set<number>>(new Set());
  const ratedOnceRef = useRef<Set<number>>(new Set());

  const [phase, setPhase] = useState<Phase>('TYPING');
  const [input, setInput] = useState('');
  const [submittedGuess, setSubmittedGuess] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef<number>(Date.now());
  // Absorbs a held/auto-repeated Enter from the prompt submit — without the
  // guard the second keydown rates LẠI before the reveal is even visible.
  const revealEnteredAt = useRef<number>(0);

  const current = queue[0];
  const done = queue.length === 0;
  const isCorrect = !!current && sentencesMatch(submittedGuess, current.example.en);
  const progressPct = initialCount > 0 ? (mastered.size / initialCount) * 100 : 0;

  // Autofocus the input on each new sentence's prompt phase.
  useEffect(() => {
    if (phase === 'TYPING' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase, current?.card_id]);

  // Read the sentence aloud `readCount` times on reveal (browser TTS —
  // sentences never have stored mp3s). 0 = off. Cancelled when the user
  // advances or unmounts.
  useEffect(() => {
    if (phase !== 'REVEAL' || !current || readCount <= 0) return;
    let cancel: (() => void) | null = null;
    const t = setTimeout(() => {
      cancel = speakTimes(current.example.en, readCount);
    }, 250);
    return () => {
      clearTimeout(t);
      cancel?.();
    };
    // card_id (primitive) instead of the item object — stable identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, current?.card_id, readCount]);

  function handleSubmitAnswer(raw: string) {
    setSubmittedGuess(raw);
    setPhase('REVEAL');
    revealEnteredAt.current = Date.now();
  }

  const handleRate = useCallback(
    (quality: Quality) => {
      if (!current) return;
      const id = current.card_id;

      setQualityCounts((prev) => ({ ...prev, [quality]: prev[quality] + 1 }));

      // failed_this_session refers to lapses BEFORE this rating.
      const failedBefore = failedThisSessionRef.current.has(id);
      if (quality === 0) failedThisSessionRef.current.add(id);

      // First rating of a sentence per session mutates its schedule; every
      // later rating is log-only.
      const applySrs = !ratedOnceRef.current.has(id);
      ratedOnceRef.current.add(id);

      void fetch('/api/sentence-drill/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flashcard_id: id,
          example_index: current.example_index,
          quality,
          failed_this_session: failedBefore,
          apply_srs: applySrs,
        }),
      })
        .then((res) => {
          if (!res.ok) {
            setErrorMsg('Mạng có vẻ chậm — lần chấm vừa rồi có thể chưa lưu được.');
            setTimeout(() => setErrorMsg(null), 4000);
          }
        })
        .catch(() => {
          setErrorMsg('Không kết nối được — lần chấm vừa rồi có thể chưa lưu được.');
          setTimeout(() => setErrorMsg(null), 4000);
        });

      setQueue((prev) => {
        const rest = prev.slice(1);
        if (quality >= 4) {
          setMastered((m) => new Set(m).add(id));
          return rest;
        }
        const offset = Math.min(REQUEUE_OFFSET[quality] ?? 2, rest.length);
        return [...rest.slice(0, offset), prev[0], ...rest.slice(offset)];
      });

      setInput('');
      setSubmittedGuess('');
      setPhase('TYPING');
    },
    [current],
  );

  // Key bindings — reveal phase only (prompt owns Enter via its form).
  useEffect(() => {
    if (phase !== 'REVEAL' || done) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        if (Date.now() - revealEnteredAt.current < 350) return;
        e.preventDefault();
        handleRate(isCorrect ? 4 : 0);
        return;
      }
      const rating = RATINGS.find((r) => r.key === e.key);
      if (rating) {
        e.preventDefault();
        handleRate(rating.quality);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, done, handleRate, isCorrect]);

  if (done) {
    return (
      <SummaryScreen
        initialCount={initialCount}
        masteredCount={mastered.size}
        qualityCounts={qualityCounts}
        startedAt={startedAt.current}
        onAnotherSession={onAnotherSession}
      />
    );
  }
  if (!current) return null;

  return (
    <div>
      {/* Top bar: mastered/initial progress + queue-remaining counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 11,
            fontWeight: 800,
            color: 'var(--v-ink-soft)',
            letterSpacing: '0.04em',
          }}
        >
          {mastered.size} / {initialCount} câu thuộc
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--v-muted)',
          }}
        >
          Còn {queue.length} trong queue
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: 'var(--v-panel)',
          borderRadius: 999,
          overflow: 'hidden',
          marginBottom: 18,
        }}
      >
        <div
          style={{
            width: `${progressPct}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--v-teal), var(--v-primary))',
            borderRadius: 999,
            transition: 'width 300ms var(--v-ease)',
          }}
        />
      </div>

      {phase === 'TYPING' && (
        <SentencePrompt
          item={current}
          input={input}
          setInput={setInput}
          inputRef={inputRef}
          onSubmit={handleSubmitAnswer}
        />
      )}

      {phase === 'REVEAL' && (
        <SentenceReveal
          item={current}
          guess={submittedGuess}
          failedThisSession={failedThisSessionRef.current.has(current.card_id)}
          onRate={handleRate}
        />
      )}

      {errorMsg && (
        <div
          style={{
            marginTop: 12,
            padding: '8px 12px',
            background: 'var(--v-red)',
            color: '#fff',
            borderRadius: 'var(--v-radius-sm)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-sm)',
            textAlign: 'center',
          }}
        >
          {errorMsg}
        </div>
      )}
    </div>
  );
}
