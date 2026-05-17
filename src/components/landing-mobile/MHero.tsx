'use client';

import Link from 'next/link';
import BlobBg from '../landing/shared/BlobBg';
import Sparkles from '../landing/shared/Sparkles';
import LiveMascot from '../landing/shared/LiveMascot';
import Icon from '../landing/shared/Icon';

// Mobile hero — mascot center, heading below, CTAs stacked.
// See README §3.2.

export default function MHero() {
  const accent = 'var(--v-brand)';
  return (
    <section
      style={{
        padding: '36px 20px 56px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <BlobBg
        blobs={[
          { x: '-15%', y: '5%', r: 240, color: 'var(--v-brand)', opacity: 0.18, dur: 18, delay: 0 },
          { x: '60%', y: '50%', r: 220, color: 'var(--v-pink)', opacity: 0.12, dur: 22, delay: 2 },
        ]}
      />
      <Sparkles
        items={[
          [40, 60, 8, 'var(--v-yellow)', 0],
          [350, 90, 10, 'var(--v-pink)', 0.5],
          [60, 380, 9, 'var(--v-brand)', 0.9],
          [340, 360, 8, 'var(--v-purple)', 1.4],
        ]}
      />

      {/* Pre-heading pill */}
      <div
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: '#fff',
          border: '1.5px solid color-mix(in srgb, var(--v-brand) 33%, transparent)',
          borderRadius: 999,
          fontFamily: 'var(--v-font-body)',
          fontSize: 10,
          fontWeight: 900,
          color: accent,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 22,
          boxShadow: '0 2px 0 color-mix(in srgb, var(--v-brand) 15%, transparent)',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: accent,
            animation: 'v-sparkle 1.4s ease-in-out infinite',
          }}
        />
        ✦ App học tiếng Anh kiểu Việt
      </div>

      {/* Mascot */}
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          marginBottom: 18,
          width: 170,
          height: 160,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--v-brand) 22%, transparent) 0%, transparent 65%)',
            animation: 'v-sparkle 3s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LiveMascot size={150} poses={['happy', 'happy', 'happy', 'blink', 'happy']} interval={1300} />
        </div>
      </div>

      <h1
        style={{
          fontFamily: 'var(--v-font-head)',
          fontSize: 38,
          fontWeight: 1000,
          lineHeight: 1.0,
          margin: 0,
          letterSpacing: '-0.03em',
          color: 'var(--v-ink)',
        }}
      >
        Học tiếng Anh
        <br />
        theo{' '}
        <span
          style={{
            fontStyle: 'italic',
            fontFamily: '"Lora", serif',
            fontWeight: 600,
            backgroundImage: 'linear-gradient(90deg, var(--v-brand), var(--v-pink), var(--v-brand))',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            animation: 'v-bun-shimmer-text 5s linear infinite',
          }}
        >
          kiểu bạn thích
        </span>
        <span style={{ color: 'var(--v-ink)' }}>.</span>
      </h1>

      <p
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 15,
          fontWeight: 700,
          lineHeight: 1.45,
          color: 'var(--v-ink-soft)',
          margin: '14px auto 0',
          maxWidth: 320,
        }}
      >
        Bạn lo phần <b style={{ color: 'var(--v-ink)' }}>học</b> — mình lo phần{' '}
        <b
          style={{
            color: 'var(--v-ink)',
            background: 'color-mix(in srgb, var(--v-brand) 19%, transparent)',
            padding: '0 4px',
            borderRadius: 3,
          }}
        >
          thô
        </b>
        .
      </p>

      {/* CTAs stacked */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginTop: 24,
          maxWidth: 320,
          marginInline: 'auto',
        }}
      >
        <Link
          href="/login"
          style={{
            position: 'relative',
            padding: '15px 24px',
            background: accent,
            color: '#fff',
            border: 'none',
            boxShadow: '0 4px 0 rgba(20,40,80,.2), 0 8px 18px color-mix(in srgb, var(--v-brand) 40%, transparent)',
            borderRadius: 16,
            fontFamily: 'var(--v-font-head)',
            fontWeight: 1000,
            fontSize: 15,
            letterSpacing: '0.02em',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            textDecoration: 'none',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: -3,
              borderRadius: 19,
              animation: 'v-bun-pulse-ring 2s ease-out infinite',
              pointerEvents: 'none',
            }}
          />
          Bắt đầu học miễn phí <Icon name="arrowRight" size={16} stroke="#fff" strokeWidth={3} />
        </Link>

        <a
          href="#workflow"
          style={{
            padding: '14px 24px',
            background: '#fff',
            color: 'var(--v-ink)',
            border: '1.5px solid var(--v-border)',
            boxShadow: 'var(--v-shadow-sm)',
            borderRadius: 16,
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 14,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            textDecoration: 'none',
          }}
        >
          <Icon name="play" size={12} fill={accent} stroke={accent} /> Xem workflow mẫu
        </a>
      </div>

      {/* Trust pills */}
      <div
        style={{
          marginTop: 18,
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
          fontFamily: 'var(--v-font-body)',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--v-muted)',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon name="check" size={12} stroke={accent} strokeWidth={3} /> Miễn phí
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon name="check" size={12} stroke={accent} strokeWidth={3} /> Tiếng Việt
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon name="check" size={12} stroke={accent} strokeWidth={3} /> No card
        </span>
      </div>
    </section>
  );
}
