import type { ReactNode } from 'react';

/**
 * A titled block inside a GroupCard. Flat (no own border/background) — the
 * surrounding GroupCard provides the card chrome; this just labels a section.
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
    <section style={{ marginBottom: 18 }}>
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
