'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import TypingStage from './TypingStage';
import RevealStage from './RevealStage';
import SummaryScreen from './SummaryScreen';
import type { Flashcard } from '@/lib/types';
import {
  AUDIO_AUTOPLAY_COUNT,
  AUDIO_PAUSE_MS,
  REQUEUE_OFFSET,
  REVEAL_AUDIO_START_DELAY_MS,
  type Phase,
  type Quality,
  type SessionConfig,
} from './types';

interface Props {
  /** The user-selected subset from SessionPicker. Order is preserved
   *  for the initial queue. */
  cards: Flashcard[];
  config: SessionConfig;
  /** Fired when the user clicks "Học thêm phiên nữa" on the summary —
   *  the parent should re-fetch candidates and re-mount the picker. */
  onAnotherSession: () => void;
}

/**
 * Anki-like session orchestrator. Owns:
 *   - the queue (read from front, mutated immutably)
 *   - the typing↔reveal phase machine
 *   - per-card audio autoplay loop
 *   - key bindings (1-4 + Enter + Escape)
 *   - the SRS rating POST to /api/cards/:id/rate
 *
 * Queue logic (post-rate):
 *   q=0 (LẠI) → pop + reinsert at offset +2 (or end if queue is shorter)
 *   q=2 (KHÓ) → pop + reinsert at offset +4 (or end)
 *   q=4 (TỐT) → pop + mastered.add(card.id)
 *   q=5 (DỄ)  → pop + mastered.add(card.id)
 *
 * SRS state is updated server-side on every rate regardless of queue
 * movement — repeated rates on the same card (e.g. LẠI then TỐT) produce
 * separate `flashcard_reviews` rows. The card's final SRS state reflects
 * the LAST rating, which matches the learner's most recent signal.
 *
 * Reload mid-session: state is in memory only. Acceptable v1 trade-off.
 */
