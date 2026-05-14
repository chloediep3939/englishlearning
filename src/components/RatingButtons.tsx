'use client';

interface Rating {
  quality: 0 | 2 | 4 | 5;
  label: string;
  sub: string;
  emoji: string;
  bg: string;
  key: string;
}

const RATINGS: Rating[] = [
  { quality: 0, label: 'LẠI',  sub: '< 1 phút', emoji: '😵', bg: 'var(--v-red)',     key: '1' },
  { quality: 2, label: 'KHÓ',  sub: '~ 10 phút', emoji: '😬', bg: 'var(--v-orange)',  key: '2' },
  { quality: 4, label: 'TỐT',  sub: 'vài ngày',  emoji: '😊', bg: 'var(--v-primary)', key: '3' },
  { quality: 5, label: 'DỄ',   sub: 'lâu hơn',   emoji: '🎉', bg: 'var(--v-blue)',    key: '4' },
];

interface Props {
  onRate: (quality: 0 | 2 | 4 | 5) => void;
  disabled?: boolean;
}

export default function RatingButtons({ onRate, disabled = false }: Props) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 10,
      }}
    >
      {RATINGS.map((r) => (
        <button
          key={r.quality}
          type="button"
          onClick={() => onRate(r.quality)}
          disabled={disabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            background: r.bg,
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--v-radius-md)',
            boxShadow: 'var(--v-press)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            fontFamily: 'var(--v-font-head)',
            textAlign: 'left',
            transition: 'transform 80ms var(--v-ease)',
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(2px)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>{r.emoji}</span>
          <span style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 'var(--v-text-base)', letterSpacing: '0.02em' }}>
              {r.label}
            </div>
            <div style={{ fontSize: 'var(--v-text-xs)', fontWeight: 700, opacity: 0.85 }}>
              {r.sub}
            </div>
          </span>
          <kbd
            style={{
              fontFamily: 'var(--v-font-mono)',
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 6px',
              background: 'rgba(255,255,255,0.25)',
              borderRadius: 4,
            }}
          >
            {r.key}
          </kbd>
        </button>
      ))}
    </div>
  );
}
