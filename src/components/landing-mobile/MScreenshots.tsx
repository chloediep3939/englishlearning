'use client';

import MockDashboard from '../landing/shared/MockDashboard';
import MockFlashcard from '../landing/shared/MockFlashcard';
import MockReveal from '../landing/shared/MockReveal';

// Horizontal-scroll screenshot strip. README §3.7. Wide bleed (no horizontal
// padding on the section so cards scroll edge-to-edge).

type ShotKey = 'dash' | 'flash' | 'review';

interface Shot {
  key: ShotKey;
  label: string;
  color: string;
  hint: string;
}

const SHOTS: ReadonlyArray<Shot> = [
  { key: 'dash',   label: 'DASHBOARD', color: 'var(--v-brand)',   hint: 'Tổng quan · stat tiles · streak.' },
  { key: 'flash',  label: 'FLASHCARD', color: 'var(--v-orange)',  hint: 'Polaroid · speech bubble · gõ.' },
  { key: 'review', label: 'ÔN TẬP',    color: 'var(--v-primary)', hint: 'Char-diff · 4 rating buttons.' },
];

function Mock({ k }: { k: ShotKey }) {
  if (k === 'dash') return <MockDashboard />;
  if (k === 'flash') return <MockFlashcard />;
  return <MockReveal />;
}

export default function MScreenshots() {
  return (
    <section style={{ padding: '44px 0', background: '#fff' }}>
      <div style={{ padding: '0 20px', marginBottom: 18 }}>
        <div
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 10,
            fontWeight: 900,
            color: 'var(--v-muted)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          Giao diện
        </div>
        <h2
          style={{
            fontFamily: 'var(--v-font-head)',
            fontSize: 28,
            fontWeight: 1000,
            color: 'var(--v-ink)',
            margin: '4px 0 4px',
            letterSpacing: '-0.025em',
          }}
        >
          Trông thế này,{' '}
          <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600, color: 'var(--v-brand)' }}>
            cảm giác sao
          </span>
          ?
        </h2>
        <p style={{ fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 700, color: 'var(--v-muted)', margin: 0 }}>
          Vuốt ngang để xem →
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          padding: '0 20px',
          scrollbarWidth: 'none',
        }}
      >
        {SHOTS.map((s) => (
          <div
            key={s.key}
            style={{
              width: 230,
              flexShrink: 0,
              scrollSnapAlign: 'start',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                alignSelf: 'flex-start',
                background: s.color,
                color: '#fff',
                padding: '3px 8px',
                borderRadius: 7,
                fontFamily: 'var(--v-font-body)',
                fontSize: 9,
                fontWeight: 900,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                background: '#fff',
                border: '1px solid var(--v-border)',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: 'var(--v-shadow-md)',
              }}
            >
              <div
                style={{
                  background: 'var(--v-panel)',
                  borderBottom: '1px solid var(--v-border)',
                  padding: '6px 10px',
                  display: 'flex',
                  gap: 4,
                }}
              >
                {['#ff5757', '#ffc94a', '#7ac143'].map((c) => (
                  <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                ))}
              </div>
              <div style={{ width: '100%', height: 172, overflow: 'hidden' }}>
                <Mock k={s.key} />
              </div>
            </div>
            <p style={{ fontFamily: 'var(--v-font-body)', fontSize: 11, fontWeight: 700, color: 'var(--v-ink-soft)', margin: 0 }}>
              {s.hint}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
