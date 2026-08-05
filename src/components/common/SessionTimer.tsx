'use client';

// Time-boxed study sessions (Học từ / Học câu): a countdown hook, the
// remaining-time chip for the session top bar, and the "hết giờ" overlay
// asking whether to loop the same duration again or stop to the summary.
import { useEffect, useState } from 'react';
import { AlarmClock, Play, Square } from 'lucide-react';

export function useSessionTimer(durationMin: number | null | undefined) {
  const enabled = typeof durationMin === 'number' && durationMin > 0;
  const [secondsLeft, setSecondsLeft] = useState(enabled ? durationMin * 60 : 0);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!enabled || expired) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setExpired(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [enabled, expired]);

  function restart() {
    if (!enabled) return;
    setSecondsLeft(durationMin * 60);
    setExpired(false);
  }

  return { enabled, secondsLeft, expired, restart };
}

/** Compact mm:ss chip for the session top bar; turns red in the last minute. */
export function TimerChip({ secondsLeft }: { secondsLeft: number }) {
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const urgent = secondsLeft < 60;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        background: urgent ? 'rgba(255,87,87,0.10)' : 'var(--v-panel)',
        border: `1px solid ${urgent ? 'rgba(255,87,87,0.4)' : 'var(--v-border)'}`,
        borderRadius: 999,
        fontFamily: 'var(--v-font-mono)',
        fontSize: 12,
        fontWeight: 700,
        color: urgent ? 'var(--v-red)' : 'var(--v-ink-soft)',
      }}
    >
      <AlarmClock size={12} strokeWidth={2.4} />
      {m}:{String(s).padStart(2, '0')}
    </span>
  );
}

/**
 * Full-screen "hết giờ" gate. Continue restarts the same duration; Stop
 * ends the session (parent shows the summary).
 */
export function TimeUpOverlay({
  durationMin,
  onContinue,
  onStop,
}: {
  durationMin: number;
  onContinue: () => void;
  onStop: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,20,30,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 120,
        padding: 20,
      }}
    >
      <div
        style={{
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 'var(--v-radius-lg)',
          boxShadow: 'var(--v-shadow-lg)',
          padding: '28px 28px 24px',
          width: '100%',
          maxWidth: 420,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 40, lineHeight: 1 }}>⏰</div>
        <h2
          style={{
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 'var(--v-text-2xl)',
            margin: '10px 0 6px',
            color: 'var(--v-ink)',
          }}
        >
          Hết giờ rồi!
        </h2>
        <p
          style={{
            margin: '0 0 20px',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-md)',
            color: 'var(--v-ink-soft)',
          }}
        >
          Bạn đã học đủ {durationMin} phút. Học tiếp {durationMin} phút nữa hay ngưng?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={onContinue}
            autoFocus
            style={{
              padding: '12px 18px',
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
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Play size={14} /> HỌC TIẾP {durationMin} PHÚT
          </button>
          <button
            type="button"
            onClick={onStop}
            style={{
              padding: '11px 18px',
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
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Square size={13} /> Ngưng — xem kết quả
          </button>
        </div>
      </div>
    </div>
  );
}
