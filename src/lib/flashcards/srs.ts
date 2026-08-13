import type { Flashcard, FlashcardStatus } from '@/lib/types';

const QUALITY_RATINGS = { again: 0, hard: 2, good: 4, easy: 5 } as const;
export type SRSQuality = (typeof QUALITY_RATINGS)[keyof typeof QUALITY_RATINGS];
export type ReviewQuality = SRSQuality;

/**
 * The only fields the scheduler actually reads. Structural so non-flashcard
 * entities with the same SRS columns (e.g. sentence_drills rows for
 * "Học câu") can be scheduled by the same algorithm.
 */
export type SRSCardState = Pick<
  Flashcard,
  'status' | 'ease_factor' | 'interval_days' | 'repetitions'
>;

/**
 * Compute the would-be next interval (in days) for each rating without
 * mutating the card. Used by the flashcard-session RevealStage to show
 * "ôn sau X" on the rating buttons so the learner sees what each choice
 * costs them in real time.
 *
 * Quality 0 ("Lại") returns 0 — same-session re-queue, not measured in days.
 */
export function previewIntervals(
  card: SRSCardState,
  opts: { failedThisSession?: boolean } = {},
): Record<SRSQuality, number> {
  // fuzz: false — deterministic labels; the real schedule (computed at
  // rating time) still applies ±15% fuzz.
  const o = { ...opts, fuzz: false };
  return {
    0: 0,
    2: calculateNextReview(card, 2, o).interval_days,
    4: calculateNextReview(card, 4, o).interval_days,
    5: calculateNextReview(card, 5, o).interval_days,
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

/** Lapse keeps this share of the old interval (Anki's "new interval %").
 *  Raised 0.25 → 0.5 per user: a correct answer after a lapse jumps back
 *  near the old mốc (8-day card → sai 1 lần → đúng → hẹn ~4 ngày) instead
 *  of grinding the 1→3→8 ladder from scratch. */
const LAPSE_KEEP_RATIO = 0.5;

/**
 * Timed Flashcard-nhanh correct answer on a DUE card: gentle interval growth
 * only — ease and repetitions untouched so game play can never feed the
 * mastery gate. Returns the new interval (days) and the day-granular
 * next_review_at (00:00 UTC ≈ 7:00 sáng VN, same convention as
 * calculateNextReview).
 *
 *   interval = max(interval + 1, round(interval × 1.2)), then ±15% fuzz
 *   when the result is ≥ 4 days.
 */
export function calculateFlashcardBoost(
  card: Flashcard,
): { interval_days: number; next_review_at: string; prev_interval: number } {
  const prev_interval = card.interval_days;
  let interval = Math.max(prev_interval + 1, Math.round(prev_interval * 1.2));
  interval = applyFuzz(interval);
  const next = new Date();
  next.setUTCDate(next.getUTCDate() + interval);
  return {
    interval_days: interval,
    next_review_at: `${next.toISOString().slice(0, 10)} 00:00:00`,
    prev_interval,
  };
}

/**
 * SM-2 with 4-button rating (Lại/Khó/Tốt/Dễ → 0/2/4/5).
 *
 * Returns next review state given current card state + user rating.
 *
 *   quality 0 (Lại):  reps→0, schedule +1 minute (same-session relearn).
 *                     Graduated cards (reps>=2): ease −0.2 AND keep 25% of
 *                     the old interval as the relearn baseline. Cards still
 *                     in learning: no ease penalty (Anki: learning-phase
 *                     answers never touch ease — avoids "ease hell").
 *   quality 2 (Khó):  interval × 1.2 once graduated; ease −0.15 (graduated only)
 *   quality 4 (Tốt):  interval × ease;               ease unchanged
 *   quality 5 (Dễ):   interval × ease × 1.3;         ease +0.15 (graduated only)
 *
 * Day-granular scheduling: q>0 intervals land on the DATE boundary
 * (00:00 UTC ≈ 7:00 sáng VN) — "1 ngày" means the card IS due tomorrow
 * morning, not 24h-to-the-minute after tonight's rating (which made cards
 * invisible in morning sessions).
 *
 * `failedThisSession`: the learner lapsed this card earlier in the current
 * session. A graduating Dễ right after a lapse caps at the 1-day step
 * instead of jumping to 4 days.
 *
 * Lapse carry-over: after q=0 keeps 25% of the interval, the next
 * graduating/early steps use max(step, carried interval) so relearning a
 * mature card doesn't clobber the kept remnant back down to 1–4 days.
 *
 * Mastery gate (Anki-style "mature"): status='mastered' only when both
 *   - interval_days >= 21   (held for ~3 weeks without forgetting)
 *   - repetitions >= 3      (multiple distinct review sessions)
 *
 * 'mastered' is NOT terminal — cards keep growing intervals and remain
 * reviewable. The /review query no longer filters mastered by default
 * (see db.ts step 2.2 + migration 0014).
 */
export function calculateNextReview(
  card: SRSCardState,
  quality: SRSQuality,
  opts: { failedThisSession?: boolean; fuzz?: boolean } = {},
): SRSUpdate {
  const prev_interval = card.interval_days;
  // Ease only ever moves once the card has graduated (2+ successful reps
  // BEFORE this rating). Learning-phase answers never touch it.
  const graduated = card.repetitions >= 2;
  let ease = card.ease_factor;
  let interval = card.interval_days;
  let reps = card.repetitions;
  let status: FlashcardStatus = card.status;

  if (quality === 0) {
    reps = 0;
    status = 'learning';
    if (graduated) {
      ease = Math.max(1.3, ease - 0.2);
      // Keep a fraction of the old interval — relearning resumes from here.
      interval = Math.max(1, Math.round(interval * LAPSE_KEEP_RATIO));
    } else {
      interval = 0; // true reset for cards that never graduated
    }
  } else {
    reps += 1;
    if (reps === 1) {
      // Graduating step: Easy gets 4 days, Good/Hard get 1 day. An Easy
      // right after an in-session lapse stays at 1 day. max() preserves a
      // lapse carry-over (25% of a mature interval) instead of clobbering it.
      const step = quality === 5 && !opts.failedThisSession ? 4 : 1;
      interval = Math.max(step, interval);
      status = 'learning';
    } else if (reps === 2) {
      const step = quality === 2 ? 2 : quality === 4 ? 3 : 4;
      interval = Math.max(step, interval);
      status = 'review';
    } else {
      const mult = quality === 2 ? 1.2 : quality === 4 ? ease : ease * 1.3;
      interval = Math.max(1, Math.round(interval * mult));
      status = 'review';
    }

    // Ease adjustments — graduated cards only (see note above).
    if (graduated) {
      if (quality === 2) ease = Math.max(1.3, ease - 0.15);
      else if (quality === 5) ease = ease + 0.15;
      // quality === 4 (Tốt): ease unchanged — SM-2 standard
    }

    // Fuzz intervals >= 4 days to prevent clumping. Disabled for the
    // rating-button previews (opts.fuzz === false) so the "ôn sau X ngày"
    // labels don't wobble 7/8/9 between renders — only the actually
    // persisted schedule gets the randomization.
    if (opts.fuzz !== false && interval >= 4) interval = applyFuzz(interval);
  }

  // Mastery gate (Anki-style "mature"): both conditions required.
  // Migration 0018 retro-promoted existing review cards to this bar.
  if (status === 'review' && interval >= 21 && reps >= 3) {
    status = 'mastered';
  }

  const next = new Date();
  let next_review_at: string;
  if (quality === 0) {
    next.setMinutes(next.getMinutes() + 1);
    next_review_at = next.toISOString().replace('T', ' ').slice(0, 19);
  } else {
    // Day-granular: due at 00:00 UTC of the target date (≈ 7:00 sáng VN),
    // so an evening "1 ngày" rating is reviewable the next morning.
    next.setUTCDate(next.getUTCDate() + interval);
    next_review_at = `${next.toISOString().slice(0, 10)} 00:00:00`;
  }

  return {
    status,
    ease_factor: Math.round(ease * 100) / 100,
    interval_days: interval,
    repetitions: reps,
    next_review_at,
    prev_interval,
  };
}
