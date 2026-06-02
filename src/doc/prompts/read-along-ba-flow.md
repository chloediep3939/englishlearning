<!-- Saved verbatim 2026-06-02. User-pasted BA flow document (companion to read-along.md). -->

# Read-Along · Karaoke TTS — BA Flow Document

> Feature: Đọc theo / Karaoke reader with Microsoft Translator integration
> Version: 1.0 · May 2026

---

## 1. Tổng quan

User đọc một bài passage tiếng Anh, app đọc to (Web Speech API) và **highlight từng từ** theo kiểu karaoke. Tap từ nào → nghe phát âm + xem nghĩa + lưu vào bộ từ. Dịch song song EN→VN bằng Microsoft Translator.

**Actors:** User · Frontend (Next.js) · Web Speech API (browser) · MS Translator API · Gemini AI (IPA) · Backend API · D1 DB

---

## 2. Data Model (entities liên quan)

| Entity | Mô tả | Nguồn |
|---|---|---|
| `passages` | Bài đọc: id, title, content (plain text EN), level (CEFR), word_count, estimated_time | DB — user tạo hoặc system seed |
| `passage_translations` | Cache dịch: passage_id, sentence_index, vn_text | DB — từ MS Translator, cache lại |
| `word_glossary` | Cache từ điển: word (cleaned), vn, pos, ipa, source | DB — MS Dictionary Lookup + Gemini IPA |
| `flashcards` | Thẻ từ user lưu (đã có) | DB — existing table |
| `decks` | Bộ từ (đã có) | DB — existing table |
| `reading_sessions` | Lịch sử đọc: user_id, passage_id, completed, words_saved, read_at | DB — new table |

---

## 3. Flows

### FLOW 1 · Vào trang Read-Along

**Pre-condition:** User đã đăng nhập, có ít nhất 1 passage trong DB.

#### Happy path

```
1. User ở trang danh sách passage (hoặc dashboard)
2. Tap một passage card
3. Navigate → /read/[passageId]
4. Frontend GET /api/passages/[id]
   → trả về: title, content, level, word_count
5. Frontend tách content thành paragraphs → sentences (client-side hoặc pre-processed)
6. Frontend check cache translations:
   GET /api/passages/[id]/translations
   → Cache HIT:  dùng luôn VN translations
   → Cache MISS: gọi MS Translator (xem Flow 1a)
7. Frontend tokenize mỗi sentence → {text, start, end, isWord}[]
8. Frontend pre-load glossary cho content words:
   POST /api/words/glossary  body: {words: ["morning","opens",...]}
   → trả về cached entries, flag words chưa có
9. Render UI:
   - Passage card (serif font, word-level spans)
   - Word card (mascot idle state)
   - Controls: speed / auto-continue / transport / parallel toggle
   - Saved-words tray (empty)
10. Sẵn sàng → user bấm "Đọc to"
```

#### Flow 1a · Fetch translations (cache miss)

```
1. Backend POST /api/passages/[id]/translate
2. Backend gom tất cả sentences thành batch
3. Backend gọi MS Translator:
   POST https://api.cognitive.microsofttranslator.com/translate
     ?api-version=3.0&from=en&to=vi
   Headers: Ocp-Apim-Subscription-Key, Ocp-Apim-Subscription-Region
   Body: [{Text: "sentence 1"}, {Text: "sentence 2"}, ...]
4. MS trả về [{translations: [{text: "VN sentence 1"}]}, ...]
5. Backend cache vào passage_translations table
6. Trả VN sentences về frontend
```

#### Edge cases

| # | Case | Xử lý |
|---|---|---|
| E1.1 | Passage not found (deleted/invalid ID) | 404 page, nút quay lại danh sách |
| E1.2 | Passage content rỗng | Empty state: "Bài đọc chưa có nội dung" + mascot sleep |
| E1.3 | MS Translator key chưa config | Degrade: hiện passage EN only, ẩn toggle "Dịch song song", log warning |
| E1.4 | MS Translator API lỗi / timeout | Retry 1 lần. Nếu vẫn fail → dùng passage EN only, hiện toast "Không thể dịch lúc này" |
| E1.5 | MS Translator rate limit (429) | Dùng cached nếu có. Không có → degrade như E1.4 |
| E1.6 | User offline | Passage text từ DB vẫn hiện. TTS vẫn hoạt động (browser built-in). Translations/glossary bị disable. Hiện banner offline |
| E1.7 | Passage rất dài (>50 sentences) | Không paginate — scroll. Tokenize lazy per paragraph nếu cần. MS Translator batch max 100 elements nên OK |
| E1.8 | Passage chứa special chars / emoji / HTML | Strip HTML tags. Giữ unicode text. Emoji → TTS sẽ bỏ qua |
| E1.9 | Content chứa số, viết tắt (U.S., Dr., $100) | TTS tự xử lý (đọc "one hundred dollars"). Tokenizer giữ nguyên |

