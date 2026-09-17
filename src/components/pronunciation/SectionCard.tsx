import type { ReactNode } from 'react';

/** A titled card section used to stack the panels on the sound detail page. */
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
    <section
      style={{
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-lg)',
        boxShadow: 'var(--v-shadow-sm)',
        padding: 18,
        marginBottom: 16,
      }}
    >
      <h2
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-md)',
          color: 'var(--v-ink)',
          margin: '0 0 14px',
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
