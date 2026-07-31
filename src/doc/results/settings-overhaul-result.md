# Result: settings-overhaul

> Date: 2026-07-31 · Prompt: `src/doc/prompts/settings-overhaul.md`

## Scope

Full audit + overhaul of the settings system: removed dead settings, wired
two stored-but-ignored settings into real behavior, added 6 new settings
(including the requested reveal read-count and gap-between-reads), and fixed
three latent bugs found during the audit.

## Files changed

**Schema / API layer**
- `src/lib/types.ts` — `FlashcardSettings`: removed `daily_goal_new`,
  `daily_new_word_target`, `reminder_time`, `reminder_enabled`; added 6 M6
  fields. Removed `daily_new_word_target` from `M3_SETTINGS`; added
  `M6_SETTINGS` ranges const.
- `src/lib/db.ts` — `SETTINGS_KEYS` pruned + 6 new keys; `getFlashcardSettings`
  rewritten around a `numOr()` helper (fixes stored-`0` swallowed by
  `Number(x) || default`); `mastered_hide_from_review` absent-key fallback
  aligned to `true` (matches seeders); `updateFlashcardSettings` upserts
  updated accordingly.
- `src/app/api/settings/route.ts` — removed 4 dead validators; added 6 new
  (ranges from `M6_SETTINGS`; `speed_read_count` legally accepts 0);
  `daily_goal_review` clamp tightened 0–500 → 10–200 since it now drives the
  real queue.
- `src/app/api/auth/callback/google/route.ts`, `src/lib/demo/seed-user.ts` —
  seeders no longer insert `daily_goal_new` / `reminder_*` rows.

**New settings — definitions**

| Key | Default | Range | Consumed by |
|---|---|---|---|
| `reveal_read_count` | 6 | 1–10 | FlashcardSession reveal autoplay (both /study and /review) |
| `reveal_read_gap_ms` | 1000 | 300–3000 | pause between those plays |
| `word_tts_rate` | 0.95 | 0.5–1.5 | FlashcardSession autoplay (mp3 + TTS), SpeedQuizSession, AudioButton, PronounceSession help panel |
| `speed_read_count` | 3 | 0–6 (0 = off) | SpeedQuizSession prompt auto-read |
| `chunk_pause_ms` | 550 | 200–2000 | chunk-practice auto-read pause (`/read/[id]`, `/read-once`, template karaoke) |
| `default_session_size` | 10 | 5–30 | QuizSetup pre-selected count chip (speed/cloze/pronounce/sentence) |

**UI**
- `src/app/settings/page.tsx` — reminder card removed; `mastered_hide_from_review`
  moved into "Mục tiêu hàng ngày"; M3 target slider removed; new controls added
  to Luyện tập / Học theo bài đọc / Âm thanh; `word_tts_rate` mirrored into
  localStorage on load + save (same pattern as voice/theme).
- `src/components/settings-controls/TtsRateControl.tsx` — generalized with
  optional `label/hint/min/max/step/previewText` props (passage defaults
  preserved); preview now also uses the stored voice preference; two-decimal
  display for fine steps.

**Consumers**
- `src/components/flashcard-session/types.ts` — dropped `AUDIO_AUTOPLAY_COUNT`
  / `AUDIO_PAUSE_MS`; added `SessionAudioSettings`.
