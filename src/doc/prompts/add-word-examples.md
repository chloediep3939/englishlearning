# Prompt: add-word-examples (2026-08-04)

User messages, verbatim (chat, Vietnamese — after asking where meanings and
examples come from on the add-word screen, with an ozdic.com screenshot):

> lấy vd trong odiz tab Examples hoặc ví du trong Oxford dc ko, rồi dùng
> MyMemory dịch tiếng việt

Plan revision:

> phần thêm 1 từ có UI cho user tự thêm ví dụ ; tiếng anh và tiếng việt
> luôn ( Ko bắt buộc nhưng user có thể tự controll). nút sửa trong bộ từ sẽ
> update IPA, cách đọc và ví dụ - ví dụ chỉ dc update khi trong từ ko có ví
> dụ naò, nếu có 1 câu thôi cũng ko dc update ví dụ. show thêm phần ví dụ
> trong card edit để người dùng có thể chỉnh sửa

Decisions:
- Source = Oxford Learner's Dictionaries (already fetched for audio — same
  page carries examples; ozdic has no API and its Examples tab is
  Wiktionary-sourced). Fallback: dictionaryapi.dev examples.
- Vietnamese via MyMemory (translateEnToVi), per user's explicit ask.
- Hard rule: auto-fill fires ONLY on 0-example cards; a card with even one
  example is user-controlled and never touched.
- Card edit modal gains an en+vi examples editor.
