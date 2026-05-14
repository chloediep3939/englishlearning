'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock, Pause, Play, RotateCcw, X as XIcon } from 'lucide-react';
import { usePomodoro } from './pomodoro-provider';

const CLOCK_TICK_MS = 30_000; // wall clock only updates every 30s

export default function ClockPill() {
  const {
    phase,
    lastPhase,
    remainingSec,
    workMinutes,
    breakMinutes,
    notification,
    start,
    pause,
    resume,
    reset,
    dismissNotification,
  } = usePomodoro();

  const [open, setOpen] = useState(false);
  const [wallTime, setWallTime] = useState(() => formatHHMM(new Date()));
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Wall-clock display, only when no Pomodoro phase is active.
  useEffect(() => {
    if (phase !== 'idle') return;
    setWallTime(formatHHMM(new Date()));
    const id = window.setInterval(() => setWallTime(formatHHMM(new Date())), CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, [phase]);

  // Close popover on outside click / Esc.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Visible accent — the pill colour changes by phase so the state is
  // glanceable even when the popover is closed.
  const accent = phaseAccent(phase, lastPhase);

  const pillLabel = phase === 'idle' ? wallTime : formatMMSS(remainingSec);

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px 6px 8px',
          background: accent.pillBg,
          border: `1px solid ${accent.pillBorder}`,
          borderRadius: 999,
          boxShadow: 'var(--v-shadow-sm)',
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 13,
          color: accent.pillFg,
          cursor: 'pointer',
        }}
        title="Pomodoro"
      >
        <Clock size={16} color={accent.iconFg} strokeWidth={2.4} />
        <span style={{ fontFeatureSettings: '"tnum"' }}>{pillLabel}</span>
      </button>

      {/* Inline notification (auto-dismisses after a few seconds) */}
      {notification && !open && (
        <button
          type="button"
          onClick={dismissNotification}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 30,
            padding: '8px 12px',
            background: accent.popoverAccent,
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(40,30,15,0.15)',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 12,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {notification}
        </button>
      )}

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 40,
            width: 280,
            background: 'var(--v-surface)',
            border: '1px solid var(--v-border)',
            borderRadius: 16,
            boxShadow: '0 8px 24px rgba(40,30,15,0.15)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={14} color={accent.popoverAccent} />
            <div
              style={{
                flex: 1,
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 13,
                color: 'var(--v-ink)',
                letterSpacing: '0.02em',
              }}
            >
              Pomodoro
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                width: 24,
                height: 24,
                padding: 0,
                background: 'transparent',
                border: 'none',
                color: 'var(--v-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Đóng"
            >
              <XIcon size={14} />
            </button>
          </div>

          {/* Phase label */}
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 11,
              fontWeight: 800,
              color: accent.popoverAccent,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {phaseLabel(phase, lastPhase)}
          </div>

          {/* Big display */}
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 48,
              fontWeight: 900,
              color: 'var(--v-ink)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              fontFeatureSettings: '"tnum"',
              textAlign: 'center',
              padding: '6px 0',
            }}
          >
            {phase === 'idle' ? formatMMSS(workMinutes * 60) : formatMMSS(remainingSec)}
          </div>

          {/* Sub-text */}
          {phase === 'idle' && (
            <div
              style={{
                fontFamily: 'var(--v-font-body)',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--v-muted)',
                textAlign: 'center',
              }}
            >
              {workMinutes} phút tập trung · {breakMinutes} phút nghỉ
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {phase === 'idle' && (
              <PrimaryButton onClick={start} accent={accent.popoverAccent}>
                <Play size={14} fill="#fff" /> Bắt đầu
              </PrimaryButton>
            )}
            {(phase === 'work' || phase === 'break') && (
              <>
                <PrimaryButton onClick={pause} accent={accent.popoverAccent}>
                  <Pause size={14} fill="#fff" /> Tạm dừng
                </PrimaryButton>
                <SecondaryButton onClick={reset}>
                  <RotateCcw size={12} /> Đặt lại
                </SecondaryButton>
              </>
            )}
            {phase === 'paused' && (
              <>
                <PrimaryButton onClick={resume} accent={accent.popoverAccent}>
                  <Play size={14} fill="#fff" /> Tiếp tục
                </PrimaryButton>
                <SecondaryButton onClick={reset}>
                  <RotateCcw size={12} /> Đặt lại
                </SecondaryButton>
              </>
            )}
          </div>

          {/* In-popover notification */}
          {notification && (
            <div
              style={{
                marginTop: 4,
                padding: '8px 10px',
                background: accent.popoverSoft,
                color: accent.popoverAccent,
                borderRadius: 10,
                fontFamily: 'var(--v-font-body)',
                fontSize: 11,
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              {notification}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

function formatHHMM(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatMMSS(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function phaseLabel(phase: string, lastPhase: 'work' | 'break'): string {
  if (phase === 'work') return 'Tập trung';
  if (phase === 'break') return 'Nghỉ ngơi';
  if (phase === 'paused') return lastPhase === 'work' ? 'Tạm dừng (tập trung)' : 'Tạm dừng (nghỉ)';
  return 'Sẵn sàng';
}

interface Accent {
  pillBg: string;
  pillBorder: string;
  pillFg: string;
  iconFg: string;
  popoverAccent: string;
  popoverSoft: string;
}

function phaseAccent(phase: string, lastPhase: 'work' | 'break'): Accent {
  // While work or paused-from-work, use --v-primary. While break or paused-from-break,
  // use --v-blue. The blue-soft token doesn't exist; inline rgba derived from
  // the existing palette colours.
  const isBreak = phase === 'break' || (phase === 'paused' && lastPhase === 'break');
  const isWork = phase === 'work' || (phase === 'paused' && lastPhase === 'work');
  if (isBreak) {
    return {
      pillBg: 'rgba(93,193,240,0.18)',
      pillBorder: 'rgba(93,193,240,0.4)',
      pillFg: 'var(--v-blue)',
      iconFg: 'var(--v-blue)',
      popoverAccent: 'var(--v-blue)',
      popoverSoft: 'rgba(93,193,240,0.18)',
    };
  }
  if (isWork) {
    return {
      pillBg: 'var(--v-primary-soft)',
      pillBorder: 'var(--v-primary)',
      pillFg: 'var(--v-primary)',
      iconFg: 'var(--v-primary)',
      popoverAccent: 'var(--v-primary)',
      popoverSoft: 'var(--v-primary-soft)',
    };
  }
  // idle
  return {
    pillBg: 'var(--v-surface)',
    pillBorder: 'var(--v-border)',
    pillFg: 'var(--v-ink)',
    iconFg: 'var(--v-ink-soft)',
    popoverAccent: 'var(--v-primary)',
    popoverSoft: 'var(--v-primary-soft)',
  };
}

function PrimaryButton({
  onClick,
  accent,
  children,
}: {
  onClick: () => void;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 14px',
        background: accent,
        color: '#fff',
        border: 'none',
        boxShadow: '0 3px 0 rgba(60,20,5,0.15)',
        borderRadius: 12,
        fontFamily: 'var(--v-font-head)',
        fontWeight: 900,
        fontSize: 12,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 14px',
        background: 'var(--v-surface)',
        color: 'var(--v-ink-soft)',
        border: '1px solid var(--v-border)',
        borderRadius: 12,
        fontFamily: 'var(--v-font-head)',
        fontWeight: 800,
        fontSize: 11,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {children}
    </button>
  );
}
