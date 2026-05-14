'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowDown, BookOpen, Heart, Sparkles, ExternalLink } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import POSPill from '@/components/common/POSPill';
import AudioButton from './AudioButton';
import { previewIntervals, intervalLabel } from '@/lib/flashcards/srs';
import type { Flashcard } from '@/lib/types';

interface Props {
  cards: Flashcard[];
}

// Two-phase flow per design: typing → reveal+rate (combined on one screen).
// The legacy three-phase model (PROMPT/REVEAL/RATE with an extra "TỰ ĐÁNH GIÁ"
// button) was extra friction not present in the V2 mockup.
type Phase = 'TYPING' | 'REVEAL';
type Quality = 0 | 2 | 4 | 5;

interface Rating {
  quality: Quality;
  label: string;
  emoji: string;
  bg: string;
  key: '1' | '2' | '3' | '4';
}

// "Ôn sau X" sub-copy is computed per-card from previewIntervals — see RevealStage.
const RATINGS: Rating[] = [
  { quality: 0, label: 'LẠI', emoji: '😵', bg: 'var(--v-red)',     key: '1' },
  { quality: 2, label: 'KHÓ', emoji: '😬', bg: 'var(--v-orange)',  key: '2' },
  { quality: 4, label: 'TỐT', emoji: '😊', bg: 'var(--v-primary)', key: '3' },
  { quality: 5, label: 'DỄ',  emoji: '🎉', bg: 'var(--v-blue)',    key: '4' },
];

// How many times to auto-replay the word audio when entering reveal phase
// (copied behavior from the my-portfolio reference). 6 plays at 300ms pause
// gives enough exposure for a learner to hear pronunciation drift.
const AUDIO_AUTOPLAY_COUNT = 6;
const AUDIO_PAUSE_MS = 300;
const REVEAL_AUDIO_START_DELAY_MS = 250;

