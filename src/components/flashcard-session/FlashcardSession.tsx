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
 * Queue logic (post-rate, gated by the session mastery threshold —
 * see calculateMastery below and the matching DB-side gate in
 * `src/lib/flashcards/srs.ts`):
 *   q=5 (DỄ)  → always pop + mastered.add(card.id)
 *   q=0 (LẠI) → reset card's correctCount; pop + reinsert at offset +2
 *   q=2 (KHÓ) → increment correctCount; if gate passes pop+master,
 *                else pop + reinsert at offset +4
 *   q=4 (TỐT) → increment correctCount; if gate passes pop+master,
 *                else pop + reinsert at offset +6
 *
 * Mastery gate: correctCount >= 3, OR correctCount >= 2 AND the learner
 * has NOT received a q=0 on this card in the current session. Matches
 * srs.ts so the session UI counter and the DB `status` agree.
 *
 * SRS apply protocol (apply_srs flag on /api/cards/:id/rate):
 *   - LẠI (q=0)            → ALWAYS applied (a lapse is a lapse, even if the
 *                            card was rated Tốt two minutes earlier).
 *   - gate-passing rating  → applied (the card's FINAL verdict this session).
 *   - intermediate ratings → log-only (flashcard_reviews row, no SRS mutation).
 * Consequence: quitting mid-session leaves unfinished cards untouched — new
 * cards stay 'new' and reappear in /study; due cards stay due. Every rating
 * is still logged either way.
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
  // Per-card session-scoped wrong-tracker. Once a card receives quality=0
  // in this session its id lands here and stays through the rest of the
  // session, bumping the mastery threshold from 2 corrects to 3. Resets
  // on mount → next session starts clean.
  const failedThisSessionRef = useRef<Set<number>>(new Set());
  // Per-card running count of non-zero ratings (q=2/4/5) since the last
  // q=0 reset. The session mastery gate compares this against 2 (clean
  // run) or 3 (had a wrong) — see calculateMastery in handleRate. Resets
  // to 0 whenever the card gets q=0.
  const correctCountRef = useRef<Map<number, number>>(new Map());

  const [phase, setPhase] = useState<Phase>('TYPING');
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
      if (cancelled || count >= AUDIO_AUTOPLAY_COUNT) return;
      count++;
      setAutoplayCount(count);

      const onComplete = () => {
        if (!cancelled) setTimeout(playOnce, AUDIO_PAUSE_MS);
      };

      if (oxfordUrl) {
        try {
          const audio = new Audio(oxfordUrl);
          currentAudio = audio;
          audio.onended = onComplete;
          audio.onerror = () => {
            // eslint-disable-next-line no-console
            console.warn('[autoplay] Oxford mp3 failed, fallback TTS:', oxfordUrl);
            speakTTS();
          };
          audio.play().catch(() => speakTTS());
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
        const synth = window.speechSynthesis;
        const doSpeak = () => {
          try {
            synth.cancel();
            const u = new SpeechSynthesisUtterance(word);
            u.lang = 'en-US';
            u.rate = 1;
            u.onend = onComplete;
            u.onerror = onComplete;
            synth.speak(u);
          } catch {
            onComplete();
          }
        };
        // Chrome on first page load returns [] until voiceschanged fires.
        // Calling speak() with no voices produces no sound (bug, not spec).
        // Mirror the wait-for-voices dance the `speak()` helper already does.
        if (synth.getVoices().length === 0) {
          synth.addEventListener('voiceschanged', doSpeak, { once: true });
          synth.getVoices();
        } else {
          doSpeak();
        }
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
    // when SessionFlow re-syncs candidates from a router.refresh, the
    // object identity can change for the same card and the effect would
    // re-fire, cleanup-cancel the in-flight audio, and the autoplay would
    // never produce sound.
  }, [phase, current?.id]);

  const handleRate = useCallback(
    (quality: Quality) => {
      if (!current) return;

      // Always log the SRS rating — the queue loop is purely UI; the
      // DB always sees every signal.
      setQualityCounts((prev) => ({ ...prev, [quality]: prev[quality] + 1 }));

      // Maintain session-scoped tracking BEFORE we read it for the
      // mastery gate below.
      if (quality === 0) {
        failedThisSessionRef.current.add(current.id);
        correctCountRef.current.set(current.id, 0);
      } else {
        const prev = correctCountRef.current.get(current.id) ?? 0;
        correctCountRef.current.set(current.id, prev + 1);
      }
      const failedThisSession = failedThisSessionRef.current.has(current.id);
      const correctCount = correctCountRef.current.get(current.id) ?? 0;

      // Session gate — decides both queue eviction AND whether this rating
      // is the card's final (SRS-applied) verdict for the session.
      const shouldMaster =
        quality === 5 ||
        correctCount >= 3 ||
        (correctCount >= 2 && !failedThisSession);

      // Apply SRS on: every LẠI (lapse must always count), and the
      // gate-passing final rating. Intermediate ratings are log-only, so
      // quitting mid-session leaves the card's schedule untouched.
      const applySrs = quality === 0 || shouldMaster;

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

      // Queue movement — `shouldMaster` computed above (it also decided
      // whether the rating was SRS-applied):
      //   - q=5 (DỄ)                                 → evict immediately
      //   - correctCount >= 2 AND no fail this run   → evict (clean run)
      //   - correctCount >= 3                        → evict (had a wrong)
      //   - else                                     → requeue
      if (shouldMaster) {
        setMastered((prev) => {
          const next = new Set(prev);
          next.add(current.id);
          return next;
        });
        setQueue((prev) => prev.slice(1));
      } else {
        // Reinsert at offset 2 (LẠI), 4 (KHÓ), or 6 (TỐT not-yet-mastered),
        // counted from the head of the post-pop queue. min(offset,
        // rest.length) clamps to "append to end" when the queue is
        // shorter than the offset.
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
    </div>
  );
}
