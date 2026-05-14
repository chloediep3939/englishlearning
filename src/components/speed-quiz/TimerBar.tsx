'use client';

import { useEffect, useState } from 'react';

/**
 * Per-question countdown bar at the top of the prompt card. Resets when
 * the parent remounts it via `key={position}`. Pauses when feedback is
 * showing so the bar doesn't drain after the user answers.
 */
export default function TimerBar({
  duration,
  paused,
}: {
  duration: number;
  paused: boolean;
}) {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setNow(Date.now()), 60);
    return () => clearInterval(id);
  }, [paused]);
  const elapsed = paused ? 0 : now - start;
  const remaining = Math.max(0, duration - elapsed);
  const pct = (remaining / duration) * 100;
  const color = pct > 50 ? 'var(--v-primary)' : pct > 20 ? 'var(--v-orange)' : 'var(--v-red)';
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: 'var(--v-panel)',
        borderRadius: '8px 8px 0 0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          transition: 'width 80ms linear, background-color 200ms var(--v-ease)',
        }}
      />
    </div>
  );
}
