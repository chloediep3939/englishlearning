-- Kho đoạn văn dùng chung cho các bài nghe/đọc dựa trên đoạn văn:
--   tab Nghe: nghe-12, 19, 20, 21, 22, 23
--   tab Đọc:  doc-22, 23, 24, 25, 26, 28, 29
-- Chỉ tạo bảng; dữ liệu nạp bằng scripts/import-roadmap-data.mjs (sinh migration
-- mới mỗi lần nạp). Màn hình làm bài và màn thêm/sửa/xoá làm sau.
--
-- annotations_json giữ các khối chú thích tuỳ bài (main_ideas, keywords, hiw,
-- smw, hcs, skim, scan, context_words, mc_single, mc_multiple,
-- topic_sentence_index) — đặc tả ở src/doc/roadmap-data-format.md.
-- Nội dung dùng chung, không user_id.

CREATE TABLE IF NOT EXISTS listening_passages (
  id TEXT PRIMARY KEY,
  batch INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  level TEXT,
  text TEXT NOT NULL,
  word_count INTEGER NOT NULL,
  annotations_json TEXT NOT NULL DEFAULT '{}',
  authored_by TEXT,
  verified_by_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_listening_passages_topic ON listening_passages(topic);
