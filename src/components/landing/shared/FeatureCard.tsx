'use client';

import { useState } from 'react';
import Icon from './Icon';

// Single tile in the 4×2 features grid. Hover lifts the card -6px, intensifies
// the corner ellipse, and wiggles the icon box (v-bun-wiggle 0.55s).

export interface Feature {
  icon: string;
  title: string;
  body: string;
  color: string; // CSS color or var(--…)
}

export default function FeatureCard({ feature: f }: { feature: Feature }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        boxShadow: hover
          ? '0 14px 28px rgba(40,30,15,.12), 0 5px 0 rgba(40,30,15,.07)'
          : 'var(--v-shadow-md)',
        borderRadius: 18,
        padding: '22px 18px 18px',
        transform: hover ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform .25s cubic-bezier(.2,.7,.3,1), box-shadow .25s ease',
        overflow: 'hidden',
        cursor: 'pointer',
        height: '100%',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: f.color,
          opacity: hover ? 0.18 : 0.08,
          transition: 'opacity .25s ease',
        }}
        aria-hidden="true"
      />
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          background: f.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 3px 0 rgba(60,20,5,.1), 0 4px 8px color-mix(in srgb, ${f.color} 31%, transparent)`,
          marginBottom: 14,
          transformOrigin: 'center',
          animation: hover ? 'v-bun-wiggle .55s ease-in-out' : undefined,
        }}
      >
        <Icon name={f.icon} size={21} stroke="#fff" fill="#fff" strokeWidth={2.4} />
      </div>
      <h3
        style={{
          fontFamily: 'var(--v-font-head)',
          fontSize: 16,
          fontWeight: 1000,
          color: 'var(--v-ink)',
          margin: '0 0 6px',
          letterSpacing: '-0.01em',
          lineHeight: 1.2,
        }}
      >
        {f.title}
      </h3>
      <p
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--v-ink-soft)',
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {f.body}
      </p>
    </div>
  );
}
