'use client';

import { useState } from 'react';

interface Props {
  children: React.ReactNode;
  lift?: number;
  tilt?: number;
  style?: React.CSSProperties;
}

export default function HoverLift({ children, lift = 6, tilt = 0, style }: Props) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        transform: hover ? `translateY(-${lift}px) rotate(${tilt}deg)` : 'translateY(0) rotate(0deg)',
        transition: 'transform .25s cubic-bezier(.2,.7,.3,1), box-shadow .25s ease',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
