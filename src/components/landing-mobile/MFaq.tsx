'use client';

import { useState } from 'react';
import Icon from '../landing/shared/Icon';

// 5 FAQ accordion items. README §3.9.

interface FAQ {
  q: string;
  a: string;
}

const FAQS: ReadonlyArray<FAQ> = [
  {
    q: 'Bún khác Anki ở đâu?',
    a: 'Anki tốt cho flashcard, nhưng workflow ngắn. Bún có Anki loop + AI auto-fill + 7 modality khác (đọc to, viết câu, đoạn văn, bài đọc tương tác…). Vẫn có thể export sang Anki nếu bạn cần.',
  },
  {
    q: 'AI có miễn phí không?',
    a: 'Miễn phí. Free tier Gemini Flash đủ cho người dùng thường (~30 từ/ngày). Nếu hết quota, bạn có thể nhập từ tay — workflow vẫn chạy.',
  },
  {
    q: 'Dữ liệu của mình ở đâu?',
    a: 'Cloudflare D1 (SQLite). Bạn login bằng Google, mỗi user là 1 row. Export Anki bất kỳ lúc nào — không khóa dữ liệu.',
  },
  {
    q: 'Có app iOS / Android không?',
    a: 'Hiện tại là web app. Mở trên điện thoại được — UI mobile-first. Native app trong roadmap.',
  },
  {
    q: 'Có hỗ trợ TOEIC / IELTS / PTE không?',
    a: 'Có deck mẫu cho mỗi mục. Bạn có thể tạo deck riêng cho bài thi mình đang luyện. Bún không thay thế khoá học, chỉ giúp phần từ vựng + phản xạ.',
  },
];

export default function MFaq() {
  const [open, setOpen] = useState(0);
  const accent = 'var(--v-brand)';
  return (
    <section id="faq" style={{ padding: '44px 20px', background: 'var(--v-panel)' }}>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
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
          Hỏi đáp
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
          Mấy câu{' '}
          <span style={{ fontStyle: 'italic', fontFamily: '"Lora", serif', fontWeight: 600, color: accent }}>
            thường gặp
          </span>
        </h2>
        <p style={{ fontFamily: 'var(--v-font-body)', fontSize: 12, fontWeight: 600, color: 'var(--v-ink-soft)', margin: 0 }}>
          Còn câu khác? <a href="mailto:chao@bun.app" style={{ color: accent, fontWeight: 800, textDecoration: 'none' }}>chao@bun.app</a>
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div
              key={f.q}
              style={{
                background: '#fff',
                border: isOpen
                  ? '1px solid color-mix(in srgb, var(--v-brand) 33%, transparent)'
                  : '1px solid var(--v-border)',
                boxShadow: isOpen
                  ? '0 6px 14px color-mix(in srgb, var(--v-brand) 15%, transparent), 0 2px 0 color-mix(in srgb, var(--v-brand) 13%, transparent)'
                  : 'var(--v-shadow-sm)',
                borderRadius: 14,
                overflow: 'hidden',
                transition: 'all .2s ease',
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: isOpen ? accent : '#fff',
                    color: isOpen ? '#fff' : accent,
                    border: isOpen ? 'none' : `1px solid color-mix(in srgb, var(--v-brand) 33%, transparent)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--v-font-head)',
                    fontSize: 11,
                    fontWeight: 1000,
                    flexShrink: 0,
                  }}
                >
                  Q{i + 1}
                </div>
                <div
                  style={{
                    flex: 1,
                    fontFamily: 'var(--v-font-head)',
                    fontSize: 13,
                    fontWeight: 900,
                    color: 'var(--v-ink)',
                    lineHeight: 1.3,
                  }}
                >
                  {f.q}
                </div>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: isOpen ? accent : 'var(--v-panel)',
                    color: isOpen ? '#fff' : 'var(--v-ink-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: isOpen ? 'rotate(45deg)' : 'none',
                    transition: 'transform .2s ease',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="plus" size={14} stroke="currentColor" strokeWidth={2.6} />
                </div>
              </button>
              <div
                style={{
                  maxHeight: isOpen ? 240 : 0,
                  overflow: 'hidden',
                  transition: 'max-height .35s cubic-bezier(.4,0,.2,1)',
                }}
              >
                <p
                  style={{
                    padding: '0 14px 14px 50px',
                    margin: 0,
                    fontFamily: 'var(--v-font-body)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--v-ink-soft)',
                    lineHeight: 1.55,
                  }}
                >
                  {f.a}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
