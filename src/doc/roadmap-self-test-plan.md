# Roadmap self-test tools — plan and checklist

Turning the 141 roadmap checklist items (`/roadmap`) from hand-ticked boxes into self-tests the
learner can run inside Bún. Companion doc: `roadmap-question-authoring.md` (how the question
banks get written and verified).

Status today: `roadmap_progress` has exactly one writer — `PUT /api/roadmap/[key]`, driven by the
user clicking ✓/✗. Nothing in the app measures anything for the roadmap.

## Principles

Bún does **not** call an AI to generate questions or grade answers. It does three things:

1. **Holds content** — word lists, question banks, dictation sentence banks. Loaded by **bulk JSON
   import** plus a **manual editor** (the way `/decks` already supports both import and hand entry).
2. **Grades mechanically** — five methods only: string comparison, answer key, counting, timing,
   speech recognition.
3. **Records results** — clearing the threshold auto-writes ✓ to `roadmap_progress` with a note
   like "48/50 · 16/09".

Free-form work (paragraphs, essays, 2-minute speaking) is **not graded in the app**. Instead a
**"Copy để nhờ AI chấm"** button bundles *task + the learner's text + criteria + threshold* into
one block. The learner pastes it into an outside chat, gets a verdict, comes back and ticks ✓/✗
with the feedback in the note field.

> `/compose`, `/sentence` and `/passage` (translate / rewrite steps) **already call Gemini**.
> That is existing behaviour; this plan neither changes it nor relies on it for roadmap grading.

## The eight tools

| Code | Tool | Learner does | Graded by | Content from |
|---|---|---|---|---|
| **T1** | Word-list check | Draw N words, tap **Biết / Không biết**; optionally type the Vietnamese meaning, or hear audio and type the word | Count, compare to threshold | Public word lists |
| **T2** | Grammar & word-form drill | 10 questions per run: fill / choose / fix | Answer key | JSON import + manual editor |
| **T3** | Sentence dictation | Hear a sentence, type it back | Word-by-word diff, % correct | Imported sentence bank; TTS already exists |
| **T4** | Read aloud via speech recognition | Read a word or sentence into the mic | Recognise → word-by-word match → colour, % correct | Imported sentences |
| **T5** | Write in app, **export for an outside AI** | Write, then tap Copy | **Not graded** — only packages task + text + criteria; learner enters the verdict | Imported prompts |
| **T5b** | Mechanical proofreading | Paste the text | Word counts, string searches — no AI | — |
| **T6** | Timed reading comprehension | Read, answer, against a clock | Answer key + elapsed time | Passages already in `/passage`; questions imported |
| **T7** | Guided self-report | Answer 3–5 very concrete yes/no questions | Maps to ✓/✗ | — |
| **T8** | Minimal pairs & word stress | Hear two words differing by one sound, pick the one heard; or pick the stressed syllable | Count | Script derived from `public/cmu-ipa.json` (125,915 entries, already carries `ˈ ˌ`) |

Existing practice modules are reused as-is: `/study` (type the word, has a listen-then-type mode),
`/speed` (fast MCQ, has a spelling mode), `/cloze` (fill the blank), `/sentence-study` (retype a
whole sentence), `/pronounce` (read into the mic), `/passage` + `/read` (passages, karaoke
read-along, chunk practice), `/templates` (memorise speaking frames), `/decks` (import/export).

---

# Item-by-item mapping

Four routes per item: test inside Bún · test outside · practise inside Bún · learn outside.

## 1. NGHE — Listening (23 items)

