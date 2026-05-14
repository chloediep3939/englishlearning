'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import TypingStage from './TypingStage';
import RevealStage from './RevealStage';
import type { Flashcard } from '@/lib/types';
import {
  AUDIO_AUTOPLAY_COUNT,
  AUDIO_PAUSE_MS,
  REVEAL_AUDIO_START_DELAY_MS,
  type Phase,
  type Quality,
  type SessionConfig,
} from './types';

interface Props {
  cards: Flashcard[];
  config: SessionConfig;
}

/**
 * Shared session orchestrator for Review + Study. Owns the queue, the
 * typing↔reveal phase machine, per-card audio autoplay, key bindings, and
 * the SRS rating POST. Page-level variation lives in `config` —
 * see types.ts for the SessionConfig shape.
 *
 * The queue copies its input by reference; re-queue on failure mutates a
 * new array (immutable update via setQueue([...q, card])).
 *
 * Phase B will replace the queue logic with the Anki-like reinsert-at-offset
 * + mastered Set + completion screen rewrite. Today this matches the
 * pre-extraction Review behavior (re-append on q=0 when
 * config.requeueOnFail) and the pre-extraction Study behavior (no re-queue).
 */
export default function FlashcardSession({ cards: initial, config }: Props) {
  const router = useRouter();
  const [queue, setQueue] = useState<Flashcard[]>(initial);
  const [position, setPosition] = useState(0);
  const [phase, setPhase] = useState<Phase>('TYPING');
  const [input, setInput] = useState('');
  const [submittedGuess, setSubmittedGuess] = useState('');
  const [done, setDone] = useState(initial.length === 0);
  const [ratings, setRatings] = useState<Quality[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoplayCount, setAutoplayCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef<number>(Date.now());

  const current = queue[position];
  const total = queue.length;
  const progress = total > 0 ? ((position + 1) / total) * 100 : 0;
  const isCorrect = !!current && input.trim().toLowerCase() === current.english.toLowerCase();

  // Autofocus on each new card's typing phase.
  useEffect(() => {
    if (phase === 'TYPING' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase, position]);

  // Auto-play audio AUDIO_AUTOPLAY_COUNT times on reveal entry. Falls back
  // to TTS if dictionary audio fails, and is cancellable when the user
  // advances or unmounts mid-play.
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

  // advance accepts the just-rated card so that "LẠI" (quality=0) can
  // re-append it to the queue when `config.requeueOnFail` is on. Phase B
  // replaces this with reinsert-at-offset queue logic.
  const advance = useCallback(
    (failedCard: Flashcard | null) => {
      setInput('');
      setSubmittedGuess('');
      setPhase('TYPING');
      setAutoplayCount(0);

      const newQueueLen = queue.length + (failedCard ? 1 : 0);
      const newPos = position + 1;

      if (failedCard) {
        setQueue((q) => [...q, failedCard]);
      }
      if (newPos < newQueueLen) {
        setPosition(newPos);
      } else {
        setDone(true);
        router.refresh();
      }
    },
    [position, queue.length, router]
  );

  const handleRate = useCallback(
    (quality: Quality) => {
      if (!current) return;
      setRatings((r) => [...r, quality]);
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
      advance(quality === 0 && config.requeueOnFail ? current : null);
    },
    [current, advance, config.requeueOnFail]
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
        if (window.confirm('Thoát luôn?')) router.push('/');
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
    return <>{config.renderSummary({ total, ratings, startedAt: startedAt.current })}</>;
  }
  if (!current) return null;

  return (
    <div>
      {/* Top bar: slim progress + counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div
          style={{
            flex: 1,
            height: 6,
            background: 'var(--v-panel)',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: config.progressGradient,
              borderRadius: 999,
              transition: 'width 300ms var(--v-ease)',
            }}
          />
        </div>
        <span
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 11,
            fontWeight: 800,
            color: 'var(--v-muted)',
            flexShrink: 0,
            letterSpacing: '0.04em',
          }}
        >
          {position + 1} / {total}
        </span>
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
