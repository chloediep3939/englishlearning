// ============================================================================
// User
// ============================================================================

export interface User {
  id: number;
  email: string;
  name: string | null;
  picture_url: string | null;
  google_sub: string | null;
  is_admin: boolean;
  created_at: string;
  last_login_at: string | null;
  // Demo accounts: spawned via /api/auth/demo, expire at `demo_expires_at`
  // (unix seconds). `is_demo` is the gate for the demo banner and feedback
  // analytics. Both are null/false for normal Google-OAuth users.
  is_demo: boolean;
  demo_expires_at: number | null;
}

// ============================================================================
// Feedback (in-app góp ý popup)
// ============================================================================

export interface Feedback {
  id: number;
  user_id: number | null;
  email: string | null;
  rating: number | null;     // 1..5
  content: string;
  page_url: string | null;
  user_agent: string | null;
  is_demo_user: boolean;
  created_at: number;        // unix seconds
}

export interface FeedbackInput {
  rating?: number | null;
  content: string;
  email?: string | null;
}

// ============================================================================
// Flashcard module
// ============================================================================

export type FlashcardStatus = 'new' | 'learning' | 'review' | 'mastered';

export interface FlashcardDeck {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  color: string;
  position: number;
  is_default: boolean;
  created_at: string;
  icon: string | null;       // lucide-react icon name (e.g., "BookOpen")
  subtitle: string | null;
  // "Chỉ hiểu nghĩa": recognition-only deck — study sessions drop
  // production/typing exercises and use EN→VI flip-and-self-grade instead.
  // SRS scheduling is identical to full decks, but these decks are kept
  // out of the dashboard learning stats.
  recognition_only: boolean;
}

export const DECK_ICON_OPTIONS = [
  'BookOpen', 'Coffee', 'Briefcase', 'GraduationCap', 'Plane', 'Heart',
  'Star', 'Music', 'Camera', 'Code', 'Flame', 'Sparkles',
] as const;
export type DeckIcon = typeof DECK_ICON_OPTIONS[number];

export interface FlashcardDeckWithCounts extends FlashcardDeck {
  total: number;
  new_count: number;
  learning_count: number;
  review_count: number;
  mastered_count: number;
  due_count: number;
}

export interface FlashcardExample {
  en: string;
  vi?: string;
}

export interface FlashcardImageAttribution {
  source: 'pexels' | 'unsplash' | 'other';
  author: string;
  author_url: string;
  source_url: string;
}

export interface FlashcardCollocation {
  phrase: string;
  // word/position are populated by Datamuse (the AI source) but absent for
  // user-added collocations from the inline preview editor — make them
  // optional so the preview UI doesn't have to fabricate them.
  word?: string;
  position?: 'before' | 'after';
}

export interface Flashcard {
  id: number;
  user_id: number;
  deck_id: number;
  english: string;
  vietnamese: string;
  ipa: string | null;
  part_of_speech: string | null;
  audio_url: string | null;
  // Oxford US pronunciation: R2 object key + fetch status. `audio_us_status`
  // is 'ok' (mp3 stored under audio_us_key), 'failed' (attempted, no mp3), or
  // null (never attempted). The read-aloud button plays the mp3 when 'ok',
  // else falls back to browser TTS (with a warning when 'failed').
  audio_us_key: string | null;
  audio_us_status: 'ok' | 'failed' | null;
  examples: FlashcardExample[];
  image_url: string | null;
  image_attribution: FlashcardImageAttribution | null;
  notes: string | null;
  collocations: FlashcardCollocation[];
  status: FlashcardStatus;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string | null;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // M4: Word Bank — when a card is saved from a passage reader, these point
  // back to the source. Both nullable (NULL for cards added manually or
  // imported before M4). source_passage_id has ON DELETE SET NULL so cards
  // survive their source passage being deleted.
  source_passage_id: number | null;
  source_context: string | null;
}

// Where a review row came from: unified study session vs timed Flashcard
// nhanh play. `srs_applied` marks whether the row mutated SRS state (1) or
// was log-only activity (0). Both values count as "review activity" for
// stats/streak purposes.
export type ReviewSource = 'study' | 'flashcard';

export interface FlashcardReview {
  id: number;
  flashcard_id: number;
  user_id: number;
  quality: 0 | 2 | 4 | 5;
  prev_interval: number;
  new_interval: number;
  reviewed_at: string;
  source: ReviewSource;
  srs_applied: 0 | 1;
}

export type TestMode = 'speed' | 'cloze' | 'pronunciation' | 'sentence';

export interface FlashcardTestAttempt {
  id: number;
  flashcard_id: number;
  user_id: number;
  mode: TestMode;
  passed: boolean;
  time_ms: number | null;
  metadata: Record<string, unknown> | null;
  attempted_at: string;
}

