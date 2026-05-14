-- M0: Settings table only. Flashcard schema lands in M1.
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO app_config (key, value) VALUES ('app_initialized', '1');
