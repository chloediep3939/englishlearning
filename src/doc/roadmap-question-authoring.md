# Roadmap question authoring — how to build the question banks

How to produce the question banks that feed the roadmap self-test tools (mainly **T2 — grammar
and word-form drill**, which covers 59 of the 141 checklist items). See
`roadmap-self-test-plan.md` for the tool inventory and the per-item mapping.

The app never calls an AI to write or grade these questions. Questions are authored **outside**
the app by whatever chat assistant you like, verified across separate sessions, then imported as
JSON. Bún only stores them and grades by comparing strings against an answer key.

The prompts below are kept in Vietnamese on purpose — they are operational text meant to be
pasted verbatim into a chat, and the learner writes Vietnamese.

---

## Why three sessions, not one

A question bank is reused for months and graded by exact string comparison. One bad question
keeps telling a correct learner they are wrong, forever. A single chat session cannot catch its
own ambiguity — asked to review its own output it will agree with itself.

So every batch goes through three separate sessions (different models if possible):

```
Session A: write 30 questions
      ↓
Session B: answer them blind, then compare     Session C: same, independently
      ↓                                              ↓
   both sessions match the key   → ACCEPT
   one session disagrees         → Session D (arbiter) decides
   both sessions disagree        → DROP, do not patch
```

## How many questions per topic

Each test draws **10 questions**, preferring ones the learner has not seen and ones they
previously got wrong.

| Pool after filtering | Test runs with no repeat | Good enough for |
|---|---|---|
| 20 | 2 | testing only, at the 4-week retest cadence |
| 30 | 3 | testing comfortably; practice burns through it in about a week |
| 75 | 7 | both testing and practice |

Two consequences:

- **Ask for 30 to end up with ~25** — the filtering rules below will drop some.
- **Do not ask for 75 in one go.** The longer the generation, the more the model repeats sentence
  frames and the sloppier the tail gets. Run several batches instead, passing the existing
  questions in so the new batch does not duplicate them.

Recommended: one batch for every topic first; then two extra batches (→ ~75 questions) for the 13
A2 grammar topics `viet-01`…`viet-13` and for any topic you keep failing.

---

## File format

One file per topic per batch, at `content/roadmap-drills/<item_key>-b<batch>.json`:

```json
{
  "item_key": "viet-14",
  "topic": "Điều kiện loại 0 và 1",
  "version": 1,
  "batch": 1,
  "authored_by": "model name + date",
  "verified_by": [],
  "questions": [
    {
      "id": "viet-14-001",
      "type": "choice",
      "prompt": "If water ___ 100°C, it boils.",
      "options": ["reaches", "reached", "will reach", "is reaching"],
      "answer": "reaches",
      "accept": ["reaches"],
      "explain_vi": "Điều kiện loại 0 nói về sự thật luôn đúng: cả hai vế đều hiện tại đơn. 'will reach' sai vì vế if không dùng will.",
      "difficulty": "easy",
      "tests": "zero conditional"
    }
  ],
  "self_check": { "replaced": 0, "unsure_ids": [] }
}
```

`type` has exactly three values:

| `type` | Learner does | Graded by |
|---|---|---|
| `choice` | picks 1 of 4 | index/string match against `answer` |
| `fill` | types the missing word(s) | string match against `accept` |
| `fix` | rewrites a sentence containing one error | string match against `accept` |

For `fill` and `fix`, `accept` must list **every** acceptable variant — contractions
(`don't` / `do not`), British vs American spelling, alternative word orders. A missing variant
means a correct learner is marked wrong.

---

## Prompt A — write the batch

> Bạn là người soạn đề luyện tiếng Anh. Bộ đề này sẽ được nạp vào app tự học của tôi, **máy chấm
> tự động bằng cách so chuỗi** (máy không hiểu ngữ nghĩa), và **dùng lại nhiều lần trong nhiều
> tháng**. Một câu sai sẽ liên tục báo sai cho người học đúng. Hãy làm chậm và chắc, thà ít câu
> mà đúng.
>
> **Mục cần soạn**
> - Mã mục: `{{ITEM_KEY}}`
> - Tên mục: `{{LABEL}}`
> - Cách test đã định: `{{HOW_TO_TEST}}`
> - Ngưỡng đạt: `{{PASS_WHEN}}`
> - Người học: người Việt, đang từ B1 lên B2, ôn PTE.
> - Đợt số: `{{BATCH}}`
> - **Những câu đã có sẵn từ các đợt trước, tuyệt đối không soạn trùng ý cũng không dùng lại
>   cùng khung câu**: `{{EXISTING_PROMPTS}}` *(để trống nếu là đợt 1)*
>
> **Yêu cầu**
> 1. Soạn đúng **30 câu**. (Tôi sẽ lọc bỏ câu không qua kiểm chéo, nên cần dư.)
> 2. Mỗi câu chỉ được có **một** đáp án đúng trong ngữ cảnh đã cho. Nếu một câu có thể chấp nhận
>    nhiều đáp án, hãy sửa ngữ cảnh cho chỉ còn một, hoặc bỏ câu đó.
> 3. Với `fill` / `fix`: liệt kê **tất cả** biến thể chấp nhận được vào `accept` — viết tắt và
>    viết đầy đủ (`don't` / `do not`), chính tả Anh–Mỹ (`colour` / `color`), thứ tự từ thay thế
>    được. Máy so chuỗi, thiếu biến thể nào là người học bị chấm sai.
> 4. Từ vựng trong câu phải ở mức **A2–B1**. Mục tiêu là kiểm tra `{{LABEL}}`, không phải kiểm
>    tra từ vựng — người học sai thì phải vì không nắm điểm ngữ pháp đó, không phải vì không biết từ.
> 5. Không tên riêng lạ, không chủ đề nhạy cảm, không câu cần kiến thức văn hoá riêng.
> 6. Đa dạng: không lặp cùng một khung câu, đổi chủ ngữ, đổi tình huống.
> 7. Rải độ khó: 10 câu `easy`, 14 câu `medium`, 6 câu `hard`.
> 8. `explain_vi` viết **tiếng Việt**, 1–2 câu, nói rõ vì sao đáp án đúng **và vì sao lựa chọn
>    hấp dẫn nhất còn lại sai**.
>
> **Tự kiểm bắt buộc trước khi trả lời.** Duyệt lại từng câu và xác nhận đủ 7 điều; câu nào không
> qua thì sửa hoặc thay:
> - (a) Có đúng một đáp án đúng không? Thử lần lượt từng lựa chọn kia, tìm cách hiểu nào làm nó
>   cũng đúng — nếu tìm được thì câu hỏng.
> - (b) `answer` có nằm nguyên văn trong `options` không, có sai chính tả không?
> - (c) Câu có thật sự kiểm tra `{{LABEL}}` hay vô tình kiểm tra điểm ngữ pháp khác?
> - (d) Có từ nào trên mức B1 không? Có thì thay.
> - (e) `accept` đã đủ biến thể chưa?
> - (f) `explain_vi` có đúng và có giải thích được cả chỗ sai không?
> - (g) Có trùng ý với câu nào khác trong bộ không?
>
> **Trả về JSON thuần**, không bọc trong markdown, không thêm lời dẫn, đúng cấu trúc sau:
>
> *(dán khối schema ở mục "File format" vào đây)*
>
> Trường `self_check` ghi số câu bạn đã thay trong lúc tự kiểm và id những câu bạn còn chưa chắc.

