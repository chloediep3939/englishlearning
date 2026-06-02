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
 * Apply ±15% randomization to interval to avoid review clumping over time.
 * No fuzz for intervals < 4 days (small intervals are sensitive to drift).
 */
function applyFuzz(interval: number): number {
  if (interval < 4) return interval;
  const fuzz = 0.15;
  const offset = (Math.random() * 2 - 1) * fuzz * interval;
  return Math.max(1, Math.round(interval + offset));
}

/**
 * SM-2 with 4-button rating (Lại/Khó/Tốt/Dễ → 0/2/4/5).
 *
 * Returns next review state given current card state + user rating.
 *
 *   quality 0 (Lại):  reset reps, schedule +1 minute, ease −0.2 (floor 1.3)
 *   quality 2 (Khó):  interval × 1.2 once graduated; ease −0.15 (−0.25 at reps=1)
 *   quality 4 (Tốt):  interval × ease;               ease unchanged
 *   quality 5 (Dễ):   interval × ease × 1.3;         ease +0.15
 *
 * Mastery gate (NEW, tight): status='mastered' only when both
 *   - interval_days >= 60   (held for ~2 months without forgetting)
 *   - repetitions >= 4      (multiple distinct review sessions)
 *
 * 'mastered' is NOT terminal — cards keep growing intervals and remain
 * reviewable. The /review query no longer filters mastered by default
 * (see db.ts step 2.2 + migration 0014).
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

  if (quality === 0) {
    reps = 0;
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
    status = 'learning';
  } else {
    reps += 1;
    if (reps === 1) {
      // Graduating step: Easy gets 4 days, Good/Hard get 1 day.
      interval = quality === 5 ? 4 : 1;
      status = 'learning';
    } else if (reps === 2) {
      interval = quality === 2 ? 2 : quality === 4 ? 3 : 4;
      status = 'review';
    } else {
      const mult = quality === 2 ? 1.2 : quality === 4 ? ease : ease * 1.3;
      interval = Math.max(1, Math.round(interval * mult));
      status = 'review';
    }

    // Ease adjustments
    if (quality === 2) {
      // Stronger penalty at reps=1: Khó on a fresh card means the learner
      // really struggled, so make future intervals shorter via lower ease.
      ease = Math.max(1.3, ease - (reps === 1 ? 0.25 : 0.15));
    } else if (quality === 5) {
      ease = ease + 0.15;
    }
    // quality === 4 (Tốt): ease unchanged — SM-2 standard

    // Fuzz intervals >= 4 days to prevent clumping
    if (interval >= 4) interval = applyFuzz(interval);
  }

  // Mastery gate (tight): only true long-term retention.
  // Both conditions required.
  if (status === 'review' && interval >= 60 && reps >= 4) {
    status = 'mastered';
  }

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
