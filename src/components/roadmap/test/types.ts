// Kiểu dùng chung cho màn làm bài bộ từ (T1). Khớp với payload của
// GET /api/roadmap/[key]/wordlist-test.

export interface TestWord {
  word: string;
  rank: number | null;
  sublist: number | null;
  meaning_en: string | null;
  ipa: string | null;
  has_audio: boolean;
  vi: string | null;
  pos: string | null;
}

export interface TestData {
  list_code: string;
  list_label: string;
  mode: 'know' | 'listen';
  words: TestWord[];
  remaining: number;
  total: number;
}

/** Một câu đã trả lời. `typed` chỉ có ở chế độ nghe-gõ. */
export interface Answer {
  word: TestWord;
  correct: boolean;
  typed?: string;
}

export interface SubmitResult {
  judged: boolean;
  passed: boolean | null;
  correct: number;
  wrong: number;
  answered: number;
  partial: boolean;
  unknown_words: string[];
}

// ---- Bài nghe cặp từ (T8) — khớp GET /api/roadmap/[key]/pair-test ----

export interface PairQuestion {
  id: number;
  contrast: string;
  contrast_label: string;
  word_a: string;
  word_b: string;
  ipa_a: string | null;
  ipa_b: string | null;
  audio_a: boolean;
  audio_b: boolean;
  /** Từ nào trong cặp được phát. */
  target: 'a' | 'b';
}

export interface PairTestData {
  questions: PairQuestion[];
  per_group: number;
  contrasts: string[];
  scoring: 'min_group' | 'overall';
}

export interface PairAnswer {
  question: PairQuestion;
  picked: 'a' | 'b';
  correct: boolean;
}