| Item | Test in Bún | Test outside | Practise in Bún | Learn outside |
|---|---|---|---|---|
| nghe-01 Nguyên âm /ɪ/–/iː/… | **T8** — 20 pairs per group, ≥18/20 | englishclub minimal-pairs · shiporsheep | T8 practice mode | shiporsheep, YouGlish |
| nghe-02 Phụ âm /θ/–/s/… | **T8** — same | same | T8 | same |
| nghe-03 Âm cuối -s/-z/-t/-d/-k/-p | **T3** — ending-heavy sentences; only ending words are scored, ≥90% | APEUni Write From Dictation | T3 + `/study` listen→type | Anki |
| nghe-04 Hậu tố -ment/-able/-tion… | **T1** listen→type, 30 Academic Word List words, ≥27/30 | APEUni Write From Dictation | `/study` listen→type | Anki |
| nghe-05 Trọng âm từ nhiều âm tiết | **T8** variant — play the word, pick the stressed syllable, compare to the `ˈ` mark in CMU | dictionary.cambridge.org | T8 | Cambridge Dictionary |
| nghe-06 Từ chức năng lướt | **T3** — only a/the/of/to/has/been are scored, ≥85% | APEUni Write From Dictation | T3 | — |
| nghe-07 Nối âm phụ âm + nguyên âm | **T3** — sentence bank with clear linking, ≥8/10 | APEUni Write From Dictation | `/read` chunk practice | — |
| nghe-08 Trọng âm câu, ngữ điệu | **T7** + listen to the model in `/read` | APEUni Read Aloud | `/read` read-along | YouGlish |
| nghe-09 New General Service List 1–1.500 khi nghe | **T1** listen→type, ≥90% | APEUni Answer Short Question | `/study` listen→type on an NGSL deck | Anki |
| nghe-10 New General Service List 1.500–2.800 khi nghe | **T1** listen→type, 30 words, ≥85% | — | `/study` listen→type | Anki |
| nghe-11 Academic Word List khi nghe | **T1** listen→type + meaning, ≥80% | — | `/study` listen→type | Anki |
| nghe-12 Từ khoa học / kinh tế | **T3** on science-topic sentences, count words not caught | APEUni Summarize Spoken Text | `/passage` science texts + glossary | — |
| nghe-13 Không bịa khi không nghe ra | **T3** — blanks allowed; **the machine can count** words typed that are not in the source | APEUni Write From Dictation | T3 | — |
| nghe-14 Tốc độ nhanh / accent Anh, Úc | **T3** with an en-GB / en-AU voice (`tts.ts` selects voices), compare % against US | APEUni Summarize Spoken Text | `/study` listen→type, different voice | BBC Learning English |
| nghe-15 Giữ câu 6–8 từ nguyên văn | **T3** — 10 sentences ≤8 words, one listen, ≥80% | APEUni Write From Dictation | T3 | — |
| nghe-16 Giữ câu 10–13 từ | **T3** — 10 long sentences, ≥70% | APEUni Write From Dictation | T3 | — |
| nghe-17 Chép theo âm, không dựng lại nghĩa | **T3** — app shows the word diff, **learner counts** reconstructed sentences and enters the number (no AI) | APEUni Write From Dictation | T3 | — |
| nghe-18 Chính tả từ đã biết khi viết nhanh | **T1** listen→type, 20s per word, 0 errors | — | `/speed` spelling mode (**exists**) | Anki |
| nghe-19 Bắt ý chính bài 60–90 giây | **T3** plays the long clip + **T5** exports the summary for an outside AI | APEUni Summarize Spoken Text | `/passage` + audio | — |
| nghe-20 Ghi keyword khi nghe | **T7** — compare notes to the transcript, report how many keywords matched | APEUni Re-tell Lecture | `/read` | — |
| nghe-21 Nghe và đọc song song | **T3** variant — play audio, show text with errors planted in the imported item, learner taps the wrong words | APEUni Highlight Incorrect Words | — | — |
| nghe-22 Nghe điền từ | **T3** variant — blank out words in the transcript, listen and fill | APEUni Fill in the Blanks | `/cloze` (text only, no audio) | — |
| nghe-23 Đoán từ cuối / chọn tóm tắt | **T7** — only needs "do you know the rule" | APEUni | — | — |

## 2. ĐỌC — Reading (29 items)

