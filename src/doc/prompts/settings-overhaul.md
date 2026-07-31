# Prompt: settings-overhaul

> Date: 2026-07-31
> Saved per CLAUDE.md §8 (implementation spans ≥3 files).

## User prompt (verbatim)

review lại phần setting của Bún, review lại cái nào cần, cái nào ko, đã thật sự hoạt động chưa, cần thêm setting cho số lần đọc khi học, khoảng cách giữ các lần đọc, coi lại hết xem chỗ nào cần đem ra setting nữa

## Decisions confirmed in-chat

1. Remove all dead settings entirely (`daily_goal_new`, `daily_new_word_target`, `reminder_enabled`, `reminder_time`); wire `autoplay_audio` so it actually gates flashcard reveal autoplay.
2. Wire `daily_goal_review` into the real `/review` queue (was hardcoded 50).
3. Add all proposed new settings: speed-quiz read count, global word-TTS rate, chunk-practice pause, default session size — plus the two requested (reveal read count, gap between reads).
4. Mobile `MSettings.tsx` static mockup: out of scope for this pass.
