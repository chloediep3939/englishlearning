'use client';

import { Check, Flame } from 'lucide-react';

const N = 14;

interface Props {
  /** Current streak in days (incl. today if completed, else the run up to yesterday). */
  streak: number;
  /** Whether the user has reviewed at least once today — controls the today cell's icon. */
  reviewedToday: boolean;
  /** Longest historical streak. Pass null to hide the sub-line. */
  longestStreak: number | null;
}

export default function StreakBar({ streak, reviewedToday, longestStreak }: Props) {
  // T = today's 1-indexed position in the 14-cell strip.
  //
  // Mode A (streak < N):
  //   - When streak === 0, push today to the leftmost cell (T=1) — no past
  //     days to show, the future projection is what matters.
  //   - Otherwise, today sits at the right edge of the filled run so the
  //     past streak days fill exactly cells 1..streak-1 (if reviewed today)
  //     or 1..streak (if streak is the run up to yesterday — see note).
  // Mode B (streak >= N):
  //   - Center today at T=8. 7 past visible + today + 6 future.
  //
  // The `streak` value passed in represents days completed. If the user has
  // NOT yet reviewed today, the today cell is rendered as "pending" but the
  // past cells still cover the run up to yesterday. We anchor T to the most
  // recent visual position that keeps today on the strip.
  let T: number;
  if (streak >= N) {
    T = 8;
  } else if (streak === 0) {
    T = 1;
  } else {
    T = reviewedToday ? streak : streak + 1;
    if (T > N) T = N;
  }

  // Local-timezone "today at midnight" — the reference for cell date math.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const DAY_MS = 24 * 60 * 60 * 1000;

  const cells = Array.from({ length: N }, (_, i) => {
    const idx = i + 1; // 1-indexed
    const offset = idx - T; // days from today (negative = past)
    const date = new Date(today.getTime() + offset * DAY_MS);
    const isToday = offset === 0;
    const isPast = offset < 0;
    const isFuture = offset > 0;
    // Streak day number — counts from the start of the visible run.
    // Past + today share the same "streak number" axis, starting at the
    // leftmost visible past day. We compute it relative to T so the first
    // visible past cell shows 1 and today shows whatever number we're on.
    const dayNumber = (() => {
      if (streak >= N) {
        // In mode B, today is the (streak)-th day; cells to the left count
        // backwards, cells to the right project forward.
        return streak + offset;
      }
      // Mode A: today's "day number" = streak (if reviewed today) or streak+1
      // (projected). Past cells decrease by 1 going left; future cells project.
      const todayNum = reviewedToday ? streak : streak + 1;
      return todayNum + offset;
    })();
    return { idx, offset, date, isToday, isPast, isFuture, dayNumber };
  });

  return (
    <div
      className="v-card"
      style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 16 }}
    >
      {/* Side label */}
      <div
        style={{
          flexShrink: 0,
          paddingRight: 14,
          borderRight: '1px dashed var(--v-border)',
          minWidth: 132,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              background: 'var(--v-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(255,87,87,0.3)',
              flexShrink: 0,
            }}
          >
            <Flame size={17} color="#fff" fill="#fff" />
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--v-font-head)',
                fontSize: 18,
                fontWeight: 900,
                lineHeight: 1,
                color: 'var(--v-ink)',
              }}
            >
              {streak} ngày
            </div>
            {longestStreak !== null && longestStreak > 0 ? (
              <div
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--v-muted)',
                  marginTop: 2,
                }}
              >
                kỷ lục: {longestStreak}
              </div>
            ) : (
              <div
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--v-muted)',
                  marginTop: 2,
                }}
              >
                {streak >= 1 ? 'streak đang chạy' : 'bắt đầu lại nha'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 14 cells */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(14, 1fr)',
          gap: 4,
        }}
      >
        {cells.map((c) => (
          <Cell
            key={c.idx}
            dayNumber={c.dayNumber}
            date={c.date}
            isToday={c.isToday}
            isPast={c.isPast}
            isFuture={c.isFuture}
            reviewedToday={reviewedToday}
          />
        ))}
      </div>
    </div>
  );
}

function Cell({
  dayNumber,
  date,
  isToday,
  isPast,
  isFuture,
  reviewedToday,
}: {
  dayNumber: number;
  date: Date;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  reviewedToday: boolean;
}) {
  const topColor = isFuture ? 'var(--v-muted)' : 'var(--v-ink)';
  const dateLabel = `${date.getDate()}/${date.getMonth() + 1}`;

  let pill: React.ReactNode;
  if (isPast) {
    pill = (
      <div
        style={{
          ...pillBase,
          background: 'var(--v-primary)',
          border: '1.5px solid var(--v-primary)',
          boxShadow: '0 1px 0 rgba(60,20,5,0.1)',
        }}
      >
        <Check size={14} color="#fff" strokeWidth={3.5} />
      </div>
    );
  } else if (isToday) {
    pill = (
      <div
        style={{
          ...pillBase,
          background: reviewedToday ? 'var(--v-primary)' : 'var(--v-surface)',
          border: `1.5px ${reviewedToday ? 'solid' : 'dashed'} var(--v-primary)`,
          boxShadow: reviewedToday ? '0 1px 0 rgba(60,20,5,0.1)' : 'none',
        }}
      >
        {reviewedToday ? (
          <Check size={14} color="#fff" strokeWidth={3.5} />
        ) : (
          <span
            style={{
              width: 6,
              height: 6,
              background: 'var(--v-primary)',
              borderRadius: '50%',
            }}
          />
        )}
      </div>
    );
  } else {
    pill = (
      <div
        style={{
          ...pillBase,
          background: 'var(--v-panel)',
          border: '1.5px dashed var(--v-border)',
        }}
      />
    );
  }

  return (
    <div style={{ textAlign: 'center', minWidth: 0 }}>
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 9,
          fontWeight: 800,
          color: topColor,
          letterSpacing: '0.04em',
          lineHeight: 1,
        }}
      >
        {dayNumber}
      </div>
      <div style={{ marginTop: 3 }}>{pill}</div>
      <div
        style={{
          marginTop: 3,
          fontFamily: 'var(--v-font-body)',
          fontSize: 9,
          fontWeight: 700,
          color: 'var(--v-ink-soft)',
          lineHeight: 1,
        }}
      >
        {dateLabel}
      </div>
    </div>
  );
}

const pillBase: React.CSSProperties = {
  height: 28,
  borderRadius: 9,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
