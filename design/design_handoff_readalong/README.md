# Handoff: Karaoke Read-Along (TTS reader)

## Overview

An interactive **read-along / karaoke reader** for the Bún English-learning app. The user reads a passage while the app reads it aloud (Web Speech API), highlighting each word as it's spoken. It is a real, working prototype — not a static mock.

Core capabilities:
1. **Karaoke highlight** — the current word is highlighted as TTS speaks; the active sentence is tinted.
2. **Speed control** — Chậm 0.7× / Vừa 0.85× / Thường 1.0× / Nhanh 1.3×. Changing speed mid-read restarts the current sentence at the new rate.
3. **Tap a word** — speaks that single word alone (pauses the flowing read) and opens a word-detail card.
4. **Sentence-by-sentence vs. continuous** — an "auto-continue" toggle; transport controls for prev / play-pause / next / restart.
5. **Parallel translation** — toggle to show a Vietnamese line beneath every sentence.
6. **Word-detail card** — meaning (VN) + IPA + part-of-speech + "listen again" + **Save to deck**.
7. **Saved-words tray** — counts and lists words picked while reading, with an "Ôn ngay" (review now) CTA.

Two surfaces, **one shared engine**:
- `<ReadAlongDesktop/>` — 1280px, app frame (top nav + sidebar), two columns (reading | control rail).
- `<ReadAlong/>` — 402px mobile, single column with bottom tab bar.

## About the design files

The files in `source/` are a **design reference built in HTML + inline-JSX (React via Babel CDN)** — a working prototype that demonstrates intended look + behavior, **not production code to ship as-is**. Recreate this in the target codebase's real stack (React/Next + your component lib, React Native, etc.) using its established patterns. All styling here is inline `style={}`; port to your styling system.

The TTS, tokenization, highlight, and save logic ARE the real intended behavior — copy the *logic*, restyle the *markup*.

## Fidelity

**High-fidelity.** Colors, type, spacing, radii, shadows, and timings are intentional. The interaction model (engine hook) is the spec.

## Entry point

Open `source/index.html`. In the design canvas:
- Section **"★ V2 · Pick & Mix"** → artboard **"Đọc theo · Karaoke TTS"** → `<ReadAlongDesktop/>`.
- Section **"★ Web app · Mobile"** → artboard **"11 · Đọc theo · Karaoke TTS"** → `<ReadAlong/>`.

All read-along code lives in **`source/read-along.jsx`**. The other files are dependencies (tokens, icons, shells) — see Files.

## The engine — `useKaraoke()` (the important part)

A single hook holds all state + behavior. Both surfaces call it and render their own chrome. Reimplement this as a hook / view-model / controller in your stack.

### Data
- `RA_TEXT: string[][]` — paragraphs → sentences (English).
- `RA_VN: string[][]` — same shape, Vietnamese translations (parallel by `[pIdx][sIdx]`).
- `RA_GLOSS: { [cleanWord]: { vi, pos, ipa } }` — mini glossary. Key = `RA_clean(word)` = `word.toLowerCase().replace(/[^a-z']/g, '')`. ~38 entries in the demo; in production this comes from your dictionary/AI service.
- `RA_SPEEDS` — `[{label:'Chậm',rate:0.7}, {label:'Vừa',0.85}, {label:'Thường',1.0}, {label:'Nhanh',1.3}]`.

### Tokenization
`RA_tokenize(sentence)` → array of `{ text, start, end, isWord }` chunks (words AND whitespace, with char offsets). Offsets are essential: the TTS boundary event reports a `charIndex` into the sentence string, which is mapped back to a token to know which word to highlight. Sentences are flattened into a single list `sentences[]`, each `{ pIdx, sIdx, text, tokens }`.

### State exposed by the hook
| State | Type | Meaning |
|---|---|---|
| `playing` | bool | TTS currently speaking a sentence flow |
| `curSent` | int | index into flat `sentences` (-1 = none) |
| `curTok` | int | index of highlighted token within current sentence |
| `rate` | number | speech rate |
| `auto` | bool | auto-continue to next sentence on sentence end |
| `showVN` | bool | parallel translation visible |
| `sel` | obj/null | selected word `{ sentIdx, tokIdx, raw, clean, gloss }` |
| `saved` | array | saved words `[{ clean, raw, vi }]` (deduped by `clean`) |
| `deck` | string | target deck name (demo: "PTE Academic") |
| `wordPop` | obj | last single-word readout (legacy field, mobile chip) |
| `supported` | bool | `'speechSynthesis' in window` |

