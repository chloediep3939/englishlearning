'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Mic, HelpCircle, X, Volume2, RotateCcw, ArrowRight, Check } from 'lucide-react';
import Mascot from '@/components/common/Mascot';
import type { Flashcard, PronunciationAttemptMeta } from '@/lib/types';
import { isMatch } from '@/lib/pronounce/match';

interface Props {
  cards: Flashcard[];
  maxAttempts: number;    // 0 = unlimited
  onFinish: () => void;   // user clicks "Quay lại" from summary
}

type Phase = 'ready' | 'listening' | 'eval' | 'pass' | 'fail' | 'summary';

interface CardResult {
  cardId: number;
  passed: boolean;
  attempts: number;
  finalTranscripts: string[];
  helped: boolean;
  timeMs: number;
}

export default function PronounceSession({ cards, maxAttempts, onFinish }: Props) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [attempts, setAttempts] = useState(0);
  const [helpedThisCard, setHelpedThisCard] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [results, setResults] = useState<CardResult[]>([]);
  const [unsupported, setUnsupported] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const cardStartTime = useRef<number>(Date.now());
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const evalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentCard = cards[idx];

  // Refs over moving state so the event handlers we register once stay correct.
  const attemptsRef = useRef(attempts);
  const helpedRef = useRef(helpedThisCard);
  const idxRef = useRef(idx);
  const cardsRef = useRef(cards);
  const maxAttemptsRef = useRef(maxAttempts);
  useEffect(() => { attemptsRef.current = attempts; }, [attempts]);
  useEffect(() => { helpedRef.current = helpedThisCard; }, [helpedThisCard]);
  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { cardsRef.current = cards; }, [cards]);
  useEffect(() => { maxAttemptsRef.current = maxAttempts; }, [maxAttempts]);

  // Init SpeechRecognition once.
  useEffect(() => {
    const Ctor =
      (typeof window !== 'undefined' && (window.SpeechRecognition ?? window.webkitSpeechRecognition)) || null;
    if (!Ctor) {
      setUnsupported(true);
      return;
    }
    const r = new Ctor();
    r.lang = 'en-US';
    r.interimResults = false;
    r.maxAlternatives = 3;
    r.continuous = false;

    r.onresult = (event) => {
      const alts: string[] = [];
      const result = event.results[0];
      for (let i = 0; i < result.length && i < 3; i++) {
        alts.push(result[i].transcript);
      }
      handleTranscripts(alts);
    };

    r.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPermissionDenied(true);
        setPhase('ready');
      } else if (event.error === 'no-speech') {
        // Silence — do NOT count as a failed attempt
        setPhase('ready');
      } else {
        // Generic error — treat like a failed listen, allow retry
        setPhase('ready');
      }
    };

    r.onend = () => {
      setPhase((p) => (p === 'listening' ? 'ready' : p));
    };

    recognitionRef.current = r;

    return () => {
      try { r.abort(); } catch {/* noop */}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per-card reset.
  useEffect(() => {
    setAttempts(0);
    setHelpedThisCard(false);
    setHelpOpen(false);
    setTranscripts([]);
    setPhase('ready');
    cardStartTime.current = Date.now();
    if (evalTimerRef.current) {
      clearTimeout(evalTimerRef.current);
      evalTimerRef.current = null;
    }
    if (listenSafetyRef.current) {
      clearTimeout(listenSafetyRef.current);
      listenSafetyRef.current = null;
    }
  }, [idx]);

  // Listening safety timeout: if no `onresult` (and no `onerror` / `onend`)
  // fires within 5s, force back to ready. Treats as "no speech" — does NOT
  // count as a failed attempt. Mirrors what the ASR's own `no-speech` error
  // would do, but covers the case where the engine silently stalls.
  useEffect(() => {
    if (phase !== 'listening') return;
    listenSafetyRef.current = setTimeout(() => {
      try { recognitionRef.current?.abort(); } catch {/* noop */}
      setPhase('ready');
    }, 5000);
    return () => {
      if (listenSafetyRef.current) {
        clearTimeout(listenSafetyRef.current);
        listenSafetyRef.current = null;
      }
    };
  }, [phase]);

  const finishCard = useCallback(
    (passed: boolean, alts: string[], finalAttempts: number) => {
      const card = cardsRef.current[idxRef.current];
      if (!card) return;
      const timeMs = Date.now() - cardStartTime.current;
      const result: CardResult = {
        cardId: card.id,
        passed,
        attempts: finalAttempts,
        finalTranscripts: alts,
        helped: helpedRef.current,
        timeMs,
      };
      setResults((rs) => [...rs, result]);

      const meta: PronunciationAttemptMeta = {
        attempts: finalAttempts,
        transcripts: alts,
        passed,
        helped: helpedRef.current,
      };
      void fetch(`/api/cards/${card.id}/test-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'pronunciation',
          passed,
          time_ms: timeMs,
          metadata: meta,
        }),
      }).catch(() => {/* fire-and-forget */});

      setPhase(passed ? 'pass' : 'fail');

      window.setTimeout(() => {
        if (idxRef.current + 1 >= cardsRef.current.length) {
          setPhase('summary');
        } else {
          setIdx((i) => i + 1);
        }
      }, passed ? 1000 : 2200);
    },
    []
  );

  const handleTranscripts = useCallback(
    (alts: string[]) => {
      const card = cardsRef.current[idxRef.current];
      if (!card) return;
      // Stop the listening safety timer the moment a result lands.
      if (listenSafetyRef.current) {
        clearTimeout(listenSafetyRef.current);
        listenSafetyRef.current = null;
      }
      setTranscripts(alts);
      setPhase('eval');
      const matched = isMatch(alts, card.english);
      const nextAttempts = attemptsRef.current + 1;
      setAttempts(nextAttempts);

      const lim = maxAttemptsRef.current;
      if (matched) {
        finishCard(true, alts, nextAttempts);
      } else if (lim > 0 && nextAttempts >= lim) {
        finishCard(false, alts, nextAttempts);
      } else {
        // Guard the eval→ready transition with a ref so a re-render can't
        // strand us in `eval`. Always cancel any prior timer first.
        if (evalTimerRef.current) clearTimeout(evalTimerRef.current);
        evalTimerRef.current = setTimeout(() => {
          evalTimerRef.current = null;
          setPhase('ready');
        }, 1200);
      }
    },
    [finishCard]
  );

  const startListening = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) return;
    setPhase('listening');
    try {
      r.start();
    } catch (err) {
      // "already started" → InvalidStateError. Recover by aborting and
      // restarting after one tick so the ASR has time to release.
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'InvalidStateError') {
        try { r.abort(); } catch {/* noop */}
        window.setTimeout(() => {
          try { r.start(); } catch { setPhase('ready'); }
        }, 100);
      } else {
        setPhase('ready');
      }
    }
  }, []);

  const handleHelpOpen = useCallback(() => {
    setHelpOpen(true);
    setHelpedThisCard(true);
  }, []);

  const handleClose = useCallback(() => {
    if (window.confirm('Thoát luôn?')) {
      try { recognitionRef.current?.abort(); } catch {/* noop */}
      onFinish();
    }
  }, [onFinish]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase === 'summary') return;

      if (e.key === 'Escape') {
        if (helpOpen) {
          setHelpOpen(false);
        } else {
          if (window.confirm('Thoát luôn?')) {
            try { recognitionRef.current?.abort(); } catch {/* noop */}
            onFinish();
          }
        }
        return;
      }
      if (e.key === '?') {
        setHelpOpen((o) => {
          const next = !o;
          if (next) setHelpedThisCard(true);
          return next;
        });
        return;
      }
      if (helpOpen) return;
      if (e.key === ' ' && phase === 'ready') {
        e.preventDefault();
        startListening();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, helpOpen, startListening, onFinish]);

  const passCount = useMemo(() => results.filter((r) => r.passed).length, [results]);
  const helpedCount = useMemo(() => results.filter((r) => r.helped).length, [results]);

  // ===== Render branches =====

  if (unsupported) {
    return <UnsupportedBanner onFinish={onFinish} />;
  }
  if (permissionDenied) {
    return (
      <PermissionDeniedBanner
        onRetry={() => {
          setPermissionDenied(false);
          startListening();
        }}
        onFinish={onFinish}
      />
    );
  }
  if (phase === 'summary') {
    return (
      <Summary
        total={cards.length}
        passCount={passCount}
        helpedCount={helpedCount}
        onRestart={() => {
          setIdx(0);
          setResults([]);
          setPhase('ready');
        }}
        onFinish={onFinish}
      />
    );
  }
  if (!currentCard) return null;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <HeaderBar
        position={idx}
        total={cards.length}
        onHelp={handleHelpOpen}
        onClose={handleClose}
      />

      <div
        style={{
          background: 'var(--v-panel)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-md)',
          boxShadow: 'var(--v-shadow-md)',
          padding: 32,
          textAlign: 'center',
          minHeight: 360,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        {phase === 'ready' && (
          <>
            <div
              style={{
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-5xl)',
                color: 'var(--v-ink)',
                letterSpacing: 'var(--v-tracking-tight)',
                wordBreak: 'break-word',
              }}
            >
              {currentCard.english}
            </div>
            <button
              type="button"
              onClick={startListening}
              aria-label="Bấm để đọc"
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: 'var(--v-primary)',
                color: '#fff',
                border: 'none',
                boxShadow: 'var(--v-press), 0 10px 22px rgba(122,193,67,0.4)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mic size={40} strokeWidth={2.2} />
            </button>
            <div style={{ color: 'var(--v-muted)', fontSize: 'var(--v-text-sm)' }}>
              Bấm hoặc nhấn <Kbd>Space</Kbd> để đọc
            </div>
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
              {maxAttempts > 0 ? `Lần ${attempts + 1} / ${maxAttempts}` : `Lần ${attempts + 1}`}
            </div>
          </>
        )}

        {phase === 'listening' && (
          <>
            <div
              style={{
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-4xl)',
                color: 'var(--v-ink)',
              }}
            >
              {currentCard.english}
            </div>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: 'var(--v-red)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'v-mic-pulse 1.2s ease-in-out infinite',
                boxShadow: '0 0 0 0 rgba(255,87,87,0.5)',
              }}
            >
              <Mic size={40} strokeWidth={2.2} />
            </div>
            <div style={{ color: 'var(--v-ink-soft)', fontWeight: 700 }}>Đang nghe…</div>
          </>
        )}

        {phase === 'eval' && (
          <>
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
              Mình nghe được
            </div>
            <div
              style={{
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-3xl)',
                color: 'var(--v-ink)',
              }}
            >
              “{transcripts[0] ?? ''}”
            </div>
            <div style={{ color: 'var(--v-muted)', fontSize: 'var(--v-text-sm)' }}>
              Đang chấm…
            </div>
          </>
        )}

        {phase === 'pass' && (
          <>
            <Mascot pose="happy" size={120} bob />
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                background: 'var(--v-primary)',
                color: '#fff',
                borderRadius: 'var(--v-radius-pill)',
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-lg)',
              }}
            >
              <Check size={18} strokeWidth={3} /> Tốt!
            </div>
            <div
              style={{
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-2xl)',
                color: 'var(--v-ink)',
              }}
            >
              {currentCard.english}
            </div>
          </>
        )}

        {phase === 'fail' && (
          <>
            <Mascot pose="idle" size={120} />
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
              Đáp án
            </div>
            <div
              style={{
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 'var(--v-text-4xl)',
                color: 'var(--v-ink)',
              }}
            >
              {currentCard.english}
            </div>
            {currentCard.ipa && (
              <div
                style={{
                  fontFamily: 'var(--v-font-mono)',
                  fontSize: 'var(--v-text-md)',
                  color: 'var(--v-accent)',
                }}
              >
                {currentCard.ipa}
              </div>
            )}
          </>
        )}
      </div>

      {helpOpen && (
        <HelpPanel
          card={currentCard}
          onClose={() => setHelpOpen(false)}
        />
      )}

      <style jsx global>{`
        @keyframes v-mic-pulse {
          0% { box-shadow: 0 0 0 0 rgba(255,87,87,0.55); }
          70% { box-shadow: 0 0 0 18px rgba(255,87,87,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,87,87,0); }
        }
      `}</style>
    </div>
  );
}

function HeaderBar({
  position, total, onHelp, onClose,
}: {
  position: number; total: number; onHelp: () => void; onClose: () => void;
}) {
  const pct = ((position + 1) / total) * 100;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span
          style={{
            fontSize: 'var(--v-text-xs)',
            color: 'var(--v-muted)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            letterSpacing: 'var(--v-tracking-wide)',
            textTransform: 'uppercase',
            flex: 1,
          }}
        >
          Thẻ {position + 1} / {total}
        </span>
        <button
          type="button"
          onClick={onHelp}
          aria-label="Trợ giúp"
          style={iconBtn()}
        >
          <HelpCircle size={16} />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          style={iconBtn()}
        >
          <X size={16} />
        </button>
      </div>
      <div
        style={{
          height: 8,
          background: 'var(--v-border)',
          borderRadius: 'var(--v-radius-pill)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--v-stage-review)',
            borderRadius: 'var(--v-radius-pill)',
            transition: 'width 300ms ease',
          }}
        />
      </div>
    </div>
  );
}

function iconBtn(): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--v-radius-sm)',
    background: 'var(--v-surface)',
    border: '1px solid var(--v-border)',
    color: 'var(--v-ink-soft)',
    cursor: 'pointer',
  };
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

function HelpPanel({
  card, onClose,
}: {
  card: Flashcard; onClose: () => void;
}) {
  function speak() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(card.english);
      u.lang = 'en-US';
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    } catch {/* noop */}
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(40,30,15,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-lg)',
          boxShadow: 'var(--v-shadow-lg)',
          padding: 24,
          maxWidth: 480,
          width: '100%',
          maxHeight: '88vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          style={{
            ...iconBtn(),
            position: 'absolute',
            top: 12,
            right: 12,
          }}
        >
          <X size={16} />
        </button>

        <div style={{ textAlign: 'center', marginTop: 6 }}>
          <div
            style={{
              fontFamily: 'var(--v-font-mono)',
              fontSize: 'var(--v-text-2xl)',
              fontWeight: 700,
              color: 'var(--v-accent)',
              marginBottom: 8,
            }}
          >
            {card.ipa || '(chưa có IPA)'}
          </div>

          <button
            type="button"
            onClick={speak}
            aria-label="Nghe phát âm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              background: 'var(--v-blue)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--v-radius-md)',
              boxShadow: 'var(--v-press), 0 4px 12px rgba(93,193,240,0.4)',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 'var(--v-text-base)',
              cursor: 'pointer',
              marginBottom: 14,
            }}
          >
            <Volume2 size={16} /> Nghe Bún đọc
          </button>

          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 'var(--v-text-xl)',
              fontWeight: 800,
              color: 'var(--v-ink)',
              marginBottom: 12,
            }}
          >
            {card.vietnamese}
          </div>

          {card.image_url && (
            <div style={{ marginTop: 8 }}>
              <Image
                src={card.image_url}
                alt={card.english}
                width={400}
                height={200}
                unoptimized
                style={{
                  maxHeight: 200,
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '100%',
                  borderRadius: 'var(--v-radius-md)',
                  objectFit: 'contain',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UnsupportedBanner({ onFinish }: { onFinish: () => void }) {
  return (
    <div
      style={{
        maxWidth: 480,
        margin: '0 auto',
        textAlign: 'center',
        padding: '32px 24px',
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-lg)',
        boxShadow: 'var(--v-shadow-md)',
      }}
    >
      <Mascot pose="idle" size={96} />
      <h2
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-2xl)',
          margin: '12px 0 8px',
          color: 'var(--v-ink)',
        }}
      >
        Trình duyệt này chưa hỗ trợ ghi âm
      </h2>
      <p style={{ color: 'var(--v-muted)', marginBottom: 18 }}>
        Đề xuất: Chrome, Edge, hoặc Safari mới nhất.
      </p>
      <button
        type="button"
        onClick={onFinish}
        style={primaryBtn()}
      >
        Quay lại
      </button>
    </div>
  );
}

function PermissionDeniedBanner({
  onRetry, onFinish,
}: {
  onRetry: () => void; onFinish: () => void;
}) {
  return (
    <div
      style={{
        maxWidth: 480,
        margin: '0 auto',
        textAlign: 'center',
        padding: '32px 24px',
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-lg)',
        boxShadow: 'var(--v-shadow-md)',
      }}
    >
      <Mascot pose="idle" size={96} />
      <h2
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-2xl)',
          margin: '12px 0 8px',
          color: 'var(--v-ink)',
        }}
      >
        Bún cần quyền truy cập micro 🎤
      </h2>
      <p style={{ color: 'var(--v-muted)', marginBottom: 18 }}>
        Hãy bật quyền micro trong cài đặt trình duyệt rồi quay lại.
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={onRetry} style={primaryBtn()}>
          Thử lại
        </button>
        <button type="button" onClick={onFinish} style={secondaryBtn()}>
          Quay lại
        </button>
      </div>
    </div>
  );
}

function Summary({
  total, passCount, helpedCount, onRestart, onFinish,
}: {
  total: number; passCount: number; helpedCount: number;
  onRestart: () => void; onFinish: () => void;
}) {
  const failCount = total - passCount;
  const pct = total > 0 ? Math.round((passCount / total) * 100) : 0;
  const pose = pct >= 70 ? 'happy' : 'idle';

  return (
    <div
      style={{
        maxWidth: 560,
        margin: '0 auto',
        textAlign: 'center',
        padding: '32px 24px',
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-lg)',
        boxShadow: 'var(--v-shadow-md)',
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
        🎉 Hoàn thành!
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 10,
          marginBottom: 18,
        }}
      >
        <Stat label="Tổng số thẻ" value={String(total)} color="var(--v-ink)" />
        <Stat label="Đúng" value={String(passCount)} color="var(--v-primary)" />
        <Stat label="Sai" value={String(failCount)} color="var(--v-orange)" />
        <Stat label="Tỉ lệ" value={`${pct}%`} color="var(--v-blue)" />
      </div>

      {helpedCount > 0 && (
        <div style={{ color: 'var(--v-muted)', fontSize: 'var(--v-text-sm)', marginBottom: 18 }}>
          Đã xem trợ giúp {helpedCount} lần
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={onRestart} style={primaryBtn()}>
          <RotateCcw size={14} /> Học lại
        </button>
        <button type="button" onClick={onFinish} style={secondaryBtn()}>
          Quay lại <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        padding: 12,
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

function primaryBtn(): React.CSSProperties {
  return {
    padding: '11px 18px',
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
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    padding: '10px 18px',
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
  };
}
