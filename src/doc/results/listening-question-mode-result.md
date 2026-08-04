# Result: listening-question-mode

Date: 2026-08-03

## Scope

Adds a listening question variant to the unified study session (`/study`):
review cards (SRS status ≠ `new`) can be prompted as **audio→type** — the
word's pronunciation auto-plays, everything that gives the word away (image,
Vietnamese meaning, note) is hidden, and the user types what they heard. The
prompt kind is rolled per card appearance with a user-configurable ratio, plus
an on/off toggle in Settings.

## Files changed

- `src/lib/types.ts` — `FlashcardSettings` gains `listening_enabled: boolean`
  and `listening_ratio: number`; new `LISTENING_SETTINGS` const
  (`ratio: default 50, min 10, max 90, step 10`).
- `src/lib/db.ts` — `SETTINGS_KEYS` + defaults in `getFlashcardSettings`
  (enabled=`true`, ratio=50) + upserts in `updateFlashcardSettings`. No
  migration needed — `user_settings` is a key-value table.
- `src/app/api/settings/route.ts` — PUT validation for the two new keys
  (boolean; number clamped to the `LISTENING_SETTINGS` range).
- `src/app/settings/page.tsx` — "Luyện tập" card gains a Toggle ("Câu hỏi
  dạng nghe (phiên Học)") and a Headphones `SliderWithIcon` ("Tỉ lệ câu
  nghe", %, disabled when the toggle is off).
- `src/components/flashcard-session/types.ts` — new
  `SessionListeningSettings { enabled, ratio }` interface.
- `src/components/flashcard-session/ListeningStage.tsx` — **new**. Speaker
  panel (auto-plays once ~400ms after the card appears; big replay button)
  + the same input/submit row as TypingStage. Playback via `speakWord()`
  (`@/lib/tts`): stored Oxford US mp3 when `audio_us_status === 'ok'`,
  browser TTS fallback (phrases always TTS).
- `src/components/flashcard-session/FlashcardSession.tsx` — new `listening`
  prop; `promptKind` state rolled in a `useLayoutEffect` on each TYPING
  entry; renders `ListeningStage` or `TypingStage` accordingly.
- `src/components/study/StudyClient.tsx` — threads the new `listening` prop.
- `src/app/study/page.tsx` — resolves the two settings server-side and
  passes them down.

## Key decisions

- **Eligibility:** `!recognition && listening.enabled && card.status !== 'new'`.
  New cards always get the VI→EN prompt (user-confirmed: you can't recognize
  a word by ear before ever learning it). Recognition-only decks ("Chỉ hiểu
  nghĩa") have no typing at all, so they never roll.
- **Roll timing:** per card *appearance* — a LẠI/KHÓ requeue may come back as
  the other kind. `useLayoutEffect` (not `useEffect`) so the stage swap lands
  before paint; a passive effect would flash the Vietnamese prompt for one
  frame and leak the hint.
- **`card.status` is the fetch-time value** held in the client queue — it
  does not mutate mid-session, so a card keeps its eligibility for the whole
  session. Acceptable: the SRS server state only matters at queue build time.
- **Autoplay ignores `autoplay_audio`** — that setting governs the *reveal*
  autoplay; in listening mode the audio IS the question, so it always plays
  once. Replay is unlimited via the speaker button.
- **The note (chú thích) is hidden in listening mode** even though the
  previous change added it to TypingStage — notes typically describe the
  word and would undermine pure listening.
- **Input row duplicated from TypingStage** (2nd consumer). Per CLAUDE.md
  §2.1 extraction to `common/` happens at the 3rd consumer.
- `Math.random()` used for the roll — documented per §6.8 (non-reproducible
  by design).

## Deviations from prompt

None beyond the clarified answers recorded in the prompt file.

## Verification

- `npx tsc --noEmit` clean.
- NOT tested end-to-end: did not run the dev server (repo rule — no
  auto-run of `npm run dev`). Untested by hand: the autoplay timing, mp3 →
  TTS fallback inside the session, slider/toggle persistence round-trip,
  and the one-frame-flash claim about `useLayoutEffect`.

## Follow-ups / known issues

- `speakWord()` returns no cancel handle for the mp3 path — skipping a card
  mid-play lets the tail of a <1s clip finish. Cosmetic.
- The `playing` bob animation on the speaker button only tracks the mp3
  path accurately; the TTS path resolves early (speakWord doesn't await TTS
  completion), so the bob is brief there.
- Mobile mock screens (`app-mobile/`) were not updated — they are static
  mockups.
