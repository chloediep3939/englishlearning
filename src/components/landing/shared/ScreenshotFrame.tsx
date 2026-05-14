'use client';

import { useState } from 'react';

// Wraps a decorative mock screen (MockDashboard / MockFlashcard / MockReveal).
// macOS-style title bar with 3 colored dots, top label pill, and a tilted rest
// state that straightens on hover. Hover also lifts -8px and grows the shadow.

interface Props {
  label: string;
  color: string;
  hint: string;
  rotate?: number;
  children: React.ReactNode;
}

export default function ScreenshotFrame({ label, color, hint, rotate = 0, children }: Props) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        flex: 1,
        transform: `rotate(${hover ? 0 : rotate}deg) translateY(${hover ? -8 : 0}px)`,
        transition: 'transform .3s cubic-bezier(.2,.7,.3,1)',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 10px',
          background: color,
          color: '#fff',
          borderRadius: 999,
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 11,
          letterSpacing: '0.04em',
          boxShadow: '0 2px 0 rgba(60,20,5,.12)',
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: '100%',
          aspectRatio: '4 / 3',
          background: 'var(--v-surface)',
          border: '1px solid var(--v-border)',
          borderRadius: 16,
          boxShadow: hover
            ? '0 28px 50px rgba(40,30,15,.18), 0 8px 0 rgba(40,30,15,.06)'
            : '0 18px 36px rgba(40,30,15,.10), 0 6px 0 rgba(40,30,15,.06)',
          overflow: 'hidden',
          position: 'relative',
          transition: 'box-shadow .25s ease',
        }}
      >
        <div
          style={{
            height: 14,
            background: 'var(--v-panel)',
            borderBottom: '1px solid var(--v-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '0 6px',
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--v-red)' }} />
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--v-yellow-deep)' }} />
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--v-primary)' }} />
        </div>
        <div style={{ position: 'absolute', top: 14, left: 0, right: 0, bottom: 0 }}>{children}</div>
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--v-ink-soft)',
          marginTop: 12,
          lineHeight: 1.4,
        }}
      >
        {hint}
      </div>
    </div>
  );
}
