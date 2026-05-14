'use client';

import Sparkles, { type SparkleItem } from './shared/Sparkles';
import SpeechBubble from './shared/SpeechBubble';
import PulseButton from './shared/PulseButton';
import Icon from './shared/Icon';
import Reveal from './shared/Reveal';

// Final blue-gradient CTA block. 8 corner sparkles, bun-celebrate mascot with
// a serif-italic speech bubble. Two CTAs: primary (white-on-color w/ pulse
// ring) and secondary (translucent on the gradient).

const CTA_SPARKLES: ReadonlyArray<SparkleItem> = [
  [80,   60, 12, '#fff',                  0],
  [1100, 80, 10, 'var(--v-yellow-deep)',  0.4],
  [1150, 280, 14, '#fff',                 1.0],
  [40,   320, 11, 'var(--v-yellow-deep)', 0.7],
  [560,  30,  9, '#fff',                  1.5],
  [820,  290, 11, '#fff',                 0.9],
  [200,  380,  8, 'var(--v-pink)',        1.2],
  [980,  380,  9, '#fff',                 0.5],
];

export default function BunCTA() {
  return (
    <section style={{ padding: '48px 48px 80px', position: 'relative' }}>
      <Reveal>
        <div
          style={{
            position: 'relative',
            borderRadius: 32,
            padding: '60px 56px',
            background: 'linear-gradient(135deg, var(--v-brand) 0%, var(--v-brand-dark) 100%)',
            border: '1px solid rgba(20,40,80,.25)',
            boxShadow:
              '0 8px 0 rgba(20,40,80,.2), 0 18px 40px color-mix(in srgb, var(--v-brand) 33%, transparent)',
            overflow: 'hidden',
          }}
        >
          <Sparkles items={CTA_SPARKLES} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 40,
              position: 'relative',
            }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {/* White radial halo behind the celebrating mascot */}
              <div
                style={{
                  position: 'absolute',
                  inset: -20,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255,255,255,.25), rgba(255,255,255,0))',
                }}
                aria-hidden="true"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/mascot/bun-celebrate.png"
                width={240}
                height={240}
                alt=""
                aria-hidden="true"
                style={{
                  position: 'relative',
                  filter: 'drop-shadow(0 14px 28px rgba(40,30,15,.32))',
                  animation: 'v-ngoc-bob 2.2s ease-in-out infinite',
                }}
              />
              <SpeechBubble
                tail="bottom"
                tailOffset={22}
                font="serif"
                fontStyle="italic"
                fontWeight={600}
                fontSize={16}
                padding="11px 18px"
                borderRadius={18}
                shadow="0 8px 18px rgba(40,30,15,.2)"
                tiltDuration={3.5}
                style={{ top: -10, right: -130 }}
              >
                &quot;Đi học thôi nha!&quot;
              </SpeechBubble>
            </div>

            <div style={{ flex: 1, color: '#fff' }}>
              <h2
                style={{
                  fontFamily: 'var(--v-font-head)',
                  fontSize: 62,
                  fontWeight: 1000,
                  lineHeight: 1,
                  margin: 0,
                  letterSpacing: '-0.035em',
                  textShadow: '0 3px 0 rgba(20,40,80,.22)',
                }}
              >
                Sẵn sàng{' '}
                <span
                  style={{
                    fontStyle: 'italic',
                    fontFamily: 'var(--v-font-serif)',
                    fontWeight: 600,
                  }}
                >
                  bắt đầu
                </span>{' '}
                chưa?
              </h2>
              <p
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 19,
                  fontWeight: 700,
                  lineHeight: 1.4,
                  margin: '14px 0 26px',
                  color: 'rgba(255,255,255,0.96)',
                  maxWidth: 520,
                }}
              >
                Tạo deck đầu tiên trong <b>30 giây</b>. Bún auto-fill IPA · audio · ví dụ · ảnh. Bạn chỉ cần dán từ.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <PulseButton
                  href="/login"
                  tone="inverted"
                  color="#fff"
                  textColor="var(--v-brand)"
                  ringColor="#fff"
                  fontSize={18}
                  padding="18px 34px"
                  borderRadius={20}
                  pulseDuration={2.2}
                >
                  Vào học miễn phí{' '}
                  <Icon name="arrowRight" size={20} stroke="var(--v-brand)" strokeWidth={3} />
                </PulseButton>
                <a
                  href="#workflows"
                  className="bun-cta-btn"
                  style={{
                    padding: '18px 28px',
                    background: 'rgba(255,255,255,0.20)',
                    color: '#fff',
                    border: '1.5px solid rgba(255,255,255,0.60)',
                    borderRadius: 20,
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
                  <Icon name="play" size={13} fill="#fff" stroke="#fff" /> Xem demo trước
                </a>
              </div>
              <div
                style={{
                  marginTop: 18,
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                Không cần thẻ tín dụng · Tiếng Việt 100% · Export sang Anki bất cứ lúc nào
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
