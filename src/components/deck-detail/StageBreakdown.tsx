import type { FlashcardStatus } from '@/lib/types';
import { STAGE_COLOR, STAGE_LABEL } from './constants';

interface Props {
  counts: Record<FlashcardStatus, number>;
  total: number;
}

/**
 * Segmented horizontal bar showing the share of new/learning/review/mastered
 * cards in a deck, with a 4-column legend beneath. Stages with a zero count
 * are omitted from the bar (cleaner) but still listed in the legend.
 */
export default function StageBreakdown({ counts, total }: Props) {
  const stages: FlashcardStatus[] = ['new', 'learning', 'review', 'mastered'];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          height: 12,
          borderRadius: 'var(--v-radius-pill)',
          overflow: 'hidden',
          background: 'var(--v-border)',
          marginBottom: 10,
        }}
      >
        {stages.map((s) => {
          const pct = total > 0 ? (counts[s] / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={s}
              style={{
                width: `${pct}%`,
                background: STAGE_COLOR[s],
                transition: 'width 0.3s ease',
              }}
              title={`${STAGE_LABEL[s]}: ${counts[s]}`}
            />
          );
        })}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
        }}
      >
        {stages.map((s) => (
          <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: STAGE_COLOR[s],
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--v-font-body)',
                  fontSize: 'var(--v-text-xs)',
                  fontWeight: 700,
                  letterSpacing: 'var(--v-tracking-wide)',
                  textTransform: 'uppercase',
                  color: 'var(--v-muted)',
                }}
              >
                {STAGE_LABEL[s]}
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--v-font-head)',
                fontSize: 'var(--v-text-xl)',
                fontWeight: 900,
                color: 'var(--v-ink)',
              }}
            >
              {counts[s]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
