-- "Phát âm": per-user progress over the 44-sound static catalog. One row per
-- (user, sound). The catalog itself (IPA, example words, tips, videos) lives in
-- src/lib/pronunciation/ — this table only tracks per-user completion and the
-- best "match score" from the read-aloud scorer. A sound with no row here is
-- untouched; rows are created lazily on the first interaction.
CREATE TABLE IF NOT EXISTS pronunciation_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sound_slug TEXT NOT NULL,                 -- ASCII slug from the static catalog, e.g. 'ee'
  completed INTEGER NOT NULL DEFAULT 0,     -- user pressed "Đã học xong"
  best_score INTEGER,                       -- 0..100 best read-match score, NULL until first read
  attempts INTEGER NOT NULL DEFAULT 0,      -- number of scored reads
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE(user_id, sound_slug)
);

CREATE INDEX IF NOT EXISTS idx_pron_progress_user ON pronunciation_progress(user_id);