// Speed quiz
export type SpeedQuizMode = 'en_to_vi' | 'vi_to_en' | 'spelling' | 'mix';
// Per-question concrete mode. In 'mix' sessions each question is randomly
// assigned one of these, so the UI can adapt prompt size / IPA / audio per card.
export type SpeedQuizQuestionMode = Exclude<SpeedQuizMode, 'mix'>;

export interface SpeedQuizQuestion {
  card_id: number;
  question_mode: SpeedQuizQuestionMode;
  prompt: string;
  prompt_audio: string | null;
  prompt_ipa: string | null;
  show_audio: boolean;
  show_ipa: boolean;
  options: string[];
  correct_index: number;
}

export interface SpeedQuizResponse {
  questions: SpeedQuizQuestion[];
  mode: SpeedQuizMode;
}

// Cloze
export type ClozeMode = 'timed' | 'untimed';
export type ClozeOutcome = 'correct' | 'wrong_form' | 'wrong' | 'empty';

export interface PracticeSentence {
  id: number;
  flashcard_id: number;
  sentence: string;
  vi_translation: string | null;
  times_shown: number;
  last_shown_at: string | null;
  created_at: string;
}

export interface ClozeChallenge {
  card_id: number;
  english: string;
  vietnamese: string;
  ipa: string | null;
  audio_url: string | null;
  blanked_sentence: string;
  full_sentence: string;
  vi_sentence: string | null;
  sentence_id: number | null;
}

export interface ClozeResult {
  outcome: ClozeOutcome;
  user_input: string;
  target: string;
  hint?: string;
}

// Shared cloze sentence pool — keyed by lowercase headword, reused across
// users. Populated by background ensureClozePool() (see Part 2).
export interface ClozeSentence {
  id?: number;
  word: string;
  pos?: string | null;
  sentence: string;
  blank_word: string;
  difficulty?: string | null;
}

// Settings
export interface FlashcardSettings {
  daily_goal_review: number;          // dashboard daily-goal ring target (/review redirects to /study)
  mastered_hide_from_review: boolean;
  // ----- M3 keys -----
  f1_max_attempts: number;            // 0 = unlimited
  f2_timer_seconds: number;
  f3_max_words_per_composition: number;
  speed_timer_seconds: number;        // Flashcard nhanh countdown; 0 = off
  // ----- M4 keys -----
  user_cefr_level: CefrLevel;
  passage_tts_rate: number;           // 0.5–1.5
  passage_pre_fetch: boolean;
  // ----- M5 keys -----
  autoplay_audio: boolean;            // auto-play TTS on reveal
  voice_preference: string;           // SpeechSynthesisVoice name, 'auto' = browser default
  theme: ThemeMode;
  // ----- Pomodoro -----
  pomodoro_work_minutes: number;      // length of a focus phase, default 25
  pomodoro_break_minutes: number;     // length of a break phase, default 5
  // ----- Read-Along / Karaoke reader -----
  reading_speed: number;              // TTS rate chip: 0.7 / 0.85 / 1.0 / 1.3, default 1.0
  reading_auto_continue: boolean;     // sentence-end → next sentence, default true
  reading_deck_id: number | null;     // last-used deck for saving words; null = none yet
  // ----- Unified study session (study-unified) -----
  session_review_limit: number;       // default số thẻ ôn mỗi phiên (1–200)
  session_new_limit: number;          // default số thẻ mới mỗi phiên (1–200)
  // ----- M6 keys (settings overhaul) -----
  reveal_read_count: number;          // flashcard reveal: how many times the word auto-plays
  reveal_read_gap_ms: number;         // pause between those auto-plays
  word_tts_rate: number;              // TTS rate for single-word playback (flashcard/quiz/speaker button)
  speed_read_count: number;           // Flashcard nhanh: prompt auto-reads; 0 = off
  chunk_pause_ms: number;             // chunk practice: pause between thought-groups
  default_session_size: number;       // pre-selected question count in practice pickers (snapped to each picker's chips)
}

// ===== Unified study session (/study) =====

/** Ôn (due only) / Học (new only) / Ôn + Học (interleaved). */
export type StudySessionMode = 'review' | 'new' | 'mix';
/** Deck group a session runs on — never mixed. */
export type StudyDeckGroup = 'full' | 'recognition';

export interface StudySessionResponse {
  due_count: number;
  new_count: number;
  /** Server-built queue. Absent when countsOnly=1. */
  cards?: Flashcard[];
}

export type ThemeMode = 'light' | 'dark' | 'system';

// ===== Read-Along / Karaoke reader =====

/** Word-level glossary entry. vn/pos/ipa nullable — a partial lookup (e.g.
 *  IPA only, no dictionary hit for a proper noun) is still a valid cached row. */
