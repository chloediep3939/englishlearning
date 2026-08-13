'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import TypingStage from './TypingStage';
import ListeningStage from './ListeningStage';
import FlipStage from './FlipStage';
import RevealStage from './RevealStage';
import SummaryScreen from './SummaryScreen';
import { TimerChip, TimeUpOverlay, useSessionTimer } from '@/components/common/SessionTimer';
import type { Flashcard } from '@/lib/types';
import { calculateNextReview } from '@/lib/flashcards/srs';
import { speak, getStoredVoicePreference } from '@/lib/tts';
import {
  REQUEUE_OFFSET,
  REVEAL_AUDIO_START_DELAY_MS,
  type Phase,
  type Quality,
  type SessionAudioSettings,
  type SessionConfig,
  type SessionListeningSettings,
} from './types';

interface Props {
  /** Server-built queue from /api/study/session. Order is preserved
   *  for the initial queue. */
  cards: Flashcard[];
  config: SessionConfig;
  /** Recognition-only deck group ("Chỉ hiểu nghĩa"): the prompt stage is an
   *  EN→VI flip (FlipStage) instead of typed VI→EN recall, and the reveal
   *  hides the char-diff. SRS scheduling is identical either way. */
  recognition?: boolean;
  /** Reveal-autoplay settings (autoplay on/off, repeat count, gap, rate). */
  audio: SessionAudioSettings;
  /** Listening-question settings (enabled + % ratio for review cards). */
  listening: SessionListeningSettings;
  /** Time-boxed session length in minutes (25/45); null = count-based. */
  durationMin?: number | null;
  /** Fired when the user clicks "Học thêm phiên nữa" on the summary —
   *  the parent should re-fetch candidates and re-mount the setup screen. */
  onAnotherSession: () => void;
}

/**
 * Anki-like session orchestrator (study-unified A3). Owns:
 *   - the queue (read from front, mutated immutably)
 *   - the prompt↔reveal phase machine (typed recall, or flip on recognition decks)
 *   - per-card audio autoplay loop
 *   - key bindings (1-4 + Enter + Escape)
 *   - the SRS rating POST to /api/cards/:id/rate
 *
 * Queue logic (post-rate):
 *   q=0 (LẠI) → pop + reinsert at offset +2
 *   q=2 (KHÓ) → pop + reinsert at offset +4
 *   q=4 (TỐT) / q=5 (DỄ) → remove from queue (mastered.add)
 *
 * SRS apply protocol (apply_srs flag on /api/cards/:id/rate):
 *   - the FIRST rating of a card in this session → applied (mutates SRS).
 *   - every later rating of the same card       → log-only
 *     (flashcard_reviews row with srs_applied=0, no schedule change).
 * Consequence: a card's schedule is decided by its first answer; the
 * re-queue loop afterwards is purely in-session reinforcement.
 *
 * Reload mid-session: state is in memory only. Acceptable v1 trade-off.
 */
