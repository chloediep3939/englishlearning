'use client';

// Animated radial-gradient blobs for hero / CTA backgrounds. Each blob drifts
// + scales via `v-bun-blob` keyframe.

export interface Blob {
  x: number | string;
  y: number | string;
  r: number;
  color: string;
  opacity?: number;
  dur?: number;
  delay?: number;
}

export default function BlobBg({ blobs }: { blobs: ReadonlyArray<Blob> }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {blobs.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: b.x,
            top: b.y,
            width: b.r,
            height: b.r,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${b.color}, ${b.color}00 70%)`,
            opacity: b.opacity ?? 0.55,
            filter: 'blur(8px)',
            animation: `v-bun-blob ${b.dur ?? 14}s ease-in-out ${b.delay ?? 0}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