---

### FLOW 2 · Playback — Karaoke highlight

**Pre-condition:** Page đã load, passage + translations sẵn sàng.

#### Happy path

```
1. User tap "Đọc to" (lần đầu) hoặc "Đọc tiếp" (đang pause)
2. System cancel() any existing utterance
3. System tạo SpeechSynthesisUtterance(sentence.text)
   - lang = 'en-US'
   - rate = current speed setting (0.7 / 0.85 / 1.0 / 1.3)
4. synth.speak(utterance)
5. TTS bắt đầu đọc → UI: button đổi thành "Tạm dừng"
6. onboundary event fires:
   - e.charIndex → map to token via start/end offsets
   - Highlight token đó: blue background, white text, glow shadow
   - Sentence tinted background (light blue)
7. onend fires (sentence xong):
   a. Auto-continue ON:
      - curSent++ → speakSentence(next)
      - Progress bar updates
   b. Auto-continue OFF:
      - playing = false
      - Button → "Đọc tiếp"
      - curTok = -1 (clear word highlight)
      - Sentence highlight remains (cho user biết đang ở đâu)
8. Last sentence, onend:
   - playing = false
   - Progress bar = 100%
   - Button → "Đọc to" (reset)
   - curSent = -1 (hoặc giữ ở last sentence?)
```

#### Happy path — Pause

```
1. User tap "Tạm dừng" khi đang playing
2. System: speechSynthesis.cancel()
   (KHÔNG dùng pause()/resume() — flaky across browsers)
3. playing = false
4. curSent giữ nguyên (biết resume từ đâu)
5. curTok = -1 (clear word highlight)
6. Button → "Đọc tiếp"
7. User tap "Đọc tiếp" → speakSentence(curSent) — đọc lại từ đầu câu hiện tại
```

> **Note:** Cancel = mất vị trí trong câu, resume từ ĐẦU CÂU. Đây là trade-off đã chọn (pause/resume không đáng tin across browsers).

#### Edge cases

| # | Case | Xử lý |
|---|---|---|
| E2.1 | Browser không hỗ trợ speechSynthesis | `supported = false`. Hiện warning banner: "⚠️ Trình duyệt này không hỗ trợ đọc to. Thử Chrome / Safari." Disable toàn bộ TTS controls. Passage vẫn hiện để đọc silent |
| E2.2 | Không có voice en-US | TTS dùng default voice. Có thể giọng sai. Chấp nhận — future: voice picker |
| E2.3 | onboundary không fire (một số voice/browser) | Chỉ highlight sentence-level (tinted bg), không highlight word-level. Không crash. Feature degrades gracefully |
| E2.4 | User switch tab (background) | Browser có thể throttle/stop TTS. Khi user quay lại: nếu TTS đã stop → playing = false tự động qua onend. Nếu TTS paused (Chrome) → may need re-trigger |
| E2.5 | User close tab / navigate away mid-playback | useEffect cleanup: speechSynthesis.cancel(). State lost (OK — ephemeral session) |
| E2.6 | Sentence rất dài (>200 words) | TTS sẽ đọc hết, nhưng có thể buffer. Không cần xử lý đặc biệt |
| E2.7 | utterance.onend không fire (rare browser bug) | Timeout fallback: nếu playing=true quá lâu (sentence length / rate * 1.5) → force stop. **Low priority — monitor** |
| E2.8 | User spam tap play/pause nhanh | cancel() idempotent — safe. State updates React batched — safe |
| E2.9 | prefers-reduced-motion | Tắt: mascot bob, word highlight transition, sentence tint transition. Giữ: highlight color (instant swap) |

---

### FLOW 3 · Điều chỉnh tốc độ

#### Happy path

```
1. User tap chip tốc độ (Chậm 0.7× / Vừa 0.85× / Thường 1.0× / Nhanh 1.3×)
2. rate state + rateRef cập nhật
3. UI: chip selected → blue background
4. Nếu đang playing:
   a. speechSynthesis.cancel()
   b. speakSentence(curSent) — restart câu hiện tại ở tốc độ mới
5. Nếu không playing:
   → Chỉ lưu rate, áp dụng khi play tiếp
```

