'use client';

import Icon from './shared/Icon';
import WorkflowChapter, { type Workflow } from './shared/WorkflowChapter';

// "★ Quan trọng nhất" — 3 persona chapters showing how different Vietnamese
// learners use Bún. Stacked, with a divider pill at the bottom hinting that
// users can also mix steps freely.

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
      { icon: 'target',  label: 'Đặt mục tiêu',      detail: '30 từ mới mỗi ngày' },
      { icon: 'plus',    label: 'Dán 30 từ tiếng Anh', detail: 'Bún auto-fill toàn bộ' },
      { icon: 'cards',   label: 'Học flashcard',     detail: 'Anki loop, ôn đến khi nhớ' },
      { icon: 'book',    label: 'Viết đoạn văn',     detail: 'Group 30 từ → AI chấm' },
      { icon: 'pencil',  label: 'Điền chỗ trống',    detail: 'Từ chính 30 từ đó' },
      { icon: 'speaker', label: 'Luyện đọc to',      detail: 'Từng từ một' },
      { icon: 'quote',   label: 'Đặt câu có timer',  detail: '60s/từ, AI chấm' },
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
      { icon: 'plus',    label: 'Dán bài Medium/BBC', detail: 'vào Bài đọc' },
      { icon: 'target',  label: 'App chấm CEFR',      detail: 'Biết khó hay dễ' },
      { icon: 'book',    label: 'Click từ lạ',        detail: 'Định nghĩa + lưu deck' },
      { icon: 'speaker', label: 'Karaoke TTS',        detail: 'Nghe đúng âm' },
      { icon: 'pencil',  label: 'Dịch sang Việt',     detail: 'AI chấm bản dịch' },
      { icon: 'quote',   label: 'Paraphrase tiếng Anh', detail: 'AI chấm cách viết' },
    ],
    outcome: 'Mỗi bài đọc = 1 deck + 4 bài luyện',
  },
];

export default function BunWorkflows() {
  return (
    <section
      id="workflows"
      style={{
        padding: '72px 48px',
        background: 'var(--v-panel)',
        position: 'relative',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
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
          ★ Quan trọng nhất
        </div>
        <h2
          style={{
            fontFamily: 'var(--v-font-head)',
            fontSize: 44,
            fontWeight: 1000,
            color: 'var(--v-ink)',
            margin: '6px 0 12px',
            letterSpacing: '-0.025em',
          }}
        >
          Ba người, ba{' '}
          <span
            style={{
              fontStyle: 'italic',
              fontFamily: 'var(--v-font-serif)',
              fontWeight: 600,
              color: 'var(--v-brand)',
            }}
          >
            nhịp học
          </span>{' '}
          khác nhau
        </h2>
        <p
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--v-ink-soft)',
            margin: '0 auto',
            maxWidth: 580,
            lineHeight: 1.5,
          }}
        >
          Bún không ép bạn theo 1 lộ trình. Đây là cách 3 người Việt thật đang dùng — pick &amp; mix module hợp với
          nhịp riêng.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {WORKFLOWS.map((w, i) => (
          <WorkflowChapter key={w.name} w={w} idx={i} />
        ))}
      </div>

      {/* Mix-it hint */}
      <div
        style={{
          marginTop: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <div style={{ flex: 1, height: 1, background: 'var(--v-border)' }} />
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            background: 'var(--v-surface)',
            border: '1px solid var(--v-border)',
            borderRadius: 999,
            boxShadow: 'var(--v-shadow-sm)',
            fontFamily: 'var(--v-font-body)',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--v-ink-soft)',
          }}
        >
          <Icon name="sparkle" size={14} stroke="var(--v-brand)" fill="var(--v-brand)" /> Hoặc trộn lại — workflow của
          bạn là của bạn.
        </div>
        <div style={{ flex: 1, height: 1, background: 'var(--v-border)' }} />
      </div>
    </section>
  );
}
