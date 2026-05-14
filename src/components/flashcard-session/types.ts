// Two-phase flow: TYPING (user guesses) → REVEAL (answer shown + rate).
export type Phase = 'TYPING' | 'REVEAL';

// SM-2 quality buckets. Matches `recordRating` in @/lib/db.
export type Quality = 0 | 2 | 4 | 5;

export type SessionMode = 'study' | 'review';

export interface Rating {
  quality: Quality;
  label: string;
  emoji: string;
  bg: string;
  key: '1' | '2' | '3' | '4';
}

// "Ôn sau X" sub-copy is computed per-card from previewIntervals — see RevealStage.
export const RATINGS: Rating[] = [
  { quality: 0, label: 'LẠI', emoji: '😵', bg: 'var(--v-red)',     key: '1' },
  { quality: 2, label: 'KHÓ', emoji: '😬', bg: 'var(--v-orange)',  key: '2' },
  { quality: 4, label: 'TỐT', emoji: '😊', bg: 'var(--v-primary)', key: '3' },
  { quality: 5, label: 'DỄ',  emoji: '🎉', bg: 'var(--v-blue)',    key: '4' },
];

// Audio autoplay tuning on reveal entry (copied behavior from my-portfolio
// reference). 6 plays at 300ms pause gives enough exposure for a learner to
// hear pronunciation drift.
export const AUDIO_AUTOPLAY_COUNT = 6;
export const AUDIO_PAUSE_MS = 300;
export const REVEAL_AUDIO_START_DELAY_MS = 250;

/**
 * Anki-like reinsert offsets. After rating with `quality`, the card is
 * popped from the front of the queue and reinserted at this offset (from
 * the front of the remaining queue). q=4/5 don't appear here — those
 * remove the card entirely.
 *
 * Tuning: q=0 ("LẠI") loops back in ~2 cards; q=2 ("KHÓ") gets a longer
 * spaced break of ~4. Past spaced-repetition research suggests both
 * values are well within the working-memory window where repetition
 * reinforces rather than fatigues.
 */
export const REQUEUE_OFFSET: Partial<Record<Quality, number>> = {
  0: 2,
  2: 4,
};

/**
 * Per-page customization for the shared FlashcardSession orchestrator.
 *
 * Captures the V2-audit's documented differences between Review and
 * Study: progress gradient, eyebrow text, input placeholder, rating row
 * label. Everything else (queue logic, typing UX, reveal layout, SRS
 * rating, key bindings, completion screen) is shared.
 *
 * The `mode` field drives the SessionPicker's headings and status-badge
 * behavior (Review shows new/learning/review badges; Study omits them).
 */
export interface SessionConfig {
  mode: SessionMode;
  /** linear-gradient(...) value for the top progress bar. */
  progressGradient: string;
  /** Eyebrow text above the Vietnamese prompt in the speech bubble. */
  promptEyebrow: string;
  /** Placeholder shown in the typing input. */
  inputPlaceholder: string;
  /** Header label on the rating row (e.g. "Bạn thấy thế nào?"). */
  ratingRowLabel: string;
}