export default function FlashcardSession({ cards, config, recognition = false, audio, listening, durationMin = null, onAnotherSession }: Props) {
  const router = useRouter();

  // initialCount is captured once at mount so the progress display
  // doesn't drift when LẠI/KHÓ cards re-enter the queue.
  const [initialCount] = useState(cards.length);
  const [queue, setQueue] = useState<Flashcard[]>(cards);
  const [mastered, setMastered] = useState<Set<number>>(new Set());
  const [qualityCounts, setQualityCounts] = useState<Record<Quality, number>>({
    0: 0, 2: 0, 4: 0, 5: 0,
  });
  // Per-card session-scoped wrong-tracker. Once a card receives quality=0
  // in this session its id lands here and stays through the rest of the
  // session — threads into previewIntervals so the "ôn sau X" hints stay
  // honest. Resets on mount → next session starts clean.
  const failedThisSessionRef = useRef<Set<number>>(new Set());
  // First-rating-per-session guard: ids of cards already rated once. Only
  // the first rating mutates SRS state; later ratings are log-only.
  const ratedOnceRef = useRef<Set<number>>(new Set());

  const [phase, setPhase] = useState<Phase>('TYPING');
  // Prompt variant for the current card appearance: VI→EN typed recall or
  // audio→type listening. Rolled per appearance (see the layout effect below).
  const [promptKind, setPromptKind] = useState<'typing' | 'listening'>('typing');
  const [input, setInput] = useState('');
  const [submittedGuess, setSubmittedGuess] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoplayCount, setAutoplayCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef<number>(Date.now());
  // Wall-clock timestamp of the last TYPING→REVEAL transition. Enter
  // rating is suppressed for ~350ms after to absorb a held / auto-repeated
  // Enter that came from the TypingStage submit — otherwise the second
  // keydown bubbles to the window listener, fires handleRate(0), and
  // re-queues the card before the user ever sees the reveal panel.
  const revealEnteredAt = useRef<number>(0);

  // Time-boxed mode: countdown + "hết giờ" gate. Stopping ends the session
  // early (summary shows progress so far); continuing loops the duration.
  const timer = useSessionTimer(durationMin);
  const [timeStopped, setTimeStopped] = useState(false);

  const current = queue[0];
  const done = queue.length === 0 || timeStopped;
  // Recognition flip has no guess — treat as "correct" so the Enter default
  // on reveal is TỐT (self-grade flow), matching the flip-and-self-grade UX.
  const isCorrect = recognition
    ? true
    : !!current && input.trim().toLowerCase() === current.english.toLowerCase();
  const progressPct = initialCount > 0 ? (mastered.size / initialCount) * 100 : 0;

  // Roll the prompt kind each time a card enters the prompt phase. Only
  // review cards (status !== 'new') on non-recognition decks are eligible —
  // a never-seen word can't be recognized by ear. Math.random is intentional
  // (per-appearance roll; a LẠI/KHÓ requeue may come back as the other kind).
  // useLayoutEffect so the swap lands before paint — a plain useEffect would
  // flash the VI prompt for a frame and leak the hint.
  useLayoutEffect(() => {
    if (phase !== 'TYPING') return;
    const eligible =
      !recognition && listening.enabled && !!current && current.status !== 'new';
    setPromptKind(
      eligible && Math.random() * 100 < listening.ratio ? 'listening' : 'typing'
    );
    // current?.id (primitive) instead of the object — same reasoning as the
    // autoplay effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, current?.id, recognition, listening.enabled, listening.ratio]);

  // Autofocus on each new card's typing phase (typed variant only).
  useEffect(() => {
    if (!recognition && phase === 'TYPING' && inputRef.current) {
      inputRef.current.focus();
    }
    // current?.id covers the case where the queue head changes via
    // reinsert (same length) without phase changing.
  }, [phase, current?.id, recognition]);

  // Auto-play audio `audio.readCount` times on reveal entry (gated by the
  // `autoplay_audio` setting). Falls back to TTS if dictionary audio fails,
  // and is cancellable when the user advances or unmounts mid-play.
  useEffect(() => {
    if (phase !== 'REVEAL' || !current || !audio.autoplay) return;

    setAutoplayCount(0);
    let cancelled = false;
    let count = 0;
    const { english: word } = current;
    // Stored Oxford US mp3 (R2, served by /api/audio/[cardId]) — same source
    // as AudioButton. Phrases never store audio (browser TTS by design), and
    // a failed/never-fetched card has no file — both fall through to TTS.
    // If the file 404s / stalls anyway, per-play error handlers fall back.
    const oxfordUrl =
      current.audio_us_status === 'ok' && !/\s/.test(word.trim())
        ? `/api/audio/${current.id}?v=${encodeURIComponent(current.updated_at ?? '')}`
        : null;
    let currentAudio: HTMLAudioElement | null = null;

    function playOnce() {
      if (cancelled || count >= audio.readCount) return;
      count++;
      setAutoplayCount(count);

      const onComplete = () => {
        if (!cancelled) setTimeout(playOnce, audio.gapMs);
      };

      if (oxfordUrl) {
        try {
          const el = new Audio(oxfordUrl);
          currentAudio = el;
          // Recorded audio outside 0.5–1.5x sounds garbled — same clamp as
          // playAudioUrl in @/lib/tts.
          el.playbackRate = Math.min(1.5, Math.max(0.5, audio.wordRate));
          el.onended = onComplete;
          el.onerror = () => {
            // eslint-disable-next-line no-console
            console.warn('[autoplay] Oxford mp3 failed, fallback TTS:', oxfordUrl);
            speakTTS();
          };
          el.play().catch(() => speakTTS());
          return;
        } catch {
          speakTTS();
          return;
        }
      }
      speakTTS();

      function speakTTS() {
        // Shared helper: honors voice_preference, does the wait-for-voices
        // dance, and fires onDone even when speechSynthesis is unavailable.
        speak(word, {
          lang: 'en-US',
          rate: audio.wordRate,
          voice_preference: getStoredVoicePreference(),
          onDone: onComplete,
        });
      }
    }

    const startTimer = setTimeout(playOnce, REVEAL_AUDIO_START_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      if (currentAudio) {
        try {
          currentAudio.pause();
        } catch {}
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
    };
    // Depend on current?.id (primitive) instead of the Flashcard object —
    // if the parent re-syncs cards from a router.refresh, the
    // object identity can change for the same card and the effect would
    // re-fire, cleanup-cancel the in-flight audio, and the autoplay would
    // never produce sound. Audio settings are primitives and fixed for the
    // session (resolved server-side), so listing them is safe.
  }, [phase, current?.id, audio.autoplay, audio.readCount, audio.gapMs, audio.wordRate]);

  const handleRate = useCallback(
    (quality: Quality) => {
      if (!current) return;

      // Always log the SRS rating — the queue loop is purely UI; the
      // DB always sees every signal.
      setQualityCounts((prev) => ({ ...prev, [quality]: prev[quality] + 1 }));

      if (quality === 0) {
        failedThisSessionRef.current.add(current.id);
      }
      const failedThisSession = failedThisSessionRef.current.has(current.id);

      // SRS-apply protocol:
      //   - first rating of a card this session → applied
      //   - every LẠI → applied (each lapse decays the schedule again)
      //   - the evicting TỐT/DỄ of a card that lapsed earlier this session
      //     → applied (relearn graduation: 9 ngày → sai 1 lần → ~2 ngày →
      //     sai 2 lần → 1 ngày). Everything else is log-only.
      const isFirstRating = !ratedOnceRef.current.has(current.id);
      ratedOnceRef.current.add(current.id);
      const applySrs =
        isFirstRating || quality === 0 || (quality >= 4 && failedThisSession);

      // Queue rule (A3): TỐT/DỄ leave the queue, LẠI/KHÓ requeue.
      const shouldMaster = quality >= 4;

      void fetch(`/api/cards/${current.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quality,
          failed_this_session: failedThisSession,
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

      // Queue movement — TỐT/DỄ evict, LẠI/KHÓ requeue at their offsets.
      if (shouldMaster) {
        setMastered((prev) => {
          const next = new Set(prev);
          next.add(current.id);
          return next;
        });
        setQueue((prev) => prev.slice(1));
      } else {
        // Reinsert at offset 2 (LẠI) or 4 (KHÓ), counted from the head of
        // the post-pop queue. min(offset, rest.length) clamps to "append
        // to end" when the queue is shorter than the offset.
        // When this rating was SRS-applied, reinsert the card with its NEW
        // SRS state (mirrors what the server just persisted, minus fuzz) so
        // the "ôn sau X" button labels on its next appearance reflect the
        // lapse instead of the stale session-start snapshot.
        const requeued = applySrs
          ? (() => {
              const upd = calculateNextReview(current, quality, {
                failedThisSession,
                fuzz: false,
              });
              return {
                ...current,
                status: upd.status,
                ease_factor: upd.ease_factor,
                interval_days: upd.interval_days,
                repetitions: upd.repetitions,
              };
            })()
          : current;
        const offset = REQUEUE_OFFSET[quality]!;
        setQueue((prev) => {
          const rest = prev.slice(1);
          const insertAt = Math.min(offset, rest.length);
          return [...rest.slice(0, insertAt), requeued, ...rest.slice(insertAt)];
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
      if (queue.length === 1 && shouldMaster) {
        router.refresh();
      }
    },
    [current, queue.length, router]
  );

  // Submit takes the raw value so callers (input keydown + button click)
  // can hand it in directly instead of relying on closure state — that
  // race was what made Enter feel "dead" after a fast type → Enter sequence.
  //
  // Empty input is allowed: pressing Enter without typing reveals the
  // answer directly (the char-diff renders the whole answer as "missed"
  // characters). Acts as a "I don't know, show me" affordance.
  const handleSubmitAnswer = useCallback((raw: string) => {
    setSubmittedGuess(raw.trim());
    setPhase('REVEAL');
    revealEnteredAt.current = Date.now();
  }, []);

  // Window listener: Escape + REVEAL-phase keys. TYPING+Enter is owned by
  // the <input onKeyDown> in the typed variant; the recognition flip has no
  // input, so Enter-to-reveal is handled here instead.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Suspended while the time-up overlay is open so Enter can't rate a
      // card behind the dialog.
      if (done || (timer.enabled && timer.expired)) return;
      if (e.key === 'Escape') {
        if (window.confirm('Thoát luôn?')) router.push('/dashboard');
        return;
      }
      if (recognition && phase === 'TYPING' && e.key === 'Enter') {
        e.preventDefault();
        handleSubmitAnswer('');
        return;
      }
      if (phase === 'REVEAL') {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (Date.now() - revealEnteredAt.current < 350) return;
          handleRate(isCorrect ? 4 : 0);
        } else if (e.key === '1') handleRate(0);
        else if (e.key === '2') handleRate(2);
        else if (e.key === '3') handleRate(4);
        else if (e.key === '4') handleRate(5);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, done, handleRate, handleSubmitAnswer, router, isCorrect, recognition, timer.enabled, timer.expired]);

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
    // Full width per user preference — the session content fills <main>
    // (the 960px cap tried earlier felt too narrow on wide screens).
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
        {timer.enabled && <TimerChip secondsLeft={timer.secondsLeft} />}
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

      {phase === 'TYPING' && recognition && (
        <FlipStage card={current} onReveal={() => handleSubmitAnswer('')} />
      )}

      {phase === 'TYPING' && !recognition && promptKind === 'listening' && (
        <ListeningStage
          card={current}
          input={input}
          setInput={setInput}
          inputRef={inputRef}
          onSubmit={handleSubmitAnswer}
          wordRate={audio.wordRate}
        />
      )}

      {phase === 'TYPING' && !recognition && promptKind === 'typing' && (
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
          hideGuess={recognition}
          autoplayCount={autoplayCount}
          autoplayTotal={audio.autoplay ? audio.readCount : 0}
          onRate={handleRate}
          ratingRowLabel={config.ratingRowLabel}
          failedThisSession={failedThisSessionRef.current.has(current.id)}
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

      {timer.enabled && timer.expired && durationMin != null && (
        <TimeUpOverlay
          durationMin={durationMin}
          onContinue={timer.restart}
          onStop={() => setTimeStopped(true)}
        />
      )}
    </div>
  );
}
