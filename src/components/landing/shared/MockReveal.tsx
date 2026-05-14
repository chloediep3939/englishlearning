'use client';

// Decorative reveal-screen mock — card counter, progress bar, the word
// "preferential" with highlight underline, IPA, char-diff transformation,
// meaning line, 4-button rating row. Static.

export default function MockReveal() {
  const ratings: Array<[label: string, color: string]> = [
    ['LẠI', 'var(--v-red)'],
    ['KHÓ', 'var(--v-orange)'],
    ['TỐT', 'var(--v-primary)'],
    ['DỄ', 'var(--v-blue)'],
  ];
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--v-surface)',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontFamily: 'var(--v-font-body)',
      }}
      aria-hidden="true"
    >
      {/* progress row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            fontSize: 6,
            fontWeight: 900,
            color: 'var(--v-ink-soft)',
            letterSpacing: '0.1em',
          }}
        >
          THẺ 12/46
        </span>
        <div style={{ flex: 1, height: 6, background: 'var(--v-panel)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: '28%', height: '100%', background: 'var(--v-primary)' }} />
        </div>
      </div>

      {/* word + IPA */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          paddingBottom: 6,
          borderBottom: '1px solid var(--v-border)',
        }}
      >
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 2,
              height: '35%',
              background: 'var(--v-primary)',
              opacity: 0.28,
              borderRadius: 2,
            }}
          />
          <span
            style={{
              position: 'relative',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 1000,
              fontSize: 26,
              color: 'var(--v-ink)',
              letterSpacing: '-0.03em',
            }}
          >
            preferential
          </span>
        </div>
        <span
          style={{
            fontFamily: 'var(--v-font-mono)',
            fontSize: 10,
            color: 'var(--v-accent)',
            fontWeight: 600,
          }}
        >
          /ˌprefəˈrenʃəl/
        </span>
      </div>

      {/* char-diff */}
      <div
        style={{
          background: 'var(--v-primary-soft)',
          borderRadius: 8,
          padding: '8px 10px',
          border: '1px solid color-mix(in srgb, var(--v-primary) 25%, transparent)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--v-font-mono)',
            fontSize: 10,
            color: 'var(--v-red)',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          <span style={{ color: 'var(--v-primary)' }}>prefer</span> →{' '}
          <span style={{ color: 'var(--v-primary)', fontSize: 12 }}>preferential</span>
        </div>
      </div>

      {/* meaning */}
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ width: 3, alignSelf: 'stretch', background: 'var(--v-accent)', borderRadius: 2 }} />
        <div>
          <div
            style={{
              fontSize: 6,
              fontWeight: 900,
              color: 'var(--v-accent)',
              letterSpacing: '0.12em',
            }}
          >
            NGHĨA
          </div>
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontWeight: 800,
              fontSize: 11,
              color: 'var(--v-ink)',
            }}
          >
            Ưu đãi, dành sự ưu tiên
          </div>
        </div>
      </div>

      {/* rating row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 'auto' }}>
        {ratings.map(([label, c]) => (
          <div
            key={label}
            style={{
              background: c,
              color: '#fff',
              borderRadius: 7,
              padding: '5px',
              textAlign: 'center',
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 8,
              letterSpacing: '0.04em',
              boxShadow: '0 2px 0 rgba(60,20,5,.15)',
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
