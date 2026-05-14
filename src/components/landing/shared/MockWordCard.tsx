'use client';

// Floating decorative mock card shown on the right side of the hero. Mimics a
// flashcard reveal — static; not interactive.

export default function MockWordCard() {
  const ratings: Array<[label: string, color: string]> = [
    ['LẠI', 'var(--v-red)'],
    ['KHÓ', 'var(--v-orange)'],
    ['TỐT', 'var(--v-primary)'],
    ['DỄ', 'var(--v-blue)'],
  ];
  return (
    <div
      style={{
        width: 230,
        background: 'var(--v-surface)',
        borderRadius: 14,
        padding: 12,
        border: '1px solid var(--v-border)',
        boxShadow: '0 14px 32px rgba(40,30,15,.14), 0 3px 0 rgba(40,30,15,.06)',
        animation: 'v-bun-float-slow 5s ease-in-out infinite',
      }}
      aria-hidden="true"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <span
          style={{
            background: 'var(--v-purple)',
            color: '#fff',
            borderRadius: 999,
            padding: '2px 9px',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 9,
            letterSpacing: '0.08em',
          }}
        >
          ADJ
        </span>
        <span style={{ fontFamily: 'var(--v-font-body)', fontSize: 10, fontWeight: 700, color: 'var(--v-muted)' }}>
          thẻ 12/46
        </span>
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 22,
          color: 'var(--v-ink)',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        preferential
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-mono)',
          fontSize: 11,
          color: 'var(--v-brand)',
          fontWeight: 700,
          marginTop: 2,
        }}
      >
        /ˌprefəˈrenʃəl/
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 11,
          color: 'var(--v-ink-soft)',
          marginTop: 6,
          fontWeight: 700,
        }}
      >
        Ưu đãi, dành sự ưu tiên
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 4 }}>
        {ratings.map(([label, c]) => (
          <div
            key={label}
            style={{
              flex: 1,
              height: 18,
              background: c,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 9,
              color: '#fff',
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
