-- PTE speaking template memorization: template frames + filled examples.
-- frame_text keeps [slot] tokens and "/" "//" thought-group markers verbatim.
-- filled_text is the assembled speech (slots substituted, markers kept) so
-- karaoke/TTS never re-derives it; slot_values_json is NULL for fills pasted
-- as whole text (slot boundaries unknown → excluded from the slot quiz).

CREATE TABLE IF NOT EXISTS pte_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  frame_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_pte_templates_user_created
  ON pte_templates(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pte_template_fills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  template_id INTEGER NOT NULL,
  topic TEXT NOT NULL,
  slot_values_json TEXT,
  filled_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (template_id) REFERENCES pte_templates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pte_template_fills_user_tpl
  ON pte_template_fills(user_id, template_id, created_at DESC);