| Item | Test in Bún | Test outside | Practise in Bún | Learn outside |
|---|---|---|---|---|
| doc-01 New General Service List 1–1.500 (nghĩa) | **T1** — draw 50 words, Biết/Không biết or type the meaning, ≥47/50 | newgeneralservicelist.com | `/speed` en→vi + `/study` on an NGSL deck | Anki |
| doc-02 New General Service List 1.500–2.800 | **T1** — 50 words, ≥42/50 | newgeneralservicelist.com | `/speed`, `/study` | Anki |
| doc-03 Academic Word List sublist 1–3 | **T1** + part of speech, ≥40/50 | — | `/speed`, `/study` | Anki AWL deck |
| doc-04 Academic Word List sublist 4–10 | **T1** — 50 words, ≥35/50 | — | `/speed`, `/study` | Anki |
| doc-05 Phân biệt từ hình dạng giống nhau | **T2** — 20 pairs, pick the right meaning | — | `/speed` | — |
| doc-06 Collocation thông dụng | **T2** — 30 items; authored from Datamuse (`datamuse.ts` exists — a lookup API, not an AI) | — | `/cloze` | — |
| doc-07 Collocation học thuật | **T2** — built from the **2,468 collocations already sitting in `collocations-import/`** (currently unused by any code) | — | `/cloze` + a collocation deck | — |
| doc-08 Phrasal verb (100) | **T1/T2** — 30 items | — | `/study` phrasal-verb deck | Anki |
| doc-09 Đọc từ loại từ hậu tố | **T2** — 40 unknown words, part of speech only, ≥36/40 | — | T2 | — |
| doc-10 Tạo họ từ từ gốc | **T2** — 30 roots, supply N/V/Adj/Adv | — | T2 | — |
| doc-11 Hậu tố danh từ | **T2** — 20 roots → noun | — | T2 | — |
| doc-12 Hậu tố tính từ | **T2** — 20 roots → adjective | — | T2 | — |
| doc-13 Hậu tố động từ | **T2** — 20 roots → verb | — | T2 | — |
| doc-14 Hậu tố trạng từ | **T2** — 20 roots → adverb | — | T2 | — |
| doc-15 Tiền tố un-, dis-, re-… | **T2** — 20 words, pick the meaning | — | T2 | — |
| doc-16 Xác định từ loại cần điền | **T2** — 20 blanks, answer the part of speech | APEUni Fill in the Blanks | `/cloze` | — |
| doc-17 Fill in the Blanks dropdown | **T2** choice form | APEUni | `/cloze` MC mode (**exists**) | — |
| doc-18 Fill in the Blanks kéo thả | **T2** drag-and-drop form | APEUni | `/cloze` | — |
| doc-19 Tìm chủ ngữ / động từ chính | **T2** — tap words in a 25–35 word sentence, key ships with the item, ≥9/10 | — | `/passage` grammar analysis (**exists**) | — |
| doc-20 Mệnh đề quan hệ / rút gọn | **T2** — pick the clause and the word it modifies | — | `/passage` | Murphy |
| doc-21 Đảo ngữ, cleft, bị động | **T2** recognition + **T5** export the rewritten sentences | — | `/passage` | Murphy |
| doc-22 Từ nối & đại từ tham chiếu | **T6** — reorder sentences, key ships with the item | APEUni Re-order Paragraphs | `/passage` | — |
| doc-23 Cấu trúc đoạn | **T6** — pick the topic sentence and the example sentence, 4/5 | — | `/passage` | — |
| doc-24 Skimming | **T6** — 2-minute clock, pick the main idea from 4 options (multiple choice instead of free writing, to avoid needing a grader) | — | `/passage` | — |
| doc-25 Scanning | **T6** — 10 detail questions, 5-minute clock, ≥8/10 | — | `/passage` | — |
| doc-26 Đoán nghĩa từ ngữ cảnh | **T6** — 10 unknown words, pick the meaning from 4 options | — | `/read` glossary (**exists**) | — |
| doc-27 Summarize Written Text | **T5** — write the one-sentence summary, export it | APEUni | `/passage` | — |
| doc-28 Multiple Choice đọc | **T6** — 3 items per type, with the negative-marking rule | APEUni | `/passage` | — |
| doc-29 Quản lý thời gian Reading | **T6** — 29–30 minute mock, measures whether everything got answered | APEUni mock | — | — |

## 3. VIẾT — Writing (62 items)

