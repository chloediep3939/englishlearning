'use client';

import type { Flashcard } from '@/lib/types';
import { STAGE_COLOR, STAGE_LABEL } from './constants';

interface Props {
  card: Flashcard;
  isLast: boolean;
  onClick: () => void;
}

/**
 * Single row in the deck-detail word list. Four columns:
 * english | ipa | vietnamese | stage pill. Clicking opens the card
 * detail modal in the parent.
 */
export default function WordRow({ card, isLast, onClick }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(120px, 1.2fr) minmax(100px, 1fr) minmax(120px, 1.5fr) auto',
        gap: 12,
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: isLast ? 'none' : '1px solid var(--v-border)',
        cursor: 'pointer',
        background: 'transparent',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--v-surface)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      <div
        style={{
          fontFamily: 'var(--v-font-head)',
          fontWeight: 800,
          fontSize: 'var(--v-text-base)',
          color: 'var(--v-ink)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {card.english}
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-mono)',
          fontSize: 'var(--v-text-sm)',
          color: 'var(--v-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {card.ipa ?? '—'}
      </div>
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-sm)',
          color: 'var(--v-ink-soft)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {card.vietnamese}
      </div>
      <span
        style={{
          padding: '2px 10px',
          background: STAGE_COLOR[card.status],
          color: '#fff',
          borderRadius: 'var(--v-radius-pill)',
          fontFamily: 'var(--v-font-head)',
          fontSize: 'var(--v-text-xs)',
          fontWeight: 800,
          letterSpacing: 'var(--v-tracking-wide)',
          textTransform: 'uppercase',
          justifySelf: 'end',
        }}
      >
        {STAGE_LABEL[card.status]}
      </span>
    </div>
  );
}
