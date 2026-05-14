'use client';

import { useState } from 'react';
import FaqItem from './shared/FaqItem';
import Reveal from './shared/Reveal';

// Original 2-col layout (0.7fr / 1.3fr) with the bun-dream mascot anchoring
// a sticky aside on the left. The earlier centered redesign over-corrected —
// per user feedback the layout was already good; only the answers needed
// rewriting.
//
// Q1 + Q5 rewritten to match the project's honest "side project, no paid
// plan today" positioning; the marketing-y "tier pro" + "không bán data,
// không quảng cáo" lines are gone.

interface FAQ {
  q: string;
  a: string;
}

const FAQS: ReadonlyArray<FAQ> = [
  {
    q: 'Có mất phí không?',
    a: 'Không, hiện tại không thu phí. Đây là phần mềm mình viết cho chính mình học, rồi share cho mọi người cùng chí hướng. Hiện chưa có plan tính phí nào — nếu sau này có thay đổi, mình sẽ thông báo trước nha.',
  },
  {
    q: 'Khác gì Anki / Duolingo?',
    a: 'Khác Anki: Bún có 8 modality (đọc to, viết câu, đoạn văn, bài đọc) + AI auto-fill — không phải chỉ flip card khô khan. Khác Duolingo: Bún không ép lộ trình bài — bạn pick & mix theo nhịp riêng.',
  },
  {
    q: 'AI sai thì sao?',
    a: 'Bún dùng Gemini 2.5 Flash + cross-check với dictionary cho IPA và nghĩa. Vẫn có thể sai — bạn edit trực tiếp được, hoặc 1-click regenerate. Bún không ép bạn tin AI.',
  },
  {
    q: 'Cần internet không?',
    a: 'Cần internet cho lần đầu mỗi thẻ (để AI sinh nội dung). Sau đó, ôn flashcard offline được — content đã cache. Đọc to và viết bài thì vẫn cần network.',
  },
  {
    q: 'Data của mình lưu ở đâu?',
    a: 'Decks và progress lưu trên Cloudflare D1 dưới account của bạn. Không gửi đi đâu khác. Muốn rời đi lúc nào cũng được — export sang Anki/CSV bất cứ lúc nào.',
  },
];

export default function BunFAQ() {
  const [open, setOpen] = useState<number>(0);
  return (
    <section
      id="faq"
      style={{
        padding: '72px 48px',
        background: 'var(--v-panel)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '0.7fr 1.3fr',
          gap: 48,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ position: 'sticky', top: 90 }}>
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
            Hỏi · Đáp
          </div>
          <h2
            style={{
              fontFamily: 'var(--v-font-head)',
              fontSize: 40,
              fontWeight: 1000,
              color: 'var(--v-ink)',
              margin: '6px 0 14px',
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
            }}
          >
            Mấy câu{' '}
            <span
              style={{
                fontStyle: 'italic',
                fontFamily: 'var(--v-font-serif)',
                fontWeight: 600,
                color: 'var(--v-brand)',
              }}
            >
              thường gặp
            </span>
          </h2>
          <p
            style={{
              fontFamily: 'var(--v-font-body)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--v-ink-soft)',
              margin: '0 0 18px',
              lineHeight: 1.55,
            }}
          >
            Có câu khác chưa thấy ở đây? Cứ hỏi mình — sẽ thêm vào nếu nhiều người cùng thắc mắc.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mascot/bun-dream.png"
            width={170}
            height={170}
            alt=""
            aria-hidden="true"
            style={{
              filter: 'drop-shadow(0 8px 18px rgba(40,30,15,.20))',
              animation: 'v-ngoc-float 4.5s ease-in-out infinite',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={i * 60} distance={16}>
              <FaqItem
                q={f.q}
                a={f.a}
                idx={i}
                open={open === i}
                onToggle={() => setOpen(open === i ? -1 : i)}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
