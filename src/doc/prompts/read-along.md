<!-- Saved verbatim 2026-06-02. User-pasted implementation prompt. -->

# Read-Along · Karaoke TTS — Implementation Prompt

## Overview

Build the **Read-Along / Karaoke reader** feature. User reads an English passage while the app reads it aloud via Web Speech API, highlighting each word in real-time (karaoke style). Tap any word to hear it, see its meaning/IPA, and save it to a deck. Sentence-level parallel Vietnamese translation powered by **Microsoft Translator API**.

This is a new page/route. The app already has a `passages` table and reading UI — inspect the existing code first, then build this as the upgraded reading experience.

---

## Design reference

**Location:** `/Users/blue/Desktop/english-learning/design/design_handoff_readalong/`

| File | What it contains |
|---|---|
| `read-along.jsx` | **THE main reference.** Full working prototype: `useKaraoke` hook (engine), `RAWord`, `RAParagraphs`, `RAWordCard`, `RA_PlayIcon`, `ReadAlong` (mobile), `ReadAlongDesktop` (desktop). Copy the LOGIC, restyle the MARKUP. |
| `shared.jsx` | `Icon` SVG map, `MASCOT` image paths, `Mascot` component. Map icon names to lucide-react equivalents. |
| `direction-v2.jsx` | `V` + `V_C` token objects. These map to the app's existing `--v-*` CSS variables in `globals.css`. |
| `landing-bun-anim.jsx` | `BUN_BLUE` (#3aa9e6), `BUN_BLUE_SOFT` (#e3f2fb), hover/animation CSS classes. |
| `app-mobile.jsx` | `MAppShell`, `MStatusBar`, `MTabBar` — mobile shell reference. |
| `README.md` | Full handoff doc with engine API, state table, interaction spec, design tokens, gotchas. **Read this first.** |

**Fidelity:** High. Colors, spacing, radii, shadows, type are intentional. The `useKaraoke` hook logic is the actual spec — port it faithfully.

---

## Database changes

### New tables

```sql
-- Cache for sentence-level translations (MS Translator)
CREATE TABLE IF NOT EXISTS passage_translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  passage_id INTEGER NOT NULL,
  sentence_index INTEGER NOT NULL,
  en_text TEXT NOT NULL,
  vn_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(passage_id, sentence_index)
);

-- Cache for word-level glossary (MS Dictionary + Gemini IPA)
CREATE TABLE IF NOT EXISTS word_glossary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL UNIQUE,        -- cleaned form (lowercase, alpha+apostrophe only)
  vn TEXT,                          -- Vietnamese meaning
  pos TEXT,                         -- part of speech (n, v, adj, adv, prep, etc.)
  ipa TEXT,                         -- IPA pronunciation
  source TEXT DEFAULT 'ms+gemini',  -- where data came from
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Reading session tracking
CREATE TABLE IF NOT EXISTS reading_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  passage_id INTEGER NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  completed INTEGER DEFAULT 0,
  words_saved INTEGER DEFAULT 0
);
```

### Existing tables to check

- `passages` — should have: id, title, content (plain English text), user_id. Check actual schema and adapt. If there's a `level` or `word_count` column, use it. If not, compute client-side.
- `flashcards` / `decks` — existing. Used by the "Save to deck" flow.

**D1 column trap reminder:** When adding columns to a TS type, also update the INSERT column list.

---

## Environment variables (Cloudflare secrets)

```
MS_TRANSLATOR_KEY=<Azure Translator subscription key>
MS_TRANSLATOR_REGION=<Azure region, e.g. "southeastasia">
```

Add these via `wrangler secret put`. Access in API routes via `env.MS_TRANSLATOR_KEY`.

---

## New files to create

```
src/
  app/
    read/
      [id]/
        page.tsx                    — Read-along page (main UI)
    api/
      passages/
        [id]/
          translations/
            route.ts                — GET cached translations, POST to trigger MS translate
      words/
        glossary/
          route.ts                  — POST: batch lookup cached glossary entries
        lookup/
          route.ts                  — POST: single word lookup (MS Dictionary + Gemini IPA)
  lib/
    reading/
      use-karaoke.ts                — The karaoke engine hook (port from design)
      tokenizer.ts                  — RA_tokenize + RA_clean utilities
      constants.ts                  — RA_SPEEDS, stop words list
      components/
        reading-passage.tsx         — Passage card with word-level spans (RAParagraphs + RAWord)
        word-detail-card.tsx        — Word card (meaning, IPA, listen, save)
        transport-controls.tsx      — Play/pause, prev, next, restart, progress bar
        speed-selector.tsx          — Speed chips (4 options)
        parallel-toggle.tsx         — "Dịch song song" toggle
        auto-continue-toggle.tsx    — Auto-continue toggle
        saved-words-tray.tsx        — Saved words count + chips + "Ôn ngay" CTA
      ai/
        ms-translator.ts           — Microsoft Translator wrapper (translate + dictionary)
        reading-ipa.ts              — Gemini IPA generation for words
```

---

## 1. Tokenizer — `src/lib/reading/tokenizer.ts`

Port directly from the design prototype:

```typescript
export interface Token {
  text: string;
  start: number;
  end: number;
  isWord: boolean;
}

export interface FlatSentence {
  pIdx: number;      // paragraph index
  sIdx: number;      // sentence index within paragraph
  gi: number;        // global flat index
  text: string;
  tokens: Token[];
}

/** Clean a word for glossary lookup: lowercase, keep only a-z and apostrophe */
export function cleanWord(s: string): string {
  return s.toLowerCase().replace(/[^a-z']/g, '');
}

/** Tokenize a sentence into words + whitespace chunks with char offsets */
export function tokenize(sentence: string): Token[] {
  const tokens: Token[] = [];
  const re = /(\s+|[^\s]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence))) {
    tokens.push({
      text: m[0],
      start: m.index,
      end: m.index + m[0].length,
      isWord: /\S/.test(m[0]),
    });
  }
  return tokens;
}

/** Split passage text into paragraphs → sentences, then flatten */
export function splitPassage(content: string): { paragraphs: string[][]; flat: FlatSentence[] } {
  // Split by double newline (or single newline for paragraphs)
  const rawParas = content.split(/\n\s*\n/).filter(p => p.trim());
  const paragraphs: string[][] = rawParas.map(p => {
    // Split sentences: period/question/exclamation followed by space or end
    // Keep the punctuation with the sentence
    return p.match(/[^.!?]*[.!?]+[\s]*/g)?.map(s => s.trim()).filter(Boolean)
      || [p.trim()];
  });

  const flat: FlatSentence[] = [];
  paragraphs.forEach((para, pIdx) => {
    para.forEach((text, sIdx) => {
      flat.push({ pIdx, sIdx, gi: flat.length, text, tokens: tokenize(text) });
    });
  });

  return { paragraphs, flat };
}
```

**Note on sentence splitting:** The regex approach works for most English text. Edge cases (abbreviations like "Dr.", "U.S.") may split incorrectly. Accept this for now — can upgrade to a proper NLP tokenizer later.

---

## 2. Microsoft Translator — `src/lib/reading/ai/ms-translator.ts`

```typescript
interface TranslateResult {
  text: string;
  to: string;
}

interface DictionaryEntry {
  normalizedTarget: string;
  displayTarget: string;
  posTag: string;
  confidence: number;
}

const MS_ENDPOINT = 'https://api.cognitive.microsofttranslator.com';

/** Translate an array of sentences EN → VN */
export async function translateSentences(
  sentences: string[],
  msKey: string,
  msRegion: string
): Promise<string[]> {
  const url = `${MS_ENDPOINT}/translate?api-version=3.0&from=en&to=vi`;
  const body = sentences.map(text => ({ Text: text }));

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': msKey,
      'Ocp-Apim-Subscription-Region': msRegion,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MS Translator error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.map((item: any) => item.translations[0].text);
}

/** Dictionary lookup for a single word EN → VN. Returns POS + VN meanings. */
export async function dictionaryLookup(
  word: string,
  msKey: string,
  msRegion: string
): Promise<{ vn: string; pos: string } | null> {
  const url = `${MS_ENDPOINT}/dictionary/lookup?api-version=3.0&from=en&to=vi`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': msKey,
      'Ocp-Apim-Subscription-Region': msRegion,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ Text: word }]),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const translations: DictionaryEntry[] = data[0]?.translations || [];
  if (translations.length === 0) return null;

  // Take highest confidence entry
  const best = translations.sort((a, b) => b.confidence - a.confidence)[0];
  return {
    vn: best.displayTarget,
    pos: best.posTag?.toLowerCase() || '',
  };
}
```

---

## 3. Gemini IPA — `src/lib/reading/ai/reading-ipa.ts`

Use the existing `getAIProvider()` factory. Keep it simple:

```typescript
import { getAIProvider } from '@/lib/ai/provider'; // adjust import path

export async function generateIPA(word: string): Promise<string | null> {
  try {
    const ai = await getAIProvider();
    const result = await ai.generateText(
      `You are a phonetics expert. Provide ONLY the IPA pronunciation for the English word "${word}". Return ONLY the IPA enclosed in slashes, like /wɜːrd/. No other text.`,
      { maxTokens: 50 }
    );
    const match = result.match(/\/[^/]+\//);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}
```

---

## 4. API Routes

### `GET /api/passages/[id]/translations`

```
Response 200: {
  sentences: [
    { index: 0, en: "Every morning...", vn: "Mỗi sáng..." },
    ...
  ]
}

Response 404: { error: "Passage not found" }
```

Logic:
1. Load passage from DB.
2. Split content into sentences (use `splitPassage`).
3. Query `passage_translations` for this passage_id.
4. **Cache hit** (all sentences have translations): return from DB.
5. **Cache miss** (partial or none):
   - Call `translateSentences()` for missing sentences.
   - INSERT results into `passage_translations`.
   - Return complete list.
6. **MS Translator fails**: return `{ sentences: [...], translationAvailable: false }` with EN text only, no VN.

### `POST /api/words/glossary`

```
Request:  { words: ["morning", "curious", "shop"] }
Response: {
  entries: {
    "morning": { vn: "buổi sáng", pos: "n", ipa: "/ˈmɔːrnɪŋ/" },
    "shop":    { vn: "cửa hàng", pos: "n", ipa: "/ʃɑːp/" }
  },
  missing: ["curious"]
}
```

Logic:
1. Query `word_glossary` WHERE word IN (...).
2. Return found entries + list of missing words.
3. Frontend will call `/api/words/lookup` on-demand for missing words (when user taps them).

### `POST /api/words/lookup`

```
Request:  { word: "curious" }
Response: { word: "curious", vn: "tò mò", pos: "adj", ipa: "/ˈkjʊriəs/", source: "ms+gemini" }
```

Logic:
1. Check `word_glossary` cache → hit? Return.
2. Cache miss:
   a. Call `dictionaryLookup("curious", key, region)` → `{ vn, pos }`.
   b. Call `generateIPA("curious")` → `ipa`.
   c. INSERT into `word_glossary`.
   d. Return.
3. If MS Dictionary fails → `vn = null, pos = null`. Still try IPA.
4. If Gemini fails → `ipa = null`. Still return what we have.

---

## 5. The Karaoke Hook — `src/lib/reading/use-karaoke.ts`

Port `useKaraoke()` from `read-along.jsx` **faithfully**. Key changes for production:

1. **Accept data as params** instead of hardcoded globals:
   ```typescript
   interface UseKaraokeOptions {
     sentences: FlatSentence[];
     translations: Record<string, string>;  // `${pIdx}-${sIdx}` → VN text
     glossary: Record<string, { vn: string; pos: string; ipa: string }>;
   }
   export function useKaraoke(options: UseKaraokeOptions) { ... }
   ```

2. **Keep all the ref patterns** from the prototype: `rateRef`, `autoRef`, `singleRef`. These are critical for stale-closure avoidance in TTS callbacks.

3. **`speakSentence(idx)`** — the core function. Port exactly:
   - `speechSynthesis.cancel()` first
   - Create `SpeechSynthesisUtterance` with `lang='en-US'`, `rate=rateRef.current`
   - `onboundary`: map `e.charIndex` → token index. Filter `e.name !== 'word'`.
   - `onend`: if `singleRef.current` return. If `autoRef.current` → chain next. Else stop.

4. **`speakWord(sentIdx, tokIdx)`** — cancel flow, speak single word, set `sel`.

5. **`pickRate(r)`** — update rate + rateRef. If playing → restart current sentence.

6. **Cleanup** — `useEffect` return: `speechSynthesis.cancel()`.

7. **Browser support check**: `supported = 'speechSynthesis' in window`.

8. **addWord / isSaved** — keep the dedup logic by `clean` form.

Expose the same state shape as the prototype (see README.md state table).

---

## 6. UI Components

### General styling rules (same as rest of app)

- **Inline `style={{}}` with CSS variables** (`var(--v-ink)`, etc.). NO Tailwind utilities.
- lucide-react icons only (map from design's `Icon` names: play→Play, speaker→Volume2, refresh→RefreshCw, plus→Plus, check→Check, folder→Folder, sparkle→Sparkles, book→BookOpen, arrowLeft→ArrowLeft).
- Nunito for headings/UI. **Lora for reading passage** (serif, 27px desktop / 17px mobile, line-height 1.8). JetBrains Mono for IPA/progress.
- Chunky shadows: `0 4px 0 rgba(20,40,80,.2), 0 8px 18px #3aa9e655`.
- Radii: cards 14–22, buttons 12–16, pills 999.

### `reading-passage.tsx`

Port `RAParagraphs` + `RAWord` from the design.

- **RAWord states**: hot (current spoken word → solid BUN_BLUE bg, white text), picked (sel → light blue bg), known (in glossary → 2px dotted BUN_BLUE underline), plain.
- **Two render modes**: `vnMode=false` → sentences flow inline within `<p>`. `vnMode=true` → each sentence is a block with left accent border + VN line beneath.
- **Active sentence**: light blue tint background when `s.gi === curSent`.
- Footer hint: "Từ có gạch chấm là có nghĩa — click để xem & lưu vào bộ từ."

### `word-detail-card.tsx`

Port `RAWordCard` from the design.

- **No selection**: mascot image + prompt text. Mascot bobs when playing.
- **With selection**: word (24px heading), POS badge (purple pill), IPA (mono, blue), VN meaning (bold), 🔊 listen button (BUN_BLUE circle), Save button.
- **Save button states**: default "＋ Lưu vào bộ từ" (BUN_BLUE) → saved "✓ Đã lưu vào {deckName}" (green, disabled).
- **Loading state** (when fetching glossary for new word): word heading shown, meaning area shows spinner/skeleton.
- **Error state**: "Không thể tra nghĩa lúc này" + retry button.
- **No gloss available** (proper noun etc.): "Chưa có nghĩa sẵn — bấm 🔊 để nghe phát âm."

### `transport-controls.tsx`

- Prev ⏮ / Play-Pause (big BUN_BLUE button) / Next ⏭ — row layout.
- "Đọc lại từ đầu" restart button below.
- Progress bar + "Câu n/N" counter below that.
- Play button text: "Đọc to" (idle) / "Đọc tiếp" (paused) / "Tạm dừng" (playing).

### `speed-selector.tsx`

- 4 chips: Chậm 0.7× / Vừa 0.85× / Thường 1.0× / Nhanh 1.3×.
- Desktop: 2×2 grid. Mobile: 4 in a row.
- Selected chip: BUN_BLUE bg, white text, hard shadow.

### `parallel-toggle.tsx` + `auto-continue-toggle.tsx`

- Standard toggle switch (44×24 desktop / 40×22 mobile).
- Parallel: teal accent when ON. Label "Dịch song song" / "Hiện nghĩa tiếng Việt dưới mỗi câu".
- Auto-continue: BUN_BLUE when ON. Label changes: "Đọc liền cả đoạn" (ON) / "Đọc từng câu" (OFF).

### `saved-words-tray.tsx`

- Header: pink folder icon + "Đã nhặt {n} từ" + "vào bộ {deckName}".
- Empty: help text "Chưa có từ nào. Chạm một từ rồi bấm ＋ Lưu vào bộ từ."
- With words: flex-wrap chips (pill, pink dot + word text) + "Ôn ngay →" button (pink).

---

## 7. Page layout — `src/app/read/[id]/page.tsx`

### Desktop (≥768px)

```
┌─────────────────────────────────────────────────────┐
│ App shell (existing sidebar + header)               │
│ ┌───────────────────────────────────────────────────┐│
│ │ Eyebrow: "Đọc theo · Karaoke TTS"                ││
│ │ Title: passage.title    [86 từ · ~40s] [CEFR B1] ││
│ ├────────────────────────┬──────────────────────────┤│
│ │                        │ Word detail card         ││
│ │  Reading card          │ Parallel toggle          ││
│ │  (Lora serif, 27px)    │ Speed selector           ││
│ │  word-level spans      │ Auto-continue toggle     ││
│ │                        │ Transport + progress     ││
│ │  Footer hint           │ Saved words tray         ││
│ │                        │                          ││
│ ├────────────────────────┴──────────────────────────┤│
│ │ grid: 1fr 340px, gap 20px                         ││
│ └───────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

Right rail: `position: sticky, top: 18px`.

### Mobile (<768px)

Single column, vertical stack. All components in order:
1. Header row (back arrow, title, CEFR badge)
2. Browser unsupported warning (if needed)
3. Reading card (Lora 17px)
4. Word detail card
5. Parallel toggle
6. Speed chips (4 in a row)
7. Auto-continue toggle
8. Transport row (prev / play / next / restart)
9. Progress bar
10. Saved words tray

---

## 8. Data flow on page load

```
page.tsx mount
  │
  ├─ GET /api/passages/[id]           → passage data
  │
  ├─ GET /api/passages/[id]/translations  → VN sentences
  │    (triggers MS Translator on cache miss)
  │
  ├─ splitPassage(content)            → paragraphs + flat sentences (client)
  │
  ├─ Extract content words (skip stop words: the, a, is, are, was, were, ...)
  │
  ├─ POST /api/words/glossary         → cached glossary entries + missing list
  │    body: { words: contentWords }
  │
  └─ useKaraoke({ sentences, translations, glossary })
       → hook ready, UI renders idle state
```

**Stop words list** to skip during pre-fetch (common ~100 English function words). Define in `constants.ts`. These words still get tokenized and rendered — they just don't get pre-fetched from the glossary API. If a user taps one, on-demand lookup fires.

---

## 9. Saving words — integration with existing card system

When user taps "＋ Lưu vào bộ từ":

1. Client calls `POST /api/cards/generate` (existing endpoint).
2. Pass additional `prefilled` field to skip AI generation for data we already have:
   ```json
   {
     "word": "curious",
     "deckId": "deck-123",
     "skipImage": true,
     "prefilled": {
       "vi": "tò mò",
       "pos": "adj",
       "ipa": "/ˈkjʊriəs/"
     }
   }
   ```
3. Backend: if `prefilled` is present, use those values instead of calling Gemini for vi/pos/ipa. Still generate example sentence + collocations via Gemini (unless also prefilled).
4. Check if card with same word already exists in deck → return existing instead of creating duplicate.

**Deck selection:** Default to user's most recently used deck (from settings or localStorage). Show deck name in word card + saved tray. If user has no decks, auto-create "Từ vựng đọc bài".

---

## 10. Settings persistence

| Setting | Key in settings | Default | Where used |
|---|---|---|---|
| Reading speed | `reading_speed` | `1.0` | Speed selector initial value |
| Auto-continue | `reading_auto_continue` | `true` | Toggle initial value |
| Reading deck | `reading_deck_id` | null (→ last used) | Deck for saving words |

**Parallel translation toggle** → localStorage only (per-device preference, not critical to persist server-side).

Load settings on page mount via existing `/api/settings` endpoint. Update on change.

---

## 11. Edge case handling summary

| Scenario | Handling |
|---|---|
| No speechSynthesis | `supported=false`, warning banner, disable TTS controls, passage still readable |
| MS Translator key missing/invalid | Degrade: no translations, hide parallel toggle, log warning |
| MS Translator 429 / timeout | Retry once. Fail → use cached if available, else EN-only with toast |
| MS Dictionary lookup fails for a word | Word card shows word + listen only, "Chưa có nghĩa sẵn" |
| Gemini IPA fails | Word card omits IPA line, everything else works |
| Network offline | Passage from DB still loads. TTS works (browser). Translations/glossary disabled |
| onboundary doesn't fire | Sentence-level highlight only (tinted bg), no word-level karaoke |
| User navigates away mid-playback | useEffect cleanup: `speechSynthesis.cancel()` |
| Passage not found | 404 with back link |
| Word already saved (dedup) | Button disabled, shows "✓ Đã lưu" |
| Card save fails (backend) | Toast error, revert button state |

---

## 12. Implementation order

1. **Database** — Run SQL to create new tables.
2. **Tokenizer** — `tokenizer.ts` + `constants.ts` (pure logic, no deps).
3. **MS Translator wrapper** — `ms-translator.ts` (needs env vars).
4. **Gemini IPA** — `reading-ipa.ts` (uses existing AI provider).
5. **API routes** — translations, glossary, lookup. Test with curl.
6. **useKaraoke hook** — Port from design. Test in isolation with hardcoded data.
7. **UI components** — One by one: passage → word card → transport → toggles → tray.
8. **Page assembly** — Wire everything together in `read/[id]/page.tsx`.
9. **Settings persistence** — Speed, auto-continue, deck preference.
10. **Existing endpoint update** — Add `prefilled` support to `/api/cards/generate`.

---

## 13. Conventions reminder

- **Inline `style={{}}` with CSS vars.** No Tailwind utilities.
- **`getAIProvider()`** is async. Use for Gemini calls only.
- **D1 async SQLite.** All DB calls are async. Use parameterized queries.
- **Feature module pattern:** All new reading code under `src/lib/reading/`.
- **No tests / ESLint / Prettier.** Just make `tsc` clean.
- **TypeScript strict.** Type everything. No `any` where avoidable.
- **lucide-react** only for icons. No custom SVG icons.
- **Mascot images** at `public/mascot/ngoc-*.png`. Use `aria-hidden`, empty `alt`.
