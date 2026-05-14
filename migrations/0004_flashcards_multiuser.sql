-- ============================================================================
-- M1a-multiuser: replace single-user flashcard schema (from 0002) with
-- user-scoped tables. Drop+recreate is safe: 0002 only seeded one default
-- deck row, which we no longer want (default decks are created lazily per
-- user via `flashcardDecksDb.ensureDefault(userId)`).
-- ============================================================================

DROP TABLE IF EXISTS flashcard_practice_sentences;
DROP TABLE IF EXISTS flashcard_test_attempts;
DROP TABLE IF EXISTS flashcard_reviews;
DROP TABLE IF EXISTS flashcards;
DROP TABLE IF EXISTS flashcard_decks;

-- Decks (user-scoped)
CREATE TABLE flashcard_decks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#7ac143',
  position INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX idx_decks_user ON flashcard_decks(user_id);
CREATE INDEX idx_decks_user_position ON flashcard_decks(user_id, position);

-- Cards (user-scoped via deck; user_id denormalised for query simplicity)
CREATE TABLE flashcards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id INTEGER NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
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

CREATE INDEX idx_cards_user        ON flashcards(user_id);
CREATE INDEX idx_cards_user_deck   ON flashcards(user_id, deck_id);
CREATE INDEX idx_cards_user_status ON flashcards(user_id, status);
CREATE INDEX idx_cards_next_review ON flashcards(user_id, next_review_at);

-- Reviews
CREATE TABLE flashcard_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flashcard_id INTEGER NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quality INTEGER NOT NULL CHECK(quality IN (0,2,4,5)),
  prev_interval INTEGER NOT NULL DEFAULT 0,
  new_interval INTEGER NOT NULL DEFAULT 0,
  reviewed_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX idx_reviews_card      ON flashcard_reviews(flashcard_id);
CREATE INDEX idx_reviews_user_date ON flashcard_reviews(user_id, reviewed_at);

-- Test attempts
CREATE TABLE flashcard_test_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flashcard_id INTEGER NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK(mode IN ('speed','cloze','pronunciation','sentence')),
  passed INTEGER NOT NULL,
  time_ms INTEGER,
  metadata TEXT,
  attempted_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX idx_attempts_card ON flashcard_test_attempts(flashcard_id);
CREATE INDEX idx_attempts_user_mode_date ON flashcard_test_attempts(user_id, mode, attempted_at);

-- Practice sentences (Cloze pool — FK to card, no user_id needed; ownership checked via card)
CREATE TABLE flashcard_practice_sentences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flashcard_id INTEGER NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  sentence TEXT NOT NULL,
  vi_translation TEXT,
  times_shown INTEGER NOT NULL DEFAULT 0,
  last_shown_at TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX idx_practice_card ON flashcard_practice_sentences(flashcard_id, times_shown);
