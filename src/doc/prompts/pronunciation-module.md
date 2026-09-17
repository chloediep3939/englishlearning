# Prompt: Module học phát âm (Pronunciation)

Date: 2026-09-17

> Prompt gốc của người dùng (lưu verbatim theo CLAUDE.md §8). Ngôn ngữ gốc: tiếng Việt.

---

tôi muốn build phần học pronounce , có danh sách 44 âm, video hướng dẫn https://www.youtube.com/playlist?list=PLD6B222E02447DC07  25 ví dụ mỗi từ, cách đọc, sau khi dọc có thu âm và đánh giá lại là match bao nhiều điểm trên 100,  có thể xem https://youglish.com/ từ đó trên youglish ngay trong web mình, cuối là có bài học lựa chọn so sánh cặp từ, và mark bài đó đã học xg chưa.  đầu tiên xét về tính khả thi , có thể lồng các ifram youlish và video youtube lên web mình ko

---

## Các quyết định chốt qua brainstorm (không có trong prompt gốc)

- **Engine chấm điểm:** Web Speech API (option A, free). Điểm gán nhãn trung thực "điểm khớp
  nhận diện", không phải điểm giọng chuẩn bản xứ.
- **Nguồn dữ liệu:** seed tĩnh trong repo (catalog TS), sửa được sau; chỉ tiến độ per-user vào D1.
- **Video khẩu hình:** 44 MP4 từ Google Drive người dùng cung cấp
  (folder `1aEqfqZMsitSCV6k4rJOcGx7uIza2fcue`) → tải vào `public/pronunciation/mouth/`, tên slug ASCII.
- **Tính năng bổ sung chốt:** mẹo phát âm tiếng Việt + so sánh âm Việt–Anh (tự soạn); nghe lại giọng
  mình A/B (không lưu); đọc chậm 0.5×; minimal pair listening; hiện transcript "máy nghe bạn nói ra
  gì"; link sang `/pronounce` sẵn có để luyện phát âm từ flashcards.
- **Ngoài phạm vi v1:** trọng âm từ (word stress) — module riêng; phát hiện âm yếu / SRS cho âm;
  per-word best score.

Xem plan chi tiết đã duyệt trong session và kết quả tại `src/doc/results/pronunciation-module-result.md`.
