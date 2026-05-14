-- M5: on-demand grammar analysis for passages + content-hash cache.
-- All three columns are nullable so existing rows stay valid. The hash is
-- populated lazily on the next grammar-route call (SHA-256 isn't a built-in
-- D1 function, so backfill happens in TypeScript via crypto.subtle).
ALTER TABLE passages ADD COLUMN grammar_analysis TEXT;
ALTER TABLE passages ADD COLUMN grammar_analyzed_at DATETIME;
ALTER TABLE passages ADD COLUMN content_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_passages_content_hash
  ON passages(content_hash);
