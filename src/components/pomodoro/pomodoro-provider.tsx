'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type PomodoroPhase = 'idle' | 'work' | 'break' | 'paused';

interface PersistedState {
  phase: PomodoroPhase;
  endsAt: number | null;
  lastPhase: 'work' | 'break';
  // When paused, the remaining seconds at the moment of pause.
  remainingMsAtPause: number | null;
}

interface PomodoroContextValue {
  phase: PomodoroPhase;
  lastPhase: 'work' | 'break';
  // Time remaining in the current phase, in seconds. 0 while idle.
  remainingSec: number;
  // Phase length config (minutes), read from user settings at app shell.
  workMinutes: number;
  breakMinutes: number;
  // Transient notification ("Hết phiên tập trung..." etc). Auto-clears.
  notification: string | null;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  dismissNotification: () => void;
}

const STORAGE_KEY = 'pomodoro_state';
const TICK_MS = 1000;
const NOTIFICATION_MS = 6000;

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

export function usePomodoro(): PomodoroContextValue {
  const ctx = useContext(PomodoroContext);
  if (!ctx) {
    throw new Error('usePomodoro must be used inside <PomodoroProvider>.');
  }
  return ctx;
}

interface Props {
  children: React.ReactNode;
  workMinutes: number;
  breakMinutes: number;
}

