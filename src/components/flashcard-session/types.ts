// Two-phase flow: PROMPT (typed guess, or flip prompt on recognition decks)
// → REVEAL (answer shown + rate). The phase name stays 'TYPING' for the
// typed variant's history.
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

// Delay before the first autoplay after reveal. Repeat count / pause length
// are user settings now (`reveal_read_count` / `reveal_read_gap_ms`), passed
// in via SessionAudioSettings.
export const REVEAL_AUDIO_START_DELAY_MS = 250;

/** User audio settings for the reveal autoplay, resolved server-side from
 *  FlashcardSettings and threaded through SessionFlow. */
export interface SessionAudioSettings {
  /** `autoplay_audio` — false = silent reveal. */
  autoplay: boolean;
  /** `reveal_read_count` — how many times the word plays. */
  readCount: number;
  /** `reveal_read_gap_ms` — pause between plays so the learner can mimic. */
  gapMs: number;
  /** `word_tts_rate` — playback rate for both the mp3 and the TTS fallback. */
  wordRate: number;
}

/**
 * Anki-like reinsert offsets (study-unified A3). After rating with
 * `quality`, the card is popped from the front of the queue and reinserted
 * at this offset (from the front of the remaining queue). q=4/q=5 don't
 * appear here — TỐT and DỄ always remove the card from the queue.
 *
 * Tuning: q=0 ("LẠI") loops back in ~2 cards; q=2 ("KHÓ") at ~4. Both
 * within the working-memory window where repetition reinforces rather
 * than fatigues.
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
 * The `mode` field records which page flavor a config belongs to.
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