> **Lý do restart:** SpeechSynthesisUtterance.rate không thể thay đổi mid-utterance. Phải cancel + re-create.

#### Edge cases

| # | Case | Xử lý |
|---|---|---|
| E3.1 | User thay đổi speed liên tục (spam) | Mỗi lần cancel+restart là clean. Có thể nghe "giật" nhưng không crash |
| E3.2 | Rate ngoài range browser hỗ trợ | Browser tự clamp (thường 0.1–10). 0.7–1.3 nằm trong safe range |

---

### FLOW 4 · Tap từ — Word detail

#### Happy path

```
1. User tap một từ (isWord token) trong passage
2. speakWord(sentIdx, tokIdx) gọi:
   a. speechSynthesis.cancel() — pause flow
   b. singleRef = true (guard để onend không trigger auto-advance)
   c. Nói từ đó (sayText)
   d. playing = false
   e. curSent = sentIdx, curTok = tokIdx (highlight picked)
   f. setSel({sentIdx, tokIdx, raw, clean, gloss})
3. Word card renders:
   a. Word heading (large, bold)
   b. POS badge (purple pill): "n" / "v" / "adj" / "adv" / "prep"
   c. IPA (mono font, blue): /ˈmɔːrnɪŋ/
   d. VN meaning (bold): "buổi sáng"
   e. 🔊 button (listen again)
   f. "＋ Lưu vào bộ từ" button
4. Passage UI:
   - Tapped word: light blue background (picked state)
   - Previously active sentence: tint remains
```

#### Flow 4a · Glossary lookup (cache miss khi tap)

```
1. User tap từ chưa có trong local glossary cache
2. Word card shows: word heading + loading spinner cho meaning area
3. Frontend POST /api/words/lookup  body: {word: "curious"}
4. Backend:
   a. Check word_glossary table → cache miss
   b. Gọi MS Dictionary Lookup:
      POST https://api.cognitive.microsofttranslator.com/dictionary/lookup
        ?api-version=3.0&from=en&to=vi
      Body: [{Text: "curious"}]
   c. Response: [{translations: [{displayTarget: "tò mò", posTag: "ADJ", ...}]}]
   d. Gọi Gemini cho IPA: "Provide IPA for: curious" → /ˈkjʊriəs/
   e. Cache vào word_glossary: {word: "curious", vn: "tò mò", pos: "adj", ipa: "/ˈkjʊriəs/"}
   f. Trả về frontend
5. Word card updates: POS + IPA + VN meaning hiện ra
```

#### Edge cases

| # | Case | Xử lý |
|---|---|---|
| E4.1 | Tap whitespace / punctuation-only token | isWord = false → no action (click handler skips) |
| E4.2 | Word kèm punctuation: "shop." / "drink—" | RA_clean() strips non-alpha: "shop." → "shop". Lookup bằng cleaned form |
| E4.3 | Proper noun / tên riêng ("Mai") | MS Dictionary có thể không có kết quả. → Hiện: "Chưa có nghĩa sẵn — bấm 🔊 để nghe phát âm." + listen button vẫn hoạt động |
| E4.4 | MS Dictionary trả nhiều POS cho 1 từ (ví dụ "run" = n/v) | Lấy entry có confidence cao nhất (MS trả về sorted). Hiện POS đầu tiên. Future: hiện tất cả meanings |
| E4.5 | MS Dictionary lookup fail / timeout | Hiện word + listen button. Meaning area: "Không thể tra nghĩa lúc này" + retry icon |
| E4.6 | Gemini IPA fail | Hiện word card bình thường, ẩn dòng IPA. Không block |
| E4.7 | User tap từ mới khi single-word TTS đang nói | cancel() → nói từ mới. singleRef reset. Clean |
| E4.8 | User tap cùng 1 từ lại | Re-speak, refresh card (idempotent) |
| E4.9 | User tap từ rồi bấm "Đọc tiếp" | playing = true, singleRef = false, flow resume. Word card vẫn hiện (sel giữ nguyên cho đến khi tap từ khác hoặc clear) |
| E4.10 | Từ có dotted underline (trong glossary) vs. từ không có | Dotted underline = `RA_GLOSS[clean]` exists → visual hint "từ này có nghĩa". Tap từ không có underline vẫn hoạt động — gọi lookup on-demand |

---

### FLOW 5 · Lưu từ vào bộ từ

#### Happy path

