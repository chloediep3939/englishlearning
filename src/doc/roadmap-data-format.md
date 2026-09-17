# Roadmap data format — sentence banks and passage bank

How to author, verify and import the content that roadmap self-tests need but the app
cannot generate: **sentence banks** (part B) and the **passage bank** (part C).

There is no editing UI yet. Data flows **JSON file → importer → new migration → D1**.
A create/edit/delete screen is planned for later; until then, fix data by editing the JSON
and generating a *new* migration (never edit an applied one).

| Part | Table | Roadmap items | Test UI status |
|---|---|---|---|
| B — sentences | `dictation_sentences` | `nghe-15` (6–8 words), `nghe-16` (10–13 words) | Ready — reuses the dictation test (`mode: "words"`); becomes testable as soon as data is imported |
| C — passages | `listening_passages` (migration `0036`) | `nghe-12, 19, 20, 21, 22, 23` · `doc-22, 23, 24, 25, 26, 28, 29` | **Not built yet** — data is stored now, test screens come later |

Files:

- `scripts/import-roadmap-data.mjs` — validator + SQL generator
- `scripts/check-d1-split.mjs` — replays wrangler's statement splitter on a `.sql` file (catches the `CASE … END,` trap and oversize statements before D1 does)
- `content/roadmap-data/examples/` — one valid example per kind (placeholders, **not real data**; the importer refuses them without `--allow-unverified`)
- Put real files in `content/roadmap-data/` (e.g. `sentences-nghe-15-b1.json`, `passages-b1.json`)

---

## 1. Rules shared by both kinds

- **Text charset:** only `A–Z a–z 0–9`, space and `. , ! ? ; : " '`. No brackets, dashes, ellipses,
  line breaks or curly quotes. Reason: every index in the file refers to the app's tokenizer
  (split on whitespace, strip `.,!?;:"` at both ends of each token). Any other punctuation shifts
  indices and learners get marked wrong for correct answers.
- **Word indices are 0-based** over that tokenization. `"It's a cold day."` → `["It's", "a", "cold", "day"]`.
- **Ids are stable forever.** Re-importing the same id updates the row (UPSERT). Never reuse an id
  for different content.
