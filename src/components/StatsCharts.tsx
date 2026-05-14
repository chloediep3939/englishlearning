'use client';

import type { FlashcardStats } from '@/lib/types';

interface Props {
  stats: FlashcardStats;
}

export default function StatsCharts({ stats }: Props) {
  // M1a type stores { date, new, review } per day; compose into total `count` here.
  const days = stats.cards_per_day_last_30.map((d) => ({
    date: d.date,
    count: d.new + d.review,
  }));
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <div
      style={{
        background: 'var(--v-surface)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-lg)',
        boxShadow: 'var(--v-shadow-md)',
        padding: 20,
      }}
    >
      <h3
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 800,
          fontSize: 'var(--v-text-base)',
          color: 'var(--v-muted)',
          letterSpacing: 'var(--v-tracking-wider)',
          textTransform: 'uppercase',
          margin: '0 0 14px',
        }}
      >
        30 ngày qua
      </h3>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 2,
          height: 160,
          marginBottom: 8,
        }}
      >
        {days.map((d, i) => {
          const heightPct = (d.count / max) * 100;
          const isToday = i === days.length - 1;
          return (
            <div
              key={d.date}
              title={`${d.date}: ${d.count} từ`}
              style={{
                flex: 1,
                height: `${Math.max(heightPct, 2)}%`,
                background: d.count > 0
                  ? (isToday ? 'var(--v-primary)' : 'var(--v-primary-soft)')
                  : 'var(--v-border)',
                border: isToday ? '1px solid var(--v-primary-deep)' : 'none',
                borderRadius: '3px 3px 0 0',
                cursor: 'pointer',
                transition: 'background 200ms var(--v-ease)',
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 'var(--v-text-xs)',
          color: 'var(--v-muted)',
          fontFamily: 'var(--v-font-mono)',
        }}
      >
        <span>{days[0]?.date.slice(5) ?? ''}</span>
        <span>Hôm nay</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 8,
          marginTop: 18,
        }}
      >
        <BigStat label="Đúng 7 ngày qua" value={`${Math.round(stats.retention_rate_7d * 100)}%`} color="var(--v-primary)" />
        <BigStat label="Streak" value={`${stats.streak_days} ngày`} color="var(--v-red)" />
        <BigStat label="Hôm nay" value={`${stats.reviews_today} từ`} color="var(--v-blue)" />
      </div>
    </div>
  );
}

function BigStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        padding: 12,
        background: 'var(--v-panel)',
        border: '1px solid var(--v-border)',
        borderRadius: 'var(--v-radius-md)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-xs)',
          fontWeight: 800,
          color: 'var(--v-muted)',
          letterSpacing: 'var(--v-tracking-wide)',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-2xl)',
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}
