'use client';

import Icon from './Icon';

// Single FAQ accordion row. The plus icon rotates 45° to become an X when
// open. Answer slides via a max-height transition (0 → 200px, 0.35s
// cubic-bezier(.4,0,.2,1)) so the row animates rather than snapping.

interface Props {
  q: string;
  a: string;
  idx: number;
  open: boolean;
  onToggle: () => void;
}

export default function FaqItem({ q, a, idx, open, onToggle }: Props) {
  const accent = 'var(--v-brand)';
  return (
    <div
      style={{
        background: 'var(--v-surface)',
        border: open
          ? '1px solid color-mix(in srgb, var(--v-brand) 33%, transparent)'
          : '1px solid var(--v-border)',
        boxShadow: open
          ? '0 8px 20px color-mix(in srgb, var(--v-brand) 14%, transparent), 0 3px 0 color-mix(in srgb, var(--v-brand) 13%, transparent)'
          : 'var(--v-shadow-sm)',
        borderRadius: 16,
        overflow: 'hidden',
        transition: 'all .2s ease',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '18px 22px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            background: open ? accent : 'var(--v-panel)',
            color: open ? '#fff' : 'var(--v-ink-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--v-font-head)',
            fontWeight: 1000,
            fontSize: 12,
            flexShrink: 0,
            transition: 'all .2s ease',
            boxShadow: open ? '0 3px 0 rgba(20,40,80,.15)' : 'none',
          }}
        >
          Q{idx + 1}
        </div>
        <h3
          style={{
            flex: 1,
            fontFamily: 'var(--v-font-head)',
            fontSize: 16,
            fontWeight: 900,
            color: 'var(--v-ink)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          {q}
        </h3>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 9,
            background: open ? accent : 'var(--v-panel)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all .25s ease',
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        >
          <Icon name="plus" size={14} stroke={open ? '#fff' : 'var(--v-ink)'} strokeWidth={2.8} />
        </div>
      </button>
      <div
        style={{
          maxHeight: open ? 200 : 0,
          overflow: 'hidden',
          transition: 'max-height .35s cubic-bezier(.4,0,.2,1)',
        }}
      >
        <div
          style={{
            padding: '0 22px 20px 70px',
            fontFamily: 'var(--v-font-body)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--v-ink-soft)',
            lineHeight: 1.6,
          }}
        >
          {a}
        </div>
      </div>
    </div>
  );
}
