'use client';

import { useEffect, useState } from 'react';

// Cycles through a list of mascot poses on an interval so Bún feels alive in
// the hero. Renders raw <img> (not next/Image) because the src swaps every
// ~1300ms — Next's optimizer pipeline isn't a fit for that cadence, and the
// landing's design handoff specifies <img> directly.

export type Pose =
  | 'idle'
  | 'happy'
  | 'blink'
  | 'sleep'
  | 'wake'
  | 'run-a'
  | 'run-b'
  | 'bun-learn'
  | 'bun-flex'
  | 'bun-celebrate'
  | 'bun-dream'
  | 'bun-magic';

const POSE_PATH: Record<Pose, string> = {
  idle: '/mascot/ngoc-idle.png',
  happy: '/mascot/ngoc-happy.png',
  blink: '/mascot/ngoc-blink.png',
  sleep: '/mascot/ngoc-sleep.png',
  wake: '/mascot/ngoc-wake.png',
  'run-a': '/mascot/ngoc-run-a.png',
  'run-b': '/mascot/ngoc-run-b.png',
  'bun-learn': '/mascot/bun-learn.png',
  'bun-flex': '/mascot/bun-flex.png',
  'bun-celebrate': '/mascot/bun-celebrate.png',
  'bun-dream': '/mascot/bun-dream.png',
  'bun-magic': '/mascot/bun-magic.png',
};

interface Props {
  size?: number;
  poses?: Pose[];
  interval?: number;
  float?: boolean;
  style?: React.CSSProperties;
}

export default function LiveMascot({
  size = 180,
  poses = ['happy', 'happy', 'blink', 'happy'],
  interval = 1400,
  float = true,
  style,
}: Props) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % poses.length), interval);
    return () => clearInterval(id);
  }, [poses.length, interval]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={POSE_PATH[poses[i]]}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      style={{
        display: 'block',
        filter: 'drop-shadow(0 14px 28px rgba(40,30,15,.22))',
        animation: float ? 'v-ngoc-bob 3s ease-in-out infinite' : undefined,
        ...style,
      }}
    />
  );
}
