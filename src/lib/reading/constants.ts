// Read-Along shared constants — pure data, safe in client code.

export const BUN_BLUE = '#3aa9e6';
export const BUN_BLUE_SOFT = '#e3f2fb';

export interface ReadingSpeed {
  label: string;
  rate: number;
}

// Four speed chips (design prototype RA_SPEEDS). 1.0 ("Thường") is the default.
export const RA_SPEEDS: readonly ReadingSpeed[] = [
  { label: 'Chậm', rate: 0.7 },
  { label: 'Vừa', rate: 0.85 },
  { label: 'Thường', rate: 1.0 },
  { label: 'Nhanh', rate: 1.3 },
] as const;

export const READING_DEFAULT_RATE = 1.0;

// localStorage key for the per-device parallel-translation preference (BR9).
export const READING_SHOW_VN_KEY = 'reading_show_translation';

// Default deck name auto-created when the user has no decks (Q7 / E5.2).
export const READING_DEFAULT_DECK_NAME = 'Từ vựng đọc bài';

/**
 * Common English function words skipped during glossary pre-fetch (Q2). These
 * still render and stay tappable — tapping one fires an on-demand lookup. The
 * point is only to avoid pre-fetching ~100 high-frequency words per passage.
 */
export const STOP_WORDS: ReadonlySet<string> = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'nor', 'so', 'yet', 'for',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'done', 'have', 'has', 'had', 'having',
  'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
  'this', 'that', 'these', 'those', 'here', 'there',
  'in', 'on', 'at', 'by', 'to', 'of', 'off', 'up', 'out', 'as', 'if', 'than', 'then',
  'with', 'from', 'into', 'onto', 'over', 'under', 'about', 'after', 'before',
  'no', 'not', 'too', 'very', 'just', 'only', 'also', 'more', 'most', 'much', 'many',
  'some', 'any', 'all', 'each', 'every', 'both', 'few', 'such', 'own', 'same',
  'what', 'which', 'who', 'whom', 'whose', 'when', 'where', 'why', 'how',
  'because', 'while', 'until', 'though', 'although', 'since',
  'one', 'two', 'three', 'first', 'second',
  "it's", "i'm", "don't", "doesn't", "didn't", "can't", "won't", "isn't", "aren't",
  "wasn't", "weren't", "he's", "she's", "they're", "we're", "you're", "that's",
]);

/** Rough reading time estimate (~200 wpm) for the header pill, in seconds. */
export function estimateSeconds(wordCount: number): number {
  return Math.max(5, Math.round((wordCount / 200) * 60));
}
