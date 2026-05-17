'use client';

import Icon from '../landing/shared/Icon';
import Reveal from '../landing/shared/Reveal';

// Mobile features — 2-col grid. README §3.5. Same 8 features as desktop.

interface Feature {
  icon: string;
  title: string;
  body: string;
  color: string;
}

const FEATURES: ReadonlyArray<Feature> = [
  { icon: 'refresh', title: 'SRS thông minh',     body: 'SM-2 + Anki loop. Ôn đến khi thuộc.',   color: 'var(--v-purple)' },
  { icon: 'sparkle', title: 'AI tự sinh thẻ',     body: 'Dán 30 từ, Bún fill IPA, audio, ví dụ.', color: 'var(--v-orange)' },
  { icon: 'speaker', title: 'Luyện đọc to',       body: 'Đọc vào mic, chấm từng từ.',             color: 'var(--v-blue)' },
  { icon: 'pencil',  title: 'Đặt câu có timer',   body: 'Viết câu chứa từ, AI Gemini chấm.',      color: 'var(--v-pink)' },
  { icon: 'book',    title: 'Viết đoạn văn',      body: 'Group từ → AI chấm ngữ pháp.',           color: 'var(--v-teal)' },
  { icon: 'quote',   title: 'Bài đọc tương tác',  body: 'CEFR + karaoke TTS + click từ lạ.',      color: 'var(--v-primary)' },
  { icon: 'cards',   title: 'Điền chỗ trống',     body: 'Cloze quiz từ pool đã học.',             color: 'var(--v-yellow-deep)' },
  { icon: 'flame',   title: 'Streak + Pomodoro',  body: 'Tiến trình + timer tập trung.',          color: 'var(--v-red)' },
];

export default function MFeatures() {
  return (
    <section id="tính-năng" style={{ padding: '44px 20px' }}>
      <div style={{ marginBottom: 20 }}>
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
          Tính năng
        </div>
        <h2
          style={{
            fontFamily: 'var(--v-font-head)',
            fontSize: 28,
            fontWeight: 1000,
            color: 'var(--v-ink)',
            margin: '4px 0 6px',
            letterSpacing: '-0.025em',
          }}
        >
          8 modality,{' '}
          <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600, color: 'var(--v-brand)' }}>
            1 app
          </span>
        </h2>
        <p
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--v-ink-soft)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Đừng học 1 kiểu mãi. Nhồi từ vào não qua nhiều giác quan.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 50}>
            <div
              style={{
                position: 'relative',
                background: '#fff',
                border: '1px solid var(--v-border)',
                boxShadow: 'var(--v-shadow-md)',
                borderRadius: 14,
                padding: '14px 12px',
                overflow: 'hidden',
                boxSizing: 'border-box',
                height: '100%',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: f.color,
                  opacity: 0.1,
                }}
              />
              <div
                style={{
                  position: 'relative',
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: f.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 2px 0 color-mix(in srgb, ${f.color} 50%, transparent), 0 3px 6px color-mix(in srgb, ${f.color} 33%, transparent)`,
                  marginBottom: 10,
                }}
              >
                <Icon name={f.icon} size={15} stroke="#fff" fill="#fff" strokeWidth={2.4} />
              </div>
              <h3
                style={{
                  position: 'relative',
                  fontFamily: 'var(--v-font-head)',
                  fontSize: 13,
                  fontWeight: 1000,
                  color: 'var(--v-ink)',
                  margin: '0 0 4px',
                  letterSpacing: '-0.015em',
                  lineHeight: 1.2,
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  position: 'relative',
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--v-ink-soft)',
                  lineHeight: 1.45,
                  margin: 0,
                }}
              >
                {f.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
