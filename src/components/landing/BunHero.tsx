'use client';

import BlobBg, { type Blob } from './shared/BlobBg';
import Sparkles, { type SparkleItem } from './shared/Sparkles';
import LiveMascot from './shared/LiveMascot';
import SpeechBubble from './shared/SpeechBubble';
import PulseButton from './shared/PulseButton';
import Icon from './shared/Icon';
import MockStreakCard from './shared/MockStreakCard';
import MockWordCard from './shared/MockWordCard';

// Pre-computed at module scope so reveals are stable across re-renders.
const HERO_BLOBS: ReadonlyArray<Blob> = [
  { x: '5%',  y: '10%', r: 380, color: 'var(--v-brand)',  opacity: 0.16, dur: 18, delay: 0 },
  { x: '70%', y: '5%',  r: 320, color: 'var(--v-pink)',   opacity: 0.12, dur: 22, delay: 2 },
  { x: '60%', y: '60%', r: 360, color: 'var(--v-yellow-deep)', opacity: 0.10, dur: 20, delay: 4 },
  { x: '-5%', y: '55%', r: 300, color: 'var(--v-teal)',   opacity: 0.10, dur: 17, delay: 1 },
];

const HERO_SPARKLES: ReadonlyArray<SparkleItem> = [
  [140,  80, 11, 'var(--v-yellow-deep)', 0],
  [1120, 110, 12, 'var(--v-pink)',  0.5],
  [240, 260,  9, 'var(--v-brand)',  1.1],
  [1040, 300, 11, 'var(--v-orange)', 0.3],
  [60,  420, 10, 'var(--v-purple)', 0.9],
  [1180, 460,  9, 'var(--v-teal)',  1.4],
  [560, 600, 12, 'var(--v-yellow-deep)', 0.6],
  [320, 540,  8, 'var(--v-pink)',   1.2],
];

export default function BunHero() {
  return (
    <section
      style={{
        padding: '60px 48px 90px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 700,
      }}
    >
      <BlobBg blobs={HERO_BLOBS} />
      <Sparkles items={HERO_SPARKLES} />

      {/* Pre-heading badge */}
      <div
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '7px 16px',
          background: 'var(--v-surface)',
          border: '1.5px solid rgba(58,169,230,0.33)',
          borderRadius: 999,
          fontFamily: 'var(--v-font-body)',
          fontSize: 12,
          fontWeight: 900,
          color: 'var(--v-brand)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: 28,
          boxShadow: '0 3px 0 rgba(58,169,230,0.14)',
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--v-brand)',
            animation: 'v-sparkle 1.4s ease-in-out infinite',
          }}
        />
        App học tiếng Anh kiểu Việt · v0.4 beta
      </div>

      {/* Live mascot with halo + speech bubble */}
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          marginBottom: 28,
          width: 240,
          height: 220,
        }}
      >
        {/* Twinkling blue halo behind mascot */}
        <div
          style={{
            position: 'absolute',
            inset: '10px 10px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(58,169,230,0.25) 0%, rgba(58,169,230,0) 65%)',
            animation: 'v-sparkle 3s ease-in-out infinite',
          }}
          aria-hidden="true"
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
          <LiveMascot size={210} poses={['happy', 'happy', 'happy', 'idle', 'happy']} interval={1300} />
        </div>
        <SpeechBubble
          tail="left"
          tailOffset={14}
          tiltDuration={4}
          style={{ right: -150, top: 30 }}
        >
          Mình đợi bạn nha 🐲
        </SpeechBubble>
      </div>

      {/* Heading */}
      <h1
        style={{
          fontFamily: 'var(--v-font-head)',
          fontSize: 76,
          fontWeight: 1000,
          lineHeight: 0.98,
          margin: '0 auto',
          letterSpacing: '-0.035em',
          color: 'var(--v-ink)',
          maxWidth: 920,
          position: 'relative',
        }}
      >
        Học tiếng Anh<br />
        theo{' '}
        <span
          style={{
            fontStyle: 'italic',
            fontFamily: 'var(--v-font-serif)',
            fontWeight: 600,
            backgroundImage: 'linear-gradient(90deg, var(--v-brand), var(--v-pink), var(--v-brand))',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            animation: 'v-bun-shimmer-text 5s linear infinite',
            paddingRight: 4,
          }}
        >
          kiểu bạn thích
        </span>
        <span style={{ display: 'inline-block', color: 'var(--v-ink)', position: 'relative' }}>.</span>
      </h1>

      {/* Sub */}
      <p
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 21,
          fontWeight: 700,
          lineHeight: 1.4,
          color: 'var(--v-ink-soft)',
          margin: '22px auto 0',
          maxWidth: 640,
          position: 'relative',
        }}
      >
        Bạn lo phần <b style={{ color: 'var(--v-ink)', position: 'relative' }}>học</b> — mình lo phần{' '}
        <b style={{ color: 'var(--v-ink)', position: 'relative' }}>
          thô
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: -2,
              right: -2,
              bottom: 1,
              height: 6,
              background: 'rgba(58,169,230,0.25)',
              zIndex: -1,
              borderRadius: 3,
            }}
          />
        </b>
        .
      </p>

      {/* CTAs */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          marginTop: 34,
          position: 'relative',
        }}
      >
        <PulseButton href="/login">
          Bắt đầu học <Icon name="arrowRight" size={18} stroke="#fff" strokeWidth={3} />
        </PulseButton>
        <a
          href="#workflows"
          className="bun-cta-btn"
          style={{
            padding: '17px 26px',
            background: 'var(--v-surface)',
            color: 'var(--v-ink)',
            border: '1.5px solid var(--v-border)',
            boxShadow: 'var(--v-shadow-md)',
            borderRadius: 18,
            fontFamily: 'var(--v-font-head)',
            fontWeight: 900,
            fontSize: 15,
            cursor: 'pointer',
            letterSpacing: '0.02em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            textDecoration: 'none',
          }}
        >
          <Icon name="play" size={13} fill="var(--v-brand)" stroke="var(--v-brand)" /> Xem workflow mẫu
        </a>
      </div>

      {/* Trust row */}
      <div
        style={{
          marginTop: 22,
          display: 'inline-flex',
          gap: 22,
          alignItems: 'center',
          fontFamily: 'var(--v-font-body)',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--v-muted)',
          position: 'relative',
        }}
      >
        {['Miễn phí dùng thử', 'Tiếng Việt 100%', 'Không cần thẻ tín dụng'].map((label) => (
          <span
            key={label}
            className="bun-trust-item"
            style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'default' }}
          >
            <Icon name="check" size={13} stroke="var(--v-brand)" strokeWidth={3} /> {label}
          </span>
        ))}
      </div>

      {/* Floating mock previews */}
      <div
        style={{
          position: 'absolute',
          left: 36,
          top: 230,
          transform: 'rotate(-3deg)',
        }}
      >
        <MockStreakCard />
      </div>
      <div
        style={{
          position: 'absolute',
          right: 36,
          top: 200,
          transform: 'rotate(4deg)',
        }}
      >
        <MockWordCard />
      </div>
    </section>
  );
}
