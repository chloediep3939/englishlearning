import type { ReactNode } from 'react';

// Two-phase flow: TYPING (user guesses) → REVEAL (answer shown + rate).
export type Phase = 'TYPING' | 'REVEAL';

// SM-2 quality buckets. Matches `recordRating` in @/lib/db.
export type Quality = 0 | 2 | 4 | 5;

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
 * Per-page customization for the shared FlashcardSession orchestrator.
 *
 * Captures the V2-audit's 6 documented differences between Review and
 * Study: progress gradient, eyebrow text, input placeholder, rating row
 * label, summary semantics (computed inside `renderSummary`), and re-queue
 * behavior. Everything else (typing UX, reveal layout, SRS rating, key
 * bindings) is shared.
 */
export interface SessionConfig {
  /** linear-gradient(...) value for the top progress bar. */
  progressGradient: string;
  /** Eyebrow text above the Vietnamese prompt in the speech bubble. */
  promptEyebrow: string;
  /** Placeholder shown in the typing input. */
  inputPlaceholder: string;
  /** Header label on the rating row (e.g. "Bạn thấy thế nào?"). */
  ratingRowLabel: string;
  /**
   * Phase A only: whether quality=0 ("LẠI") re-appends the card to the
   * queue so the learner has to nail it before the session ends. Review
   * = true; Study = false historically. Phase B replaces this with the
   * Anki-like reinsert-at-offset logic, so this flag is short-lived.
   */
  requeueOnFail: boolean;
  /**
   * Renders the completion screen. Both summaries receive the full
   * `ratings` array so each can compute its own derived stats (Review
   * counts good/hard; Study counts learned = q !== 0). `startedAt` is
   * the ms-since-epoch when the orchestrator first mounted, so the
   * summary can render elapsed time without owning a timer.
   */
  renderSummary: (args: { total: number; ratings: Quality[]; startedAt: number }) => ReactNode;
}
