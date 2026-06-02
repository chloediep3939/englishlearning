-- 0013_read_along.sql
-- Read-Along / Karaoke reader caches.
--   passage_translations — sentence-level EN→VI cache (Microsoft Translator).
--   word_glossary        — global word-level cache (MS Dictionary + Gemini IPA).
-- reading_sessions is deliberately deferred (see src/doc/prompts/read-along-ba-flow.md
-- "Resolved decisions"): no session tracking in this cut.

-- Sentence-level translation cache. Keyed (passage_id, sentence_index); the
-- global flat sentence index from splitPassage(). en_text stored alongside so a
-- content edit can be detected (stale rows ignored when en_text mismatches).
CREATE TABLE IF NOT EXISTS passage_translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  passage_id INTEGER NOT NULL,
  sentence_index INTEGER NOT NULL,
  en_text TEXT NOT NULL,
  vn_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(passage_id, sentence_index)
);

CREATE INDEX IF NOT EXISTS idx_passage_translations_passage
  ON passage_translations(passage_id);

-- Word-level glossary cache. GLOBAL (no user_id) — like flashcard_cloze_pool,
-- these entries are generic dictionary data reused across all users. Keyed on
-- the cleaned headword (lowercase, a-z + apostrophe only). vn/pos/ipa nullable
-- so a partial result (e.g. IPA but no dictionary hit) can still be cached.
CREATE TABLE IF NOT EXISTS word_glossary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL UNIQUE,
  vn TEXT,
  pos TEXT,
  ipa TEXT,
  source TEXT DEFAULT 'ms+gemini',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
