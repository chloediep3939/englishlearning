'use client';

import AudioButton from '@/components/AudioButton';
import { getPOSColor } from '@/components/common/POSPill';
import type { Flashcard } from '@/lib/types';
import { STAGE_COLOR, STAGE_LABEL } from './constants';

interface Props {
  card: Flashcard;
  /** 1-based row index in the parent's currently-displayed list. Re-numbers
   *  on filter/search since it's purely a display ordinal — no DB plumbing. */
  index: number;
  isLast: boolean;
  onClick: () => void;
}

/**
 * Single row in the deck-detail word list. Six columns:
 *   # | english+audio | ipa | pos | vietnamese | stage pill
 * The speaker sits next to the headword (within the same cell) so the
 * learner can play audio without scanning to the row's right edge.
 * Clicking anywhere on the row (except the audio button) opens the card
 * detail modal in the parent. The audio button stops propagation so it
 * doesn't trigger the modal.
 */
export default function WordRow({ card, index, isLast, onClick }: Props) {
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
        gridTemplateColumns:
          'auto minmax(140px, 1.2fr) minmax(80px, 0.9fr) minmax(60px, 0.6fr) minmax(120px, 1.3fr) auto',
        gap: 10,
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
      {/* # — display ordinal */}
      <span
        style={{
          fontFamily: 'var(--v-font-mono)',
          fontSize: 'var(--v-text-xs)',
          fontWeight: 700,
          color: 'var(--v-muted)',
          minWidth: 22,
          textAlign: 'right',
        }}
      >
        {index}
      </span>

      {/* english + audio button (kept together in one cell) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: 0,
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
            minWidth: 0,
          }}
        >
          {card.english}
        </div>
        {/* audio button — stop propagation so it doesn't open the modal */}
        <span
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            // Don't let Enter/Space bubble up to the row's keydown handler.
            if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
          }}
          style={{ display: 'inline-flex', flexShrink: 0 }}
        >
          <AudioButton audioUrl={card.audio_url} fallbackText={card.english} size={26} />
        </span>
      </div>

      {/* ipa */}
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

      {/* part of speech */}
      <div
        style={{
          fontFamily: 'var(--v-font-body)',
          fontSize: 'var(--v-text-xs)',
          fontWeight: 800,
          color: getPOSColor(card.part_of_speech),
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {card.part_of_speech ?? '—'}
      </div>

      {/* vietnamese */}
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

      {/* stage pill */}
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