export default function FlashcardSession({ cards, config, onAnotherSession }: Props) {
  const router = useRouter();

  // initialCount is captured once at mount so the progress display
  // doesn't drift when LẠI/KHÓ cards re-enter the queue.
  const [initialCount] = useState(cards.length);
  const [queue, setQueue] = useState<Flashcard[]>(cards);
  const [mastered, setMastered] = useState<Set<number>>(new Set());
  const [qualityCounts, setQualityCounts] = useState<Record<Quality, number>>({
    0: 0, 2: 0, 4: 0, 5: 0,
  });

  const [phase, setPhase] = useState<Phase>('TYPING');
  const [input, setInput] = useState('');
  const [submittedGuess, setSubmittedGuess] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoplayCount, setAutoplayCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef<number>(Date.now());

  const current = queue[0];
  const done = queue.length === 0;
  const isCorrect = !!current && input.trim().toLowerCase() === current.english.toLowerCase();
  const progressPct = initialCount > 0 ? (mastered.size / initialCount) * 100 : 0;

  // Autofocus on each new card's typing phase.
  useEffect(() => {
    if (phase === 'TYPING' && inputRef.current) {
      inputRef.current.focus();
    }
    // current?.id covers the case where the queue head changes via
    // reinsert (same length) without phase changing.
  }, [phase, current?.id]);

  // Auto-play audio AUDIO_AUTOPLAY_COUNT times on reveal entry. Falls
  // back to TTS if dictionary audio fails, and is cancellable when the
  // user advances or unmounts mid-play.
  useEffect(() => {
    if (phase !== 'REVEAL' || !current) return;

    setAutoplayCount(0);
    let cancelled = false;
    let count = 0;
    const { english: word, audio_url } = current;

    function playOnce() {
      if (cancelled || count >= AUDIO_AUTOPLAY_COUNT) return;
      count++;
      setAutoplayCount(count);

      const onComplete = () => {
        if (!cancelled) setTimeout(playOnce, AUDIO_PAUSE_MS);
      };

      if (audio_url) {
        try {
          const audio = new Audio(audio_url);
          audio.onended = onComplete;
          audio.onerror = speakTTS;
          audio.play().catch(speakTTS);
          return;
        } catch {
          speakTTS();
          return;
        }
      }
      speakTTS();

      function speakTTS() {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
          onComplete();
          return;
        }
        try {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(word);
          u.lang = 'en-US';
          u.rate = 0.9;
          u.onend = onComplete;
          u.onerror = onComplete;
          window.speechSynthesis.speak(u);
        } catch {
          onComplete();
        }
      }
    }

    const startTimer = setTimeout(playOnce, REVEAL_AUDIO_START_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
    };
  }, [phase, current]);

  const handleRate = useCallback(
    (quality: Quality) => {
      if (!current) return;

      // Always log the SRS rating — the queue loop is purely UI; the
      // DB always sees every signal.
      setQualityCounts((prev) => ({ ...prev, [quality]: prev[quality] + 1 }));
      void fetch(`/api/cards/${current.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quality }),
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

      // Mutate queue + mastered.
      if (quality === 4 || quality === 5) {
        setMastered((prev) => {
          const next = new Set(prev);
          next.add(current.id);
          return next;
        });
        setQueue((prev) => prev.slice(1));
      } else {
        // Reinsert at offset 2 (LẠI) or 4 (KHÓ), counted from the head
        // of the post-pop queue. min(offset, rest.length) clamps to
        // "append to end" when the queue is shorter than the offset.
        const offset = REQUEUE_OFFSET[quality]!;
        setQueue((prev) => {
          const rest = prev.slice(1);
          const insertAt = Math.min(offset, rest.length);
          return [...rest.slice(0, insertAt), current, ...rest.slice(insertAt)];
        });
      }

      // Reset typing-phase state for the next card (or trigger summary).
      setInput('');
      setSubmittedGuess('');
      setPhase('TYPING');
      setAutoplayCount(0);

      // If this rate emptied the queue, kick a router.refresh so the
      // dashboard counter widgets pick up the new SRS state on
      // back-navigation. Done condition triggers on next render via
      // queue.length === 0.
      if (queue.length === 1 && (quality === 4 || quality === 5)) {
        router.refresh();
      }
    },
    [current, queue.length, router]
  );

  // Submit takes the raw value so callers (input keydown + button click)
  // can hand it in directly instead of relying on closure state — that
  // race was what made Enter feel "dead" after a fast type → Enter sequence.
  const handleSubmitAnswer = useCallback((raw: string) => {
    const v = raw.trim();
    if (v.length === 0) return;
    setSubmittedGuess(v);
    setPhase('REVEAL');
  }, []);

  // Window listener: only Escape + REVEAL-phase keys. TYPING+Enter is
  // owned by the <input onKeyDown> so we don't need to handle it here.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return;
      if (e.key === 'Escape') {
        if (window.confirm('Thoát luôn?')) router.push('/dashboard');
        return;
      }
      if (phase === 'REVEAL') {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleRate(isCorrect ? 4 : 0);
        } else if (e.key === '1') handleRate(0);
        else if (e.key === '2') handleRate(2);
        else if (e.key === '3') handleRate(4);
        else if (e.key === '4') handleRate(5);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, done, handleRate, router, isCorrect]);

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
          {mastered.size} / {initialCount} từ thuộc
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
            background: config.progressGradient,
            borderRadius: 999,
            transition: 'width 300ms var(--v-ease)',
          }}
        />
      </div>

      {phase === 'TYPING' && (
        <TypingStage
          card={current}
          input={input}
          setInput={setInput}
          inputRef={inputRef}
          onSubmit={handleSubmitAnswer}
          promptEyebrow={config.promptEyebrow}
          inputPlaceholder={config.inputPlaceholder}
        />
      )}

      {phase === 'REVEAL' && (
        <RevealStage
          card={current}
          guess={submittedGuess}
          isCorrect={isCorrect}
          autoplayCount={autoplayCount}
          onRate={handleRate}
          ratingRowLabel={config.ratingRowLabel}
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
