'use client';

import Icon from '../landing/shared/Icon';
import Reveal from '../landing/shared/Reveal';

// 4 reasons Bún differs. README §3.8.

interface Reason {
  eyebrow: string;
  title: string;
  body: string;
  color: string;
  icon: string;
}

const REASONS: ReadonlyArray<Reason> = [
  {
    eyebrow: '01 · Vietnamese-first',
    title: 'Không phải app dịch máy',
    body: 'UI tiếng Việt thật, ví dụ + meaning viết bằng tay, mascot Bún xưng "mình", gọi bạn là "bạn".',
    color: 'var(--v-pink)',
    icon: 'quote',
  },
  {
    eyebrow: '02 · Anki, mềm hơn',
    title: 'Không phải Anki copycat',
    body: 'Có Anki loop trong từng session, nhưng pick & mix module — không ép bạn theo 1 lộ trình.',
    color: 'var(--v-purple)',
    icon: 'refresh',
  },
  {
    eyebrow: '03 · AI thực sự hữu ích',
    title: 'AI auto-fill, chấm bài',
    body: 'Không phải chatbot. AI làm việc khô khan: IPA, audio, ví dụ, chấm câu, chấm đoạn văn.',
    color: 'var(--v-orange)',
    icon: 'sparkle',
  },
  {
    eyebrow: '04 · Workflow linh hoạt',
    title: 'Không ép lộ trình',
    body: '8 modality, dùng cái nào tùy bạn. Workflow của bạn là của bạn.',
    color: 'var(--v-brand)',
    icon: 'gem',
  },
];

export default function MWhy() {
  return (
    <section id="về-bún" style={{ padding: '44px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
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
          Vì sao Bún
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
          4 thứ khác với app{' '}
          <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600, color: 'var(--v-brand)' }}>
            bạn đã thử
          </span>
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {REASONS.map((r, i) => (
          <Reveal key={r.eyebrow} delay={i * 80}>
            <div
              style={{
                position: 'relative',
                background: '#fff',
                border: '1px solid var(--v-border)',
                boxShadow: 'var(--v-shadow-md)',
                borderRadius: 16,
                padding: 16,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                overflow: 'hidden',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: -30,
                  right: -30,
                  width: 90,
                  height: 90,
                  borderRadius: '50%',
                  background: r.color,
                  opacity: 0.08,
                }}
              />
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: r.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: `0 4px 0 color-mix(in srgb, ${r.color} 40%, transparent), 0 4px 12px color-mix(in srgb, ${r.color} 38%, transparent)`,
                }}
              >
                <Icon name={r.icon} size={26} stroke="#fff" fill="#fff" strokeWidth={2.4} />
              </div>
              <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                <div
                  style={{
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 9,
                    fontWeight: 900,
                    color: r.color,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  {r.eyebrow}
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--v-font-head)',
                    fontSize: 16,
                    fontWeight: 1000,
                    color: 'var(--v-ink)',
                    margin: '0 0 4px',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                  }}
                >
                  {r.title}
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--v-ink-soft)',
                    margin: 0,
                    lineHeight: 1.45,
                  }}
                >
                  {r.body}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