The 46 grammar items `viet-01`…`viet-46` all share **T2**: each item is one topic with a bank of
≥25 usable questions (authored in batches of 30; frequently-failed topics build up to ~75). Each
run draws 10 — preferring unseen questions and ones previously failed — and ≥9/10 passes.
Shared outside test: Cambridge "Test your English", the end-of-book tests in Murphy. Shared
outside study: Murphy, writeandimprove.com.

| Item | Test in Bún | Item-specific note |
|---|---|---|
| viet-01…viet-13 (ngữ pháp A2) | **T2**, 10 questions | viet-03 also covers 50 irregular verbs → **T1** on a verb deck |
| viet-14…viet-31 (ngữ pháp B1) | **T2**, 10 questions | viet-24 → T2 as a 120-word paragraph with 5 tense slips |
| viet-32…viet-40 (ngữ pháp B2) | **T2**, 10 questions | viet-33, viet-35 are sentence rewrites → T2 choice form + **T5** export for the written version |
| viet-41 comma splice | **T2** — 150-word paragraph, find 5 errors | app compares error positions |
| viet-42 dấu phẩy | **T2** — place commas in 10 sentences | |
| viet-43 tham chiếu rõ | **T5** — mark each pronoun and what it refers to, export | |
| viet-44 chính tả 500 từ hay sai | **T1** listen→type, 30 words, ≥29/30 | practise with `/speed` spelling mode (**exists**) |
| viet-45 chấm phẩy, hai chấm, gạch ngang | **T2**, 10 questions | |
| viet-46 viết hoa, dấu chấm, khoảng trắng | **T5b** — string search, 0 errors | no AI needed |

| Item | Test in Bún | Test outside | Practise in Bún | Learn outside |
|---|---|---|---|---|
| viet-47 Tự sinh collocation đúng | **T5** — write 150 words, export for error counting | — | `/cloze`, collocation deck | — |
| viet-48 Từ nối theo 6 chức năng | **T5** — 250-word essay, export | writeandimprove | `/compose` | — |
| viet-49 Register học thuật | **T5** — rewrite the paragraph, export | writeandimprove | `/compose` | — |
| viet-50 Dùng Academic Word List trong bài | **T5b** — **countable**: match words from the AWL deck against the text, ≥6 | — | `/compose` | — |
| viet-51 Số liệu & xu hướng | **T5** — describe a chart in 5 sentences, export | — | `/compose` | — |
| viet-52 Paraphrase | **T5** — rewrite 5 sentences, export | — | `/passage` | — |
| viet-53 Nêu lập trường ở mở bài | **T5** — export with the criteria | writeandimprove | `/compose` | — |
| viet-54 Chia đoạn mở–thân–kết | **T5b** — count paragraphs, expect 4 | writeandimprove | `/compose` | — |
| viet-55 Đoạn thân theo Point–Explanation–Example–Link | **T5** — export with the four-part criteria | — | `/compose` | — |
| viet-56 Kết bài tóm ý | **T5** — export | — | `/compose` | — |
| viet-57 Độ dài các dạng bài | **T5b** — **word count**, no grader needed | — | `/compose` | — |
| viet-58 Ngôi học thuật | **T5b** — **string search** for "you / I", expect 0 | — | `/compose` | — |
| viet-59 Template viết từ trí nhớ | `/templates` **already does this** (MemorizeTrainer + SlotQuiz, string-compared, no AI) — it just never saves the score | — | `/templates` | — |
| viet-60 Summarize Written Text | **T5** — export | APEUni | `/passage` | — |
| viet-61 Summarize Spoken Text | **T3** listen + **T5** export the summary | APEUni | `/passage` | — |
| viet-62 Write Essay 20 phút | **T5** + 20-minute clock; length and timing scored in-app, content exported | APEUni | `/compose` with a timer | writeandimprove |

## 4. NÓI — Speaking (27 items)

