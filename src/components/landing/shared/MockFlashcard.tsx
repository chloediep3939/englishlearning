'use client';

// Decorative flashcard mock — progress bar, tilted polaroid, mint speech
// bubble with the Vietnamese prompt, input with the user mid-type, KIỂM TRA
// button. Static.

export default function MockFlashcard() {
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
      <div style={{ height: 8, background: 'var(--v-panel)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: '26%', height: '100%', background: 'var(--v-primary)', borderRadius: 999 }} />
      </div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            background: 'var(--v-surface)',
            padding: 4,
            borderRadius: 6,
            boxShadow: '0 4px 10px rgba(40,30,15,.08)',
            transform: 'rotate(-2deg)',
          }}
        >
          <div style={{ width: 90, height: 50, background: 'var(--v-accent-soft)', borderRadius: 4 }} />
        </div>
        <div
          style={{
            background: 'var(--v-primary-soft)',
            padding: '10px 16px',
            borderRadius: 16,
            border: '1px solid color-mix(in srgb, var(--v-primary) 25%, transparent)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 6,
              fontWeight: 900,
              color: 'var(--v-primary)',
              letterSpacing: '0.14em',
              marginBottom: 2,
            }}
          >
            HÃY DỊCH
          </div>
          <div style={{ fontFamily: 'var(--v-font-head)', fontWeight: 900, fontSize: 13, color: 'var(--v-ink)' }}>
            &quot;Ưu đãi, dành sự ưu tiên.&quot;
          </div>
        </div>
        <div
          style={{
            width: '85%',
            padding: '8px 12px',
            background: 'var(--v-surface)',
            border: '2px solid var(--v-primary)',
            borderRadius: 10,
            fontFamily: 'var(--v-font-head)',
            fontWeight: 800,
            fontSize: 11,
            color: 'var(--v-ink)',
            textAlign: 'center',
            boxShadow: '0 2px 0 color-mix(in srgb, var(--v-primary) 25%, transparent)',
          }}
        >
          prefer
          <span
            style={{
              borderRight: '1.5px solid var(--v-primary)',
              marginLeft: 2,
              animation: 'v-bun-caret 0.8s steps(2) infinite',
            }}
          />
        </div>
        <div
          style={{
            padding: '7px 18px',
            background: 'var(--v-primary)',
            color: '#fff',
            borderRadius: 9,
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 9,
            letterSpacing: '0.06em',
            boxShadow: '0 2px 0 rgba(60,20,5,.18)',
          }}
        >
          KIỂM TRA
        </div>
      </div>
    </div>
  );
}
