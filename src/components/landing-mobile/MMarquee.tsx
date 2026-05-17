'use client';

import Icon from '../landing/shared/Icon';

// Mobile marquee — single-line word ticker. README §3.3.
// Reuses .bun-marquee / .bun-marquee-track (defined in globals.css) so the
// scroll animation + pause-on-hover come for free.

const WORDS = [
  'preferential · /ˌprefəˈrenʃəl/',
  'serendipity',
  'meticulous',
  'ubiquitous',
  'epitome',
  'pragmatic',
  'inevitable',
  'ephemeral',
];

export default function MMarquee() {
  const track = [...WORDS, ...WORDS, ...WORDS];
  return (
    <div
      className="bun-marquee"
      style={{
        background: 'var(--v-panel)',
        borderTop: '1px solid var(--v-border)',
        borderBottom: '1px solid var(--v-border)',
        padding: '10px 0',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          background: '#fff',
          padding: '3px 8px',
          borderRadius: 999,
          border: '1px solid var(--v-border)',
          fontFamily: 'var(--v-font-body)',
          fontSize: 9,
          fontWeight: 900,
          color: 'var(--v-brand)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          zIndex: 2,
          boxShadow: 'var(--v-shadow-sm)',
        }}
      >
        <Icon name="sparkle" size={10} stroke="var(--v-brand)" fill="var(--v-brand)" /> AI →
      </div>
      <div
        className="bun-marquee-track"
        style={{
          display: 'flex',
          gap: 22,
          whiteSpace: 'nowrap',
          paddingLeft: 80,
        }}
      >
        {track.map((w, i) => (
          <span
            key={i}
            style={{
              fontFamily: 'var(--v-font-mono)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--v-ink-soft)',
              flexShrink: 0,
            }}
          >
            <span style={{ color: 'var(--v-brand)' }}>✦</span> {w}
          </span>
        ))}
      </div>
    </div>
  );
}
