'use client';

// 8-pointed sparkle stars, absolutely positioned within their parent. Each
// item: [x, y, size, color, twinkle-delay].
// Use a fixed item array (computed at module scope or useMemo([])), never
// `Math.random()` in render — keeps the layout stable across re-renders.

export type SparkleItem = readonly [x: number, y: number, size: number, color: string, delay: number];

export default function Sparkles({ items }: { items: ReadonlyArray<SparkleItem> }) {
  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      aria-hidden="true"
    >
      {items.map(([x, y, s, c, d], i) => (
        <g
          key={i}
          style={{
            animation: `v-sparkle 2.4s ease-in-out ${d}s infinite`,
            transformOrigin: `${x}px ${y}px`,
          }}
        >
          <polygon
            points={`${x},${y - s} ${x + s * 0.32},${y - s * 0.32} ${x + s},${y} ${x + s * 0.32},${y + s * 0.32} ${x},${y + s} ${x - s * 0.32},${y + s * 0.32} ${x - s},${y} ${x - s * 0.32},${y - s * 0.32}`}
            fill={c}
          />
        </g>
      ))}
    </svg>
  );
}