## Prompt B — blind verification (run in two separate sessions)

> Tôi đưa bạn một bộ đề đã soạn sẵn. Việc của bạn **không phải** là khen hay chỉnh sửa, mà là
> **làm bài như một thí sinh giỏi rồi chỉ ra chỗ đề sai**.
>
> **Quy trình bắt buộc, làm đúng thứ tự**
> 1. Đọc file JSON. **Bỏ qua hoàn toàn** các trường `answer`, `accept`, `explain_vi` — coi như
>    chưa thấy chúng.
> 2. Tự trả lời cả 30 câu.
> 3. **Trả lời xong hết** rồi mới được xem `answer` để đối chiếu.
> 4. Báo cáo.
>
> **Phân loại lỗi**
> - `ambiguous` — câu có nhiều đáp án đều đúng. **Đây là lỗi nặng nhất**: máy chấm sẽ báo sai cho
>   người học trả lời đúng.
> - `wrong_key` — đáp án trong file sai.
> - `off_topic` — câu không kiểm tra đúng điểm ngữ pháp của mục.
> - `hard_vocab` — người học có thể sai vì từ vựng chứ không vì ngữ pháp.
> - `duplicate` — trùng ý với câu khác.
> - `none` — không vấn đề.
>
> **Trả về JSON thuần**:
> ```json
> { "item_key": "...", "verifier": "tên model + ngày",
>   "results": [ { "id": "...", "my_answer": "...", "matches": true,
>                  "issue": "none", "comment_vi": "" } ],
>   "summary": { "total": 30, "matched": 0, "disputed": 0, "must_fix": [] } }
> ```
>
> **Lưu ý**: `matches: false` chưa chắc đề sai — có thể bạn sai. Nói rõ bạn nghiêng về bên nào và
> vì sao. Không tự sửa đề, chỉ chỉ ra.

## Prompt C — arbiter (only for disputed questions)

> Ba nguồn đang bất đồng về mấy câu dưới đây. Với **từng câu**: nêu đáp án đúng theo bạn, nói rõ
> quy tắc ngữ pháp chi phối, rồi kết luận đúng một trong ba: `KEEP` (đề đúng, hai người kia sai),
> `FIX` (kèm bản sửa đầy đủ theo đúng schema), `DROP` (câu hỏng, không cứu).
> Không nể nang. Nếu câu có hai cách hiểu đều hợp lý thì luôn là `DROP`.
>
> *(dán các câu bất đồng kèm `my_answer` của từng phiên vào đây)*

---

## Acceptance rules

- Both verifiers match the key → **accept**.
- One verifier disagrees → send to the arbiter, follow its verdict.
- Both verifiers disagree → **drop it**, do not patch.
- A batch left with **fewer than 20** usable questions → run a top-up batch (Prompt A again with
  `{{EXISTING_PROMPTS}}` set to the surviving questions). If the top-up also loses more than half,
  the problem is the topic description: fix `{{HOW_TO_TEST}}` on the roadmap item first.
- Record both verifier names in `verified_by` so you can tell later which banks were cross-checked.

## Where the placeholders come from

`{{ITEM_KEY}}`, `{{LABEL}}`, `{{HOW_TO_TEST}}` and `{{PASS_WHEN}}` are columns on `roadmap_items`
(seeded by `migrations/0021_roadmap.sql` from `src/doc/prompts/roadmap-checklist.md`). Read one
row with:

```bash
npx wrangler d1 execute english-learning-db --local --json --command="SELECT item_key, label, how_to_test, pass_when FROM roadmap_items WHERE item_key = 'viet-14';"
```

## Importing into Bún

Phase 2 adds an import screen that takes exactly this JSON, previews it, and reports structural
errors before saving — plus a manual editor for one-off fixes. Until that ships, the JSON files
just accumulate in `content/roadmap-drills/`.