export default function PomodoroProvider({ children, workMinutes, breakMinutes }: Props) {
  const [phase, setPhase] = useState<PomodoroPhase>('idle');
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [lastPhase, setLastPhase] = useState<'work' | 'break'>('work');
  const [remainingMsAtPause, setRemainingMsAtPause] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [notification, setNotification] = useState<string | null>(null);

  // Settings can change while we run (live update from settings page). Keep
  // refs around so callbacks always see the latest values without stale
  // closures.
  const workMinutesRef = useRef(workMinutes);
  const breakMinutesRef = useRef(breakMinutes);
  useEffect(() => {
    workMinutesRef.current = workMinutes;
  }, [workMinutes]);
  useEffect(() => {
    breakMinutesRef.current = breakMinutes;
  }, [breakMinutes]);

  // ─── Hydrate from localStorage on mount ─────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<PersistedState>;
      if (!saved || typeof saved !== 'object') return;
      const savedPhase = (saved.phase ?? 'idle') as PomodoroPhase;
      const savedEndsAt = typeof saved.endsAt === 'number' ? saved.endsAt : null;
      const savedLastPhase = saved.lastPhase === 'break' ? 'break' : 'work';
      const savedRem = typeof saved.remainingMsAtPause === 'number' ? saved.remainingMsAtPause : null;

      if (savedPhase === 'paused' && savedRem !== null) {
        setPhase('paused');
        setLastPhase(savedLastPhase);
        setRemainingMsAtPause(savedRem);
        return;
      }
      if ((savedPhase === 'work' || savedPhase === 'break') && savedEndsAt !== null) {
        const remaining = savedEndsAt - Date.now();
        if (remaining > 0) {
          setPhase(savedPhase);
          setEndsAt(savedEndsAt);
          setLastPhase(savedPhase);
          return;
        }
        // Expired while the tab was closed — auto-advance to the next phase
        // so the user comes back to a sensible state (next phase started
        // "remaining ms ago", which we clamp to "just expired → 0").
        const nextPhase: 'work' | 'break' = savedPhase === 'work' ? 'break' : 'work';
        const minutes = nextPhase === 'work' ? workMinutesRef.current : breakMinutesRef.current;
        setPhase(nextPhase);
        setLastPhase(nextPhase);
        setEndsAt(Date.now() + minutes * 60 * 1000);
        setNotification(
          nextPhase === 'break'
            ? 'Hết phiên tập trung — nghỉ một chút nha.'
            : 'Hết nghỉ rồi — quay lại học thôi!'
        );
        return;
      }
    } catch {
      /* ignore corrupt state */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Persist to localStorage whenever core state changes ────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload: PersistedState = {
      phase,
      endsAt,
      lastPhase,
      remainingMsAtPause,
    };
    try {
      if (phase === 'idle') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      }
    } catch {
      /* ignore quota */
    }
  }, [phase, endsAt, lastPhase, remainingMsAtPause]);

  // ─── 1Hz tick (only while a timer is active) ────────────────────────
  useEffect(() => {
    if (phase !== 'work' && phase !== 'break') return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [phase]);

  // ─── Detect phase transitions ───────────────────────────────────────
  useEffect(() => {
    if (phase !== 'work' && phase !== 'break') return;
    if (endsAt === null) return;
    if (now < endsAt) return;
    // Phase ended — auto-advance and beep.
    beep();
    const nextPhase: 'work' | 'break' = phase === 'work' ? 'break' : 'work';
    const minutes = nextPhase === 'work' ? workMinutesRef.current : breakMinutesRef.current;
    setPhase(nextPhase);
    setLastPhase(nextPhase);
    setEndsAt(Date.now() + minutes * 60 * 1000);
    setNotification(
      nextPhase === 'break'
        ? `Hết phiên tập trung — nghỉ ${breakMinutesRef.current} phút nha 🌿`
        : `Hết nghỉ rồi — quay lại học thôi 🚀`
    );
  }, [now, endsAt, phase]);

  // ─── Auto-dismiss notification ──────────────────────────────────────
  useEffect(() => {
    if (!notification) return;
    const id = window.setTimeout(() => setNotification(null), NOTIFICATION_MS);
    return () => window.clearTimeout(id);
  }, [notification]);

  // ─── Public actions ────────────────────────────────────────────────
  const start = useCallback(() => {
    const minutes = workMinutesRef.current;
    setPhase('work');
    setLastPhase('work');
    setEndsAt(Date.now() + minutes * 60 * 1000);
    setRemainingMsAtPause(null);
    setNotification(null);
  }, []);

  const pause = useCallback(() => {
    if (phase !== 'work' && phase !== 'break') return;
    if (endsAt === null) return;
    setRemainingMsAtPause(Math.max(0, endsAt - Date.now()));
    setLastPhase(phase);
    setPhase('paused');
    setEndsAt(null);
  }, [phase, endsAt]);

  const resume = useCallback(() => {
    if (phase !== 'paused') return;
    if (remainingMsAtPause === null) return;
    setPhase(lastPhase);
    setEndsAt(Date.now() + remainingMsAtPause);
    setRemainingMsAtPause(null);
  }, [phase, lastPhase, remainingMsAtPause]);

  const reset = useCallback(() => {
    setPhase('idle');
    setEndsAt(null);
    setLastPhase('work');
    setRemainingMsAtPause(null);
    setNotification(null);
  }, []);

  const dismissNotification = useCallback(() => setNotification(null), []);

  // ─── Derived: remaining seconds ────────────────────────────────────
  const remainingSec = useMemo(() => {
    if (phase === 'paused' && remainingMsAtPause !== null) {
      return Math.max(0, Math.ceil(remainingMsAtPause / 1000));
    }
    if ((phase === 'work' || phase === 'break') && endsAt !== null) {
      return Math.max(0, Math.ceil((endsAt - now) / 1000));
    }
    return 0;
  }, [phase, endsAt, now, remainingMsAtPause]);

  const value = useMemo<PomodoroContextValue>(
    () => ({
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
    }),
    [phase, lastPhase, remainingSec, workMinutes, breakMinutes, notification, start, pause, resume, reset, dismissNotification]
  );

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

// ────────────────────────────────────────────────────────────────────
// Helper: short Web-Audio beep so the user gets an audible cue when a
// phase ends, even with the tab in the background. No external assets
// needed; only created on demand and torn down right after.
// ────────────────────────────────────────────────────────────────────
function beep() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
    osc.onended = () => ctx.close();
  } catch {
    /* audio not available; silent fallback */
  }
}