```
1. Word card đang hiện (sel !== null)
2. User tap "＋ Lưu vào bộ từ"
3. Client-side:
   a. addWord({clean, raw, vi}) → dedup check (already in saved[]?)
   b. Dedup pass → thêm vào saved[] state
4. Frontend POST /api/cards/generate (existing endpoint)
   body: {
     word: "curious",
     deckId: selectedDeckId,
     skipImage: true,          // mặc định trong read-along
     prefilled: {              // bypass AI generation cho fields đã có
       vi: "tò mò",
       pos: "adj",
       ipa: "/ˈkjʊriəs/"
     }
   }
5. Backend tạo flashcard + gắn vào deck
6. UI updates:
   a. Button → "✓ Đã lưu vào {deckName}" (green, disabled)
   b. Saved-words tray: count +1, chip mới xuất hiện
```

#### Edge cases

| # | Case | Xử lý |
|---|---|---|
| E5.1 | Từ đã lưu trước đó (dedup) | Button đã disabled + hiện "✓ Đã lưu". isSaved(clean) check |
| E5.2 | User chưa có deck nào | Tự tạo default deck "Từ vựng đọc bài" (hoặc dùng deck gần nhất). **HOặC** hiện prompt chọn/tạo deck trước |
| E5.3 | Backend save fail (500/network) | Toast error: "Không thể lưu, thử lại". Revert button về "＋ Lưu vào bộ từ". Giữ trong saved[] client-side (retry available) |
| E5.4 | Từ không có VN meaning (E4.3 proper noun) | Lưu với vi = "" — user có thể edit sau. Hoặc block save? **Đề xuất: cho lưu, prefilled.vi = ""** |
| E5.5 | Deck picker — user muốn đổi deck | Cần UI: dropdown/modal chọn deck. Mặc định = deck cuối cùng user dùng (persist trong settings hoặc localStorage) |
| E5.6 | User lưu rất nhiều từ (30+) | Tray scrollable. Performance OK (chips nhẹ) |
| E5.7 | Từ đã tồn tại trong deck (khác với dedup session) | Backend `/api/cards/generate` nên check trùng trong deck → trả về existing card thay vì tạo mới. Frontend vẫn hiện "Đã lưu" |

---

### FLOW 6 · Dịch song song (Parallel Translation)

#### Happy path

```
1. Toggle "Dịch song song" → ON
2. UI re-render passage:
   - Mỗi sentence = block (thay vì inline flow)
   - Border-left accent (active sentence = blue)
   - Dòng VN dưới mỗi câu EN (smaller font, muted color)
3. Toggle OFF → quay lại inline flow mode (sentences trong cùng <p>)
```

#### Edge cases

| # | Case | Xử lý |
|---|---|---|
| E6.1 | Translations chưa load xong (API chậm) | Dưới mỗi sentence: skeleton shimmer hoặc "Đang dịch…" |
| E6.2 | 1-2 sentences thiếu translation (partial failure) | Hiện "—" cho câu thiếu. Không block cả bài |
| E6.3 | Toggle ON khi đang playback | Layout shift → scroll position có thể nhảy. Giảm thiểu bằng scroll-to-active-sentence sau re-render |
| E6.4 | VN translation quá dài (dài hơn EN nhiều) | Wrap bình thường. Không truncate — user cần đọc hết |
| E6.5 | MS Translator trả translation chất lượng kém | Không thể detect tự động. Future: user report button? |

---

### FLOW 7 · Transport controls

#### Happy path

| Action | Behavior |
|---|---|
| ⏮ Prev | `curSent = max(0, curSent - 1)` → speakSentence (nếu đang play) hoặc chỉ highlight (nếu pause) |
| ⏭ Next | `curSent = min(last, curSent + 1)` → speakSentence hoặc highlight |
| ↻ Restart | `curSent = 0` → speakSentence(0). Luôn play |
| Progress bar | Visual only: `(curSent + 1) / totalSentences * 100%` |

#### Edge cases

| # | Case | Xử lý |
|---|---|---|
| E7.1 | Prev ở sentence 0 | Giữ nguyên sentence 0. Nếu playing → restart sentence 0 |
| E7.2 | Next ở last sentence | Giữ nguyên. Nếu playing → re-speak last sentence |
| E7.3 | Transport khi không playing (curSent = -1) | curSent = -1 → prev/next set curSent = 0, highlight nhưng KHÔNG auto-play |
| E7.4 | Restart khi đã ở sentence 0 | Re-speak sentence 0 |
| E7.5 | Rapid tap next/prev | cancel() mỗi lần → safe |

