'use client';

import Image from 'next/image';
import Icon from '../landing/shared/Icon';

// 3 stacked persona chapters (Chloe, Minh, An). README §3.6.

interface Step {
  icon: string;
  label: string;
  detail: string;
}

interface Workflow {
  name: string;
  tagline: string;
  target: string;
  accent: string;
  accentSoft: string;
  pose: 'bun-learn' | 'bun-flex' | 'bun-dream';
  moodNote: string;
  steps: ReadonlyArray<Step>;
  outcome: string;
}

const WORKFLOWS: ReadonlyArray<Workflow> = [
  {
    name: 'Chloe',
    tagline: 'Học chuyên sâu',
    target: '30 từ / ngày',
    accent: 'var(--v-pink)',
    accentSoft: 'var(--v-bun-pink-bg)',
    pose: 'bun-learn',
    moodNote:
      '"Mình thích cày sâu một list — nhồi 1 từ qua 5 cách khác nhau, đảm bảo thuộc cho bằng được."',
    steps: [
      { icon: 'target',  label: 'Đặt mục tiêu',       detail: '30 từ mới mỗi ngày' },
      { icon: 'plus',    label: 'Dán 30 từ tiếng Anh', detail: 'Bún auto-fill toàn bộ' },
      { icon: 'cards',   label: 'Học flashcard',      detail: 'Anki loop, ôn đến nhớ' },
      { icon: 'book',    label: 'Viết đoạn văn',      detail: 'Group 30 từ → AI chấm' },
      { icon: 'pencil',  label: 'Điền chỗ trống',     detail: 'Từ chính 30 từ đó' },
      { icon: 'speaker', label: 'Luyện đọc to',       detail: 'Từng từ một' },
      { icon: 'quote',   label: 'Đặt câu có timer',   detail: '60s/từ, AI chấm' },
    ],
    outcome: 'Thuộc 30 từ ở 5 modality khác nhau',
  },
  {
    name: 'Minh',
    tagline: 'Người đi làm bận',
    target: '15 phút / ngày',
    accent: 'var(--v-blue)',
    accentSoft: 'var(--v-bun-blue-bg)',
    pose: 'bun-flex',
    moodNote: '"Mình chỉ có 15 phút trước khi đi ngủ. Cần ngắn, gọn, mà vẫn giữ được streak."',
    steps: [
      { icon: 'bolt',    label: '5 phút · Speed quiz', detail: 'Nhận diện 20 từ' },
      { icon: 'refresh', label: '5 phút · Flashcard',  detail: 'Ôn deck due hôm nay' },
      { icon: 'speaker', label: '5 phút · Đọc to',     detail: '3 từ khó nhất' },
    ],
    outcome: 'Giữ nhịp đều, không bỏ ngày',
  },
  {
    name: 'An',
    tagline: 'Học qua đọc báo',
    target: 'Input-driven',
    accent: 'var(--v-primary)',
    accentSoft: 'var(--v-primary-soft)',
    pose: 'bun-dream',
    moodNote:
      '"Mình thích đọc Medium / BBC. Mỗi bài là 1 nguồn từ vựng — không cần học từ list khô khan."',
    steps: [
      { icon: 'plus',    label: 'Dán bài Medium/BBC',   detail: 'vào Bài đọc' },
      { icon: 'target',  label: 'App chấm CEFR',        detail: 'Biết khó hay dễ' },
      { icon: 'book',    label: 'Click từ lạ',          detail: 'Định nghĩa + lưu deck' },
      { icon: 'speaker', label: 'Karaoke TTS',          detail: 'Nghe đúng âm' },
      { icon: 'pencil',  label: 'Dịch sang Việt',       detail: 'AI chấm bản dịch' },
      { icon: 'quote',   label: 'Paraphrase tiếng Anh', detail: 'AI chấm cách viết' },
    ],
    outcome: 'Mỗi bài đọc = 1 deck + 4 bài luyện',
  },
];

