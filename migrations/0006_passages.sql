-- M4: passages + per-step attempts + Word Bank source tracking
-- Numbered 0006 because 0005 is M3 (compositions).

CREATE TABLE IF NOT EXISTS passages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_label TEXT,
  source_url TEXT,
  char_count INTEGER NOT NULL,
  word_count INTEGER NOT NULL,
  level_estimate TEXT,
  level_verdict TEXT,
  level_suggestion TEXT,
  last_step_viewed INTEGER NOT NULL DEFAULT 1,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_passages_user_created
  ON passages(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS passage_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  passage_id INTEGER NOT NULL,
  step_kind TEXT NOT NULL CHECK (step_kind IN ('translate', 'paraphrase', 'comprehension', 'dictation', 'shadowing')),
  user_input TEXT NOT NULL,
  ai_feedback_json TEXT NOT NULL,
  score INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (passage_id) REFERENCES passages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_passage_attempts_user_passage
  ON passage_attempts(user_id, passage_id, step_kind);

-- Word Bank: link saved cards back to the passage + sentence they came from.
-- Both nullable so existing cards stay valid; ON DELETE SET NULL keeps the
-- card around even if the source passage is later removed.
ALTER TABLE flashcards ADD COLUMN source_passage_id INTEGER REFERENCES passages(id) ON DELETE SET NULL;
ALTER TABLE flashcards ADD COLUMN source_context TEXT;
