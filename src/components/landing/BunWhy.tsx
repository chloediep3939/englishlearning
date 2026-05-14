'use client';

import Icon from './shared/Icon';
import Reveal from './shared/Reveal';
import HoverLift from './shared/HoverLift';

// "4 thứ khác với app bạn đã thử" — alternating row / row-reverse layout.
// Each card: 96×96 squircle icon block + eyebrow chip + H3 + body, with a
// giant ghost number (panel-color) at the far end.

interface Reason {
  eyebrow: string;
  title: string;
  body: string;
  icon: string;
  color: string;
}

const REASONS: ReadonlyArray<Reason> = [
  {
    eyebrow: 'Vietnamese-first',
    title: 'Không phải app dịch máy',
    body:
      'Mọi nghĩa, ví dụ, gợi ý đều viết cho người Việt học — không phải bản dịch Google của Anki English deck.',
    icon: 'quote',
    color: 'var(--v-pink)',
  },
  {
    eyebrow: 'Không phải Anki copycat',
    title: 'Có Anki loop, mà mềm hơn',
    body: 'SM-2 vẫn ở dưới. Nhưng trên là 8 modality — không chỉ flip card khô khan như Anki vanilla.',
    icon: 'refresh',
    color: 'var(--v-purple)',
  },
  {
    eyebrow: 'AI thực sự hữu ích',
    title: 'Auto-fill, chấm bài — không phải chatbot',
    body: 'Bún không chat với bạn. Bún làm việc: sinh nội dung thẻ trong 3 giây, chấm bản dịch trong 5 giây.',
    icon: 'sparkle',
    color: 'var(--v-orange)',
  },
  {
    eyebrow: 'Workflow linh hoạt',
    title: 'Không ép lộ trình',
    body: 'Hôm nay muốn cày 30 từ? OK. Hôm sau chỉ muốn đọc 1 bài Medium? Cũng OK. Bún không gắt.',
    icon: 'gem',
    color: 'var(--v-brand)',
  },
];

export default function BunWhy() {
  return (
    <section id="why" style={{ padding: '80px 48px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ textAlign: 'center', marginBottom: 44 }}>
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
          Vì sao Bún
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
          4 thứ khác với app{' '}
          <span
            style={{
              fontStyle: 'italic',
              fontFamily: 'var(--v-font-serif)',
              fontWeight: 600,
              color: 'var(--v-brand)',
            }}
          >
            bạn đã thử
          </span>
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {REASONS.map((r, i) => {
          const flipped = i % 2 === 1;
          return (
            <Reveal key={r.eyebrow} delay={i * 80} distance={26}>
              <HoverLift lift={4}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: flipped ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 26,
                    background: 'var(--v-surface)',
                    border: '1px solid var(--v-border)',
                    boxShadow: 'var(--v-shadow-md)',
                    borderRadius: 22,
                    padding: '22px 28px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      [flipped ? 'left' : 'right']: -40,
                      top: -30,
                      width: 160,
                      height: 160,
                      borderRadius: '50%',
                      background: r.color,
                      opacity: 0.10,
                    }}
                    aria-hidden="true"
                  />
                  <div
                    style={{
                      flexShrink: 0,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 96,
                      height: 96,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 22,
                        background: r.color,
                        boxShadow: `0 6px 0 rgba(20,40,80,.12), 0 8px 16px color-mix(in srgb, ${r.color} 27%, transparent)`,
                      }}
                    />
                    <Icon
                      name={r.icon}
                      size={44}
                      stroke="#fff"
                      fill="#fff"
                      strokeWidth={2.2}
                      style={{ position: 'relative' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '3px 10px',
                        background: `color-mix(in srgb, ${r.color} 10%, transparent)`,
                        color: r.color,
                        borderRadius: 999,
                        fontFamily: 'var(--v-font-body)',
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        marginBottom: 7,
                      }}
                    >
                      <Icon name={r.icon} size={12} stroke={r.color} fill={r.color} strokeWidth={2.4} /> {r.eyebrow}
                    </div>
                    <h3
                      style={{
                        fontFamily: 'var(--v-font-head)',
                        fontSize: 24,
                        fontWeight: 1000,
                        color: 'var(--v-ink)',
                        margin: '0 0 6px',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.15,
                      }}
                    >
                      {r.title}
                    </h3>
                    <p
                      style={{
                        fontFamily: 'var(--v-font-body)',
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--v-ink-soft)',
                        margin: 0,
                        lineHeight: 1.55,
                      }}
                    >
                      {r.body}
                    </p>
                  </div>
                  <div
                    style={{
                      flexShrink: 0,
                      fontFamily: 'var(--v-font-head)',
                      fontWeight: 1000,
                      fontSize: 70,
                      color: 'var(--v-panel)',
                      lineHeight: 1,
                      letterSpacing: '-0.04em',
                    }}
                    aria-hidden="true"
                  >
                    0{i + 1}
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
