'use client';

// Dragon paw-print trail rendered in the side margin of a workflow chapter
// card. Decorative — count matches the step count so the trail "walks
// alongside" the persona's steps.

interface Props {
  count?: number;
  color?: string;
  side?: 'left' | 'right';
}

export default function FootprintTrail({ count = 6, color = 'var(--v-primary)', side = 'left' }: Props) {
  const height = count * 70;
  const sideStyle: React.CSSProperties = side === 'left' ? { left: 12 } : { right: 12 };
  return (
    <svg
      width="40"
      height={height}
      style={{ position: 'absolute', top: 60, opacity: 0.18, pointerEvents: 'none', ...sideStyle }}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => {
        const y = i * 70 + 20;
        const xOffset = i % 2 === 0 ? 0 : 16;
        const rot = i % 2 === 0 ? -15 : 15;
        return (
          <g key={i} transform={`translate(${xOffset}, ${y}) rotate(${rot})`}>
            <ellipse cx="10" cy="8" rx="6" ry="8" fill={color} />
            <circle cx="3" cy="0" r="2.5" fill={color} />
            <circle cx="9" cy="-3" r="2.5" fill={color} />
            <circle cx="15" cy="-1" r="2.5" fill={color} />
            <circle cx="19" cy="3" r="2.5" fill={color} />
          </g>
        );
      })}
    </svg>
  );
}
