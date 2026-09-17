# Shadowing — Kế hoạch triển khai (lưu verbatim)

> Ngày lưu: 2026-09-18
> Nguồn: người dùng dán vào chat. Đây là **tài liệu kế hoạch**, không phải prompt
> chạy thẳng. Lưu để làm hồ sơ audit theo CLAUDE.md §8.

---

# Shadowing — Kế hoạch triển khai

> Tài liệu kế hoạch, không phải prompt để chạy thẳng. Mỗi phase sẽ có file `.md` riêng.
> Dự án: Bún (EnglishLearning). Nav: nhóm **KỸ NĂNG**.

---

## 0. Bối cảnh & giả định

- Giai đoạn này **chỉ một người dùng (Dor)**. Không phân tầng tài khoản A/C. Mọi bậc đều chấm điểm Azure.
- Nguồn audio **bắt buộc là giọng người thật**. TTS chỉ dùng dự phòng, không dùng cho shadowing.
- Kho chính: **VOA Learning English** (public domain, dùng được cả cho mục đích thương mại, ghi nguồn `learningenglish.voanews.com`).
- YouTube: chỉ nhận video **có phụ đề gốc do chủ kênh tải lên**, transcript do người dùng tự dán.
- Không gọi Gemini cho phần shadowing. Nhận xét dùng mẫu câu soạn sẵn.

---

## 1. Spike trước khi code (S0)

Làm trước, vì kết quả quyết định kiến trúc client. Mỗi spike là một trang thử nghiệm bỏ đi được, không cần đẹp.

| # | Câu hỏi | Nếu FAIL thì sao |
| --- | --- | --- |
| S0.1 | `SpeechRecognition` (Web Speech API) có chạy **song song** với `MediaRecorder` không? | Bỏ tô chữ real-time, chuyển sang Whisper chạy trên file đã ghi |
| S0.2 | Safari iOS có chạy được `webkitSpeechRecognition` không? | Trên iOS chỉ tô chữ sau khi đọc xong |
| S0.3 | Azure Pronunciation Assessment nhận định dạng nào? Safari ghi ra mp4/aac có gửi thẳng được không? | Convert sang WAV 16kHz PCM ở client trước khi gửi |
| S0.4 | Azure có trả `UnexpectedBreak` / `MissingBreak` / `Monotone` qua REST không, hay chỉ có trong Speech Studio? | Bỏ nhận xét nối âm & ngắt nghỉ, chỉ giữ phát âm + âm cuối |
| S0.5 | Script tải bài VOA (RSS → trang bài → MP3 + transcript) chạy được không? | Tải tay vài bài để có dữ liệu chạy MVP |

**Output của S0:** một file ghi chú `shadowing-spike-notes.md` — trả lời 5 câu trên. Các phase sau bám theo đó.

---

## 2. Phase map

| Phase | Tên | Nội dung | Phụ thuộc |
| --- | --- | --- | --- |
| **S0** | Spike | 5 câu hỏi ở trên | — |
| **S1** | Kho bài | Script nhập VOA, schema D1, R2 audio, trang danh sách bài | S0.5 |
| **S2** | Nhại một câu | Màn hình lõi: nghe → ghi âm → tô chữ → chấm → nhận xét | S1, S0.1–S0.4 |
| **S3** | Phiên & bậc | Thang 6 bậc, chọn bài, điểm phiên, ghi lịch sử | S2 |
| **S4** | Bản đồ đọc & nhận xét sâu | Trọng âm, nối âm, âm cuối; mẫu câu tiếng Việt | S2 |
| **S5** | Vòng Soi → Zoom → Sửa → Quay lại | Cắt cụm từ audio gốc, SRS cho câu sai | S3, S4 |
| **S6** | Bài của tuần | 7 ngày 7 nhiệm vụ trên cùng một clip, streak nói | S3 |
| **S7** | Chế độ luyện mở rộng | Xây ngược, chen chỗ trống, nhại theo vai, gõ nhịp, tăng tốc, chép chính tả, không nhìn màn hình | S3 |
| **S8** | Onboarding & tiến bộ | 15 giây test mic, giọng ngày 0, top 5 âm yếu, "1 câu thôi" | S3, S6 |
| **S9** | YouTube | Dán link + transcript, chuẩn bị clip, chỉnh điểm cắt | S2 |
| **S10** | Về sau | Lọc theo nghề, gói PTE, phân tầng tài khoản, thư viện cộng đồng | — |