function Chapter({ w, idx }: { w: Workflow; idx: number }) {
  return (
    <article
      style={{
        background: '#fff',
        border: '1px solid var(--v-border)',
        boxShadow: 'var(--v-shadow-lg)',
        borderRadius: 20,
        padding: '20px 18px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: w.accentSoft,
              border: `2px solid color-mix(in srgb, ${w.accent} 33%, transparent)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <Image
              src={`/mascot/${w.pose}.png`}
              alt=""
              width={66}
              height={66}
              aria-hidden="true"
              style={{
                animation: 'v-ngoc-float 4s ease-in-out infinite',
                filter: 'drop-shadow(0 4px 8px rgba(40,30,15,.18))',
              }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: w.accent,
              color: '#fff',
              fontFamily: 'var(--v-font-head)',
              fontSize: 10,
              fontWeight: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--v-shadow-sm)',
            }}
          >
            #{idx + 1}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 22,
              fontWeight: 1000,
              color: 'var(--v-ink)',
              letterSpacing: '-0.02em',
              lineHeight: 1.0,
            }}
          >
            {w.name}
          </div>
          <div
            style={{
              fontFamily: '"Lora", serif',
              fontStyle: 'italic',
              fontSize: 13,
              fontWeight: 500,
              color: w.accent,
              marginTop: 2,
            }}
          >
            {w.tagline}
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 5,
              padding: '3px 8px',
              background: w.accentSoft,
              borderRadius: 999,
              fontFamily: 'var(--v-font-body)',
              fontSize: 10,
              fontWeight: 900,
              color: w.accent,
              letterSpacing: '0.04em',
            }}
          >
            🎯 {w.target}
          </div>
        </div>
      </div>

      {/* Mood quote */}
      <div
        style={{
          fontFamily: '"Lora", serif',
          fontStyle: 'italic',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--v-ink-soft)',
          paddingLeft: 10,
          borderLeft: `3px solid color-mix(in srgb, ${w.accent} 60%, transparent)`,
          lineHeight: 1.45,
          marginBottom: 12,
        }}
      >
        {w.moodNote}
      </div>

      {/* Step row (horizontal scroll, bleed to card edge) */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 6,
          margin: '0 -18px',
          paddingLeft: 18,
          paddingRight: 18,
          scrollbarWidth: 'thin',
        }}
      >
        {w.steps.map((s, i) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div
              style={{
                width: 130,
                background: 'var(--v-panel)',
                border: '1px solid var(--v-border)',
                borderRadius: 12,
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: w.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={s.icon} size={12} stroke="#fff" fill="#fff" strokeWidth={2.4} />
              </div>
              <div style={{ fontFamily: 'var(--v-font-head)', fontSize: 11, fontWeight: 900, color: 'var(--v-ink)' }}>
                {s.label}
              </div>
              <div style={{ fontFamily: 'var(--v-font-body)', fontSize: 9.5, fontWeight: 700, color: 'var(--v-muted)', lineHeight: 1.3 }}>
                {s.detail}
              </div>
            </div>
            {i < w.steps.length - 1 && (
              <span style={{ margin: '0 4px', fontSize: 14, color: w.accent, fontWeight: 900 }}>→</span>
            )}
          </div>
        ))}
      </div>

      {/* Outcome bar */}
      <div
        style={{
          marginTop: 12,
          padding: '10px 12px',
          borderRadius: 12,
          background: `linear-gradient(90deg, ${w.accentSoft}, transparent)`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: w.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name="trophy" size={14} stroke="#fff" fill="#fff" strokeWidth={2.4} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 9,
              fontWeight: 900,
              color: w.accent,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Kết quả
          </div>
          <div style={{ fontFamily: 'var(--v-font-head)', fontSize: 12, fontWeight: 900, color: 'var(--v-ink)', marginTop: 2 }}>
            {w.outcome}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function MWorkflows() {
  return (
    <section id="workflow" style={{ padding: '44px 20px', background: 'var(--v-panel)' }}>
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
          ★ Quan trọng nhất
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
          Ba người, ba{' '}
          <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600, color: 'var(--v-brand)' }}>
            nhịp học
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
          Bún không ép lộ trình. Pick &amp; mix module hợp với nhịp riêng.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {WORKFLOWS.map((w, i) => (
          <Chapter key={w.name} w={w} idx={i} />
        ))}
      </div>
    </section>
  );
}