| Item | Test in Bún | Test outside | Practise in Bún | Learn outside |
|---|---|---|---|---|
| noi-01 Nguyên âm | **T4** — read 20 pairs, both words recognised, ≥18/20 | APEUni Read Aloud · ELSA | `/pronounce` (**exists**, word level) | ELSA Speak |
| noi-02 Phụ âm | **T4** — same | APEUni · ELSA | `/pronounce` | ELSA |
| noi-03 Âm cuối -s/-ed/-t/-d/-k/-l | **T4** — 20 words with endings, ≥18/20 | APEUni · ELSA | `/pronounce` | ELSA |
| noi-04 Trọng âm từ 3+ âm tiết | **T8** — read 20 words, mark the stress, app compares to CMU | dictionary.cambridge.org | `/pronounce` | Cambridge |
| noi-05 Nối âm | **T4** at sentence level — count places that should link but did not | APEUni Read Aloud | `/read` chunk practice (**exists**) | — |
| noi-06 Trọng âm câu | **T7** + listen to the model in `/read` | APEUni Read Aloud | `/read` | — |
| noi-07 Ngữ điệu & ngắt theo dấu câu | **T7** + `/read` karaoke | APEUni Read Aloud | `/read` | — |
| noi-08 Read Aloud tổng hợp | **T4** at sentence level — % of words recognised, ≥85% | APEUni Read Aloud | T4 | — |
| noi-09 Nói liên tục 40 giây | **T7** ⛔ the app cannot measure pauses | APEUni Describe Image | — | — |
| noi-10 Không "ừm / à" | **T7** ⛔ | APEUni | — | — |
| noi-11 Tốc độ đều | **T7** ⛔ | APEUni | — | — |
| noi-12 Nhắc lại câu 8–12 từ | **T4** — TTS reads, learner repeats, word match ≥70% | APEUni Repeat Sentence | T4 | — |
| noi-13 Nhắc lại câu 13+ từ | **T4** — ≥60% | APEUni Repeat Sentence | T4 | — |
| noi-14 Nói 2 phút không chuyển tiếng Việt | **T4** continuous mode → **app scans the transcript for Vietnamese words** | APEUni | T4 | — |
| noi-15 Nói 4 phút có lập luận | **T4** produces the transcript + **T5** exports it for the five-part check | APEUni | T4 | — |
| noi-16 Hoà hợp chủ ngữ–động từ khi nói | **T4** + **T5** export the transcript | APEUni | T4 | — |
| noi-17 Câu ghép because / so / which | **T4** + **T5b** count because/so/which in the transcript | — | T4 | — |
| noi-18 Mạo từ & số nhiều khi nói | **T4** + **T5** export the transcript | — | T4 | — |
| noi-19 Từ xu hướng (Describe Image) | **T4** + **T5b** count trend words against a list; needs a chart-image bank | APEUni Describe Image | `/templates` | — |
| noi-20 Paraphrase ý người khác | **T4** + **T5b** detect runs of >6 words copied from the source | APEUni Re-tell Lecture | `/templates` | — |
| noi-21 Từ vựng học thuật khi nói | **T4** + **T5b** count Academic Word List words in the transcript | — | T4 | — |
| noi-22 Template thuộc lòng | `/templates` **already does this** — it just never saves the score | — | `/templates` | — |
| noi-23 Dùng template trơn | **T7** — listen back and count stumbles | APEUni Describe Image | `/templates` karaoke | — |
| noi-24 Ghi keyword trong lúc nghe | **T7** | APEUni Re-tell Lecture | `/read` | — |
| noi-25 Chuẩn bị Describe Image trong 25 giây | **T7** + a 25-second clock | APEUni | `/templates` | — |
| noi-26 Kỹ thuật mic | **T7** ⛔ entirely out of reach for a web app | APEUni mock | — | — |
| noi-27 Answer Short Question 3 giây | **T4** — short question + 3-second countdown + recognition | APEUni | T4 | — |

---

# Coverage

Every item gets exactly one primary tool, so the counts below add up to 141.