- `SessionFlow.tsx` / `FlashcardSession.tsx` — new required `audio` prop.
  Autoplay effect now: gated by `autoplay_audio` (was unconditional — the
  toggle finally works), repeats `reveal_read_count` times with
  `reveal_read_gap_ms` pause, applies `word_tts_rate` to the Oxford mp3
  (clamped 0.5–1.5) and the TTS fallback. The inline speechSynthesis fallback
  was replaced by the shared `speak()` helper — it now also honors
  `voice_preference` (it previously didn't).
- `RevealStage.tsx` — `autoplayTotal` prop; dots hidden when autoplay is off.
- `src/app/study/page.tsx`, `src/app/review/page.tsx` — pass the `audio`
  prop; **/review queue cap now uses `daily_goal_review`** (was hardcoded 50).
- `src/components/SpeedQuizSession.tsx` + `src/app/speed/page.tsx` —
  `readTimes` / `ttsRate` props from settings; 0 reads = silent.
- `src/components/AudioButton.tsx`, `src/components/PronounceSession.tsx` —
  hardcoded `rate: 0.95` → `getStoredWordTtsRate()`.
- `src/components/QuizSetup.tsx` — fetches settings on mount and snaps
  `default_session_size` to the nearest count chip (tie → smaller); a chip the
  user already clicked is never overridden.
- `src/lib/reading/use-chunk-practice.ts` → `ReadAlong.tsx` →
  `read/[id]`, `read-once`, `TemplateDetailClient`/`TemplateKaraoke` +
  `templates/[id]` — `chunk_pause_ms` threaded through as `pauseMs`/`chunkPauseMs`.
- `src/lib/tts.ts` — `TtsOptions.onDone` callback (fires on end/error, also
  when speechSynthesis is unavailable, so chains never stall);
  `DEFAULT_WORD_TTS_RATE` + `getStoredWordTtsRate`/`setStoredWordTtsRate`
  localStorage mirror.
- `src/components/ComposePoolPicker.tsx` — bug fix: today-pool fetch now uses
  the resolved `f3_max_words_per_composition` as `limit` (was hardcoded 30,
  silently capping settings > 30).

## Key decisions

- **No migration needed** — `user_settings` is an EAV table; new keys
  materialize on first PUT, removed keys become orphaned rows that the
  whitelist query simply no longer selects (harmless).
- Learn-audio settings reach `FlashcardSession` via **server props** (both
  pages already load settings server-side) — no extra client fetch, no flash.
- `word_tts_rate` is mirrored to localStorage like `voice_preference` so
  non-React call sites (AudioButton) read it synchronously.
- One `default_session_size` key for all four pickers, snapped per-picker to
  its chip options, instead of four per-mode keys.
- `speak()`'s new `onDone` fires per-utterance in `speak` only; `speakTimes`
  intentionally ignores it (its callers use the returned cancel function).

## Deviations from prompt

- The user asked for "số lần đọc khi học" and "khoảng cách giữa các lần đọc";
  scope was extended in-chat (user-confirmed) to also remove dead settings,
  wire `autoplay_audio` + `daily_goal_review`, and add 4 more settings.
- Behavior note: the speed quiz's pre-selected question count drops from 20
  to 10 (snap of the new default) until the user tunes `default_session_size`.

## Verification

- `npx tsc --noEmit` — clean.
- NOT tested (no dev server run, per CLAUDE.md §10.11): every flow end-to-end.
  Manual smoke list: settings page save/reload for each new control; reveal
  autoplay count/gap/rate + dots + toggle-off silence on /study and /review;
  /review queue caps at `daily_goal_review`; speed quiz read count (incl. 0)
  and default chip snapping (also cloze/pronounce/sentence); AudioButton +
  pronounce help rate after saving; chunk-practice pause on /read/[id],
  /read-once, template karaoke; compose pool honors f3 > 30; theme/voice
  regressions.
- ⚠️ `word_tts_rate` localStorage mirror only refreshes when /settings is
  opened or saved — same accepted limitation as the existing voice mirror
  (a device that never opens /settings uses the 0.95 default for AudioButton /
  pronounce; flashcard + speed quiz get the true DB value via props/fetch).

## Follow-ups / known issues

- Mobile `MSettings.tsx` is still a static mockup (out of scope, user-confirmed)
  — mobile users cannot change settings; it also shows rows for settings that
  don't exist. Worth a dedicated pass.
- `pomodoro_work_minutes` / `pomodoro_break_minutes` are consumed (clock pill)
  but still have no settings-page control.
- `voice_preference` is still ignored by read-along sentence playback
  (`use-karaoke.ts`), chunk-practice browser fallback, `MemorizeTrainer`, and
  `PassageStep3Reader` — those build raw utterances.
- SRS tuning constants (mastery gate, lapse ratio, ease deltas in
  `src/lib/flashcards/srs.ts`) are candidates for a future "advanced" card.
- Orphaned EAV rows for removed keys remain in existing DBs (harmless; could
  be cleaned by a future migration if desired).
