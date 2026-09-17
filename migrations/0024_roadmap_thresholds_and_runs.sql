-- Hạ tầng cho công cụ tự kiểm tra roadmap (phase 0).
--
-- 1. Bốn cột ngưỡng trên roadmap_items: đổi "Đạt khi" từ chữ sang số để máy so
--    được. pass_dir 'gte' = càng nhiều càng tốt, 'lte' = càng ít càng tốt
--    (đếm lỗi). pass_total NULL khi ngưỡng không có mẫu số ("≥ 6 keyword/bài").
--    4 mục có ngưỡng thuần chữ → để NULL, chỉ đánh dấu tay được.
-- 2. roadmap_test_runs: lịch sử mỗi lần tự kiểm tra. Tách khỏi
--    flashcard_test_attempts vì bảng đó khoá cứng mode bằng CHECK và gắn với
--    flashcard_id, không dùng lại được.
--
-- Sinh bởi scripts/gen-roadmap-thresholds.mjs từ src/doc/prompts/roadmap-checklist.md.

ALTER TABLE roadmap_items ADD COLUMN pass_dir TEXT;
ALTER TABLE roadmap_items ADD COLUMN pass_value INTEGER;
ALTER TABLE roadmap_items ADD COLUMN pass_total INTEGER;
ALTER TABLE roadmap_items ADD COLUMN pass_unit TEXT;

