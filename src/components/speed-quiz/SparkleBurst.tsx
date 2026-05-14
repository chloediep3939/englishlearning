import { Sparkles } from 'lucide-react';

/**
 * 6 sparkle icons positioned around the "🎉 Xong rồi!" heading, with
 * staggered animation delays so they pulse out-of-sync. Uses the
 * `v-sparkle` keyframe defined in globals.css. Only rendered when the
 * session accuracy is ≥80%.
 */

type Pos = {
  top: number;
  left?: number | string;
  right?: number | string;
  size: number;
  delay: number;
};

const POSITIONS: Pos[] = [
  { top: -14, left: -28, size: 14, delay: 0 },
  { top: -10, right: -28, size: 16, delay: 0.3 },
  { top: 20, left: -36, size: 12, delay: 0.6 },
  { top: 18, right: -34, size: 14, delay: 0.9 },
  { top: -22, left: '40%', size: 12, delay: 0.2 },
  { top: 28, right: '40%', size: 10, delay: 1.1 },
];

export default function SparkleBurst() {
  return (
    <>
      {POSITIONS.map((p, i) => (
        <Sparkles
          key={i}
          size={p.size}
          style={{
            position: 'absolute',
            top: p.top,
            left: p.left,
            right: p.right,
            color: 'var(--v-yellow-deep)',
            animation: `v-sparkle 1.4s ease-in-out ${p.delay}s infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}
