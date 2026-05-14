-- Demo accounts + user feedback (M5)
-- 1. Add demo flag + expiry to users.
-- 2. Add the feedback inbox table.

-- ── Demo flag on users ──────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN demo_expires_at INTEGER;  -- unix seconds, nullable

CREATE INDEX IF NOT EXISTS idx_users_demo_expires
  ON users(demo_expires_at) WHERE is_demo = 1;

-- ── Feedback inbox ──────────────────────────────────────────────────────────
-- One row per submission. `user_id` is FK-set-null so feedback survives the
-- author's row being deleted (e.g. demo cleanup). `created_at` is unix seconds
-- to match the demo_expires_at shape and to avoid timezone surprises.
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,                          -- nullable; FK SET NULL on user delete
  email TEXT,                               -- snapshot of user email at submit time
  rating INTEGER,                           -- 1..5, nullable
  content TEXT NOT NULL,
  page_url TEXT,                            -- Referer at submit time
  user_agent TEXT,
  is_demo_user INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);
