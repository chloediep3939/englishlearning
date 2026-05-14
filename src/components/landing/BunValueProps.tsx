'use client';

import Icon from './shared/Icon';
import Reveal from './shared/Reveal';
import HoverLift from './shared/HoverLift';

// "3 trụ cột" section. Each card carries a colored quarter-circle behind a
// 96×96 mascot pose, a 48×48 icon box, and a highlighted phrase in the H3.

interface Pillar {
  eyebrow: string;
  title: string;
  titleHL: string;       // substring of `title` to color with `color`
  body: string;
  icon: string;
  color: string;          // CSS color / var
  bg: string;             // pastel CSS color / var
  bun: 'bun-learn' | 'bun-flex' | 'bun-magic';
}

const PILLARS: ReadonlyArray<Pillar> = [
  {
    eyebrow: '01 · Workflow',
    title: 'Học theo workflow của bạn',
    titleHL: 'bạn',
    body: 'Không lộ trình ép buộc. Pick & mix flashcard, đọc, nói, viết câu — bạn tự design nhịp riêng.',
    icon: 'cards',
    color: 'var(--v-brand)',
    bg: 'var(--v-brand-soft)',
    bun: 'bun-learn',
  },
  {
    eyebrow: '02 · AI',
    title: 'AI lo phần khô khan',
    titleHL: 'khô khan',
    body: 'Dán từ tiếng Anh, Bún tự fill IPA · audio · 3 ví dụ · collocations · ảnh Pexels trong vài giây.',
    icon: 'sparkle',
    color: 'var(--v-orange)',
    bg: 'var(--v-bun-orange-bg)',
    bun: 'bun-magic',
  },
  {
    eyebrow: '03 · Modality',
    title: 'Đủ kiểu để không chán',
    titleHL: 'không chán',
    body: 'Flashcard, đọc to, viết câu, đoạn văn, đọc bài AI chấm, điền chỗ trống — tất cả trong 1 app.',
    icon: 'gem',
    color: 'var(--v-purple)',
    bg: 'var(--v-bun-purple-bg)',
    bun: 'bun-flex',
  },
];

export default function BunValueProps() {
  return (
    <section
      style={{
        padding: '60px 48px',
        background: 'var(--v-panel)',
        position: 'relative',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 38 }}>
        <div
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 12,
            fontWeight: 900,
            color: 'var(--v-muted)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          3 trụ cột
        </div>
        <h2
          style={{
            fontFamily: 'var(--v-font-head)',
            fontSize: 38,
            fontWeight: 1000,
            color: 'var(--v-ink)',
            margin: '6px 0 0',
            letterSpacing: '-0.025em',
          }}
        >
          Vì sao Bún{' '}
          <span
            style={{
              fontStyle: 'italic',
              fontFamily: 'var(--v-font-serif)',
              fontWeight: 600,
              color: 'var(--v-brand)',
            }}
          >
            khác
          </span>
          ?
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {PILLARS.map((c, i) => {
          const [before, after] = c.title.split(c.titleHL);
          return (
            <Reveal key={c.eyebrow} delay={i * 120}>
              <HoverLift lift={8} style={{ height: '100%' }}>
                <div
                  style={{
                    position: 'relative',
                    background: 'var(--v-surface)',
                    border: '1px solid var(--v-border)',
                    boxShadow: 'var(--v-shadow-lg)',
                    borderRadius: 22,
                    padding: '24px 22px 22px',
                    overflow: 'hidden',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: -40,
                      right: -40,
                      width: 160,
                      height: 160,
                      borderRadius: '50%',
                      background: c.bg,
                    }}
                    aria-hidden="true"
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 10,
                      width: 96,
                      height: 96,
                      opacity: 0.95,
                      animation: `v-ngoc-float 4s ease-in-out ${i * 0.3}s infinite`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/mascot/${c.bun}.png`}
                      width={96}
                      height={96}
                      alt=""
                      aria-hidden="true"
                      style={{ filter: 'drop-shadow(0 6px 12px rgba(40,30,15,.18))' }}
                    />
                  </div>
                  <div style={{ position: 'relative', marginTop: 70 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: c.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 4px 0 rgba(60,20,5,.12), 0 6px 12px color-mix(in srgb, ${c.color} 31%, transparent)`,
                        marginBottom: 14,
                      }}
                    >
                      <Icon name={c.icon} size={22} stroke="#fff" fill="#fff" strokeWidth={2.4} />
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--v-font-body)',
                        fontSize: 11,
                        fontWeight: 900,
                        color: 'var(--v-muted)',
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        marginBottom: 6,
                      }}
                    >
                      {c.eyebrow}
                    </div>
                    <h3
                      style={{
                        fontFamily: 'var(--v-font-head)',
                        fontSize: 22,
                        fontWeight: 1000,
                        color: 'var(--v-ink)',
                        margin: '0 0 10px',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.15,
                      }}
                    >
                      {before}
                      <span style={{ color: c.color }}>{c.titleHL}</span>
                      {after}
                    </h3>
                    <p
                      style={{
                        fontFamily: 'var(--v-font-body)',
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--v-ink-soft)',
                        lineHeight: 1.55,
                        margin: 0,
                      }}
                    >
                      {c.body}
                    </p>
                  </div>
                </div>
              </HoverLift>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
