-- ============================================================================
-- M1a: Full flashcard schema
-- ============================================================================

-- Decks
CREATE TABLE IF NOT EXISTS flashcard_decks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#7ac143',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_decks_position ON flashcard_decks(position);

INSERT OR IGNORE INTO flashcard_decks (id, name, description, color, position)
VALUES (1, 'Mặc định', 'Bộ từ mặc định', '#7ac143', 0);

-- Cards
CREATE TABLE IF NOT EXISTS flashcards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id INTEGER NOT NULL DEFAULT 1 REFERENCES flashcard_decks(id) ON DELETE SET DEFAULT,
  english TEXT NOT NULL,
  vietnamese TEXT NOT NULL,
  ipa TEXT,
  part_of_speech TEXT,
  audio_url TEXT,
  examples TEXT,
  image_url TEXT,
  image_attribution TEXT,
  notes TEXT,
  collocations TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','learning','review','mastered')),
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT,
  last_reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_cards_deck         ON flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_status       ON flashcards(status);
CREATE INDEX IF NOT EXISTS idx_cards_next_review  ON flashcards(next_review_at);
CREATE INDEX IF NOT EXISTS idx_cards_deck_status  ON flashcards(deck_id, status);

-- SRS review log
CREATE TABLE IF NOT EXISTS flashcard_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flashcard_id INTEGER NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  quality INTEGER NOT NULL CHECK(quality IN (0,2,4,5)),
  prev_interval INTEGER NOT NULL DEFAULT 0,
  new_interval INTEGER NOT NULL DEFAULT 0,
  reviewed_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_reviews_card ON flashcard_reviews(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_reviews_date ON flashcard_reviews(reviewed_at);

-- Test attempts (multi-mode quizzes: speed, cloze, pronunciation, sentence)
CREATE TABLE IF NOT EXISTS flashcard_test_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flashcard_id INTEGER NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK(mode IN ('speed','cloze','pronunciation','sentence')),
  passed INTEGER NOT NULL,
  time_ms INTEGER,
  metadata TEXT,
  attempted_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_attempts_card           ON flashcard_test_attempts(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_attempts_card_mode_date ON flashcard_test_attempts(flashcard_id, mode, attempted_at);

-- Practice sentences pool (Cloze cache)
CREATE TABLE IF NOT EXISTS flashcard_practice_sentences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flashcard_id INTEGER NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  sentence TEXT NOT NULL,
  vi_translation TEXT,
  times_shown INTEGER NOT NULL DEFAULT 0,
  last_shown_at TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_practice_card ON flashcard_practice_sentences(flashcard_id, times_shown);

-- Default settings (insert if not exists)
INSERT OR IGNORE INTO app_config (key, value) VALUES
  ('flashcard_daily_goal_new', '10'),
  ('flashcard_daily_goal_review', '50'),
  ('flashcard_reminder_time', '20:00'),
  ('flashcard_reminder_enabled', '0'),
  ('flashcard_mastered_hide_from_review', '1'),
  ('flashcard_daily_new_limit', '10');