**MVP = S0 → S3.** Chạy được vòng "chọn bài → nhại từng câu → thấy điểm và nhận xét".

---

## 3. Dữ liệu

### Bảng mới (D1)

```
shadowing_lessons
  id, source (voa|youtube), source_url, title, program,
  level (0-5), audio_key (R2), duration_ms,
  word_count, wpm, created_at

shadowing_sentences
  id, lesson_id, idx, text, translation_vi,
  start_ms, end_ms,
  words_json        -- [{word, start_ms, end_ms}] mốc từng từ
  marks_json        -- bản đồ đọc: trọng âm, nối âm, âm cuối, ngắt cụm

shadowing_sessions
  id, user_id, lesson_id, level, started_at, ended_at,
  sentence_count, avg_score, speaking_seconds

shadowing_attempts
  id, session_id, sentence_id, user_id,
  stt_text, stt_match_pct,
  scored (0|1),
  pron_score, accuracy, fluency, completeness, prosody,
  words_json       -- kết quả từng từ + từng âm vị của Azure
  created_at
```

**Không lưu audio người dùng** theo mặc định. Ngoại lệ duy nhất: bản ghi "ngày 0" và "ngày 7" của Bài của tuần (S6).

### Lưu ý D1
- Thêm cột vào type TS thì **nhớ cập nhật luôn danh sách cột trong INSERT** (tiền lệ M4a: giá trị bị rớt âm thầm).
- `words_json` có thể lớn, cân nhắc chỉ lưu phần cần hiển thị lại.

### Settings keys mới
```
shadowing_level            (0-5, mặc định theo onboarding)
shadowing_daily_goal_min   (mặc định 10)
shadowing_stt_gate         (bool, mặc định false)
shadowing_stt_threshold    (0-100, mặc định 80)
shadowing_playback_rate    (0.75 | 1.0 | 1.25)
```
Đi qua `FlashcardSettings` + `/api/settings` như cũ, không dùng key-value thô.

---

## 4. API

| Route | Việc |
| --- | --- |
| `POST /api/shadowing/score` | Nhận audio + sentence_id → gọi Azure → trả điểm + lỗi từng từ → ghi `shadowing_attempts` |
| `GET /api/shadowing/lessons` | Danh sách bài, lọc theo bậc |
| `GET /api/shadowing/lessons/:id` | Bài + toàn bộ câu |
| `POST /api/shadowing/sessions` | Mở/đóng phiên, ghi điểm phiên |
| `GET /api/shadowing/progress` | Tiến bộ, top âm yếu |

Module AI theo pattern có sẵn: `src/lib/shadowing/ai/assess.ts`. Không đụng `/api/cards/generate`.

---

## 5. Chi tiết từng phase MVP

### S1 — Kho bài

1. `scripts/ingest-voa.ts` chạy **local**, không chạy trên Worker (VOA chặn request kiểu bot):
   - Đọc RSS của 3 chương trình: **Let's Learn English Level 1**, **English in a Minute**, **As It Is**
   - Lấy transcript + link MP3
   - Chạy nhận dạng giọng lấy mốc **từng từ**
   - Cắt câu theo dấu chấm, ghép mốc
   - Upload MP3 lên R2, ghi D1
2. Dịch tiếng Việt từng câu: chạy một lần lúc nhập, lưu vào `translation_vi`.
3. Gán `level` bằng tay theo chương trình (Level 1 → bậc 1–2, English in a Minute → 2–3, As It Is → 3–4).
4. Trang `/shadowing` liệt kê bài, có nhãn độ khó tính từ số từ/phút.

**Mục tiêu số lượng:** 50–80 bài, 600–1000 câu.

### S2 — Nhại một câu

Màn hình lõi. Trạng thái một câu:

```
Nghe mẫu  →  Bấm giữ ghi âm  →  Tô chữ theo lời đọc  →  Chấm
  →  Nghe A/B (mẫu ↔ mình)  →  Nhận xét  →  Câu kế / Lại
```

**Tô chữ 2 lớp:**
- *Lớp 1, lúc đang đọc:* dùng kết quả tạm của STT, từ nào máy nghe ra thì đậm lên, có bộ đếm `8/11 từ`. Từ chưa nghe ra để xám, **không dừng lại bắt sửa**. Ghi rõ đây chỉ là "máy có nghe ra không", chưa phải đúng/sai.
- *Lớp 2, sau khi Azure trả về:* tô đè theo điểm — xanh ≥80, vàng 60–79, đỏ <60, gạch ngang là bỏ sót từ, dấu `|` là ngắt sai chỗ.

