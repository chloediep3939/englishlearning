-- Cho phép lưu một lần tự kiểm tra làm dở.
--
-- Đóng popup giữa chừng thì user được hỏi có lưu không. Lưu bài dở KHÔNG được
-- chấm Đạt/Chưa đạt: 18 đúng trên 20 từ đã làm mà so với ngưỡng "≥ 47/50" là
-- đánh trượt oan. Nên bài dở vẫn vào lịch sử (completed = 0) nhưng không đụng
-- tới roadmap_progress, và không được lấy làm "điểm gần nhất" trên danh sách.
--
-- 0026 để dành cho migration nạp dữ liệu Oxford đang chạy song song.

ALTER TABLE roadmap_test_runs ADD COLUMN completed INTEGER NOT NULL DEFAULT 1;
