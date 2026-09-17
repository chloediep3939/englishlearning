-- Nối 3 bài nghe chép dùng lại kho câu đã kiểm mù của nghe-06/07/08 (84 câu).
--   nghe-13 fabrication  "0 từ bịa"            điểm = số từ bịa (lte 0)
--   nghe-14 accent       "Chênh ≤ 15%"         điểm = % giọng Mỹ − % giọng Anh/Úc (lte 15)
--   nghe-17 reconstruct  "≤ 1/10 câu dựng lại" điểm = số câu tự khai dựng lại (lte 1/10)
-- pool = lấy câu từ kho của các mục đó thay vì kho riêng.
-- ⚠️ Dùng chung kho nên người đã làm nghe-06/07/08 sẽ gặp lại câu. Khi có bộ câu
-- riêng thì đổi pool.

INSERT INTO roadmap_item_tests (item_key, tool, list_code, config_json) VALUES
  ('nghe-13', 'T3', NULL, '{"mode":"fabrication","sample":10,"pool":["nghe-06","nghe-07","nghe-08"]}'),
  ('nghe-14', 'T3', NULL, '{"mode":"accent","sample":10,"pool":["nghe-06","nghe-07","nghe-08"]}'),
  ('nghe-17', 'T3', NULL, '{"mode":"reconstruct","sample":10,"pool":["nghe-06","nghe-07","nghe-08"]}');
