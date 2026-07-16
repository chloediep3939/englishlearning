# Multi-word pronunciation (Edge TTS) + per-row fetch button

Shipped 2026-07-14. Fixes: multi-word cards (collocations / phrasal verbs —
most of the PTE collocation deck) always failed Oxford audio/IPA because
`fetchAndStoreOxfordAudio` looked up the whole phrase as one Oxford headword.
First attempt byte-concatenated per-word Oxford clips — user verdict: sounds
"rời rạc" (disjointed). Current design synthesizes the whole phrase as ONE
fluent utterance via Edge TTS.

## How it works

`src/lib/oxford/persist.ts` (`resolvePronunciation`):

- **Single word** → unchanged: one Oxford fetch, real human recording (with
  `lemmaCandidates` fallback, matching `/api/words/lookup`; note the
  lemmatizer is currently stubbed to a no-op in `src/lib/reading/lemma.ts`).
- **2–4 words** →
  - **IPA**: split on whitespace, scrape each token's US IPA sequentially,
    strip `/`, join with spaces, re-wrap → `/ˈməʊbaɪl ˈkɒmɜːs/` (same
    convention as the CMU multi-word joiner in
    `src/lib/flashcards/cmu-ipa.ts`). All-or-nothing — any token missing IPA
    → card IPA left unchanged.
  - **Audio**: `synthesizeEdgeTts(phrase)` (`src/lib/edge-tts/synthesize.ts`)
    — one natural neural-voice mp3 of the whole phrase, stored at the
    existing R2 key `audio/cards/<id>.mp3` → `/api/audio/[cardId]` and
    `AudioButton` need zero changes. Fallback chain when Edge TTS returns
    null: per-word Oxford mp3 byte-concat (all-or-nothing) → status
    `'failed'` (AudioButton speaks the phrase via browser TTS).
- **>4 words** → skipped (treated as failed); those are sentences, not
  collocations.

## Edge TTS module (`src/lib/edge-tts/synthesize.ts`)

Unofficial Microsoft Edge Read-Aloud WebSocket API (same protocol as the
`edge-tts` reference implementation). Free, no key. Server-only; transport is
the Workers fetch-upgrade WebSocket (`resp.webSocket`) so the handshake can
carry the Origin/UA headers the endpoint expects. Under plain `next dev`
(Node) there is no `resp.webSocket` → returns null (dev has no R2 binding to
store the result anyway — test via `npm run preview` / deploy).

- DRM: `Sec-MS-GEC` = SHA-256(Windows-file-time ticks rounded to 5 min +
  trusted client token), hex-upper; plus `Sec-MS-GEC-Version`. **Microsoft
  can rotate this at any time** → synthesis returns null → automatic fallback
  chain; the feature degrades, never breaks. All rotate-able constants sit at
  the top of the module.
- Output: `audio-24khz-48kbitrate-mono-mp3`; binary frames are
  `uint16-BE header length + ASCII headers + payload`, audio payloads
  collected until `Path:turn.end`. 10s hard timeout.
- Default voice `en-US-AriaNeural` (override via `opts.voice`).
- Failures log `console.warn('[edge-tts] …')` — visible in `wrangler tail`.

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

- `src/lib/edge-tts/synthesize.ts` — Edge TTS protocol client
- `src/lib/oxford/persist.ts` — split/fetch/combine core, Edge TTS first
- `src/components/deck-detail/WordRow.tsx` — fetch button
- `src/components/DeckDetailClient.tsx` — `onCardUpdated` wiring

## Gotchas

- Edge TTS is an UNOFFICIAL API — expect it to break someday; the fallback
  chain (concat → browser TTS) keeps the button functional. Patch the
  constants at the top of `synthesize.ts` when it does.
- MP3 byte-concatenation (fallback only) is not spec-pure; if a combined clip
  fails to decode, AudioButton's layered TTS fallback covers it.
- `refresh-audio` overwrites card IPA with the Oxford US value (existing
  intended behavior, now the joined phrase IPA).
- A phrase costs N Oxford page + N mp3 fetches (for IPA + concat fallback)
  plus one Edge TTS call; deck-level bulk refresh runs 5 cards in parallel.