**Cổng STT:** làm nhưng **mặc định tắt**. Khi bật, dưới ngưỡng thì không gọi Azure, hiện "Bún nghe thành: …" và mời đọc lại, luôn có nút "Cứ chấm". Luôn hiện dòng *"máy nghe sai không có nghĩa bạn nói sai"*.

**Lọc trước khi gọi Azure (luôn bật, không tốn gì):** bỏ audio im lặng, dưới 1 giây, hoặc quá ồn. Azure trả chỉ số nhiễu — nếu ồn thì cảnh báo thay vì chấm bậy.

**Chặn nhại câu chưa hiểu:** phải bấm "hiểu rồi" hoặc xem bản dịch mới mở được nút ghi âm.

### S3 — Phiên & bậc

- Bước chọn trước phiên, giống pattern study/review: chọn bài, chọn bậc, số câu (5/10/20).
- Thang 6 bậc như đã chốt, **mọi bậc đều chấm điểm**:
  - Bậc 0: cặp từ tối thiểu, 60–80 cặp soạn tay, audio Oxford có sẵn trong R2
  - Bậc 1: cụm 2–3 từ, cắt tự động từ câu đã có mốc từng từ
  - Bậc 2: câu ngắn, tốc độ 0.75, có text
  - Bậc 3: tốc độ thật, có text
  - Bậc 4: ẩn text
  - Bậc 5: đoạn liên tục 30–60 giây, **chấm gộp cuối đoạn** (Azure yêu cầu chế độ liên tục khi audio quá 30 giây), bắt buộc tai nghe và có nhắc
- Cuối phiên: điểm phiên, số **phút mở miệng**, danh sách câu cần luyện lại.
- **Giấu điểm 3 ngày đầu**, chỉ hiện nhận xét chữ.

---

## 6. Nhận xét tiếng Việt (S4)

Azure trả về theo từng từ: bỏ sót, đọc thừa, phát âm sai (điểm dưới 60), ngắt chỗ không nên ngắt, không ngắt ở dấu câu, đọc đều đều; kèm điểm tới từng âm vị.

| Nhận xét hiển thị | Suy ra từ |
| --- | --- |
| "Thiếu âm /t/ cuối trong *want*" | Âm vị cuối điểm thấp |
| "Bỏ mất từ *the*" | Lỗi bỏ sót |
| "Chưa nối *pick_it_up*" | `marks_json` báo chỗ cần nối + Azure báo có ngắt ở đó |
| "Chưa ngừng ở dấu phẩy" | Lỗi không ngắt ở dấu câu |
| "Đọc đều đều như đọc chính tả" | Lỗi đơn điệu |

**Tối đa 2–3 nhận xét mỗi câu**, ưu tiên lỗi nặng nhất. Mẫu câu soạn sẵn, không gọi LLM.

Lưu ý: chấm ngữ điệu **chỉ có với tiếng Anh Mỹ**. VOA khớp; clip giọng Anh/Úc sau này chỉ chấm được phát âm.

---

## 7. Thứ tự làm đề xuất

```
S0 spike          →  1 buổi
S1 kho bài        →  phần nặng nhất, làm xong là yên tâm
S2 nhại một câu   →  màn hình lõi
S3 phiên & bậc    →  MVP chạy được ở đây
──────────────── MVP ────────────────
S4 nhận xét sâu
S6 bài của tuần
S5 vòng sửa lỗi
S8 onboarding & tiến bộ
S7 chế độ mở rộng
S9 YouTube
S10 về sau
```

---

## 8. Đã quyết bỏ

Chế độ nhép miệng, tải clip offline, tốc độ nói từ/phút, sổ tay lỗi PDF, streak nói tách riêng, Bún phản ứng theo kết quả, gửi bản ghi cho bạn bè, điểm "giống bản xứ %", vẽ đường cao độ, bảng xếp hạng phát âm, dùng LLM chấm phát âm.

---

## 9. Chưa verify — kiểm lại khi làm

- Số bài của Let's Learn English Level 1 / Level 2 (nguồn là review bên thứ ba, không phải trang VOA).
- Tình hình sản xuất nội dung mới của VOA sau đợt cắt giảm 2025. → Tải kho về R2 sớm.
- Safari iOS có thật sự hỗ trợ `webkitSpeechRecognition` không (tài liệu chuẩn và blog nói khác nhau).
- Đã có app nào làm kiểu "zoom vào giọng thật" chưa — nên tra trước khi coi S5 là điểm khác biệt.
