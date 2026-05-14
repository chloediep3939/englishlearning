'use client';

// Floating decorative mock card shown on the left side of the hero. Static —
// not driven by real streak data. The 14-cell row uses the v-bun-streak-pop
// keyframe with a staggered delay so cells "fill in" one after another after
// page load.

import Icon from './Icon';

export default function MockStreakCard() {
  return (
    <div
      style={{
        width: 230,
        background: 'var(--v-surface)',
        borderRadius: 14,
        padding: '10px 12px',
        border: '1px solid var(--v-border)',
        boxShadow: '0 14px 32px rgba(40,30,15,.14), 0 3px 0 rgba(40,30,15,.06)',
        animation: 'v-bun-float-slow 5.6s ease-in-out -1.5s infinite',
      }}
      aria-hidden="true"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'var(--v-red)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="flame" size={15} fill="#fff" stroke="#fff" />
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontWeight: 900,
              fontSize: 14,
              lineHeight: 1,
              color: 'var(--v-ink)',
            }}
          >
            7 ngày liên tiếp
          </div>
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--v-muted)',
            }}
          >
            kỷ lục: 12
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: 2 }}>
        {Array.from({ length: 14 }).map((_, i) => {
          const filled = i < 7;
          return (
            <div
              key={i}
              style={{
                height: 16,
                borderRadius: 4,
                background: filled ? 'var(--v-brand)' : 'var(--v-panel)',
                border: i === 7 ? '1.5px dashed var(--v-brand)' : 'none',
                transformOrigin: 'bottom',
                animation: filled
                  ? `v-bun-streak-pop .55s cubic-bezier(.34,1.56,.64,1) ${1 + i * 0.12}s both`
                  : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
