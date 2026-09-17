import Link from 'next/link';
import { Map, RotateCcw } from 'lucide-react';
import type { RoadmapSkillSummary } from '@/lib/types';
import ProgressBar from './ProgressBar';
import { skillMeta, STATUS_COLOR } from './skill-meta';

interface Props {
  summary: RoadmapSkillSummary[];
}

/** Ô tóm tắt lộ trình trên /dashboard — chỉ đọc, bấm vào để sang /roadmap. */
export default function RoadmapSummaryCard({ summary }: Props) {
  const totals = summary.reduce(
    (a, s) => ({
      total: a.total + s.total,
      pass: a.pass + s.pass,
      fail: a.fail + s.fail,
      untested: a.untested + s.untested,
      needs_retest: a.needs_retest + s.needs_retest,
    }),
    { total: 0, pass: 0, fail: 0, untested: 0, needs_retest: 0 },
  );

  if (totals.total === 0) return null;

  return (
    <div className="v-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3
          style={{
            fontFamily: 'var(--v-font-head)',
            fontSize: 15,
            fontWeight: 900,
            margin: 0,
            color: 'var(--v-ink)',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <Map size={15} style={{ color: 'var(--v-blue)' }} /> Lộ trình B2
          <span style={{ color: 'var(--v-muted)', fontWeight: 800, fontSize: 12 }}>
            {totals.pass}/{totals.total} đạt
          </span>
        </h3>
        <Link
          href="/roadmap"
          style={{
            fontFamily: 'var(--v-font-body)',
            fontWeight: 800,
            color: 'var(--v-primary)',
            fontSize: 12,
            textDecoration: 'none',
          }}
        >
          Xem lộ trình →
        </Link>
      </div>

      <ProgressBar pass={totals.pass} fail={totals.fail} untested={totals.untested} height={8} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
        {summary.map((s) => {
          const meta = skillMeta(s.code);
          return (
            <Link
              key={s.code}
              href={`/roadmap?skill=${s.code}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 10px',
                background: 'var(--v-panel)',
                borderRadius: 12,
                textDecoration: 'none',
                color: 'var(--v-ink)',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 3, background: meta.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontFamily: 'var(--v-font-head)', fontSize: 12, fontWeight: 800 }}>
                {s.label}
              </span>
              <span style={{ width: 90, flexShrink: 0 }}>
                <ProgressBar pass={s.pass} fail={s.fail} untested={s.untested} height={6} />
              </span>
              <span
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--v-ink-soft)',
                  width: 46,
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {s.pass}/{s.total}
              </span>
            </Link>
          );
        })}
      </div>

      {totals.needs_retest > 0 && (
        <div
          style={{
            marginTop: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 10px',
            borderRadius: 'var(--v-radius-pill)',
            background: STATUS_COLOR.retest,
            color: '#fff',
            fontFamily: 'var(--v-font-body)',
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          <RotateCcw size={11} /> {totals.needs_retest} mục cần test lại
        </div>
      )}
    </div>
  );
}