---

### FLOW 8 · Saved words tray → "Ôn ngay"

#### Happy path

```
1. Tray hiện: "Đã nhặt {n} từ · vào bộ {deckName}"
2. Chips: mỗi saved word = pill with pink dot
3. n > 0 → "Ôn ngay →" button hiện
4. User tap "Ôn ngay →"
5. Navigate → /review?words=saved_word_ids (hoặc /study với filter)
   HOặC: open mini-review inline (flashcard mode cho saved words)
```

#### Edge cases

| # | Case | Xử lý |
|---|---|---|
| E8.1 | Tray rỗng (n=0) | Hiện: "Chưa có từ nào. Chạm một từ rồi bấm ＋ Lưu vào bộ từ." Ẩn "Ôn ngay" button |
| E8.2 | User navigate away rồi quay lại | Saved words = client state → mất. Nhưng words đã POST lên backend → vẫn trong deck. Tray reset = OK (ephemeral per-session) |
| E8.3 | "Ôn ngay" → destination page chưa có filter logic | Fallback: navigate to deck page filtered to saved words. Hoặc `/study?deckId=X` |

---

### FLOW 9 · Session lifecycle

#### Page enter

```
1. Load passage + translations + glossary (Flow 1)
2. Idle state: curSent=-1, playing=false, sel=null, saved=[]
3. Record reading_sessions entry: {user_id, passage_id, started_at}
```

#### Page exit / completion

```
1. speechSynthesis.cancel() (cleanup)
2. Update reading_sessions: {completed: true/false, words_saved: saved.length, finished_at}
```

#### Edge cases

| # | Case | Xử lý |
|---|---|---|
| E9.1 | User rời trang trước khi đọc xong | completed = false. Next visit = fresh session (không resume mid-sentence) |
| E9.2 | User đọc lại cùng passage | New session entry. Words đã lưu vẫn hiện "Đã lưu" (check deck) |
| E9.3 | Concurrent tabs mở cùng passage | Mỗi tab = independent session. speechSynthesis shared across tabs (browser) → chỉ tab cuối cùng speak. **Không cần xử lý đặc biệt** — user hiểu |

---

## 4. Business Rules

| # | Rule |
|---|---|
| BR1 | Mỗi passage có đúng 1 bộ VN translations (cached). Nếu user edit passage content → invalidate cache, re-translate |
| BR2 | Word glossary là global (shared across passages). Cached per word, không per passage |
| BR3 | IPA chỉ generate 1 lần per word, cache vĩnh viễn (IPA không thay đổi) |
| BR4 | MS Translator FREE tier = 2M chars/month. Nếu vượt → cần upgrade hoặc fallback to Gemini |
| BR5 | MS Dictionary Lookup max 10 words/request. Batch pre-fetch cần chunk |
| BR6 | Saved words trong 1 reading session dedup by `clean` form (lowercase, alpha-only) |
| BR7 | Default speed = "Thường" (1.0×). Persist user preference to settings |
| BR8 | Default auto-continue = ON. Persist to settings |
| BR9 | Default parallel translation = OFF. Persist to settings |
| BR10 | Deck for saving = user's last-used deck (hoặc explicit picker). Persist to settings/localStorage |

---

## 5. API Contracts (new / modified)

### `GET /api/passages/[id]`
Response: `{ id, title, content, level, wordCount, estimatedTime }`

### `GET /api/passages/[id]/translations`
Response: `{ sentences: [{index, en, vn}] }`
- Cache hit: return from DB
- Cache miss: trigger Flow 1a internally, then return

### `POST /api/passages/[id]/translate` (internal, called by above on miss)
- Calls MS Translator batch
- Stores results in `passage_translations`
- Response: same as GET

### `POST /api/words/glossary`
Request: `{ words: ["morning", "opens", ...] }`
Response: `{ entries: { "morning": {vn, pos, ipa}, ... }, missing: ["someword"] }`
- Returns cached glossary entries
- `missing` = words not yet in cache (frontend can lookup on-demand)

### `POST /api/words/lookup`
Request: `{ word: "curious" }`
Response: `{ word, vn, pos, ipa, source: "ms+gemini" }`
- Calls MS Dictionary Lookup + Gemini IPA
- Caches result
- Used for on-demand lookup when user taps a word not in pre-fetched glossary

### `POST /api/cards/generate` (existing — extended)
Request: thêm optional `prefilled: { vi, pos, ipa }` để skip AI generation khi data đã có từ read-along.

