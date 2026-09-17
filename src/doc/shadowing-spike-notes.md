# Shadowing — Spike notes (S0)

> Output của phase S0 (kế hoạch §1). Điền kết quả sau khi chạy các spike bên dưới.
> Các phase S1–S3 bám theo file này. Harness spike đều **bỏ đi được**.

## Cách chạy

- **S0.1 / S0.2 / S0.3 / S0.4** — `npm run dev`, mở `/shadowing-spike`:
  - Bấm **Bắt đầu ghi** → nói vài câu → **Dừng**. Xem STT có chạy song song
    với bản ghi không (S0.1). Mở cùng URL trên **Safari iOS** để kiểm tra S0.2.
  - Bấm **Gửi Azure chấm** để đẩy bản ghi sang Azure (S0.3/S0.4). Cần
    `AZURE_SPEECH_KEY` (hoặc `AZURE_SPEECH`) + `AZURE_SPEECH_REGION` trong
    `.dev.vars` (bạn tự thêm).
- **S0.5** — `node scripts/shadowing-spike-voa.mjs "<RSS_URL của VOA>"`.
  (Chưa hardcode URL feed — kế hoạch §9 chưa verify endpoint VOA.)

## Kết quả

| # | Câu hỏi | Kết quả | Ghi chú |
| --- | --- | --- | --- |
| S0.1 | SpeechRecognition chạy song song với MediaRecorder? | ⬜ chưa chạy | |
| S0.2 | Safari iOS chạy webkitSpeechRecognition? | ⬜ chưa chạy | |
| S0.3 | Azure nhận định dạng nào? webm/opus hay mp4/aac gửi thẳng được? | ⬜ chưa chạy | Xem `sent.audioContentType` + `azure.status` trong kết quả |
| S0.4 | REST trả UnexpectedBreak / MissingBreak / Monotone + prosody? | ⬜ chưa chạy | Soi `azure.body.NBest[].Words[].PronunciationAssessment` + prosody |
| S0.5 | Script tải bài VOA (RSS → MP3 + transcript) chạy được? | ⬜ chưa chạy | RSS có bị chặn bot không; item có enclosure MP3 + link bài không |

## Quyết định kiến trúc rút ra

- (điền sau khi có kết quả — vd: bỏ tô chữ real-time trên iOS, hay convert WAV
  16kHz trước khi gửi Azure, v.v.)

## Dọn dẹp

Khi xong S0, xóa các file spike:
- `src/app/shadowing-spike/page.tsx`
- `src/app/api/shadowing/spike-assess/route.ts`
- `scripts/shadowing-spike-voa.mjs`