| Tool | Items | Which ones |
|---|---|---|
| T1 word-list check | **11** | nghe-04, 09, 10, 11, 18 · doc-01, 02, 03, 04, 08 · viet-44 |
| T2 grammar & word-form drill | **59** | doc-05, 06, 07, 09→21 · viet-01→42, 45 |
| T3 sentence dictation | **12** | nghe-03, 06, 07, 12, 13, 14, 15, 16, 17, 19, 21, 22 |
| T4 read aloud / speech recognition | **16** | noi-01, 02, 03, 05, 08, 12→21, 27 |
| T5 export for an outside AI | **13** | doc-27 · viet-43, 47, 48, 49, 51, 52, 53, 55, 56, 60, 61, 62 |
| T5b mechanical proofreading | **5** | viet-46, 50, 54, 57, 58 |
| T6 timed reading comprehension | **7** | doc-22, 23, 24, 25, 26, 28, 29 |
| T7 guided self-report | **12** | nghe-08, 20, 23 · noi-06, 07, 09, 10, 11, 23, 24, 25, 26 |
| T8 minimal pairs & stress | **4** | nghe-01, 02, 05 · noi-04 |
| Already in `/templates`, only needs score saving | **2** | viet-59, noi-22 |
| **Total** | **141** | |

Five items need two tools: `nghe-19` (T3 → T5), `doc-21` (T2 → T5), `viet-33`, `viet-35` (T2 → T5),
`viet-61` (T3 → T5). Items `noi-15`→`noi-21` use T4 for the transcript then T5/T5b on top; T4 stays
the primary tool so they are counted once.

**Four items the web genuinely cannot do**: `noi-09`, `noi-10`, `noi-11`, `noi-26`. There is no
`MediaRecorder` / `getUserMedia` anywhere in `src/` — the browser hands back **text**, never audio
— so pauses, filler sounds and speaking rate cannot be measured. These stay self-report.

---

# Phases and estimates

| Phase | Work | Items added | Cumulative | Code est. | Content est. |
|---|---|---|---|---|---|
| 0 | Infrastructure: `roadmap_test_runs` table, machine-readable threshold columns on `roadmap_items`, the "Tự kiểm tra" button, auto-writing ✓/✗, the "Copy để nhờ AI chấm" button | 0 | 0 | ~0.5 day | — |
| 1 | **T1** + fetch the word lists + export unknown words into a deck | 11 | 11 | ~1.5 days | ~2 h |
| 2 | **T2** + the authoring screen + JSON import | 59 | 70 | ~2 days | **~28 h, spread over weeks** |
| 3 | **T7** + **T5b** + save `/templates` scores | 19 | 89 | ~1 day | ~1 h |
| 4 | **T3** + **T4** | 28 | 117 | ~2 days | ~4 h |
| 5 | **T5** + **T6** | 20 | 137 | ~1.5 days | ~3 h |
| 6 | **T8** | 4 | 141 | ~1 day | ~1 h |
| | **Total** | | | **~9.5 days** | **~39 h** |

⚠️ These are **rough estimates, not commitments**. A "day" means a day of writing code for this,
excluding review rounds. Phase 2 is the one most likely to slip.

After phase 3 the coverage is **89/141**, and phase 3 is cheap because T7 and T5b are little more
than forms and string counting.

### Why authoring is the long pole

T2 covers 59 items. One **batch** is 30 questions and takes about **20 minutes** end to end
(write once, verify twice, resolve disputes, import).

- 59 baseline batches (one per topic, ~25 usable questions) → ~20 h
- ~26 top-up batches for 13 frequently-failed topics (two more each → ~75 questions) → ~9 h
- **~85 batches ≈ 28 h ≈ 2,550 raw questions, ~2,100 after filtering**

At three batches a day that is about a month. **You do not need the full set to start** — a topic
becomes testable as soon as its first batch lands, so phase 2 should do the 13 A2 grammar topics
first.

---

# Running it with several agents at once

Two kinds of parallel work, and they behave very differently.

## Kind 1 — authoring: parallelises freely

The 59 topics are independent and touch no shared files. Each agent takes **one topic**, runs all
three steps (write → verify ×2 → arbiter if needed), writes
`content/roadmap-drills/<item_key>-b<batch>.json`, and ticks the checklist.