---

## 6. State Machine — UI States

```
                          ┌──────────────────────────────────────────┐
                          │                                          │
   ┌─────────┐   play    │  ┌──────────┐   onend     ┌──────────┐  │
   │  IDLE   │──────────►│  │ PLAYING  │────────────►│  PAUSED  │  │
   │ cur=-1  │           │  │ cur=N    │   (no auto) │  cur=N   │  │
   └─────────┘           │  └──────────┘             └──────────┘  │
       ▲                 │       │  ▲                     │        │
       │                 │       │  │ play                 │ play   │
       │   last sent     │       │  └─────────────────────┘        │
       │   + onend       │       │                                 │
       └─────────────────┘       │ onend (auto=true)               │
                                 │                                 │
                                 ▼                                 │
                          ┌──────────┐                             │
                          │ PLAYING  │ (next sentence)             │
                          │ cur=N+1  │─────────────────────────────┘
                          └──────────┘

   Any state + tap word → WORD_DETAIL (playing=false, sel=word)
   WORD_DETAIL + play → PLAYING (sel preserved)
   WORD_DETAIL + tap another word → WORD_DETAIL (new sel)
```

---

## 7. Degradation Matrix

| Component bị lỗi | Ảnh hưởng | Fallback |
|---|---|---|
| Web Speech API không có | Không TTS, không karaoke | Passage text hiển thị bình thường, user đọc im. Warning banner |
| MS Translator down | Không có VN sentence translations | Ẩn toggle "Dịch song song". Passage EN only |
| MS Dictionary down | Không tra nghĩa từ on-demand | Word card: hiện từ + 🔊 listen, không hiện meaning. "Không thể tra nghĩa" |
| Gemini down | Không generate IPA | Word card hiện mọi thứ trừ dòng IPA. Không block |
| Backend DB down | Không load passage | Error page |
| Network offline | Không API calls | Passage từ cache (nếu đã visit). TTS hoạt động. Translations/glossary disable |

---

## 8. Settings liên quan (persist across sessions)

| Key | Default | Type | Lưu ở |
|---|---|---|---|
| `reading_speed` | `1.0` | number (0.7/0.85/1.0/1.3) | `user_settings` table |
| `reading_auto_continue` | `true` | boolean | `user_settings` table |
| `reading_show_translation` | `false` | boolean | localStorage (per-device preference) |
| `reading_deck_id` | null (→ last used) | string | `user_settings` table |

---

## 9. Câu hỏi mở (cần quyết định trước khi code)

| # | Câu hỏi | Đề xuất |
|---|---|---|
| Q1 | Passage content lưu dạng gì? Plain text hay đã split sentences? | Plain text, split client-side bằng regex/NLP. Đơn giản, flexible |
| Q2 | Pre-fetch glossary cho TẤT CẢ words hay chỉ "content words"? | Chỉ content words (loại bỏ stop words: the, a, is, ...). Giảm API calls |
| Q3 | "Ôn ngay" navigate đi đâu? | `/study?deckId=X&mode=recent` — review chỉ words vừa saved |
| Q4 | Có track reading progress (% passage read) không? | Có, qua `reading_sessions` table. Dùng cho stats dashboard |
| Q5 | Azure Translator key — user đã có chưa? | **Cần confirm** — ảnh hưởng đến setup instructions |
| Q6 | Passage source — user tạo tay / import / AI generate? | Hiện tại đã có passages table. Giữ nguyên. Read-along là UI mới cho existing data |
| Q7 | Default deck khi user chưa chọn | Auto-create "Từ vựng đọc bài" deck lần đầu |

---

## Resolved decisions (2026-06-02, before implementation)

- **Q5 / Azure key:** User has the key + region. Build full MS integration, code defensively (degrade to EN-only if secret absent). User adds `MS_TRANSLATOR_KEY` + `MS_TRANSLATOR_REGION` to `.dev.vars` + via `wrangler secret put`.
- **Save endpoint:** Extend existing `/api/cards/from-passage` (not `/api/cards/generate`) with optional `prefilled {vi,pos,ipa}` + in-deck dedup — it already records `source_passage_id`/`source_context`.
- **Existing reader:** `/read/[id]` becomes the primary reader; `/passage/[id]` + library links point to it. `GrammarSection` kept.
- **Session tracking (Q4):** Deferred — no `reading_sessions` table, no lifecycle writes. "Ôn ngay" links to `/study?deck_id=X`.
