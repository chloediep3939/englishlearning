# Prompt: sentence-study (2026-08-04)

User messages, verbatim (chat, Vietnamese):

> hi mình cần làm 1 tính năng mới là tập đặt câu, khi mình import 1 nhóm từ
> , mỗi từ sẽ có 3 ví dụ 1,2,3. mình muốn có tính năng tập viết câu, bạn
> hiện tiếng việt => mình gõ tiếng anh ; y như phần học và ôn từ mới nhưng
> nó sẽ là câu, lúc start mình sẽ chọn câu 1, 2 hay 3. bạn cũng đánh điểm
> coi câu nào thuộc rồi để qua ôn y như từ vậy, hãy hỏi tôi cho tới khi bạn
> thật sự hiểu rọ

Mid-planning addition:

> nâng cấp hơn nếu câu ví du gen thêm hình thì có dc ko

Plan revision:

> update thêm: trong phần học hiện tại hiện ra tất cả câu ví dụ, lúc luyện
> câu: hiện tiếng việt + hình ( như phần học), để tên là học câu, bỏ cái số
> 5 đi, phần chấm cho nó như phần học từ luôn, đúng hết defautl = tốt, sai
> thì lại

Decisions answered during planning (Q&A):

1. Grading → exact match against the original sentence (case/punctuation
   insensitive) + self-rate 4 buttons; Enter default TỐT when fully
   correct, LẠI when wrong. No AI grading.
2. Example number 1/2/3 chosen once at session start, applies to the whole
   session; words lacking that example (or its VI translation) are skipped.
3. Each sentence (word × example index) has its own independent SRS
   schedule, fully separate from the word's schedule.
4. Keep the existing free-writing "Đặt câu" module; add a new sidebar entry
   named "Học câu".
5. No hints on the prompt (the adaptive-hint idea was dropped by the user):
   prompt = image + Vietnamese sentence only.
6. Setup mirrors /study (mode, multi-deck scope, limits) + the example
   number segment.
7. Per-sentence Pexels illustration, fetched lazily in the background and
   stored on the example.
8. The existing /study reveal must show ALL example sentences (it showed
   only the first).
