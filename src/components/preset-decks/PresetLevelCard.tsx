import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import type { PresetLevel } from '@/lib/types';
import { presetListMeta } from './preset-meta';

interface Props {
  level: PresetLevel;
}

/** Một ô level trong Thư viện bộ từ. Level chưa có nội dung hiện mờ "Đang soạn". */
export default function PresetLevelCard({ level }: Props) {
  const meta = presetListMeta(level.list_code);
  const ready = level.card_count > 0;
  const pct = ready ? Math.round((level.owned_count / level.card_count) * 100) : 0;
  const done = ready && level.owned_count >= level.card_count;
  // "Từ thông dụng 1–500" → "1–500"; "Học thuật · Sublist 3" → "Sublist 3";
  // "Cụm học thuật · Nhóm 3" → "Nhóm 3"
  const shortLabel = level.label
    .replace(/^Từ thông dụng\s*/, '')
    .replace(/^Học thuật\s*·\s*/, '')
    .replace(/^Cụm học thuật\s*·\s*/, '');

  const body = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span
          style={{
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-2xs)',
            fontWeight: 800,
            letterSpacing: 'var(--v-tracking-wide)',
            textTransform: 'uppercase',
            color: ready ? meta.color : 'var(--v-muted)',
          }}
        >
          {meta.short}
        </span>
        {done ? (
          <CheckCircle2 size={16} style={{ color: 'var(--v-primary)' }} />
        ) : !ready ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--v-text-2xs)', fontWeight: 800, color: 'var(--v-muted)' }}>
            <Clock size={11} /> Đang soạn
          </span>
        ) : null}
      </div>

      <div
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 900,
          fontSize: 'var(--v-text-xl)',
          letterSpacing: 'var(--v-tracking-tight)',
          color: ready ? 'var(--v-ink)' : 'var(--v-muted)',
          lineHeight: 1.15,
        }}
      >
        {shortLabel}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ height: 6, background: 'var(--v-border)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: meta.color, borderRadius: 999 }} />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'var(--v-font-body)',
            fontSize: 'var(--v-text-xs)',
            fontWeight: 700,
            color: 'var(--v-muted)',
          }}
        >
          <span>{ready ? `${level.owned_count}/${level.card_count} từ đã có` : 'Sắp có'}</span>
          {ready && <ArrowRight size={14} style={{ color: meta.color }} />}
        </div>
      </div>
    </>
  );

  const style: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minHeight: 132,
    padding: '14px 16px',
    background: ready ? 'var(--v-surface)' : 'transparent',
    border: ready ? '1px solid var(--v-border)' : '1px dashed var(--v-border-med)',
    borderRadius: 'var(--v-radius-lg)',
    boxShadow: ready ? 'var(--v-shadow-sm)' : 'none',
    textDecoration: 'none',
  };

  return ready ? (
    <Link href={`/decks/library/${level.code}`} style={style}>
      {body}
    </Link>
  ) : (
    <div style={style} aria-disabled>
      {body}
    </div>
  );
}
