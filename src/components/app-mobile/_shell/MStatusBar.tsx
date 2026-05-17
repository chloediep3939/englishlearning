'use client';

// iOS-style mobile status bar (decorative). README §3 "Shared chrome".
// `dark=true` flips foreground to white on dark surfaces.

interface Props {
  time?: string;
  dark?: boolean;
}

export default function MStatusBar({ time = '9:41', dark = false }: Props) {
  const c = dark ? '#fff' : 'var(--v-ink)';
  return (
    <div
      aria-hidden="true"
      style={{
        height: 36,
        padding: '0 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: '-apple-system, "SF Pro", system-ui, sans-serif',
        fontSize: 14,
        fontWeight: 700,
        color: c,
        flexShrink: 0,
      }}
    >
      <span>{time}</span>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <svg width="16" height="10" viewBox="0 0 16 10">
          <rect x="0" y="6" width="3" height="4" rx="0.5" fill={c} />
          <rect x="4" y="4" width="3" height="6" rx="0.5" fill={c} />
          <rect x="8" y="2" width="3" height="8" rx="0.5" fill={c} />
          <rect x="12" y="0" width="3" height="10" rx="0.5" fill={c} />
        </svg>
        <svg width="22" height="11" viewBox="0 0 22 11">
          <rect x="0.5" y="0.5" width="19" height="10" rx="2.5" stroke={c} fill="none" opacity="0.4" />
          <rect x="2" y="2" width="16" height="7" rx="1.2" fill={c} />
          <rect x="20" y="3.5" width="1.5" height="4" rx="0.5" fill={c} opacity="0.4" />
        </svg>
      </div>
    </div>
  );
}
