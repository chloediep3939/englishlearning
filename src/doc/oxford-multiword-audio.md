# Multi-word pronunciation (browser TTS) + per-row fetch button

Shipped 2026-07-14, final direction settled 2026-07-16. Multi-word cards
(collocations / phrasal verbs — most of the PTE collocation deck) have no
Oxford headword page. Three approaches were tried in order:

1. Byte-concatenated per-word Oxford clips — user: "rời rạc" (disjointed).
2. Edge TTS (unofficial Edge Read-Aloud WS API) synthesizing the phrase as
   one utterance — worked (after bumping `Sec-MS-GEC-Version` to Edge 143;
   stale versions get 403), but the user prefers the browser voice.
3. **Final: browser TTS.** `AudioButton` speaks any whitespace-containing
   entry via `speechSynthesis` (`speak()` from `@/lib/tts`, honoring the
   user's `voice_preference` setting) and ignores stored card audio for
   phrases. The working Edge TTS client was removed; it lives in git history
   at commit `b2abfad` (`src/lib/edge-tts/synthesize.ts`) if ever wanted.

## How it works

`src/components/AudioButton.tsx`: `isPhrase = /\s/.test(fallbackText)` →
phrase playback is always `speakTTS()`; the `audio_us_status='failed'`
warning badge is suppressed for phrases (TTS is intended, not a failure).

`src/lib/oxford/persist.ts` (`resolvePronunciation`):

- **Single word** → unchanged: one Oxford fetch, real human recording stored
  in R2 (with `lemmaCandidates` fallback, matching `/api/words/lookup`; note
  the lemmatizer is currently stubbed to a no-op in
  `src/lib/reading/lemma.ts`).
- **2–4 words** →
  - **IPA**: split on whitespace, scrape each token's US IPA sequentially,
    strip `/`, join with spaces, re-wrap → `/ˈməʊbaɪl ˈkɒmɜːs/` (same
    convention as the CMU multi-word joiner in
    `src/lib/flashcards/cmu-ipa.ts`). All-or-nothing — any token missing IPA
    → card IPA left unchanged.
  - **Audio**: none by design. Clears `audio_us_key`/`audio_us_status`
    (removes stale glued clips + the warning badge) and reports `ok: true`
    so deck-wide refresh doesn't count every collocation as an error.
    Orphaned `audio/cards/<id>.mp3` R2 objects from the concat era are
    harmless and simply unused.
- **>4 words** → same phrase handling, no Oxford fetches (sentences, not
  collocations).

## Per-row fetch button

`src/components/deck-detail/WordRow.tsx`: a small circular Download button
next to the speaker, shown only when `!card.ipa || audio_us_status !== 'ok'`
AND the parent passed `onCardUpdated`. Click → `POST
/api/cards/[id]/refresh-audio` → `onCardUpdated(data.card)` swaps the row's
card (IPA column + audio button light up). Failure → red tint + retry title.
Wired in `src/components/DeckDetailClient.tsx` via the existing
`handleCardUpdated`.

All existing callers benefit automatically (same persist helper):
card creation (`/api/cards`, `/api/cards/generate`), the deck-level
`RefreshAudioButton`, and the modal's "Gen lại" audio chip.

## Files

- `src/components/AudioButton.tsx` — phrase → always browser TTS, no badge
- `src/lib/oxford/persist.ts` — phrases: IPA only, audio state cleared
- `src/components/deck-detail/WordRow.tsx` — fetch button (phrases: IPA-only
  criterion)
- `src/components/DeckDetailClient.tsx` — `onCardUpdated` wiring
- `src/app/decks/page.tsx` — all-decks "Cập nhật phát âm" button (slim
  id+english card list)

## Gotchas

- Phrase voice differs per device/browser (it's the local speechSynthesis
  voice from Settings → `voice_preference`) — accepted trade-off.
- `refresh-audio` overwrites card IPA with the Oxford US value (existing
  intended behavior, now the joined phrase IPA).
- A phrase costs N Oxford page fetches for IPA; deck-level bulk refresh runs
  5 cards in parallel.
- If a recorded phrase voice is ever wanted again: Edge TTS client at commit
  `b2abfad` (constants must track a current Edge version or MS returns 403).
