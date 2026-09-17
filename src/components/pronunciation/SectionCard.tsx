import type { ReactNode } from 'react';

/**
 * A titled block inside a GroupCard. No card box, no divider — sections are
 * separated by generous bottom spacing only.
 */
export default function SectionCard({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: ReactNode;
}) {
  return (
    <section style={{ paddingBottom: 50 }}>
      <h2
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-sm)',
          color: 'var(--v-ink-soft)',
          margin: '0 0 12px',
          textTransform: 'uppercase',
          letterSpacing: 'var(--v-tracking-wide)',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            background: color,
            display: 'inline-block',
          }}
        />
        {title}
      </h2>
      {children}
    </section>
  );
}