export interface GlossaryEntry {
  vn: string | null;
  pos: string | null;
  ipa: string | null;
  // Serving URL for the word's Oxford pronunciation (/api/words/audio/<word>),
  // or null when no audio is available. The 🔊 button falls back to TTS on null.
  audioUrl?: string | null;
}

/** One sentence's translation as returned by the translations route. `vn` is
 *  null when MS Translator hasn't (or couldn't) translate that sentence. */
export interface TranslatedSentence {
  index: number;
  en: string;
  vn: string | null;
}

export interface PassageTranslationRow {
  id: number;
  passage_id: number;
  sentence_index: number;
  en_text: string;
  vn_text: string;
  created_at: string;
}

export interface WordGlossaryRow {
  id: number;
  word: string;
  vn: string | null;
  pos: string | null;
  ipa: string | null;
  source: string | null;
  audio_src: string | null; // Oxford US mp3 CDN URL (proxied by /api/words/audio)
  created_at: string;
}

// ===== M3: practice modes =====

// ----- F1 pronunciation -----
export interface PronunciationAttemptMeta {
  attempts: number;            // how many tries used (including the successful or final one)
  transcripts: string[];       // up to 3 ASR alternatives from the final attempt
  passed: boolean;
  helped: boolean;             // whether user opened the help panel during this card
}

// ----- F2 sentence (used in M3b) -----
export interface SentenceEvaluation {
  used_correctly: boolean;
  grammar_ok: boolean;
  semantic_ok: boolean;
  feedback: string;            // 1-2 sentences in Vietnamese
}

export interface SentenceAttemptMeta {
  user_sentence: string;
  evaluation: SentenceEvaluation;
  timed_out: boolean;
  time_ms: number;
}

// ----- F3 composition (used in M3c) -----
export type CompositionSource = 'today' | 'deck';

export interface CompositionAiFeedback {
  coherence_score: number;     // 0-10
  word_usage: Record<string, boolean>;
  issues: Array<{ excerpt: string; problem: string; suggestion: string }>;
  suggested_additions: Array<{ word: string; hint: string }>;
  passed: boolean;
}

export interface Composition {
  id: number;
  user_id: number;
  source: CompositionSource;
  source_deck_id: number | null;
  pool_word_ids: number[];
  content: string;
  ai_feedback: CompositionAiFeedback;
  word_usage: Record<string, boolean>;
  coherence_score: number | null;
  passed: boolean;
  created_at: string;
}

export interface CompositionRow {
  id: number;
  user_id: number;
  source: CompositionSource;
  source_deck_id: number | null;
  pool_word_ids_json: string;
  content: string;
  ai_feedback_json: string;
  word_usage_json: string;
  coherence_score: number | null;
  passed: 0 | 1;
  created_at: string;
}

// ----- M3 settings keys + defaults -----
export const M3_SETTINGS = {
  f1_max_attempts: { default: 3, min: 1, max: 10, step: 1 }, // 0 = unlimited (handled separately)
  f2_timer_seconds: { default: 60, min: 15, max: 300, step: 15 },
  f3_max_words_per_composition: { default: 30, min: 5, max: 100, step: 5 },
  speed_timer_seconds: { default: 8, min: 4, max: 20, step: 1 }, // 0 = off (handled separately)
} as const;

export type M3SettingKey = keyof typeof M3_SETTINGS;

// ============================================================================
// M4: passage-based learning
// ============================================================================

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type LevelVerdict = 'too_easy' | 'just_right' | 'too_hard';
export type PassageStepKind =
  | 'translate'
  | 'paraphrase'
  | 'comprehension'
  | 'dictation'
  | 'shadowing';

export interface Passage {
  id: number;
  user_id: number;
  title: string;
  content: string;
  source_label: string | null;
  source_url: string | null;
  char_count: number;
  word_count: number;
  level_estimate: CefrLevel | null;
  level_verdict: LevelVerdict | null;
  level_suggestion: string | null;
  // M4c: cached AI outputs so Step 7/8 don't have to re-derive them. Both
  // nullable; populated lazily by the pre-fetch / on-demand routes.
  translate_reference: string | null;
  paraphrase_tips: string[] | null;   // hydrated from paraphrase_tips_json
  last_step_viewed: number;
  completed_at: string | null;
  created_at: string;
  // M5: on-demand grammar analysis + content-hash cache key.
  grammar_analysis: GrammarAnalysis | null;  // hydrated from grammar_analysis JSON column
  grammar_analyzed_at: string | null;
  content_hash: string | null;               // SHA-256 hex of trimmed lowercase content
}