### Actions
- `togglePlay()` — if playing, `speechSynthesis.cancel()` + pause; else `speakSentence(curSent>=0?curSent:0)`.
- `speakSentence(idx)` — the core. Cancels, builds a `SpeechSynthesisUtterance(sentence.text)` with `lang='en-US'`, `rate`. Sets `onboundary` to map `charIndex`→token and set `curTok`; sets `onend` to either chain to `idx+1` (if `auto`) or stop. Uses refs (`rateRef`, `autoRef`, `singleRef`) so the long-lived utterance callbacks read fresh values.
- `prevS()` / `nextS()` — jump a sentence.
- `restart()` — from sentence 0.
- `speakWord(sentIdx, tokIdx)` — speak one token via `sayText`, set `sel` (with gloss lookup), pause flow. `singleRef` guards the shared `onend` so a single word read doesn't trigger auto-advance.
- `sayText(text)` — fire-and-forget single utterance (used by "listen again").
- `pickRate(r)` — set rate; if currently playing, re-`speakSentence(curSent)` so the new rate takes effect immediately.
- `setShowVN`, `setAuto`, `addWord(entry)` (dedupes by `clean`), `isSaved(clean)`.

### Critical implementation notes (Web Speech API gotchas)
- **Boundary→word mapping**: `onboundary` fires with `e.charIndex` (and sometimes `e.name`). Filter `if (e.name && e.name !== 'word') return;` (Safari may not set `name`). Find the token where `charIndex >= t.start && charIndex < t.end && t.isWord`.
- **Stale closures**: utterance callbacks outlive renders. Keep `rate`, `auto`, and the single-word guard in **refs**, not state, or the callbacks read stale values.
- **Rate changes don't apply mid-utterance** — you must cancel + re-speak. We restart the current sentence.
- **Pausing**: this prototype uses `cancel()` (loses intra-sentence position, resumes at sentence start) rather than `pause()`/`resume()` (flaky across browsers). Decide per your QA. If you use `pause()/resume()`, track `synth.paused`.
- **Voices load async**: `speechSynthesisgetVoices()` may be empty on first call; listen for `voiceschanged` if you want to pick a specific en-US voice. The demo relies on the default `lang='en-US'`.
- **Autoplay gating**: TTS only starts after a user gesture — fine here since play is a button. Don't auto-speak on mount.
- **Cleanup**: `speechSynthesis.cancel()` on unmount (the demo does this in a `useEffect` return).
- **`prefers-reduced-motion`**: the demo does NOT honor it — please add (mascot bob, transitions).

## Shared render helpers (in read-along.jsx)

- `RAWord` — one token span. States: hot (currently spoken → solid blue bg, white text), picked (`sel` → light blue bg), known (in glossary → dotted blue underline `2px dotted`), plain. Click → `onWord(gi, ti)`.
- `RAParagraphs({ k, onWord, vnMode, vnSize, gap })` — renders the passage. `vnMode=false` → sentences flow inline within `<p>` (active sentence tinted). `vnMode=true` → each sentence is a block with a left accent border + the VN line beneath (`RA_VN[pIdx][sIdx]`).
- `RAWordCard({ k })` — the word-detail card. No selection → mascot + prompt. With `sel` → word, POS badge, IPA, VN meaning, a "listen again" speaker button, and a **Save** button that flips to "✓ Đã lưu vào {deck}" once saved (calls `addWord`, disabled when `isSaved`).
- `RA_PlayIcon` — play▶ / pause❚❚ glyph.

## Design tokens

Pulls the **V** token system (`source/direction-v2.jsx`, objects `V` + `V_C`) plus a blue accent defined in `source/landing-bun-anim.jsx`:

| Token | Value | Use |
|---|---|---|
| `BUN_BLUE` | `#3aa9e6` | primary — play button, highlight, active toggles, dotted underline |
| `BUN_BLUE_SOFT` | `#e3f2fb` | soft tint |
| `V.ink` | `#1a2410` | text |
| `V.inkSoft` | `#5a5247` | secondary text |
| `V.muted` | `#9e978c` | captions, eyebrows |
| `V.panel` | `#fafaf6` | inset card / track bg |
| `V.border` | `rgba(40,30,15,0.13)` | borders |
| `V.primary` | `#7ac143` | "saved" confirmation (green) |
| `V_C.purple` | `#c179d6` | POS badge |
| `V_C.teal` | `#6ec1a8` | parallel-translation toggle |
| `V_C.pink` | `#f06292` | saved tray |
| `V_C.orange` | `#ff9a3c` | CEFR badge |

**Type**: headings/UI = Nunito (`V.headFont`, weights 800–1000); reading passage = `"Lora", serif` (400, large — 27px desktop / 17px mobile, line-height ~1.8); IPA/progress = JetBrains Mono (`V.monoFont`).

**Shadows** (chunky): hard offset + soft ambient, e.g. button `0 4px 0 rgba(20,40,80,.2), 0 8px 18px #3aa9e655`.

**Radii**: cards 14–22, buttons 12–16, pills 999.

## Layout

