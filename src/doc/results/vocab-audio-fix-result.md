# Vocab audio fix — prefer real recordings over speechSynthesis (result)

Date: 2026-05-17

## Scope

Vocabulary speaker buttons now play the dictionary-recorded `audio_url` (real human voice) before falling back to `speechSynthesis`. Multi-word headwords (phrasal verbs, collocations) bypass the recording — the dictionary's `audio_url` for a phrase is typically just the first token's mp3, which sounds wrong. Sentence/example/article TTS paths are untouched.

## Files changed

- `src/lib/tts.ts` — added `speakWord(word, opts)`, `SpeakWordOptions` interface, and private helpers `isSingleWord`, `normalizeAudioUrl`, `playAudioUrl`. The fallback delegates to the existing `speak()` so voice preference + lang + rate keep flowing through. Recorded-audio `playbackRate` is clamped to 0.5–1.5 because re-pitched mp3s degrade worse than synthesized voices at the extremes.
- `src/components/AudioButton.tsx` — replaced the inline `new Audio()` → onerror → TTS dance with a single `speakWord()` call. The 'vi-VN' branch still goes through `speak()` directly (no Vietnamese recordings to prefer). `audioUrl` prop is now passed straight through.
- `src/components/PronounceSession.tsx` — the local `speak()` inside `HelpPanel` was raw `speechSynthesis` only; now uses `speakWord(card.english, { audioUrl: card.audio_url, ... })` so the pronounce-practice help modal plays the real recording.
- `src/components/passage/KaraokeReader.tsx` — `speakLemma()` in the dictionary-popover replaced with `speakWord(definition.word, ...)` so single-word lookups from a passage benefit from the same guard. (The full-passage karaoke playback path uses `synth.speak(u)` for sentence-level reading and is left alone — sentence audio is genuinely TTS-only.)

## Key decisions

1. **Multi-word guard via whitespace check.** `isSingleWord(word)` returns `false` for anything containing internal whitespace. This is what makes the fix safe for `"come in"`, `"give up"`, `"look forward to"` — they skip `audio_url` entirely and let `speechSynthesis` say the whole phrase. Hyphenated words (`"well-known"`) have no whitespace and stay on the audio_url path.
2. **`speakWord` extends `TtsOptions` rather than narrowing.** The prompt suggested `{ audioUrl, rate }` only, but the existing `speak()` already accepts `voice_preference` + `lang` + `rate`. Dropping them in the fallback would regress accent picking, so `SpeakWordOptions extends TtsOptions` and the fallback forwards all three.
3. **Rate clamp 0.5–1.5 on recorded audio only.** Synthesized voices handle wider ranges fine; mp3s re-pitched outside that window sound bad. The clamp is in `playAudioUrl` so it doesn't affect the `speak()` fallback.
4. **AudioButton's `lang` branch.** When `lang === 'vi-VN'`, skip `speakWord` and go straight to `speak()`. Vietnamese cards don't have dictionary recordings to prefer, and the guard would just add overhead.
5. **Left `FlashcardSession.tsx` alone.** It already prefers `audio_url` over TTS, and the autoplay loop has its own timing/cancellation contract (count tracking, ref cleanup, voice cancellation on unmount). Re-routing it through `speakWord` would risk breaking that loop without changing behavior for users.
6. **`normalizeAudioUrl` handles protocol-relative URLs.** Free Dictionary occasionally returns `//ssl.gstatic.com/...`; prepend `https:` so `new Audio()` doesn't choke.

## Deviations from prompt

- Added `voice_preference` + `lang` to `SpeakWordOptions` (prompt mentioned matching `speak()`'s signature; the prompt's snippet only had `{ audioUrl, rate }`).
- Did not touch `RevealStage.tsx`, `WordCard.tsx`, `CardDetailModal.tsx`, `WordRow.tsx`, `SpeedQuizSession.tsx`, `ClozeSession.tsx`, `single-import.tsx`, `dictionary/page.tsx`, `settings/page.tsx` — they all delegate vocab playback to `<AudioButton>`, so the upgrade flows through transparently.
- Did not implement preload, US/UK accent toggle, or `audio_url_alt` switching (explicitly out of scope).

## Verification

- TypeScript: did not run `npm run build` or `tsc` (CLAUDE.md §10.11). Types should be clean — `speakWord` is `async` returning `Promise<void>` and callers use `void speakWord(...)` to fire-and-forget, matching the existing `speak()` ergonomics.
- Manual smoke test: not run. The user will need to refresh and verify in the browser:
  - Card with a recorded word (e.g. `preferential`) → speaker icon → real recording.
  - Card with a phrasal verb (e.g. `come in`) → speaker icon → `speechSynthesis` says the full phrase (not just `come`).
  - Card with no `audio_url` → speaker icon → `speechSynthesis` fallback speaks.
  - Network off + recorded card → `onerror` fires → fallback runs, no console error.
- Sentence/article karaoke (`KaraokeReader` line 167 area) unchanged → sentence reading should sound exactly as before.

## Follow-ups / known issues

- **Preload.** When a card mounts, `new Audio(audio_url)` (no `.play()`) would prime the cache so the first tap is instant. Easy to add to `RevealStage` / `CardDetailModal`. Suggested, not done.
- **Accent toggle.** `Flashcard.audio_url_alt` exists but is not exposed in the UI. A future US/UK switch on the speaker button could read `audio_url` vs `audio_url_alt`. Not in scope.
- **Speed-quiz prompt audio.** `SpeedQuizQuestion.prompt_audio` is also a URL. `SpeedQuizSession` renders `<AudioButton audioUrl={current.prompt_audio} ... />` so it picks up the upgrade automatically — but the multi-word guard would refuse to play a phrase prompt if `prompt_audio` was for a single token. Worth re-checking once a speed-quiz with multi-word prompts ships.
- **Older cards without `audio_url`.** If users have cards from before the migrate-ai-leaks lookup persistence work, they'll all fall back to `speechSynthesis`. A one-off backfill script could re-run `lookupWord()` on those — not in scope.

## Files (paths)

- prompt: `src/doc/prompts/vocab-audio-fix.md`
- result: this file
- code: `src/lib/tts.ts`, `src/components/AudioButton.tsx`, `src/components/PronounceSession.tsx`, `src/components/passage/KaraokeReader.tsx`