export default function ReviewSession({ cards: initial }: Props) {
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

  // Auto-play audio AUDIO_AUTOPLAY_COUNT times on reveal entry (copied from
  // my-portfolio reference). Falls back to TTS if dictionary audio fails, and
  // is cancellable when the user advances or unmounts mid-play.
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

  // advance accepts the just-rated card so that "Lại" (quality=0) re-appends
  // it to the queue — the learner has to nail it before the session ends.
  // Copied behavior from the my-portfolio reference.
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
      advance(quality === 0 ? current : null);
    },
    [current, advance]
  );

  // Submit takes the raw value so callers (input keydown + button click) can
  // hand it in directly instead of relying on closure state — that race was
  // what made Enter feel "dead" after a fast type → Enter sequence.
  const handleSubmitAnswer = useCallback(
    (raw: string) => {
      const v = raw.trim();
      if (v.length === 0) return;
      setSubmittedGuess(v);
      setPhase('REVEAL');
    },
    []
  );

  // Window listener: only Escape + REVEAL-phase keys. TYPING+Enter is owned
  // by the <input onKeyDown> so we don't need to handle it here (and avoid
  // the closure-staleness race entirely).
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
    return <Summary total={total} ratings={ratings} startedAt={startedAt.current} />;
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
              background: 'linear-gradient(90deg, var(--v-primary), var(--v-primary-deep))',
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

      {phase === 'TYPING' && <TypingStage card={current} input={input} setInput={setInput} inputRef={inputRef} onSubmit={handleSubmitAnswer} />}

      {phase === 'REVEAL' && (
        <RevealStage
          card={current}
          guess={submittedGuess}
          isCorrect={isCorrect}
          autoplayCount={autoplayCount}
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

// ─── Typing phase ─────────────────────────────────────────────────────────
function TypingStage({
  card, input, setInput, inputRef, onSubmit,
}: {
  card: Flashcard;
  input: string;
  setInput: (s: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: (value: string) => void;
}) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 22,
        padding: '20px 0',
      }}
    >

      {/* Polaroid image (if card has one) — show the whole photo (contain),
          aspect 16:9 matches typical Pexels landscape so letterboxing is minor. */}
      {card.image_url && (
        <div style={{ position: 'relative', transform: 'rotate(-1.5deg)', zIndex: 1 }}>
          <div
            style={{
              background: '#fff',
              padding: 8,
              borderRadius: 12,
              boxShadow: '0 8px 22px rgba(40,30,15,0.1), 0 2px 4px rgba(40,30,15,0.06)',
            }}
          >
            <div
              style={{
                width: 320,
                aspectRatio: '16 / 9',
                background: 'var(--v-panel)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.image_url}
                alt={card.english}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Speech-bubble prompt */}
      <div style={{ position: 'relative', maxWidth: 620, zIndex: 1 }}>
        <div
          style={{
            background: 'var(--v-primary-soft)',
            color: 'var(--v-ink)',
            padding: '18px 30px',
            borderRadius: 28,
            border: '1px solid rgba(122,193,67,0.3)',
            boxShadow: '0 4px 0 rgba(122,193,67,0.18), 0 6px 18px rgba(122,193,67,0.15)',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Sparkles size={14} color="var(--v-primary)" fill="var(--v-primary)" strokeWidth={2.4} />
            <span
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--v-primary)',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              Hãy dịch giúp mình
            </span>
            <Sparkles size={14} color="var(--v-primary)" fill="var(--v-primary)" strokeWidth={2.4} />
          </div>
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 26,
              fontWeight: 900,
              color: 'var(--v-ink)',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}
          >
            &ldquo;{card.vietnamese}&rdquo;
          </div>
          {/* Tail */}
          <div
            style={{
              position: 'absolute',
              bottom: -10,
              left: '50%',
              width: 22,
              height: 22,
              background: 'var(--v-primary-soft)',
              borderRight: '1px solid rgba(122,193,67,0.3)',
              borderBottom: '1px solid rgba(122,193,67,0.3)',
              borderRadius: '0 0 8px 0',
              transform: 'translateX(-50%) rotate(45deg)',
            }}
          />
        </div>
      </div>

      {/* Input + button */}
      <div style={{ width: '100%', maxWidth: 560, zIndex: 1 }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Bind Enter directly on the input AND read value from the DOM
            // (not React state) — sidesteps any closure-staleness race on a
            // fast type → Enter sequence.
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit(e.currentTarget.value);
            }
          }}
          placeholder="Gõ tiếng Anh…"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          style={{
            width: '100%',
            padding: '18px 22px',
            fontSize: 21,
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            background: 'var(--v-surface)',
            border: '2px solid var(--v-primary)',
            borderRadius: 18,
            boxShadow: '0 4px 0 rgba(122,193,67,0.2), 0 6px 14px rgba(122,193,67,0.18)',
            color: 'var(--v-ink)',
            outline: 'none',
            letterSpacing: '0.02em',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => onSubmit(input)}
            disabled={input.trim().length === 0}
            style={{
              padding: '12px 32px',
              background: 'var(--v-primary)',
              color: '#fff',
              border: 'none',
              boxShadow: '0 4px 0 rgba(60,20,5,0.18), 0 6px 14px rgba(122,193,67,0.3)',
              borderRadius: 16,
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: '0.04em',
              cursor: input.trim().length === 0 ? 'not-allowed' : 'pointer',
              opacity: input.trim().length === 0 ? 0.5 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            KIỂM TRA <ArrowRight size={16} strokeWidth={3} />
          </button>
        </div>
        <div
          style={{
            marginTop: 12,
            textAlign: 'center',
            fontFamily: 'var(--v-font-body)',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--v-muted)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Heart size={13} color="var(--v-red)" fill="var(--v-red)" />
          Không nhớ? Cứ đoán — sai không sao đâu!
        </div>
      </div>
    </div>
  );
}

// ─── Reveal + rate (combined) ─────────────────────────────────────────────
function RevealStage({
  card, guess, isCorrect, autoplayCount, onRate,
}: {
  card: Flashcard;
  guess: string;
  isCorrect: boolean;
  autoplayCount: number;
  onRate: (q: Quality) => void;
}) {
  // Colored bullet rotation for collocations (design pattern).
  const COLL_COLORS = ['var(--v-pink)', 'var(--v-teal)', 'var(--v-yellow-deep)'];
  const intervals = previewIntervals(card);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Big word header */}
      <header style={{ paddingBottom: 12, borderBottom: '1px solid var(--v-border)' }}>
        <POSPill pos={card.part_of_speech} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 6, flexWrap: 'wrap' }}>
          <h1
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 50,
              fontWeight: 900,
              margin: 0,
              letterSpacing: '-0.03em',
              color: 'var(--v-ink)',
              lineHeight: 1.05,
              display: 'inline-block',
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: -2,
                right: -2,
                bottom: 2,
                height: '34%',
                background: 'var(--v-primary)',
                opacity: 0.28,
                zIndex: 0,
                borderRadius: 4,
              }}
            />
            <span style={{ position: 'relative', zIndex: 1 }}>{card.english}</span>
          </h1>
          {card.ipa && (
            <span
              style={{
                fontFamily: 'var(--v-font-mono)',
                fontSize: 15,
                color: 'var(--v-accent)',
                fontWeight: 600,
              }}
            >
              {card.ipa}
            </span>
          )}
          <div style={{ marginLeft: 'auto', alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AutoplayDots played={autoplayCount} total={AUDIO_AUTOPLAY_COUNT} />
            <AudioButton audioUrl={card.audio_url} fallbackText={card.english} size={36} />
          </div>
        </div>
      </header>

      {/* 2-column body */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 20, alignItems: 'flex-start' }}>
        {/* Left: diff + meaning + example */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <CharDiffBox guess={guess} answer={card.english} />

          {/* Meaning with orange left rail */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 5, alignSelf: 'stretch', background: 'var(--v-accent)', borderRadius: 3, flexShrink: 0 }} />
            <div>
              <div
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 11,
                  fontWeight: 900,
                  color: 'var(--v-accent)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                Nghĩa
              </div>
              <div
                style={{
                  fontFamily: 'var(--v-font-head)',
                  fontSize: 18,
                  fontWeight: 800,
                  color: 'var(--v-ink)',
                  marginTop: 2,
                }}
              >
                {card.vietnamese}
              </div>
            </div>
          </div>

          {/* First example with blue left rail, target word highlighted */}
          {card.examples[0] && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 5, alignSelf: 'stretch', background: 'var(--v-blue)', borderRadius: 3, flexShrink: 0 }} />
              <div>
                <div
                  style={{
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 11,
                    fontWeight: 900,
                    color: 'var(--v-blue)',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                  }}
                >
                  Ví dụ
                </div>
                <p
                  style={{
                    fontFamily: 'var(--v-font-head)',
                    fontSize: 16,
                    fontWeight: 800,
                    color: 'var(--v-ink)',
                    margin: '4px 0 4px',
                    lineHeight: 1.35,
                  }}
                  dangerouslySetInnerHTML={{ __html: highlightTarget(card.examples[0].en, card.english) }}
                />
                {card.examples[0].vi && (
                  <p
                    style={{
                      fontFamily: 'var(--v-font-body)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--v-ink-soft)',
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {card.examples[0].vi}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: image + collocations + lookup links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {card.image_url && (
            <div
              style={{
                background: 'var(--v-surface)',
                border: '1px solid var(--v-border)',
                boxShadow: 'var(--v-shadow-md)',
                borderRadius: 18,
                padding: 6,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16 / 9',
                  background: 'var(--v-panel)',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.image_url}
                  alt={card.english}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              </div>
            </div>
          )}

          {card.collocations.length > 0 && (
            <div>
              <div
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 11,
                  fontWeight: 900,
                  color: 'var(--v-purple)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Thường đi cùng
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {card.collocations.slice(0, 4).map((c, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'var(--v-surface)',
                      border: '1px solid var(--v-border)',
                      boxShadow: 'var(--v-shadow-sm)',
                      borderRadius: 12,
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        background: COLL_COLORS[i % COLL_COLORS.length],
                        borderRadius: 2,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'var(--v-font-body)',
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--v-ink)',
                      }}
                      dangerouslySetInnerHTML={{ __html: highlightTarget(c.phrase, card.english) }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['Oxford', 'YouGlish', 'ozdic'] as const).map((p) => (
              <a
                key={p}
                href={lookupUrl(p, card.english)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '5px 10px',
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--v-ink-soft)',
                  border: '1px solid var(--v-border)',
                  borderRadius: 999,
                  background: 'var(--v-surface)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {p} <ExternalLink size={11} />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Rating row */}
      <section style={{ borderTop: '1px solid var(--v-border)', paddingTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 12, fontWeight: 800, color: 'var(--v-ink-soft)' }}>
            Bạn thấy thế nào?{' '}
            <span style={{ fontWeight: 700, color: 'var(--v-muted)' }}>(lịch ôn lại tự điều chỉnh)</span>
          </div>
          <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 700, color: 'var(--v-muted)' }}>
            Phím <Kbd>1</Kbd>—<Kbd>4</Kbd>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {RATINGS.map((r) => {
            // Smart-Enter default = TỐT if user got it right, LẠI otherwise.
            // Outline that button so the keyboard shortcut is discoverable.
            const isDefault = (isCorrect && r.quality === 4) || (!isCorrect && r.quality === 0);
            return (
              <button
                key={r.quality}
                type="button"
                onClick={() => onRate(r.quality)}
                style={{
                  padding: '12px 14px',
                  background: r.bg,
                  border: isDefault ? '2px solid var(--v-ink)' : 'none',
                  boxShadow: '0 4px 0 rgba(60,20,5,0.15), 0 6px 14px rgba(40,30,15,0.2)',
                  borderRadius: 14,
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 21, lineHeight: 1, flexShrink: 0 }}>{r.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--v-font-head)',
                      fontSize: 14,
                      fontWeight: 900,
                      letterSpacing: '0.06em',
                      lineHeight: 1,
                    }}
                  >
                    {r.label}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--v-font-body)',
                      fontSize: 11,
                      fontWeight: 700,
                      opacity: 0.9,
                      marginTop: 2,
                    }}
                  >
                    ôn sau {intervalLabel(intervals[r.quality])}
                  </div>
                </div>
                <kbd
                  style={{
                    fontFamily: 'var(--v-font-mono)',
                    fontSize: 12,
                    fontWeight: 800,
                    background: 'rgba(0,0,0,0.18)',
                    color: '#fff',
                    borderRadius: 5,
                    padding: '2px 7px',
                    flexShrink: 0,
                  }}
                >
                  {r.key}
                </kbd>
              </button>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 10,
            textAlign: 'center',
            fontFamily: 'var(--v-font-body)',
            fontSize: 11,
            color: 'var(--v-muted)',
          }}
        >
          <Kbd>Enter</Kbd> {isCorrect ? '→ TỐT' : '→ LẠI'}
        </div>
      </section>
    </div>
  );
}

function AutoplayDots({ played, total }: { played: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i < played;
        return (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: active ? 'var(--v-primary)' : 'var(--v-border)',
              transition: 'background 200ms var(--v-ease)',
            }}
          />
        );
      })}
    </div>
  );
}