CREATE TABLE IF NOT EXISTS roadmap_test_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_key TEXT NOT NULL,
  -- 'manual' = user tự nhập điểm sau khi test ở đâu đó (APEUni, giấy…).
  -- Các công cụ trong app sau này dùng mã riêng: 'T1', 'T2', …
  source TEXT NOT NULL DEFAULT 'manual',
  score INTEGER NOT NULL,
  total INTEGER,
  passed INTEGER NOT NULL,
  note TEXT,
  detail_json TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE (user_id, item_key, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_test_runs_user_item
  ON roadmap_test_runs(user_id, item_key, created_at DESC);

-- Ngưỡng số cho 137/141 mục
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 18, pass_total = 20, pass_unit = 'count' WHERE item_key = 'nghe-01';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 18, pass_total = 20, pass_unit = 'count' WHERE item_key = 'nghe-02';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 90, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'nghe-03';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 27, pass_total = 30, pass_unit = 'count' WHERE item_key = 'nghe-04';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 17, pass_total = 20, pass_unit = 'count' WHERE item_key = 'nghe-05';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 85, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'nghe-06';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 8, pass_total = 10, pass_unit = 'count' WHERE item_key = 'nghe-07';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 8, pass_total = 10, pass_unit = 'count' WHERE item_key = 'nghe-08';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 90, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'nghe-09';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 85, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'nghe-10';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 80, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'nghe-11';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 3, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'nghe-12';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 0, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'nghe-13';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 15, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'nghe-14';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 80, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'nghe-15';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 70, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'nghe-16';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 1, pass_total = 10, pass_unit = 'count' WHERE item_key = 'nghe-17';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 0, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'nghe-18';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 3, pass_total = 4, pass_unit = 'count' WHERE item_key = 'nghe-19';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 6, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'nghe-20';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 85, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'nghe-21';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 70, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'nghe-22';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 2, pass_total = 3, pass_unit = 'count' WHERE item_key = 'nghe-23';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 47, pass_total = 50, pass_unit = 'count' WHERE item_key = 'doc-01';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 42, pass_total = 50, pass_unit = 'count' WHERE item_key = 'doc-02';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 40, pass_total = 50, pass_unit = 'count' WHERE item_key = 'doc-03';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 35, pass_total = 50, pass_unit = 'count' WHERE item_key = 'doc-04';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 18, pass_total = 20, pass_unit = 'count' WHERE item_key = 'doc-05';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 27, pass_total = 30, pass_unit = 'count' WHERE item_key = 'doc-06';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 24, pass_total = 30, pass_unit = 'count' WHERE item_key = 'doc-07';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 24, pass_total = 30, pass_unit = 'count' WHERE item_key = 'doc-08';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 36, pass_total = 40, pass_unit = 'count' WHERE item_key = 'doc-09';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 25, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'doc-10';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 18, pass_total = 20, pass_unit = 'count' WHERE item_key = 'doc-11';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 18, pass_total = 20, pass_unit = 'count' WHERE item_key = 'doc-12';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 17, pass_total = 20, pass_unit = 'count' WHERE item_key = 'doc-13';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 19, pass_total = 20, pass_unit = 'count' WHERE item_key = 'doc-14';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 16, pass_total = 20, pass_unit = 'count' WHERE item_key = 'doc-15';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 18, pass_total = 20, pass_unit = 'count' WHERE item_key = 'doc-16';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 60, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'doc-17';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 60, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'doc-18';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'doc-19';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 8, pass_total = 10, pass_unit = 'count' WHERE item_key = 'doc-20';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 8, pass_total = 10, pass_unit = 'count' WHERE item_key = 'doc-21';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 80, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'doc-22';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 4, pass_total = 5, pass_unit = 'count' WHERE item_key = 'doc-23';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 3, pass_total = 3, pass_unit = 'count' WHERE item_key = 'doc-24';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 8, pass_total = 10, pass_unit = 'count' WHERE item_key = 'doc-25';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 6, pass_total = 10, pass_unit = 'count' WHERE item_key = 'doc-26';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 85, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'doc-27';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 2, pass_total = 3, pass_unit = 'count' WHERE item_key = 'doc-28';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-01';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-02';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-03';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-04';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-05';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-06';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-07';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-08';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-09';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 13, pass_total = 15, pass_unit = 'count' WHERE item_key = 'viet-10';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 10, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-11';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-12';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-13';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-14';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-15';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-16';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 8, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-17';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-18';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-19';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-20';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-21';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 10, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-22';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-23';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 4, pass_total = 5, pass_unit = 'count' WHERE item_key = 'viet-24';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-25';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-26';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-27';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-28';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 8, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-29';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-30';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-31';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 8, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-32';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 8, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-33';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 8, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-34';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 8, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-35';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-36';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 8, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-37';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 8, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-38';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 8, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-39';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 8, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-40';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 5, pass_total = 5, pass_unit = 'count' WHERE item_key = 'viet-41';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-42';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 100, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'viet-43';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 29, pass_total = 30, pass_unit = 'count' WHERE item_key = 'viet-44';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 8, pass_total = 10, pass_unit = 'count' WHERE item_key = 'viet-45';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 0, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'viet-46';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 1, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'viet-47';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 5, pass_total = 6, pass_unit = 'count' WHERE item_key = 'viet-48';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 10, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'viet-49';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 6, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'viet-50';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 5, pass_total = 5, pass_unit = 'count' WHERE item_key = 'viet-51';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 4, pass_total = 5, pass_unit = 'count' WHERE item_key = 'viet-52';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 3, pass_total = 3, pass_unit = 'count' WHERE item_key = 'viet-53';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 3, pass_total = 3, pass_unit = 'count' WHERE item_key = 'viet-54';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 5, pass_total = 6, pass_unit = 'count' WHERE item_key = 'viet-55';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 3, pass_total = 3, pass_unit = 'count' WHERE item_key = 'viet-56';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 9, pass_total = 9, pass_unit = 'count' WHERE item_key = 'viet-57';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 0, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'viet-58';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 0, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'viet-59';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 85, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'viet-60';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 70, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'viet-61';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 3, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'viet-62';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 18, pass_total = 20, pass_unit = 'count' WHERE item_key = 'noi-01';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 18, pass_total = 20, pass_unit = 'count' WHERE item_key = 'noi-02';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 18, pass_total = 20, pass_unit = 'count' WHERE item_key = 'noi-03';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 17, pass_total = 20, pass_unit = 'count' WHERE item_key = 'noi-04';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 2, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'noi-05';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 2, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'noi-07';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 85, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'noi-08';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 1, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'noi-09';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 1, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'noi-10';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 20, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'noi-11';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 70, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'noi-12';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 60, pass_total = 100, pass_unit = 'percent' WHERE item_key = 'noi-13';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 0, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'noi-14';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 1, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'noi-16';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 3, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'noi-17';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 2, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'noi-18';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 4, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'noi-19';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 3, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'noi-21';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 0, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'noi-22';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 1, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'noi-23';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 6, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'noi-24';
UPDATE roadmap_items SET pass_dir = 'gte', pass_value = 3, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'noi-25';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 0, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'noi-26';
UPDATE roadmap_items SET pass_dir = 'lte', pass_value = 0, pass_total = NULL, pass_unit = 'count' WHERE item_key = 'noi-27';

-- 4 mục ngưỡng thuần chữ, để NULL:
--   doc-29: Làm hết, không bỏ câu, dư ≥ 1 phút
--   noi-06: Tự đánh giá + mình nghe transcript nhịp
--   noi-15: Đủ 5 phần, ≤ 3 ngắt > 2s
--   noi-20: Không lặp nguyên câu > 6 từ; đủ 3 ý