Critical: the two verification passes must run in **different sessions/models** from the authoring
pass, otherwise the model is just agreeing with itself. A coordinating agent should spawn three
separate sub-agents rather than doing all three steps in one stretch.

How many at once is your call; 5–8 keeps the output reviewable.

## Kind 2 — code: parallelises only after phase 0

**Phase 0 blocks everything.** It creates the results table, the threshold columns, the
"Tự kiểm tra" button and the auto-tick mechanism — every tool plugs into those.

After that the eight tools are nearly independent. One **git worktree per lane**:

| Lane | Tool | Owns | Migration reserved |
|---|---|---|---|
| A | T1 word-list check | `src/app/roadmap/test/wordlist/`, `src/lib/roadmap-tests/wordlist/` | `0025` |
| B | T2 drill + authoring screen | `…/drill/` | `0026` |
| C | T3 dictation | `…/dictation/` | `0027` |
| D | T4 read aloud | `…/readaloud/` | `0028` |
| E | T5 export + T5b proofreading | `…/writing/` | `0029` |
| F | T6 timed reading | `…/reading/` | `0030` |
| G | T7 self-report | `…/selfreport/` | `0031` |
| H | T8 minimal pairs | `…/minimalpair/` + `scripts/build-minimal-pairs.mjs` | `0032` |

**Three hard rules — this is where parallel agents collide:**

1. **Migration numbers are assigned up front, as above.** No lane picks its own; two lanes both
   creating `0025_*.sql` breaks both. A lane that needs no migration leaves its number unused.
2. **No lane edits a shared file.** Specifically `src/lib/types.ts`,
   `src/components/roadmap/RoadmapItemRow.tsx`, `src/components/Sidebar.tsx`,
   `src/app/dashboard/page.tsx`, `src/lib/db.ts`. Each lane declares its own types in
   `src/lib/roadmap-tests/<tool>/types.ts` and its own DB wrapper in the same folder. Wiring a
   tool into the "Tự kiểm tra" button happens in a **single integration pass**, not per lane.
3. **Each lane runs `npx tsc --noEmit` in its own worktree before reporting done**, and states
   explicitly what was and was not tested.

**Suggested order**: phase 0 → lanes A, B, G in parallel → integration pass → lanes C, D, E, F, H
in parallel → integration pass. A, B and G come first because together they cover 89 of 141 items.

---

# Checklists

## Code

- [ ] **Phase 0 — infrastructure** (blocks every lane)
  - [ ] migration `0024`: `roadmap_test_runs` table
  - [ ] machine-readable threshold columns on `roadmap_items` (generate with `gen-roadmap-seed.mjs --sync`)
  - [ ] "Tự kiểm tra" button in `RoadmapItemRow`
  - [ ] auto-write ✓/✗ into `roadmap_progress`
  - [ ] "Copy để nhờ AI chấm" button
  - [ ] `tsc` clean
- [ ] **Lane A — T1 word-list check** (11 items)
  - [ ] fetch and build the 4 word lists
  - [ ] migration `0025`
  - [ ] test screen (Biết/Không biết, type meaning, listen→type)
  - [ ] "add unknown words to a deck" action
  - [ ] `tsc` clean
- [ ] **Lane B — T2 drill + authoring screen** (59 items)
  - [ ] migration `0026`
  - [ ] JSON import screen with preview and structure errors
  - [ ] manual question editor
  - [ ] drill runner (draws 10, prefers unseen/previously-failed)
  - [ ] `tsc` clean
- [ ] **Lane G — T7 self-report** (12 items)
  - [ ] migration `0031` (if needed)
  - [ ] guided form + mapping to ✓/✗
  - [ ] `tsc` clean
- [ ] **Integration pass 1** — wire A / B / G into the shared files
- [ ] **Lane C — T3 dictation** (12 items) · migration `0027`
- [ ] **Lane D — T4 read aloud** (16 items) · migration `0028`
- [ ] **Lane E — T5 export + T5b** (18 items) · migration `0029`
- [ ] **Lane F — T6 timed reading** (7 items) · migration `0030`
- [ ] **Lane H — T8 minimal pairs** (4 items) · migration `0032`
- [ ] **Integration pass 2**
- [ ] Save `/templates` scores (viet-59, noi-22)