function CharDiffBox({ guess, answer }: { guess: string; answer: string }) {
  const ansLower = answer.toLowerCase();
  return (
    <div
      style={{
        background: 'var(--v-primary-soft)',
        border: '1px solid rgba(122,193,67,0.32)',
        borderRadius: 16,
        padding: '14px 18px',
        boxShadow: '0 3px 0 rgba(122,193,67,0.18), 0 6px 18px rgba(122,193,67,0.12)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--v-font-head)',
          fontSize: 12,
          fontWeight: 900,
          color: 'var(--v-primary)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 10,
          textAlign: 'center',
        }}
      >
        Bạn gõ &ldquo;{guess}&rdquo; → đáp án
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            fontFamily: 'var(--v-font-mono)',
            fontSize: 21,
            letterSpacing: '0.08em',
            display: 'flex',
            gap: 3,
          }}
        >
          {guess.split('').map((c, i) => {
            const lc = c.toLowerCase();
            const correct = ansLower[i] === lc;
            const inWord = !correct && ansLower.includes(lc);
            const color = correct
              ? 'var(--v-primary)'
              : inWord
                ? 'var(--v-orange)'
                : 'var(--v-red)';
            return (
              <span
                key={i}
                style={{
                  color,
                  fontWeight: 700,
                  textDecoration: correct ? 'none' : 'line-through',
                }}
              >
                {c}
              </span>
            );
          })}
        </div>
        <ArrowDown size={16} color="var(--v-muted)" />
        <div
          style={{
            fontFamily: 'var(--v-font-mono)',
            fontSize: 28,
            color: 'var(--v-primary)',
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          {answer}
        </div>
      </div>
      <div
        style={{
          marginTop: 12,
          display: 'flex',
          gap: 14,
          justifyContent: 'center',
          fontFamily: 'var(--v-font-body)',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--v-ink-soft)',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, background: 'var(--v-primary)', borderRadius: 2 }} />
          đúng vị trí
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, background: 'var(--v-orange)', borderRadius: 2 }} />
          sai vị trí
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, background: 'var(--v-red)', borderRadius: 2 }} />
          không có
        </span>
      </div>
    </div>
  );
}

