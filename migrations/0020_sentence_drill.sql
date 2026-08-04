-- "Học câu" (sentence study): per-sentence SRS state, one row per
-- (user, card, example index). The sentence text itself stays in
-- flashcards.examples (JSON) — this table only tracks scheduling, and rows
-- are created lazily on the first rating. A sentence with no row here is
-- "new".
CREATE TABLE sentence_drills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flashcard_id INTEGER NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  example_index INTEGER NOT NULL,            -- 0-based; UI shows "Câu 1/2/3"
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','learning','review','mastered')),
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT,
  last_reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE(user_id, flashcard_id, example_index)
);

CREATE INDEX idx_sentence_drills_user_due ON sentence_drills(user_id, next_review_at);
