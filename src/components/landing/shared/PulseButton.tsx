'use client';

// Primary CTA with an animated pulse ring. Used by the hero and the final CTA.
// `tone='filled'` (default) — colored background, ring inherits `color`.
// `tone='inverted'` — white background on a colored surface; ring inherits the
//   passed `ringColor` (typically '#fff').

import Link from 'next/link';

interface Props {
  href: string;
  children: React.ReactNode;
  color?: string; // background / pulse-ring color when tone='filled'
  textColor?: string;
  ringColor?: string;
  fontSize?: number;
  padding?: string;
  borderRadius?: number;
  shadow?: string;
  pulseDuration?: number; // seconds
  tone?: 'filled' | 'inverted';
}

export default function PulseButton({
  href,
  children,
  color = 'var(--v-brand)',
  textColor = '#fff',
  ringColor,
  fontSize = 16,
  padding = '17px 32px',
  borderRadius = 18,
  shadow,
  pulseDuration = 2,
  tone = 'filled',
}: Props) {
  const effectiveShadow =
    shadow ??
    (tone === 'filled'
      ? `0 5px 0 rgba(20,40,80,.2), 0 10px 24px ${color}66`
      : '0 6px 0 rgba(20,40,80,.22), 0 10px 22px rgba(40,30,15,.18)');

  // Pulse ring picks up `currentColor`. For filled, that's the button's text
  // color — which we want to override to the brand color via the ring span's
  // own `color`. For inverted (white button on blue), the ring should be white.
  const ringTint = ringColor ?? (tone === 'filled' ? color : '#fff');

  return (
    <Link
      href={href}
      className="bun-cta-btn"
      style={{
        position: 'relative',
        padding,
        background: color,
        color: textColor,
        border: 'none',
        boxShadow: effectiveShadow,
        borderRadius,
        fontFamily: 'var(--v-font-head)',
        fontWeight: 1000,
        fontSize,
        cursor: 'pointer',
        letterSpacing: '0.02em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        textDecoration: 'none',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: -3,
          borderRadius: borderRadius + 3,
          color: ringTint,
          animation: `v-bun-pulse-ring ${pulseDuration}s ease-out infinite`,
          pointerEvents: 'none',
        }}
      />
      {children}
    </Link>
  );
}