function lookupUrl(provider: 'Oxford' | 'YouGlish' | 'ozdic', word: string): string {
  const w = encodeURIComponent(word);
  if (provider === 'Oxford') return `https://www.oxfordlearnersdictionaries.com/definition/english/${w}`;
  if (provider === 'YouGlish') return `https://youglish.com/pronounce/${w}/english`;
  return `https://www.ozdic.com/collocation/${w}`;
}

function highlightTarget(text: string, target: string): string {
  const safeTarget = target.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!safeTarget) return escapeHtml(text);
  const re = new RegExp(`(${safeTarget}\\w*)`, 'gi');
  return escapeHtml(text).replace(
    re,
    '<span style="background: var(--v-primary-soft); color: var(--v-primary); padding: 0 6px; border-radius: 5px;">$1</span>'
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function Summary({
  total, ratings, startedAt,
}: {
  total: number;
  ratings: Quality[];
  startedAt: number;
}) {
  const good = ratings.filter((q) => q >= 4).length;
  const hard = ratings.filter((q) => q < 4).length;
  const elapsedMs = Date.now() - startedAt;
  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const ratio = total > 0 ? good / total : 0;
  const pose = ratio >= 0.6 ? 'happy' : 'idle';

  return (
    <div
      style={{
        textAlign: 'center',
        padding: '2.5rem 1rem',
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-lg)',
        boxShadow: 'var(--v-shadow-md)',
        maxWidth: 640,
        margin: '0 auto',
      }}
    >
      <Mascot pose={pose} size={120} bob />
      <h2
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-3xl)',
          margin: '12px 0 18px',
          color: 'var(--v-ink)',
        }}
      >
        {ratio >= 0.6 ? 'Tuyệt vời!' : 'Xong rồi! 🎉'}
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 22,
        }}
      >
        <Stat label="Tổng số thẻ" value={String(total)} color="var(--v-ink)" />
        <Stat label="Nhớ tốt" value={String(good)} color="var(--v-primary)" />
        <Stat label="Cần luyện" value={String(hard)} color="var(--v-orange)" />
        <Stat label="Thời gian" value={`${minutes}m ${seconds}s`} color="var(--v-blue)" />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          href="/study"
          style={{
            padding: '11px 18px',
            background: 'var(--v-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--v-radius-md)',
            boxShadow: 'var(--v-press), 0 6px 14px rgba(122,193,67,0.4)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-base)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <BookOpen size={14} /> HỌC THÊM
        </Link>
        <Link
          href="/"
          style={{
            padding: '10px 18px',
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

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        padding: 14,
        background: 'var(--v-panel)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-md)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-xs)',
          fontWeight: 800,
          color: 'var(--v-muted)',
          letterSpacing: 'var(--v-tracking-wider)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-head)',
          fontSize: 'var(--v-text-2xl)',
          fontWeight: 900,
          color,
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      style={{
        fontFamily: 'var(--v-font-mono)',
        fontSize: 11,
        fontWeight: 700,
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 4,
        padding: '1px 6px',
        color: 'var(--v-muted)',
        margin: '0 2px',
      }}
    >
      {children}
    </kbd>
  );
}

