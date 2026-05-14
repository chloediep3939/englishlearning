-- Users table — populated by Google OAuth callback
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  picture_url TEXT,
  google_sub TEXT UNIQUE,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);

-- Per-user settings (replaces flashcard_* keys in app_config)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

-- Clean up any pre-multiuser flashcard config keys (will be re-seeded per-user on user creation)
DELETE FROM app_config WHERE key LIKE 'flashcard_%';
