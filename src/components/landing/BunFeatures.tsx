'use client';

import FeatureCard, { type Feature } from './shared/FeatureCard';
import Reveal from './shared/Reveal';

// 4×2 features grid. Vietnamese strings come straight from README §5 — don't
// reword. Each card's color tints its corner ellipse + icon shadow.

const FEATURES: ReadonlyArray<Feature> = [
  {
    icon: 'refresh',
    title: 'Học theo SRS thông minh',
    body: 'Lịch ôn khoa học (SM-2), Anki-style loop trong session — ôn đến khi thực sự thuộc.',
    color: 'var(--v-purple)',
  },
  {
    icon: 'sparkle',
    title: 'AI tự sinh thẻ',
    body: 'Dán 30 từ tiếng Anh, Bún tự fill IPA, audio, 3 ví dụ, collocations, ảnh Pexels.',
    color: 'var(--v-orange)',
  },
  {
    icon: 'speaker',
    title: 'Luyện đọc to',
    body: 'Đọc vào mic, Web Speech API chấm phát âm theo từng từ.',
    color: 'var(--v-blue)',
  },
  {
    icon: 'pencil',
    title: 'Đặt câu có timer',
    body: 'Viết câu chứa từ đã học, AI Gemini chấm + góp ý cụ thể.',
    color: 'var(--v-pink)',
  },
  {
    icon: 'book',
    title: 'Viết đoạn văn',
    body: 'Chọn pool từ đã học, viết bài, AI chấm ngữ pháp + cách dùng từ.',
    color: 'var(--v-teal)',
  },
  {
    icon: 'quote',
    title: 'Bài đọc tương tác',
    body: 'Dán bài viết bất kỳ, app chấm CEFR, karaoke TTS, click từ lạ → định nghĩa + lưu deck.',
    color: 'var(--v-primary)',
  },
  {
    icon: 'cards',
    title: 'Điền chỗ trống',
    body: 'Cloze quiz tự sinh từ pool đã học, luyện nhận diện ngữ cảnh.',
    color: 'var(--v-yellow-deep)',
  },
  {
    icon: 'flame',
    title: 'Streak + Pomodoro',
    body: 'Theo dõi tiến trình, mục tiêu hàng ngày, timer tập trung tích hợp.',
    color: 'var(--v-red)',
  },
];

export default function BunFeatures() {
  return (
    <section id="features" style={{ padding: '72px 48px', position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 32,
          position: 'relative',
          gap: 24,
        }}
      >
        <div>
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
            Tính năng
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
            8 modality,{' '}
            <span
              style={{
                fontStyle: 'italic',
                fontFamily: 'var(--v-font-serif)',
                fontWeight: 600,
                color: 'var(--v-brand)',
              }}
            >
              1 app
            </span>
          </h2>
        </div>
        <p
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--v-ink-soft)',
            maxWidth: 360,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Đừng học 1 kiểu mãi. Nhồi từ vào não qua nhiều giác quan — bạn nhớ lâu hơn, đỡ chán hơn.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 70}>
            <FeatureCard feature={f} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
