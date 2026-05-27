'use client';

import { AlertTriangle, ExternalLink } from 'lucide-react';
import AudioButton from '@/components/AudioButton';
import { getPOSColor } from '@/components/common/POSPill';
import { lookupUrl } from '@/components/common/LookupPills';
import type { Flashcard } from '@/lib/types';
import { STAGE_COLOR, STAGE_LABEL } from './constants';

export type RegenField = 'image' | 'audio' | 'ipa' | 'vietnamese';

/**
 * A card is "broken" when image / IPA / vietnamese is missing. Audio is
 * intentionally excluded: `AudioButton` already falls back to browser Web
 * Speech when `audio_url` is null, so missing mp3 isn't a defect from the
 * learner's perspective — they can still hear the word.
 */
export function getMissingFields(card: Flashcard): RegenField[] {
  const missing: RegenField[] = [];
  if (!card.image_url) missing.push('image');
  if (!card.ipa || card.ipa.trim() === '') missing.push('ipa');
  if (!card.vietnamese || card.vietnamese.trim() === '') missing.push('vietnamese');
  return missing;
}

const FIELD_LABEL_VI: Record<RegenField, string> = {
  image: 'hình',
  audio: 'audio',
  ipa: 'IPA',
  vietnamese: 'nghĩa',
};

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
  const missing = getMissingFields(card);
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
          'auto minmax(140px, 1.2fr) minmax(80px, 0.9fr) minmax(60px, 0.6fr) minmax(120px, 1.3fr) auto auto',
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
        {/* warning badge — surfaces "missing auto-fill fields" so the user
            can open the card detail (or the bulk fixer) and regen. */}
        {missing.length > 0 && (
          <span
            title={`Thiếu: ${missing.map((f) => FIELD_LABEL_VI[f]).join(', ')}`}
            aria-label={`Thiếu: ${missing.map((f) => FIELD_LABEL_VI[f]).join(', ')}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'rgba(255,154,60,0.16)',
              color: 'var(--v-orange)',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={12} strokeWidth={2.6} />
          </span>
        )}
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

      {/* lookup links — Oxford / YouGlish / ozdic. Same providers as the
          add-page preview pane. Stop propagation so clicking a pill opens
          the external site instead of the card detail modal. */}
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
        }}
        style={{ display: 'flex', gap: 4, flexShrink: 0 }}
      >
        {(['Oxford', 'YouGlish', 'ozdic'] as const).map((p) => (
          <a
            key={p}
            href={lookupUrl(p, card.english)}
            target="_blank"
            rel="noopener noreferrer"
            title={`Tra ${p}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '3px 8px',
              fontFamily: 'var(--v-font-body)',
              fontSize: 10,
              fontWeight: 800,
              color: 'var(--v-ink-soft)',
              border: '1px solid var(--v-border)',
              borderRadius: 999,
              background: 'var(--v-surface)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {p === 'Oxford' ? 'Oxf' : p === 'YouGlish' ? 'YG' : 'oz'}
            <ExternalLink size={9} />
          </a>
        ))}
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