## Authoring — 59 T2 topics

"Còn lại" = questions surviving the filter. Below 20 means a top-up batch is needed.

| Topic | Write | Verify 1 | Verify 2 | Resolve | Import | Còn lại |
|---|---|---|---|---|---|---|
| doc-05 Phân biệt từ hình dạng giống nhau | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| doc-06 Collocation thông dụng | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| doc-07 Collocation học thuật | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| doc-09 Đọc từ loại từ hậu tố | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| doc-10 Tạo họ từ từ gốc | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| doc-11 Hậu tố danh từ | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| doc-12 Hậu tố tính từ | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| doc-13 Hậu tố động từ | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| doc-14 Hậu tố trạng từ | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| doc-15 Tiền tố un-, dis-, re-… | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| doc-16 Xác định từ loại cần điền | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| doc-17 Fill in the Blanks dropdown | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| doc-18 Fill in the Blanks kéo thả | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| doc-19 Tìm chủ ngữ / động từ chính | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| doc-20 Mệnh đề quan hệ / rút gọn | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| doc-21 Đảo ngữ, cleft, bị động | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| ⭐ viet-01 Hiện tại đơn, -s ngôi 3 | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| ⭐ viet-02 Hiện tại tiếp diễn vs đơn | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| ⭐ viet-03 Quá khứ đơn + động từ bất quy tắc | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| ⭐ viet-04 Hiện tại hoàn thành | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| ⭐ viet-05 for / since / ago / in / during | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| ⭐ viet-06 Hoàn thành vs quá khứ đơn | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| ⭐ viet-07 some / any / much / many / a few | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| ⭐ viet-08 So sánh hơn / nhất / as…as | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| ⭐ viet-09 Modal must / have to / should / might | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| ⭐ viet-10 Mạo từ a / an / the | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| ⭐ viet-11 Giới từ thời gian in / on / at | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| ⭐ viet-12 Giới từ nơi chốn & đi với động từ | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| ⭐ viet-13 Vị trí trạng từ | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-14 Điều kiện loại 0 và 1 | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-15 Điều kiện loại 2 | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-16 Mệnh đề quan hệ | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-17 Defining vs non-defining | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-18 Bị động mọi thì + với modal | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-19 Câu gián tiếp, lùi thì | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-20 Gerund vs infinitive | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-21 Verb pattern suggest / advise / let | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-22 Danh từ không đếm được | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-23 Although / despite / however | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-24 Nhất quán thì trong đoạn | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-25 find it + adj + to V | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-26 Cụm mở đầu thời gian | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-27 Từ nối besides / therefore / for example | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-28 used to / be used to / get used to | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-29 Quá khứ hoàn thành, hoàn thành tiếp diễn | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-30 so / such / too / enough | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-31 both / either / neither / not only | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-32 Điều kiện loại 3 và hỗn hợp | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-33 Đảo ngữ No sooner / Hardly / Not only | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-34 Mệnh đề rút gọn | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-35 Cleft sentence | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-36 Hoà hợp chủ ngữ – động từ | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-37 Modal hoàn thành must have / can't have | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-38 Danh hoá | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-39 Mệnh đề danh từ what / that / whether | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-40 wish / if only / would rather | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-41 Comma splice | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-42 Dấu phẩy với and / but / so | [ ] | [ ] | [ ] | [ ] | [ ] | – |
| viet-45 Chấm phẩy, hai chấm, gạch ngang | [ ] | [ ] | [ ] | [ ] | [ ] | – |

⭐ = the 13 A2 topics to do first, and the ones that should build up to ~75 questions.

## Word lists (phase 1)

- [ ] New General Service List (~2,800 words, with the 1–1,500 / 1,500–2,800 split)
- [ ] Academic Word List (570 word families, sublists 1–10)
- [ ] 100 common phrasal verbs
- [ ] 500 commonly misspelled words
- [ ] Vietnamese glosses for each (the app already ships `public/envi-dict.json`, ~90k headwords)
