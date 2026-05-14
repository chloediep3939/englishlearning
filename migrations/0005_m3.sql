-- M3: compositions table (F3 history) + index
-- Numbered 0005 because 0004 is already taken by flashcards_multiuser.

CREATE TABLE IF NOT EXISTS compositions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('today', 'deck')),
  source_deck_id INTEGER,
  pool_word_ids_json TEXT NOT NULL,
  content TEXT NOT NULL,
  ai_feedback_json TEXT NOT NULL,
  word_usage_json TEXT NOT NULL,
  coherence_score INTEGER,
  passed INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (source_deck_id) REFERENCES flashcard_decks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_compositions_user_created
  ON compositions(user_id, created_at DESC);
