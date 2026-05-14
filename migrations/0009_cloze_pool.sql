-- Shared cloze sentence pool. Word-keyed (not user-keyed) — same model as
-- Datamuse caching: sentences for a headword are generic linguistic content
-- with no PII, generated once and reused across all users. Writes are gated
-- to the background ensureClozePool() helper (added in Part 2); reads are
-- open to any authed user.

CREATE TABLE flashcard_cloze_pool (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL,             -- lowercase headword (lookup key)
  pos TEXT,                       -- noun/verb/adj/adv etc. nullable
  sentence TEXT NOT NULL,         -- full sentence, target word replaced by __
  blank_word TEXT NOT NULL,       -- the inflected form used in the sentence
  difficulty TEXT,                -- A1/A2/B1/B2/C1/C2 if AI returns, nullable
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX idx_cloze_pool_word ON flashcard_cloze_pool(word);