export interface PassageRow {
  id: number;
  user_id: number;
  title: string;
  content: string;
  source_label: string | null;
  source_url: string | null;
  char_count: number;
  word_count: number;
  level_estimate: string | null;  // narrowed to CefrLevel by hydratePassage
  level_verdict: string | null;   // narrowed to LevelVerdict by hydratePassage
  level_suggestion: string | null;
  translate_reference: string | null;
  paraphrase_tips_json: string | null;  // JSON-stringified string[]
  last_step_viewed: number;
  completed_at: string | null;
  created_at: string;
  grammar_analysis: string | null;       // JSON-stringified GrammarAnalysis
  grammar_analyzed_at: string | null;
  content_hash: string | null;
}

// ===== PTE speaking templates (Template PTE) =====

export interface PteTemplate {
  id: number;
  user_id: number;
  title: string;
  frame_text: string;        // raw frame incl. [slot] tokens and "/" markers
  note: string | null;       // learner's own reminders; NULL = no note
  created_at: string;
  fill_count?: number;       // populated by listByUser only
}

export interface PteTemplateRow {
  id: number;
  user_id: number;
  title: string;
  frame_text: string;
  note: string | null;
  created_at: string;
  fill_count?: number;
}

export interface PteTemplateFill {
  id: number;
  user_id: number;
  template_id: number;
  topic: string;
  slot_values: Record<string, string> | null;  // hydrated from slot_values_json; null = pasted whole
  filled_text: string;                          // assembled speech, keeps "/" markers
  created_at: string;
}

export interface PteTemplateFillRow {
  id: number;
  user_id: number;
  template_id: number;
  topic: string;
  slot_values_json: string | null;
  filled_text: string;
  created_at: string;
}

export interface GrammarPattern {
  name: string;
  explanation_vi: string;
  examples: string[];
}

export interface GrammarAnalysis {
  patterns: GrammarPattern[];
}

export interface PassageAttempt {
  id: number;
  user_id: number;
  passage_id: number;
  step_kind: PassageStepKind;
  user_input: string;
  ai_feedback: unknown;            // shape discriminated by step_kind at consumer site
  score: number | null;
  created_at: string;
}

export interface PassageAttemptRow {
  id: number;
  user_id: number;
  passage_id: number;
  step_kind: PassageStepKind;
  user_input: string;
  ai_feedback_json: string;
  score: number | null;
  created_at: string;
}

// ----- M4 AI feedback shapes (consumed by M4b / M4c, declared here so the
// types are stable from day one and the placeholder fallbacks compile) -----

export interface DifficultyAnalysis {
  level: CefrLevel;
  verdict: LevelVerdict;
  suggestion: string;              // 1-2 sentences in Vietnamese
}

export interface WordDefinitionInContext {
  english: string;                 // canonical lemma — e.g. "running" → "run"
  vietnamese: string;
  part_of_speech: string;
  example_sentence: string;
  ipa: string | null;
}

export interface TranslationFeedback {
  accuracy_score: number;          // 0-100
  naturalness_score: number;       // 0-100
  overall_score: number;           // 0-100 (60% accuracy + 40% naturalness)
  missed_meaning: string[];
  mistranslations: Array<{ excerpt: string; problem: string; suggestion: string }>;
  suggested_translation: string;
}

export interface ParaphraseFeedback {
  meaning_preserved: number;
  grammar: number;
  vocabulary: number;
  naturalness: number;
  overall_score: number;
  issues: Array<{ excerpt: string; problem: string; suggestion: string }>;
  better_phrasings: Array<{ original: string; suggested: string }>;
}

// ----- M4 settings keys + defaults / ranges -----
export const M4_SETTINGS = {
  user_cefr_level: {
    default: 'B1' as CefrLevel,
    values: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const,
  },
  passage_tts_rate: { default: 1.0, min: 0.5, max: 1.5, step: 0.1 },
  passage_pre_fetch: { default: true },
} as const;

// ----- M6 settings keys + defaults / ranges (settings overhaul) -----
export const M6_SETTINGS = {
  reveal_read_count: { default: 6, min: 1, max: 10, step: 1 },
  reveal_read_gap_ms: { default: 1000, min: 300, max: 3000, step: 100 },
  word_tts_rate: { default: 0.95, min: 0.5, max: 1.5, step: 0.05 },
  speed_read_count: { default: 3, min: 1, max: 6, step: 1 }, // 0 = off (handled separately)
  chunk_pause_ms: { default: 550, min: 200, max: 2000, step: 50 },
  default_session_size: { default: 10, min: 5, max: 30, step: 5 },
} as const;

// Stats
export interface FlashcardStats {
  total_cards: number;
  new_count: number;
  learning_count: number;
  review_count: number;
  mastered_count: number;
  due_today: number;
  reviews_today: number;
  streak_days: number;
  cards_per_day_last_30: Array<{ date: string; new: number; review: number }>;
  retention_rate_7d: number;
}