### Desktop (`<ReadAlongDesktop/>`, 1280)
Inside the app frame (`<V_Frame>` top nav + `<V_Sidebar active="review">`):
- Header: eyebrow + title "Mai's coffee shop" + "86 từ · ~40s" pill + "CEFR B1" badge.
- Grid `1fr 340px`:
  - **Left** — reading card (white, serif 27px). Renders `RAParagraphs` (vnMode follows `showVN`). Footer hint about dotted words.
  - **Right rail** (sticky) — `RAWordCard` · "Dịch song song" toggle (teal) · "Tốc độ đọc" 2×2 speed grid · auto-continue toggle · transport block (prev / big "Đọc to" / next + "Đọc lại từ đầu" + progress "Câu n/N") · saved-words tray.

### Mobile (`<ReadAlong/>`, 402)
Inside `<MAppShell active="review">` (status bar + scroll + bottom tab bar):
- Header row (back · "Đọc theo · Karaoke" / "Mai's coffee shop" · B1 badge)
- unsupported-browser warning (if `!supported`)
- reading card (serif 17px, vnMode follows `showVN`)
- `RAWordCard`
- "Dịch song song" toggle
- "Tốc độ đọc" — 4 chips in a row
- auto-continue toggle
- transport row (prev / play / next / restart)
- progress bar
- saved-words tray

## Interactions

| Trigger | Effect |
|---|---|
| Tap ▶ Đọc to | speak from current (or first) sentence; word highlight tracks TTS boundary |
| Tap ❚❚ (while playing) | cancel/pause |
| Tap a word | speak just that word; open word card; pause flow |
| 🔊 in word card | re-speak the selected word |
| ＋ Lưu vào bộ từ | add to `saved` (dedup); button → "✓ Đã lưu"; tray count +1 + chip |
| Speed chip | set rate; if playing, restart current sentence at new rate |
| "Dịch song song" | toggle VN line under each sentence |
| Auto-continue toggle | sentence-end → next (on) or stop (off) |
| ⏮ / ⏭ | previous / next sentence |
| ↻ | restart from sentence 0 |
| sentence end (auto on) | chain to next sentence |

## State management (for production)
- Local UI state ≈ the hook above.
- **Glossary / IPA / translations**: in production these should come from your dictionary + translation services (or AI), not a static `RA_GLOSS`/`RA_VN`. Keep the same shapes: word→{vi,pos,ipa} and sentence→VN.
- **Save to deck**: `addWord` should POST to the deck/SRS backend (the demo only holds it in memory). Wire `deck` to a real deck picker (currently a fixed string).
- **Passage source**: demo hard-codes one passage. Production: accept pasted text / article import, sentence-segment server-side, pre-fetch glosses for content words.

## Files
- **`source/read-along.jsx`** — everything: `RA_TEXT`, `RA_VN`, `RA_GLOSS`, `RA_tokenize`, `RA_SPEEDS`, `useKaraoke`, `RAWord`, `RAParagraphs`, `RAWordCard`, `RA_PlayIcon`, `ReadAlong` (mobile), `ReadAlongDesktop`.
- `source/shared.jsx` — `Icon` (inline SVG set), `MASCOT` image map, sample data. Port `Icon` or map names to your icon lib (Lucide names mostly match: play, speaker→Volume2, refresh→RefreshCw, plus, check, folder, library, sparkle→Sparkles, book, arrowLeft).
- `source/direction-v2.jsx` — defines `V` + `V_C` tokens (lift these objects; ignore the rest).
- `source/landing-bun-anim.jsx` — defines `BUN_BLUE`, `BUN_BLUE_SOFT`, the `bun-*` keyframes, and hover CSS classes (`.bun-cta-btn` lift-on-hover). Only the blue consts + button hover are needed here.
- `source/app-mobile.jsx` — `MAppShell` / `MStatusBar` / `MTabBar` (the mobile shell the mobile reader sits in).
- `source/landing-bun-parts1.jsx` — incidental (provides `BunLogo`/`Sparkles` used elsewhere); not required by the reader itself but imported in the page.
- `source/assets/mascot/ngoc-happy.png` — the mascot shown in the word card / mobile.
- `source/index.html` — entry; loads React 18 + Babel from CDN and the JSX files.

## Notes
- **Don't ship the design-canvas wrapper** (`DesignCanvas`/`app.jsx` aren't included) — mount `<ReadAlongDesktop/>` or `<ReadAlong/>` directly in your route.
- The reading passage must stay selectable/clickable per word — keep word-level spans, don't flatten to a single text node.
- Mascot images: `aria-hidden`, empty `alt`.
- Keep the en-US TTS but allow a voice picker later (UK/US/AU).
- Accessibility: add `prefers-reduced-motion`, focus states on word spans + transport, and an `aria-live` region announcing the current sentence for screen-reader users (TTS + SR can conflict — consider a "reduce" path).
