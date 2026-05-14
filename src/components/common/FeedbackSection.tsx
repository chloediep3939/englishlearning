'use client';

import type { ReactNode } from 'react';

/**
 * Coloured-rail feedback section used by both Step 7 (translation) and
 * Step 8 (paraphrase) feedback views. Title row in `color`, body inside a
 * panel-tinted card with a 3px left rail in the same colour.
 */
export function FeedbackSection({
  title, color, children,
}: {
  title: string;
  color: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: 'var(--v-panel)',
        padding: 12,
        borderRadius: 'var(--v-radius-md)',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontWeight: 800,
          fontSize: 'var(--v-text-xs)',
          color,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 'var(--v-text-sm)', color: 'var(--v-ink)' }}>{children}</div>
    </div>
  );
}
