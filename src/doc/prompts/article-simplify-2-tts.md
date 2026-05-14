# article-simplify-2-tts (2026-05-14)

# Article reading — Part 2/3: TTS karaoke UI

## Prerequisite

Part 1 done. Article endpoint strips AI, returns plain `{ id, title, content, created_at }`.

## Goal

Article reader UI: render article text with per-word spans + "Đọc to" button using browser `speechSynthesis`. As TTS reads each word, highlight that word visually. Standard karaoke pattern.

## Doc workflow

- Save to `src/doc/prompts/article-simplify-2-tts.md`.
- Append "Part 2" to `src/doc/results/article-simplify-result.md`.

## Pre-reading

- Existing article reader page (grep `src/app/article/` or `src/app/reading/`)
- Existing TTS settings: `TtsRateControl`, `VoicePickerControl`, `getStoredVoicePreference()` in `@/lib/tts`
- Existing card-level TTS usage (per CLAUDE.md §2: `speak(text, opts)` from `@/lib/tts`) — read how it's wired for inspiration

## UI structure

The article page (`'use client'` component) has:

```
┌─────────────────────────────────────┐
│ Title                                │
│                                      │
│ [▶ Đọc to] [⏸ Tạm dừng]            │
│ [Tốc độ: 1x ▼] [Giọng: en-US Aria ▼]│
│                                      │
│ Article content with per-word spans  │
│ Word being read = highlighted        │
│                                      │
│ [Tìm hiểu grammar patterns →]       │  ← Part 3 handles this
└─────────────────────────────────────┘
```

## Implementation

### Word tokenization

Split article content into tokens. Keep punctuation attached to the preceding word (TTS boundary events report indices in original string — easier to match if we don't strip punctuation).

```ts
// Returns: [{ text: 'Hello', startIdx: 0, endIdx: 5 }, { text: ' world', startIdx: 5, endIdx: 11 }, ...]
function tokenizeWithIndex(text: string): { text: string; startIdx: number; endIdx: number }[] {
  const tokens: { text: string; startIdx: number; endIdx: number }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    tokens.push({ text: m[0], startIdx: m.index, endIdx: m.index + m[0].length });
  }
  return tokens;
}
```

Render each token as a `<span data-token-idx={i}>{text}</span>` with whitespace between (or use `display: inline` + space).

### TTS playback

```ts
'use client';

import { useEffect, useRef, useState } from 'react';

interface KaraokeReaderProps {
  content: string;
}

export function KaraokeReader({ content }: KaraokeReaderProps) {
  const tokens = useMemo(() => tokenizeWithIndex(content), [content]);
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1.0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  function play() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // clear any pending

    const u = new SpeechSynthesisUtterance(content);
    u.rate = rate;
    u.lang = 'en-US'; // hardcode or read from settings

    // Map TTS charIndex → token index
    u.onboundary = (e: SpeechSynthesisEvent) => {
      if (e.name !== 'word') return;
      const charIdx = e.charIndex;
      const tokenIdx = tokens.findIndex(
        (t) => charIdx >= t.startIdx && charIdx < t.endIdx
      );
      if (tokenIdx >= 0) setActiveIdx(tokenIdx);
    };

    u.onend = () => {
      setIsPlaying(false);
      setActiveIdx(-1);
    };

    utteranceRef.current = u;
    setIsPlaying(true);
    window.speechSynthesis.speak(u);
  }

  function pause() {
    window.speechSynthesis.pause();
    setIsPlaying(false);
  }

  function resume() {
    window.speechSynthesis.resume();
    setIsPlaying(true);
  }

  function stop() {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setActiveIdx(-1);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    };
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {!isPlaying ? (
          <button onClick={play}>▶ Đọc to</button>
        ) : (
          <button onClick={pause}>⏸ Tạm dừng</button>
        )}
        <button onClick={stop}>⏹ Dừng</button>
        <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
          <option value="0.75">0.75x</option>
          <option value="1">1x</option>
          <option value="1.25">1.25x</option>
          <option value="1.5">1.5x</option>
        </select>
      </div>

      <div style={{ lineHeight: 1.8, fontSize: 18 }}>
        {tokens.map((t, i) => (
          <span
            key={i}
            data-token-idx={i}
            style={{
              backgroundColor: i === activeIdx ? 'var(--v-primary)' : 'transparent',
              color: i === activeIdx ? 'white' : 'inherit',
              padding: '2px 1px',
              borderRadius: 3,
              transition: 'background-color 0.1s',
            }}
          >
            {t.text}
          </span>
        )).reduce<React.ReactNode[]>((acc, el, i) => {
          if (i > 0) acc.push(' ');
          acc.push(el);
          return acc;
        }, [])}
      </div>
    </div>
  );
}
```

⚠️ Style with inline `style={{}}` + CSS vars per CLAUDE.md §4.6. Above example follows that. Refine colors using project's existing tokens.

### Reuse existing TTS infra

Check `@/lib/tts`:
- If `speak(text, opts)` exists and supports `onboundary` callback → use it instead of raw `speechSynthesis` to centralize the abstraction.
- If `getStoredVoicePreference()` exists → use it for default voice instead of hardcoding `en-US`.

If the existing `speak()` doesn't support per-word callbacks, either extend it (preferred — single source of truth) or keep this component using `speechSynthesis` directly with a comment explaining why.

## Edge cases

- **Long articles**: Some browsers cut TTS after ~32K chars. Add a guard: if `content.length > 5000`, warn user with "Bài dài quá — chỉ đọc 5000 ký tự đầu" and slice.
- **No TTS support**: Show button disabled with title "Trình duyệt không hỗ trợ TTS".
- **No `onboundary` event** (some voices/browsers): fallback to estimating word timing based on `content.length / wordsPerSecond`. Or just don't highlight — TTS still plays.
- **Voice loading async**: `speechSynthesis.getVoices()` may be empty on first call. Listen to `voiceschanged` event before listing voices.

## Constraints

- `'use client'`.
- No new packages.
- Inline `style={{}}` + CSS vars.
- All Vietnamese UI strings.

## Verification

- Open an article page → button "Đọc to" visible.
- Click play → TTS reads aloud in English; current word highlighted as it speaks.
- Change rate → next play uses new rate.
- Pause / Resume work.
- Stop clears highlight.
- Article with punctuation reads correctly with highlights aligned.

## Next

Part 3: Grammar button + on-demand AI endpoint.

## Clarifications (recorded post-paste, user answers)

- **Scope**: Replace wizard entirely. `passage/[id]/page.tsx` becomes the simple karaoke reader. Step 1/2/7/8 components stop being rendered.
- **Word-click**: Keep word-click → save to Word Bank, but replace AI `/define-word` with `lookupWord()` dictionary API. Same UX, zero AI cost.
- **Submit page**: Fix `/passage/new` to read flat `{ id }` response shape in Part 2.
