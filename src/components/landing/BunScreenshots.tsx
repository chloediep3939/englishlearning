'use client';

import Sparkles, { type SparkleItem } from './shared/Sparkles';
import ScreenshotFrame from './shared/ScreenshotFrame';
import MockDashboard from './shared/MockDashboard';
import MockFlashcard from './shared/MockFlashcard';
import MockReveal from './shared/MockReveal';

const SCREENSHOTS_SPARKLES: ReadonlyArray<SparkleItem> = [
  [90,   60,  9, 'var(--v-pink)',         0],
  [1150, 100, 11, 'var(--v-yellow-deep)', 0.6],
  [60,   480, 10, 'var(--v-brand)',       1.2],
];

export default function BunScreenshots() {
  return (
    <section
      style={{
        padding: '80px 48px',
        background: 'var(--v-surface)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Sparkles items={SCREENSHOTS_SPARKLES} />
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
          Một vài góc trong app
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
          Trông thế này,{' '}
          <span
            style={{
              fontStyle: 'italic',
              fontFamily: 'var(--v-font-serif)',
              fontWeight: 600,
              color: 'var(--v-brand)',
            }}
          >
            cảm giác thế nào
          </span>
          ?
        </h2>
        <div
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--v-muted)',
            marginTop: 6,
          }}
        >
          Di chuột vào ảnh để xem rõ hơn →
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <ScreenshotFrame
          label="DASHBOARD"
          color="var(--v-brand)"
          rotate={-1.4}
          hint="Chương 47 của bạn — streak, lịch ôn, 4 trạng thái từ. Bún chào mỗi sáng."
        >
          <MockDashboard />
        </ScreenshotFrame>
        <ScreenshotFrame
          label="FLASHCARD"
          color="var(--v-blue)"
          rotate={0.8}
          hint="Gõ tiếng Anh khi mình đưa nghĩa. Sai không sao — Bún tự điều chỉnh lịch ôn."
        >
          <MockFlashcard />
        </ScreenshotFrame>
        <ScreenshotFrame
          label="ÔN TẬP · REVEAL"
          color="var(--v-purple)"
          rotate={-0.5}
          hint="Char-diff hiện chỗ sai. Nghĩa, ví dụ, collocations — đọc xong tự rate."
        >
          <MockReveal />
        </ScreenshotFrame>
      </div>
    </section>
  );
}
