import type { ReactNode } from 'react';

/**
 * A titled block inside a GroupCard. No own card box — just a hairline divider
 * above + spacing to separate sections cleanly. The first section's divider
 * doubles as a rule under the GroupCard title.
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
    <section style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--v-border)' }}>
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
