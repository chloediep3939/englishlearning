'use client';

import Image from 'next/image';
import Icon, { type IconName } from '../landing/shared/Icon';
import Reveal from '../landing/shared/Reveal';

// 3 stacked value-prop cards. README §3.4.

interface ValueCard {
  eyebrow: string;
  title: string;
  titleHL: string;
  body: string;
  icon: IconName;
  color: string;
  bg: string;
  bun: 'bun-learn' | 'bun-magic' | 'bun-flex';
}

const CARDS: ReadonlyArray<ValueCard> = [
  {
    eyebrow: '01 · Workflow',
    title: 'Học theo workflow của',
    titleHL: 'bạn',
    body: 'Không lộ trình ép buộc. Pick & mix flashcard, đọc, nói, viết câu.',
    icon: 'cards' as IconName,
    color: 'var(--v-brand)',
    bg: 'var(--v-brand-soft)',
    bun: 'bun-learn',
  },
  {
    eyebrow: '02 · AI',
    title: 'AI lo phần',
    titleHL: 'khô khan',
    body: 'Dán từ tiếng Anh, Bún tự fill IPA · audio · ví dụ · ảnh trong vài giây.',
    icon: 'sparkle' as IconName,
    color: 'var(--v-orange)',
    bg: 'var(--v-bun-orange-bg)',
    bun: 'bun-magic',
  },
  {
    eyebrow: '03 · Modality',
    title: 'Đủ kiểu để',
    titleHL: 'không chán',
    body: 'Flashcard, đọc to, viết câu, đoạn văn, đọc bài AI chấm — tất cả trong 1 app.',
    icon: 'gem' as IconName,
    color: 'var(--v-purple)',
    bg: 'var(--v-bun-purple-bg)',
    bun: 'bun-flex',
  },
];

export default function MValueProps() {
  return (
    <section style={{ padding: '44px 20px', background: 'var(--v-panel)' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 10,
            fontWeight: 900,
            color: 'var(--v-muted)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          3 trụ cột
        </div>
        <h2
          style={{
            fontFamily: 'var(--v-font-head)',
            fontSize: 28,
            fontWeight: 1000,
            color: 'var(--v-ink)',
            margin: '4px 0 0',
            letterSpacing: '-0.025em',
          }}
        >
          Vì sao Bún{' '}
          <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600, color: 'var(--v-brand)' }}>
            khác
          </span>
          ?
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {CARDS.map((c, i) => (
          <Reveal key={c.eyebrow} delay={i * 100}>
            <div
              style={{
                position: 'relative',
                background: '#fff',
                border: '1px solid var(--v-border)',
                boxShadow: 'var(--v-shadow-md)',
                borderRadius: 18,
                padding: '18px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: -30,
                  right: -30,
                  width: 110,
                  height: 110,
                  borderRadius: '50%',
                  background: c.bg,
                }}
              />
              <div
                style={{
                  flexShrink: 0,
                  width: 72,
                  height: 72,
                  position: 'relative',
                  animation: `v-ngoc-float ${4 + i * 0.3}s ease-in-out infinite`,
                  filter: 'drop-shadow(0 4px 8px rgba(40,30,15,.18))',
                }}
              >
                <Image src={`/mascot/${c.bun}.png`} alt="" width={72} height={72} aria-hidden="true" />
              </div>
              <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 7,
                      background: c.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 2px 4px color-mix(in srgb, ${c.color} 31%, transparent)`,
                    }}
                  >
                    <Icon name={c.icon} size={11} stroke="#fff" fill="#fff" strokeWidth={2.4} />
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--v-font-body)',
                      fontSize: 9,
                      fontWeight: 900,
                      color: 'var(--v-muted)',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {c.eyebrow}
                  </div>
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--v-font-head)',
                    fontSize: 16,
                    fontWeight: 1000,
                    color: 'var(--v-ink)',
                    margin: '0 0 4px',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.15,
                  }}
                >
                  {c.title} <span style={{ color: c.color }}>{c.titleHL}</span>
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--v-ink-soft)',
                    lineHeight: 1.45,
                    margin: 0,
                  }}
                >
                  {c.body}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