- **Removing content:** keep the entry, add `"dropped": true`. The importer emits a `DELETE` for it.
- **Blind verification:** `verified_by` must list ≥ 2 real verifier sessions (strings like
  `"<…>"` don't count). Override with `--allow-unverified` only for local experiments.
- **No copyrighted material.** Do not paste APEUni / PTE / Cambridge items. Author originals.

---

## 2. Part B — sentence bank (`kind: "sentences"`)

```json
{
  "kind": "sentences",
  "item_key": "nghe-15",
  "batch": 1,
  "authored_by": "claude-opus-5 2026-09-16",
  "verified_by": ["claude-sonnet-5 2026-09-16", "gpt-x 2026-09-17"],
  "sentences": [
    { "id": "nghe-15-001", "text": "The bus was late again this morning.", "note_vi": "“again” dễ bị nuốt khi nói nhanh." },
    { "id": "nghe-15-002", "text": "…", "note_vi": "…", "dropped": true }
  ]
}
```

| Field | Rule |
|---|---|
| `item_key` | `nghe-15` or `nghe-16` (also `nghe-06/07/08`, which need an extra key field — see `content/roadmap-dictation/`) |
| `id` | Must start with `<item_key>-`; convention `nghe-15-001` |
| `text` | `nghe-15`: 6–8 words · `nghe-16`: 10–13 words (after tokenization) |
| `note_vi` | Optional, one Vietnamese sentence shown after answering |
| Count | ≥ 10 usable (non-dropped) sentences; aim for **30 per batch** so repeated attempts don't become memory tests |

On import, a `roadmap_item_tests` row `{"mode":"words","sample":10}` is inserted if the item has none,
which makes the item testable immediately. Grading is word-level LCS alignment (contractions and
curly quotes handled); pass thresholds come from the checklist (`nghe-15` ≥ 80 %, `nghe-16` ≥ 70 %).

Do **not** reuse sentences from `nghe-06/07/08` — learners would be recalling, not listening.

---

## 3. Part C — passage bank (`kind: "passages"`)

One passage feeds many items; each item reads only the annotation block it needs. All blocks are
optional per passage, but a passage without a block simply won't appear in that item's test.
**Aim for every block on every passage.**

```json
{
  "kind": "passages",
  "batch": 1,
  "authored_by": "…",
  "verified_by": ["…", "…"],
  "passages": [
    {
      "id": "p1-001",
      "title": "Trees that cool city streets",
      "topic": "environment",
      "level": "B2",
      "text": "Many cities around the world are now planting trees along their streets. …",
      "annotations": { "…": "see table below" }
    }
  ]
}
```

| Field | Rule |
|---|---|
| `id` | `a-z 0-9 -`; convention `p<batch>-NNN` |
| `topic` | one of `science, economics, business, technology, health, environment, education, society, history, culture, psychology` |
| `level` | `A2 / B1 / B2 / C1` (optional) |
| `text` | 120–260 words, academic-lecture style, one paragraph; sentences end with `. ! ?` followed by a space |

### Annotation blocks

| Block | Shape | Validated | Used by |
|---|---|---|---|
| `main_ideas` | 3–4 English strings | count | `nghe-19` main ideas |
| `keywords` | 8–10 strings, each a word or phrase that occurs **verbatim** in `text` (case-insensitive, as whole tokens) | presence | `nghe-20` note keywords; `nghe-12` on `science`/`economics` passages |
| `hiw` | `{ "replacements": [{ "index", "original", "replacement" }] }`, 5–7 items | `original` equals the token at `index`; `replacement` is a single letter-only word, different from original; indices unique | `nghe-21` highlight incorrect words — audio reads `text`, screen shows the replaced words |
| `smw` | `{ "cut_index", "options": [4], "answer" }` | `options[answer]` equals the tail of `text` from `cut_index` (punctuation ignored) | `nghe-23` select missing word |
| `hcs` | `{ "options": [3–4 summaries], "answer", "explain_vi" }` | counts, `explain_vi` required | `nghe-23` highlight correct summary |
| `skim` | `{ "question", "options": [4], "answer" }` | MCQ | `doc-24` skimming |
| `scan` | array of ≥ 5 `{ "question", "options": [4], "answer" }` | MCQ each | `doc-25` scanning |
| `context_words` | array of `{ "index", "word", "options": [4 Vietnamese meanings], "answer" }` | `word` equals token at `index` | `doc-26` meaning from context |
| `mc_single` | `{ "question", "options": [4], "answer" }` | MCQ | `doc-28` |
| `mc_multiple` | `{ "question", "options": [5], "answers": [2–3 indices] }` | counts, unique | `doc-28` (negative marking) |
| `topic_sentence_index` | integer, 0-based sentence index | in range | `doc-23` paragraph structure |

No block needed: `nghe-22` fill in the blanks (the app picks content words to blank out),
`doc-22` reorder (the key is the original sentence order), `doc-29` timed mock (assembled from
the other blocks).

MCQ options must be distinct (case-insensitive). `answer` is a 0-based index. Vary the position of
the correct answer — the example file puts it at 0 only for readability.

Recommended bank size: **30 passages per batch**, at least 3 per topic, at least 6 across
`science` + `economics` (for `nghe-12`).

---

## 4. Import procedure

```bash
# 1. Validate (writes nothing)
node scripts/import-roadmap-data.mjs content/roadmap-data/passages-b1.json --dry-run

# 2. Generate a migration — pick the next free number (ls migrations | tail -3);
#    the importer refuses to overwrite an existing file
node scripts/import-roadmap-data.mjs content/roadmap-data/passages-b1.json --out migrations/00NN_listening_passages_b1.sql

# 3. Check wrangler can split it
node scripts/check-d1-split.mjs migrations/00NN_listening_passages_b1.sql

# 4. Apply locally and spot-check
npx wrangler d1 migrations apply english-learning-db --local
npx wrangler d1 execute english-learning-db --local --command "SELECT topic, count(*) FROM listening_passages GROUP BY topic"

# 5. Production (needs explicit confirmation — CLAUDE.md §6.6)
npx wrangler d1 migrations apply english-learning-db --remote
```

Several JSON files can go into one migration. Every passage is its own `INSERT` statement so a
batch never hits D1's 100 KB per-statement limit; the importer aborts above 90 KB.

---

## 5. Prompts

Workflow (same as `nghe-06/07/08`, see `roadmap-question-authoring.md`): one **authoring**
session → two **blind verification** sessions on different models that never see the key →
reconcile: disagreements get `"dropped": true` or fixed, then fill `verified_by`.

### 5.1 Authoring — sentence bank (paste as is, change the item)

```text
Bạn soạn bộ câu nghe chép chính tả cho người Việt luyện nghe tiếng Anh trình độ B1–B2.

Mục: nghe-15 — mỗi câu 6–8 từ. (Nếu là nghe-16: mỗi câu 10–13 từ.)
Số lượng: 30 câu. id từ nghe-15-001 đến nghe-15-030.

Luật bắt buộc:
1. Chỉ dùng chữ cái, số, khoảng trắng và . , ! ? ; : " '  — KHÔNG gạch ngang, ngoặc, dấu ba chấm, nháy cong.
2. Đếm từ = tách theo khoảng trắng. Đếm lại từng câu trước khi trả.
3. Câu tự nhiên, đời thường hoặc học thuật nhẹ, từ vựng trong 3000 từ thông dụng.
4. Không tên riêng hiếm, không số dài, không từ có hai cách viết Anh/Mỹ (colour/color, centre/center).
5. Không có hai câu gần giống nhau. Trộn thì: hiện tại, quá khứ, hoàn thành, bị động, câu hỏi.
6. Ít nhất 1/3 số câu có chỗ dễ nghe sót: mạo từ, đuôi -s/-ed, từ chức năng đọc lướt.
7. Mỗi câu kèm note_vi: MỘT câu tiếng Việt chỉ ra chỗ khó nghe trong câu đó.
8. Không chép câu từ APEUni, PTE, Cambridge hay nguồn có bản quyền.

Trả về DUY NHẤT một khối JSON đúng định dạng:
{"kind":"sentences","item_key":"nghe-15","batch":1,"authored_by":"<tên model + ngày>","verified_by":[],
 "sentences":[{"id":"nghe-15-001","text":"...","note_vi":"..."}]}
```

### 5.2 Blind verification — sentence bank

Give the verifier **only the list of texts** (no `note_vi`):

```text
Bạn là người kiểm đề độc lập. Dưới đây là các câu dùng cho bài nghe chép chính tả, mỗi câu
người học nghe 1 lần rồi gõ lại nguyên văn. Với MỖI câu, trả lời:
- words: số từ (tách theo khoảng trắng)
- ok: true/false
- problems: danh sách vấn đề nếu có, chọn trong:
  "sai ngữ pháp" · "không tự nhiên" · "có ký tự ngoài chữ-số-khoảng trắng-.,!?;:\"'" ·
  "có hai cách viết Anh/Mỹ" · "đồng âm gây mơ hồ khi nghe (vd their/there)" ·
  "tên riêng/số khó" · "trùng/gần trùng câu khác" · "quá dễ/quá khó so với B1–B2"
- fix: câu sửa gợi ý (nếu ok=false)

Trả về JSON: [{"id":"...","words":7,"ok":true,"problems":[],"fix":null}]
Không bỏ sót câu nào. Không đoán — không chắc thì ghi vấn đề và ok=false.
```

Accept a sentence only when both verifiers return `ok: true` and the word count matches the range.

### 5.3 Authoring — passage bank

```text
Bạn soạn kho đoạn văn cho người Việt luyện Nghe và Đọc tiếng Anh trình độ B2 (dạng bài giảng
học thuật ngắn). Soạn 30 đoạn, id p1-001 … p1-030, batch 1.

ĐOẠN VĂN
- 150–230 từ (đếm theo khoảng trắng), MỘT đoạn liền, không xuống dòng.
- topic là một trong: science, economics, business, technology, health, environment, education,
  society, history, culture, psychology. Mỗi topic ≥ 2 đoạn; science + economics tổng ≥ 6 đoạn.
- Câu đầu là câu chủ đề. Có ít nhất một ví dụ cụ thể và một câu chuyển ý (However, As a result…).
- Chỉ dùng chữ, số, khoảng trắng và . , ! ? ; : " '  — KHÔNG ngoặc, gạch ngang, dấu %, $, ba chấm.
  Viết số bằng chữ hoặc chữ số đơn giản ("ten percent", "2020").
- Mỗi câu kết thúc bằng . ! hoặc ? rồi một khoảng trắng. Không viết tắt có dấu chấm (e.g., U.S.).
- Nội dung tự soạn, không chép nguồn có bản quyền. Sự kiện phải đúng; không chắc thì viết chung chung.

CHỈ SỐ TỪ: đánh số từ 0, tách theo khoảng trắng, bỏ . , ! ? ; : " ở hai đầu mỗi từ.
Trước khi trả, TỰ ĐÁNH SỐ LẠI đoạn văn và kiểm từng chỉ số bạn dùng.

CHÚ THÍCH (annotations) cho MỖI đoạn — đủ cả 11 khối:
1. main_ideas: 3–4 câu tiếng Anh, mỗi câu một ý chính.
2. keywords: 8–10 từ/cụm từ xuất hiện NGUYÊN VĂN trong đoạn — thuật ngữ, danh từ mang nghĩa, không lấy từ chức năng.
3. hiw.replacements: 5–7 mục {index, original, replacement}. original = đúng từ tại index.
   replacement = MỘT từ chỉ gồm chữ cái, cùng loại từ, nghe/nhìn khác rõ, làm câu sai nghĩa nhưng vẫn đúng ngữ pháp.
   Rải đều trong đoạn, không hai mục trong cùng một câu.
4. smw: {cut_index, options[4], answer}. cut_index = chỉ số từ bắt đầu phần bị cắt ở CUỐI đoạn (2–5 từ).
   options[answer] phải đúng bằng các từ từ cut_index tới hết đoạn. 3 phương án còn lại hợp ngữ pháp nhưng sai với mạch bài.
5. hcs: {options[3], answer, explain_vi}. Một bản tóm tắt đúng (1 câu, 25–40 từ); hai bản sai theo kiểu: chỉ nói một phần / thêm ý bài không có / đảo quan hệ nhân quả.
   explain_vi: tiếng Việt, nói vì sao từng bản sai.
6. skim: {question:"What is the passage mainly about?", options[4], answer}.
7. scan: 5 câu hỏi chi tiết {question, options[4], answer}, đáp án tìm được bằng cách dò chữ trong đoạn.
8. context_words: 2–3 mục {index, word, options[4 nghĩa tiếng Việt], answer} — từ B2–C1 đoán được nhờ ngữ cảnh.
9. mc_single: {question, options[4], answer} — hỏi suy luận hoặc thái độ tác giả, không hỏi dò chữ.
10. mc_multiple: {question, options[5], answers[2 hoặc 3 chỉ số]}.
11. topic_sentence_index: chỉ số CÂU (từ 0) của câu chủ đề.

Với mọi câu trắc nghiệm: các phương án không trùng nhau, độ dài tương đương, vị trí đáp án đúng xoay vòng (không luôn là 0).

Trả về DUY NHẤT một khối JSON:
{"kind":"passages","batch":1,"authored_by":"<tên model + ngày>","verified_by":[],
 "passages":[{"id":"p1-001","title":"...","topic":"...","level":"B2","text":"...","annotations":{...}}]}
Nếu quá dài cho một lần trả, trả p1-001…p1-010 rồi dừng; mình sẽ bảo "tiếp".
```

### 5.4 Blind verification — passage bank

Strip every `answer` / `answers` / `topic_sentence_index` / `explain_vi` and the `original` of `hiw`
before sending. A small script or a find-and-replace is fine — the verifier must not see keys.

```text
Bạn là người kiểm đề độc lập, KHÔNG có đáp án. Với MỖI đoạn văn dưới đây:

1. Đếm số từ của text (tách khoảng trắng). Liệt kê ký tự nào ngoài chữ-số-khoảng trắng-.,!?;:"'
2. Sự kiện trong đoạn có chỗ nào sai hoặc gây hiểu lầm không?
3. Tự làm từng câu hỏi và ghi đáp án của bạn (chỉ số từ 0):
   skim, từng câu scan, context_words, mc_single, mc_multiple (liệt kê mọi phương án đúng), hcs (bản tóm tắt đúng),
   smw (phương án nối tiếp đúng nhất).
4. topic_sentence: chỉ số câu (từ 0) bạn cho là câu chủ đề.
5. hiw: với mỗi index, từ tại index đó trong text là gì? (đánh số từ 0, bỏ dấu câu hai đầu)
6. Câu hỏi nào có HƠN MỘT đáp án chấp nhận được, hoặc KHÔNG có đáp án đúng? Ghi rõ.
7. keywords: từ nào không xuất hiện nguyên văn trong text?

Trả về JSON, mỗi đoạn một object:
{"id":"p1-001","word_count":0,"bad_chars":[],"fact_issues":[],
 "answers":{"skim":0,"scan":[0,0,0,0,0],"context_words":[0],"mc_single":0,"mc_multiple":[0,1],"hcs":0,"smw":0},
 "topic_sentence":0,"hiw_tokens":["..."],"ambiguous":["scan[2]: ..."],"missing_keywords":[]}
Không chắc thì ghi vào ambiguous — đừng đoán cho có.
```

**Reconciling:** a question stays only if both verifiers chose the key. Any disagreement or
`ambiguous` entry → fix and re-verify that question, or drop the whole passage
(`"dropped": true`). Then run the importer — it re-checks every index mechanically, which
catches the most common authoring error (off-by-one word indices).

---

## 6. Gotchas

- `smw` answer comparison strips `. , ! ? ; : "` and lowercases, so `"for public health."` matches.
- Keywords match whole tokens: `"tree"` does **not** match `"trees"`. Copy the exact form.
- Sentence splitting for `topic_sentence_index` uses `. ! ?` followed by whitespace — a decimal
  like `2.5` is fine, `Dr. Smith` would split and shift every sentence index.
- `nghe-15` / `nghe-16` get a `roadmap_item_tests` row with `ON CONFLICT DO NOTHING`; if you later
  want a different sample size, write a migration that `UPDATE`s it.
- `listening_passages` has no test UI or API yet. Rows are inert until those screens ship.
