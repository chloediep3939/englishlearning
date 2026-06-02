'use client';

import { RA_SPEEDS, BUN_BLUE } from '@/lib/reading/constants';
import type { KaraokeEngine } from '@/lib/reading/use-karaoke';

/** Speed chips. `cols` = 2 (desktop 2×2 grid) or 4 (mobile single row). */
export default function SpeedSelector({ k, cols = 2 }: { k: KaraokeEngine; cols?: 2 | 4 }) {
  return (
    <div
      style={{
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        boxShadow: 'var(--v-shadow-md)',
        borderRadius: 18,
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 10,
          fontWeight: 900,
          color: 'var(--v-muted)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 9,
        }}
      >
        Tốc độ đọc
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 7 }}>
        {RA_SPEEDS.map((sp) => {
          const on = Math.abs(sp.rate - k.rate) < 0.001;
          return (
            <button
              key={sp.label}
              onClick={() => k.pickRate(sp.rate)}
              style={{
                padding: '10px 8px',
                borderRadius: 12,
                cursor: 'pointer',
                background: on ? BUN_BLUE : 'var(--v-surface)',
                color: on ? '#fff' : 'var(--v-ink-soft)',
                border: `1px solid ${on ? BUN_BLUE : 'var(--v-border)'}`,
                boxShadow: on ? '0 3px 0 rgba(20,40,80,.18)' : 'var(--v-shadow-sm)',
                fontFamily: 'var(--v-font-head)',
                fontWeight: 900,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {sp.label}{' '}
              <span style={{ fontFamily: 'var(--v-font-mono)', fontWeight: 700, fontSize: 10, opacity: on ? 0.85 : 0.55 }}>
                {sp.rate}×
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
