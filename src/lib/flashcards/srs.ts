import type { Flashcard, FlashcardStatus } from '@/lib/types';

const QUALITY_RATINGS = { again: 0, hard: 2, good: 4, easy: 5 } as const;
export type SRSQuality = (typeof QUALITY_RATINGS)[keyof typeof QUALITY_RATINGS];
export type ReviewQuality = SRSQuality;

/**
 * Compute the would-be next interval (in days) for each rating without
 * mutating the card. Used by the flashcard-session RevealStage to show
 * "ôn sau X" on the rating buttons so the learner sees what each choice
 * costs them in real time.
 *
 * Quality 0 ("Lại") returns 0 — same-session re-queue, not measured in days.
 */
export function previewIntervals(
  card: Flashcard,
  opts: { failedThisSession?: boolean } = {},
): Record<SRSQuality, number> {
  return {
    0: 0,
    2: calculateNextReview(card, 2, opts).interval_days,
    4: calculateNextReview(card, 4, opts).interval_days,
    5: calculateNextReview(card, 5, opts).interval_days,
  };
}

/**
 * Human-readable label for a day count.
 *   0      → "< 1 phút" (same-session retry)
 *   1      → "1 ngày"
 *   30+    → "1 tháng"
 *   365+   → "1 năm"
 */
export function intervalLabel(days: number): string {
  if (days === 0) return '< 1 phút';
  if (days < 30) return `${days} ngày`;
  if (days < 365) {
    const m = Math.round(days / 30);
    return `${m} tháng`;
  }
  const y = Math.round(days / 365);
  return `${y} năm`;
}

export interface SRSUpdate {
  status: FlashcardStatus;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string;
  prev_interval: number;
}

/**
 * Standard SM-2 algorithm with 4-button rating (again/hard/good/easy).
 * Returns next review state given current card state + user rating.
 *
 * - quality 0 (again): reset reps, 1 minute later
 * - quality 2 (hard):  same interval × 1.2, EF -0.15
 * - quality 4 (good):  interval × EF, EF unchanged
 * - quality 5 (easy):  interval × EF × 1.3, EF +0.15
 *
 * Mastered gate (count-based, runs after SM-2). `failedThisSession` is
 * scoped to a single FlashcardSession run — it does NOT persist across
 * sessions, so each new session starts the learner on the cleaner
 * 2-correct path.
 * - quality 5 (DỄ)                            → mastered immediately
 * - reps >= 2 AND !failedThisSession          → mastered (clean run, 2 corrects)
 * - reps >= 3                                 → mastered (had a wrong, need 3 corrects)
 * - interval >= 60                            → mastered (safety cap)
 */
export function calculateNextReview(
  card: Flashcard,
  quality: SRSQuality,
  opts: { failedThisSession?: boolean } = {},
): SRSUpdate {
  const prev_interval = card.interval_days;
  let ease = card.ease_factor;
  let interval = card.interval_days;
  let reps = card.repetitions;
  let status: FlashcardStatus = card.status;
  const failedThisSession = opts.failedThisSession === true || quality === 0;

  if (quality === 0) {
    reps = 0;
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
    status = 'learning';
  } else {
    reps += 1;
    if (reps === 1) {
      interval = 1;
      status = 'learning';
    } else if (reps === 2) {
      interval = quality === 2 ? 2 : quality === 4 ? 3 : 4;
      status = 'review';
    } else {
      const mult = quality === 2 ? 1.2 : quality === 4 ? ease : ease * 1.3;
      interval = Math.max(1, Math.round(interval * mult));
      status = 'review';
    }
    if (quality === 2) ease = Math.max(1.3, ease - 0.15);
    else if (quality === 5) ease = ease + 0.15;
  }

  if (quality === 5) status = 'mastered';
  else if (reps >= 3) status = 'mastered';
  else if (reps >= 2 && !failedThisSession) status = 'mastered';
  else if (interval >= 60) status = 'mastered';

  const next = new Date();
  if (quality === 0) {
    next.setMinutes(next.getMinutes() + 1);
  } else {
    next.setDate(next.getDate() + interval);
  }
  // ISO format: "YYYY-MM-DD HH:MM:SS"
  const next_review_at = next.toISOString().replace('T', ' ').slice(0, 19);

  return {
    status,
    ease_factor: Math.round(ease * 100) / 100,
    interval_days: interval,
    repetitions: reps,
    next_review_at,
    prev_interval,
  };
}
