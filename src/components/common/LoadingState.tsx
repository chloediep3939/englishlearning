'use client';

import Mascot from './Mascot';

interface Props {
  message?: string;
  size?: number;
  padding?: number;
}

export default function LoadingState({
  message = 'Bún đang chuẩn bị…',
  size = 72,
  padding = 32,
}: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding,
        gap: 14,
      }}
    >
      <Mascot pose="idle" size={size} bob />
      <p
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-sm)',
          color: 'var(--v-ink-soft)',
          fontWeight: 600,
          margin: 0,
        }}
      >
        {message}
      </p>
    </div>
  );
}
