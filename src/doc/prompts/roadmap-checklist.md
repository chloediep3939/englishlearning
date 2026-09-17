# Lộ trình / Checklist 4 kỹ năng — nguồn nội dung

> Ngày: 2026-09-16
> Yêu cầu gốc của user: "https://claude.ai/artifact/EwQVCXyXTGQtWjDcF8w9AN đây là
> lộ trình các thứ cần biết của 1 kĩ năng, tôi muốn lưu lại nó trên bún, để 1 ng
> khi học có thể nắm rõ toàn cảnh mình cần gì và thiếu gì thì mình nên đưa nó vào
> project sao"
>
> Quyết định sau khi hỏi lại:
> - Nội dung checklist nằm trong bảng D1 (`roadmap_items`), seed bằng migration.
> - Tiến độ per-user trong `roadmap_progress` (trạng thái + ghi chú + ngày test).
> - Phase 1 đầy đủ: badge "cần test lại sau 4 tuần" + ô tóm tắt trên /dashboard.
> - Chưa nối mục checklist sang các module luyện tập của Bún (để phase sau).

**File này là nguồn sự thật cho seed data.** `scripts/gen-roadmap-seed.mjs` đọc
file này và sinh ra phần INSERT của `migrations/0021_roadmap.sql`. Sửa nội dung
checklist ở đây rồi chạy lại script → không sửa tay SQL.

Cú pháp parser cần giữ nguyên:

- `## SKILL: <code> — <Tên>` mở một kỹ năng.
- `### GROUP: <Tên nhóm>` mở một nhóm trong kỹ năng đó.
- Bảng 3 cột `| Mục | Cách test | Đạt khi |` ngay dưới mỗi GROUP.
- `## TOOLS` mở bảng công cụ 3 cột `| Việc | Công cụ | Ghi chú |`.
- `item_key` được sinh là `<code>-NN` theo thứ tự xuất hiện trong kỹ năng.
  **Không đổi thứ tự các dòng đã seed** — key là khoá liên kết với tiến độ của
  user. Thêm mục mới thì thêm vào cuối kỹ năng.

---

## INTRO

Mọi mục cần học để đạt B2, chưa đánh dấu gì. Mỗi mục có cách test cụ thể và
ngưỡng đạt. Test xong ghi ✓ / ✗ vào cột đầu; mục nào ✗ thì mới học. Không học
mục đã ✓.

Cột **Cách test** chỉ có 4 kiểu:

- **Đề mình ra** — bạn nhắn `test` + tên mục. Mình gửi đề trong chat (10 câu, 30
  từ, hoặc 1 đoạn để sửa). Bạn làm, gửi lại, mình chấm và đánh ✓ / ✗.
- **APEUni** — làm trên app, chụp màn hình kết quả gửi mình.
- **Ghi âm** — mình không nghe được file audio, nên bạn ghi âm rồi làm một trong
  hai: (a) tự nghe lại, chép ra chữ, gửi mình; hoặc (b) dùng phần nhận diện từ
  của APEUni / Google Docs voice typing, chụp màn hình gửi mình.
- **Site ngoài** — link ở bảng Công cụ cuối file.

Luật làm: không tra, không chuẩn bị, làm một lần. Cột **Đạt khi** là ngưỡng để
đánh ✓. Chưa tới ngưỡng thì ✗ và mục đó vào kế hoạch học.

Ngưỡng đặt ở mức "xong mục" cho B2. Mục nào có bằng chứng ✓ thì không luyện nữa;
mục ✗ mới đưa vào kế hoạch. Mỗi mục test lại sau 4 tuần nếu đã luyện.

---

## SKILL: nghe — Nghe

### GROUP: Tầng âm — nghe ra từng âm

| Mục | Cách test | Đạt khi |
| --- | --- | --- |
| Nguyên âm /ɪ/–/iː/, /æ/–/e/–/ʌ/, /ɒ/–/ɔː/, /ʊ/–/uː/ | Minimal pair quiz trên englishclub.com hoặc shiporsheep.com: 20 cặp mỗi nhóm, nghe chọn từ. | ≥ 18/20 mỗi nhóm |
| Phụ âm /θ/–/s/, /ð/–/d/, /v/–/w/, /ʃ/–/s/, /tʃ/–/dʒ/, /r/–/l/ | Như trên, 20 cặp mỗi nhóm. | ≥ 18/20 mỗi nhóm |
| Âm cuối -s / -z / -t / -d / -k / -p | Write From Dictation 10 câu APEUni. Đếm riêng những từ có đuôi -s / -ed trong transcript và số bạn chép đúng đuôi. | ≥ 90% đuôi đúng |
| Hậu tố nhiều âm tiết -ment / -able / -tion / -er / -ing | Mình không phát được audio. Dùng Anki: mình xuất deck 30 từ Academic Word List, mặt trước chỉ có audio (không hiện chữ), bạn nghe và gõ từ. Hoặc APEUni Write From Dictation: chọn 10 câu, chỉ chấm những từ có hậu tố này. | ≥ 27/30 đúng chính tả |
| Trọng âm từ nhiều âm tiết | Mình gửi 20 từ 3+ âm tiết. Bạn nghe từng từ trên dictionary.cambridge.org, đánh dấu âm tiết nhấn, gửi lại. | ≥ 17/20 |
| Từ chức năng lướt: a / the / of / to / has / been | Write From Dictation 10 câu. Đếm riêng từ chức năng trong transcript và số chép đúng. | ≥ 85% |
| Nối âm phụ âm + nguyên âm | APEUni Write From Dictation: mình chỉ 10 câu có nối âm rõ, bạn nghe 1 lần, chép. | ≥ 8/10 câu đúng chỗ nối |
| Trọng âm câu, ngữ điệu | APEUni Read Aloud: mình chỉ 10 câu, bạn nghe audio mẫu, gạch từ được nhấn, gửi mình so. | ≥ 8/10 |

### GROUP: Tầng từ — nhận ra từ khi nghe

| Mục | Cách test | Đạt khi |
| --- | --- | --- |
| New General Service List 1–1.500 khi nghe | Answer Short Question 20 câu APEUni. | ≥ 90% |
| New General Service List 1.500–2.800 khi nghe | Anki deck mình xuất: 30 từ, mặt trước chỉ audio, bạn nghe và gõ. | ≥ 85% |
| Academic Word List khi nghe | Anki deck mình xuất: 30 từ Academic Word List, mặt trước chỉ audio, bạn gõ từ + nghĩa. | ≥ 80% chép đúng |
| Từ khoa học / kinh tế phổ thông | 2 bài Summarize Spoken Text chủ đề khoa học, gạch từ không nghe ra, so transcript. | ≤ 3 từ/bài không nghe ra |
| Không bịa khi không nghe ra | Write From Dictation 10 câu, luật: không chắc thì để trống. Sau đó đếm từ bạn viết mà không có trong transcript và không gần âm. | 0 từ bịa |
| Nhận ra từ khi tốc độ nhanh / accent Anh, Úc | 3 bài Summarize Spoken Text accent Anh hoặc Úc; so % từ nghe ra với bài accent Mỹ. | Chênh ≤ 15% |

### GROUP: Tầng bộ nhớ và xử lý

| Mục | Cách test | Đạt khi |
| --- | --- | --- |
| Giữ câu 6–8 từ nguyên văn | Write From Dictation 10 câu ≤ 8 từ, nghe 1 lần. | ≥ 80% từ đúng |
| Giữ câu 10–13 từ nguyên văn | Write From Dictation 10 câu 10–13 từ, nghe 1 lần. | ≥ 70% từ đúng |
| Chép theo âm, không dựng lại theo nghĩa | Write From Dictation 10 câu. Đếm câu có ngữ pháp khác gốc nhưng nghĩa giống (vd has invested in → need to invest). | ≤ 1/10 câu bị dựng lại |
| Chính tả từ đã biết khi viết nhanh | Anki deck mình xuất: 30 từ New General Service List hay sai chính tả, mặt trước chỉ audio, gõ trong 20 giây/từ. | 0 lỗi chính tả |
| Bắt ý chính bài dài 60–90 giây | Summarize Spoken Text 3 bài APEUni. So bản viết với đáp án mẫu: đếm ý chính có/thiếu. | ≥ 3/4 ý mỗi bài |
| Ghi keyword khi nghe | Re-tell Lecture 5 bài: ghi chú xong, so với transcript, đếm keyword đúng. | ≥ 6 keyword/bài |
| Nghe và đọc song song (Highlight Incorrect Words) | 5 bài Highlight Incorrect Words APEUni. | ≥ 85% |
| Nghe điền từ (Listening Fill in the Blanks) | 5 bài APEUni. | ≥ 70% |
| Nghe câu cuối đoán từ (Select Missing Word), chọn tóm tắt (Highlight Correct Summary) | 3 bài mỗi dạng. | ≥ 2/3 — chỉ cần biết luật |

---

## SKILL: doc — Đọc

### GROUP: Từ vựng

| Mục | Cách test | Đạt khi |
| --- | --- | --- |
| New General Service List 1–1.500 (nghĩa) | 50 từ ngẫu nhiên (mình ra hoặc Anki), viết nghĩa Việt. | ≥ 47/50 |
| New General Service List 1.500–2.800 (nghĩa) | 50 từ ngẫu nhiên. | ≥ 42/50 |
| Academic Word List sublist 1–3 (nghĩa + từ loại) | 50 từ ngẫu nhiên, viết từ loại + nghĩa. | ≥ 40/50 cả hai đúng |
| Academic Word List sublist 4–10 | 50 từ ngẫu nhiên. | ≥ 35/50 |
| Phân biệt từ hình dạng giống nhau | 20 cặp (distribute/contribute, affect/effect, adapt/adopt, economic/economical…), chọn nghĩa đúng cho mỗi từ. | ≥ 18/20 |
| Collocation thông dụng | 30 câu chọn từ (mình ra). | ≥ 27/30 |
| Collocation học thuật | 30 câu từ Academic Collocation List. | ≥ 24/30 |
| Phrasal verb thông dụng (100) | 30 câu điền phrasal verb. | ≥ 24/30 |

### GROUP: Hình thái từ — nền của Fill in the Blanks

| Mục | Cách test | Đạt khi |
| --- | --- | --- |
| Đọc từ loại từ hậu tố | 40 từ bạn chưa biết nghĩa, chỉ ghi từ loại dựa đuôi. | ≥ 36/40 |
| Tạo họ từ từ gốc | 30 gốc, viết N / V / Adj / Adv (dạng nào có). | ≥ 25 gốc đủ và đúng |
| Hậu tố danh từ -tion/-sion, -ment, -ness, -ity, -ance/-ence, -er/-or, -ism, -ship | 20 gốc → danh từ. | ≥ 18/20 |
| Hậu tố tính từ -ive, -al, -ous, -ful, -less, -able/-ible, -ent/-ant, -ic, -y | 20 gốc → tính từ. | ≥ 18/20 |
| Hậu tố động từ -ize, -ify, -en, -ate | 20 gốc → động từ. | ≥ 17/20 |
| Hậu tố trạng từ -ly và các trạng từ bất quy tắc (well, fast, hard) | 20 gốc → trạng từ. | ≥ 19/20 |
| Tiền tố un-, in-/im-/il-/ir-, dis-, re-, mis-, over-, under-, pre-, post-, anti- | 20 từ có tiền tố, đoán nghĩa không tra. | ≥ 16/20 |
| Xác định từ loại cần điền từ ngữ cảnh | Fill in the Blanks drag & drop 20 chỗ trống, chỉ trả lời từ loại + lý do (sau mạo từ, sau be, trước danh từ…). | ≥ 18/20 |
| Chọn đúng từ trong Fill in the Blanks dropdown | 5 bài APEUni, ghi lý do chọn từng chỗ. | ≥ 60% |
| Chọn đúng từ trong Fill in the Blanks drag & drop | 5 bài APEUni. | ≥ 60% |

### GROUP: Ngữ pháp phục vụ đọc

| Mục | Cách test | Đạt khi |
| --- | --- | --- |
| Tìm chủ ngữ và động từ chính của câu dài | 10 câu 25–35 từ, gạch S chính và V chính. | ≥ 9/10 |
| Nhận diện mệnh đề quan hệ và mệnh đề rút gọn, biết nó bổ nghĩa cho từ nào | 10 câu, khoanh mệnh đề và nối mũi tên tới từ được bổ nghĩa. | ≥ 8/10 |
| Hiểu đảo ngữ, cleft, bị động | 10 câu, viết lại thành câu thường cùng nghĩa. | ≥ 8/10 |
| Từ nối và đại từ tham chiếu (this, such, the former / latter, it) | Re-order Paragraphs 5 bài, giải thích lý do ghép từng cặp câu. | ≥ 80% cặp đúng có lý do |
| Cấu trúc đoạn: câu chủ đề – hỗ trợ – ví dụ | 5 đoạn, chỉ ra câu chủ đề và câu ví dụ. | ≥ 4/5 |

### GROUP: Kỹ thuật đọc

| Mục | Cách test | Đạt khi |
| --- | --- | --- |
| Skimming — lấy ý chính nhanh | 3 bài 800 từ, 2 phút/bài, viết ý chính 1 câu. | 3/3 đúng |
| Scanning — tìm chi tiết | 1 bài 800 từ + 10 câu hỏi chi tiết, 5 phút. | ≥ 8/10 |
| Đoán nghĩa từ lạ từ ngữ cảnh | 10 từ lạ trong đoạn, không tra, viết nghĩa đoán và manh mối. | ≥ 6/10 gần đúng, có manh mối hợp lý |
| Summarize Written Text — bắt ý chính đoạn 300 từ | 5 bài APEUni. | ≥ 85% content |
| Multiple Choice đọc (single / multiple) — biết luật điểm trừ | 3 bài mỗi loại, ghi số đáp án chọn ở Multiple Choice Multiple answers. | ≥ 2/3, Multiple Choice Multiple answers chọn ≤ 2 |
| Quản lý thời gian phần Reading | 1 mock phần Reading (29–30 phút). | Làm hết, không bỏ câu, dư ≥ 1 phút |

---

## SKILL: viet — Viết

> SKILLNOTE: Với mỗi mục ngữ pháp: test = 10 câu mình ra (điền hoặc sửa lỗi) + soát 3 bài viết gần nhất. Đạt khi ≥ 9/10 và 0 lỗi mục đó trong 3 bài viết. Cột "cách test" dưới đây ghi dạng câu mình sẽ ra.

### GROUP: Ngữ pháp A2

| Mục | Cách test | Đạt khi |
| --- | --- | --- |
| Hiện tại đơn, -s ngôi 3 | 10 câu chia động từ. | 9/10 + 0 lỗi bài viết |
| Hiện tại tiếp diễn vs đơn | 10 câu chọn thì. | 9/10 |
| Quá khứ đơn + 50 động từ bất quy tắc | 10 câu chia + đọc 50 V2 trong 3 phút. | 9/10 + 48/50 |
| Hiện tại hoàn thành: dạng have/has + V3 | 10 câu chia. | 9/10 |
| for / since / ago / in / during | 10 câu điền. | 9/10 |
| Hoàn thành vs quá khứ đơn | 10 câu chọn thì. | 9/10 |
| some / any / much / many / a few / a little | 10 câu điền. | 9/10 |
| So sánh hơn / nhất / as…as | 10 câu viết lại. | 9/10 |
| Modal: must / mustn't / have to / don't have to / should / might | 10 câu chọn. | 9/10 |
| Mạo từ a / an / the / không mạo từ | Đoạn 100 từ bỏ mạo từ, điền lại (15 chỗ). | ≥ 13/15 |
| Giới từ thời gian in / on / at | 10 câu điền. | 10/10 |
| Giới từ nơi chốn và giới từ đi với động từ (depend on, consist of…) | 10 câu điền. | 9/10 |
| Vị trí trạng từ (always, usually, often, also) | 10 câu đặt trạng từ. | 9/10 |

### GROUP: Ngữ pháp B1

| Mục | Cách test | Đạt khi |
| --- | --- | --- |
| Điều kiện loại 0 và 1 | 10 câu chia. | 9/10 |
| Điều kiện loại 2 | 10 câu chia. | 9/10 |
| Mệnh đề quan hệ who / which / that / whose / where / when | 10 câu nối. | 9/10 |
| Defining vs non-defining (dấu phẩy) | 10 câu đặt dấu phẩy. | 8/10 |
| Bị động mọi thì + với modal | 10 câu đổi. | 9/10 |
| Câu gián tiếp, lùi thì | 10 câu đổi. | 9/10 |
| Gerund vs infinitive (remember / stop / try / forget / regret) | 10 câu chọn. | 9/10 |
| Verb pattern: suggest / recommend / advise / want / make / let / allow | 10 câu sửa lỗi. | 9/10 |
| Danh từ không đếm được (information, advice, research, equipment, furniture, evidence) | 10 câu sửa lỗi. | 10/10 |
| Although / though / despite / in spite of / however | 10 câu điền. | 9/10 |
| Nhất quán thì trong đoạn | Đoạn 120 từ có 5 chỗ lệch thì, tìm và sửa. | ≥ 4/5 |
| find it + adj + to V / It is + adj + to V | 10 câu viết lại. | 9/10 |
| Cụm mở đầu thời gian: When you first…, At first, Once…, As soon as | 10 câu viết lại. | 9/10 |
| Từ nối: besides / moreover / in addition / therefore / as a result / for example | 10 câu điền. | 9/10 |
| used to / be used to / get used to | 10 câu chọn. | 9/10 |
| Quá khứ hoàn thành, hoàn thành tiếp diễn | 10 câu chia. | 8/10 |
| so / such / too / enough | 10 câu điền. | 9/10 |
| both / either / neither / not only… but also | 10 câu điền. | 9/10 |

### GROUP: Ngữ pháp B2

| Mục | Cách test | Đạt khi |
| --- | --- | --- |
| Điều kiện loại 3 và hỗn hợp | 10 câu chia. | 8/10 |
| Đảo ngữ: No sooner / Hardly / Not only / Never / Only when | 10 câu viết lại. | 8/10 |
| Mệnh đề rút gọn (Built in…, Having finished…, people living in…) | 10 câu rút gọn. | 8/10 |
| Cleft sentence (It was X who… / What I need is…) | 10 câu viết lại. | 8/10 |
| Hoà hợp chủ ngữ – động từ với chủ ngữ dài / the number of / a number of / each / none of | 10 câu sửa lỗi. | 9/10 |
| Modal hoàn thành: must have / can't have / should have | 10 câu chọn. | 8/10 |
| Danh hoá (decided → decision, grow → growth) | 10 câu viết lại dùng danh từ. | 8/10 |
| Mệnh đề danh từ (what / that / whether) | 10 câu nối. | 8/10 |
| wish / if only / would rather | 10 câu chia. | 8/10 |

### GROUP: Câu và dấu câu

| Mục | Cách test | Đạt khi |
| --- | --- | --- |
| Không nối 2 câu độc lập bằng dấu phẩy (comma splice) | Đoạn 150 từ có 5 comma splice, tìm và sửa + soát 3 bài viết. | 5/5 + 0 lỗi bài viết |
| Dấu phẩy với and / but / so và với mệnh đề phụ đứng trước | 10 câu đặt dấu phẩy. | 9/10 |
| Tham chiếu rõ (it / this / one / they chỉ cái gì) | Đoạn 150 từ, gạch mỗi đại từ và ghi nó chỉ gì. | 100% xác định được |
| Chính tả 500 từ hay sai (experience, balance, environment, government, necessary…) | Anki deck mình xuất: 30 từ, mặt trước chỉ audio, bạn gõ. | ≥ 29/30 |
| Chấm phẩy, hai chấm, gạch ngang | 10 câu đặt dấu. | 8/10 |
| Viết hoa, dấu chấm cuối câu, khoảng trắng — lỗi máy chấm bắt | Soát 3 bài viết. | 0 lỗi |

### GROUP: Từ vựng để viết

| Mục | Cách test | Đạt khi |
| --- | --- | --- |
| Tự sinh collocation đúng (không chỉ nhận ra) | Viết 150 từ, mình đếm lỗi collocation. | ≤ 1 lỗi |
| Từ nối theo 6 chức năng (thêm, đối lập, nguyên nhân, kết quả, ví dụ, kết luận) | Essay 250 từ, đếm số chức năng có dùng và dùng đúng. | ≥ 5/6 chức năng, 0 dùng sai |
| Register học thuật | Đoạn 100 từ giọng nói (get, a lot of, big, you…), viết lại giọng học thuật. | ≥ 10 chỗ đổi đúng |
| Dùng Academic Word List đúng trong bài | Essay 250 từ, đếm từ Academic Word List dùng đúng nghĩa và đúng dạng. | ≥ 6 từ |
| Diễn đạt số liệu và xu hướng (increase, decline, peak, remain stable, account for) | Mô tả 1 biểu đồ bằng 5 câu. | 5/5 đúng ngữ pháp, ≥ 4 từ xu hướng |
| Paraphrase — viết lại câu không lặp từ gốc | 5 câu, viết lại đổi ≥ 50% từ. | ≥ 4/5 giữ nghĩa |

### GROUP: Cấu trúc bài và dạng PTE

| Mục | Cách test | Đạt khi |
| --- | --- | --- |
| Nêu lập trường rõ ở mở bài | Soát 3 essay. | 3/3 có, 1 câu, không lặp |
| Chia đoạn mở – thân – kết | Soát 3 essay. | 3/3 có 4 đoạn |
| Đoạn thân theo Point – Explanation – Example – Link (ý – giải thích – ví dụ – chốt) | Soát 3 essay, đánh dấu 4 phần mỗi đoạn. | ≥ 5/6 đoạn thân đủ 4 phần |
| Kết bài tóm ý, không thêm ý mới | Soát 3 essay. | 3/3 |
| Độ dài: Write Essay 200–300, Summarize Written Text 5–75, Summarize Spoken Text 50–70 | Soát 3 bài mỗi dạng. | 9/9 đúng khoảng |
| Ngôi học thuật (không you / I trừ khi đề hỏi) | Soát 3 essay. | 0 lần you |
| Template Summarize Written Text / Summarize Spoken Text / Write Essay viết từ trí nhớ | Viết ra giấy, so bản gốc. | 0 sai chữ |
| Summarize Written Text — 1 câu đúng ngữ pháp, đủ ý | 5 bài APEUni. | ≥ 85% cả content và form |
| Summarize Spoken Text — 50–70 từ, đủ 3 ý | 5 bài APEUni. | ≥ 70% |
| Write Essay — 200–300 từ trong 20 phút | 3 bài bấm giờ, mình chấm. | ≤ 3 lỗi/bài, đúng độ dài, đúng giờ |

---

## SKILL: noi — Nói

> SKILLNOTE: Cách test khi mình không nghe được audio: ghi âm trên APEUni, dùng phần chấm từng từ (từ xanh / vàng / đỏ) để thấy âm nào máy không nhận — phần này tin được để phát hiện lỗi âm, dù điểm tổng không tin. Với trôi chảy: ghi âm, nghe lại, tự đếm số lần ngắt và "ừm". Với ngữ pháp khi nói: ghi âm 2 phút rồi tự chép lại nguyên văn, gửi mình chấm như bài viết.

### GROUP: Phát âm

| Mục | Cách test | Đạt khi |
| --- | --- | --- |
| Nguyên âm /ɪ/–/iː/, /æ/–/e/–/ʌ/, /ɒ/–/ɔː/, /ʊ/–/uː/ | Đọc 20 cặp minimal pair vào APEUni Read Aloud hoặc ELSA; xem từ nào máy nhận sai. | ≥ 18/20 cặp máy nhận đúng cả 2 từ |
| Phụ âm /θ/ /ð/ /v/ /w/ /ʃ/ /ʒ/ /tʃ/ /dʒ/ /r/–/l/ | Như trên. | ≥ 18/20 |
| Âm cuối -s / -ed / -t / -d / -k / -l | Đọc 20 từ có đuôi (books, worked, wanted, cold, milk, feel) vào máy nhận diện. | ≥ 18/20 nhận đúng đuôi |
| Trọng âm từ 3+ âm tiết | Đọc 20 từ Academic Word List, ghi âm, tự đánh dấu âm tiết mình nhấn, so từ điển. | ≥ 17/20 |
| Nối âm phụ âm + nguyên âm | Read Aloud 3 bài, nghe lại, đếm chỗ nên nối mà tách rời. | ≤ 2 chỗ/bài |
| Trọng âm câu — nhấn content word, lướt function word | Read Aloud 3 bài, nghe lại: có phân biệt to/the/of nhẹ hơn không. | Tự đánh giá + mình nghe transcript nhịp |
| Ngữ điệu và ngắt theo dấu câu | Read Aloud 3 bài, đếm số lần ngắt sai chỗ (giữa cụm) và không ngắt ở dấu phẩy. | ≤ 2/bài |
| Read Aloud tổng hợp | 5 bài Read Aloud APEUni, xem % từ xanh. | ≥ 85% từ xanh |

### GROUP: Trôi chảy

| Mục | Cách test | Đạt khi |
| --- | --- | --- |
| Nói liên tục 40 giây | Describe Image 5 bài ghi âm, đếm số lần ngắt > 2 giây. | ≤ 1 lần/bài |
| Không "ừm / à", không lặp từ, không tự sửa | Cùng 5 bài Describe Image, đếm. | ≤ 1 lần/bài |
| Tốc độ đều | Ghi âm 40 giây, đếm số từ ở 0–10s, 10–20s, 20–30s, 30–40s. | Chênh giữa các khoảng ≤ 20% |
| Nhắc lại câu 8–12 từ nguyên văn (Repeat Sentence) | 20 câu Repeat Sentence APEUni, xem transcript máy nhận. | ≥ 70% từ đúng |
| Nhắc lại câu 13+ từ | 10 câu Repeat Sentence dài. | ≥ 60% |
| Nói 2 phút về chủ đề đời thường không chuyển tiếng Việt | Ghi âm 2 phút, tự chép lại. | 0 từ tiếng Việt, ≤ 3 ngắt > 2s |
| Nói 4 phút có lập luận (B2) | Ghi âm 4 phút: quan điểm – 2 lý do – ví dụ – phản biện – kết. Chép lại. | Đủ 5 phần, ≤ 3 ngắt > 2s |

### GROUP: Ngữ pháp và từ vựng khi nói

| Mục | Cách test | Đạt khi |
| --- | --- | --- |
| Hoà hợp chủ ngữ – động từ và thì khi nói nhanh | Ghi âm 2 phút, chép lại nguyên văn, gửi mình đếm lỗi. | ≤ 1 lỗi hoà hợp chủ ngữ – động từ, ≤ 1 lỗi thì |
| Câu ghép because / so / which khi nói | Cùng bản chép, đếm câu ghép đúng. | ≥ 3 câu ghép đúng / 2 phút |
| Mạo từ và số nhiều khi nói | Cùng bản chép. | ≤ 2 lỗi / 2 phút |
| Từ mô tả xu hướng và so sánh (Describe Image) | Describe Image 3 bài, chép lại, đếm từ xu hướng dùng đúng. | ≥ 4 từ/bài, 0 sai |
| Paraphrase ý người khác (Re-tell Lecture / Summarize Group Discussion) | Re-tell Lecture 3 bài, so bản nói với transcript gốc. | Không lặp nguyên câu > 6 từ; đủ 3 ý |
| Từ vựng chủ đề học thuật khi nói (giáo dục, môi trường, công nghệ, kinh tế) | Nói 1 phút mỗi chủ đề, chép, đếm từ Academic Word List dùng đúng. | ≥ 3 từ/phút |

### GROUP: Kỹ thuật dạng bài

| Mục | Cách test | Đạt khi |
| --- | --- | --- |
| Template Describe Image / Re-tell Lecture / Summarize Group Discussion / Respond to a Situation thuộc lòng | Viết ra giấy từ trí nhớ, so bản gốc. | 0 sai chữ mỗi template |
| Dùng template trơn khi có nội dung thật | Describe Image 5 bài, nghe lại: template có bị vấp ở chỗ nối nội dung không. | ≤ 1 vấp/bài |
| Ghi keyword trong lúc nghe (Re-tell Lecture / Summarize Group Discussion) | 5 bài, so keyword ghi được với transcript. | ≥ 6 keyword đúng/bài |
| Chuẩn bị Describe Image trong 25 giây | 5 bài Describe Image, ghi lại số ý chuẩn bị được trước khi mic bật. | ≥ 3 ý/bài |
| Kỹ thuật mic: không ngắt > 3 giây, giọng đều, không thổi mic | Mock speaking 1 lần, đếm số bài mic tắt sớm. | 0 bài |
| Answer Short Question — trả lời trong 3 giây, không bỏ trống | 20 câu APEUni. | 0 câu bỏ trống |

---

## TOOLS

| Việc | Công cụ | Ghi chú |
| --- | --- | --- |
| Minimal pairs nghe | englishclub.com/pronunciation/minimal-pairs · shiporsheep.com | Miễn phí, có audio |
| Audio từ đơn | dictionary.cambridge.org · youglish.com | Cambridge có cả giọng Anh/Mỹ |
| Write From Dictation / Repeat Sentence / Read Aloud / Summarize Spoken Text / Fill in the Blanks / Highlight Incorrect Words / Re-order Paragraphs | APEUni | Tin phần chấm khớp chữ; không tin điểm Speaking tổng |
| Nhận diện từ khi nói | APEUni Read Aloud (chấm từng từ) · ELSA Speak · Google Docs voice typing | Voice typing miễn phí: nói vào, xem nó gõ ra gì |
| Chấm viết theo khung tham chiếu ngôn ngữ châu Âu | writeandimprove.com | Miễn phí, Cambridge |
| Test ngữ pháp tổng | Cambridge "Test your English" · bài test cuối sách Murphy | Cho thẳng khung tham chiếu ngôn ngữ châu Âu |
| Test từ vựng theo mốc | newgeneralservicelist.com (test New General Service List) · Anki deck Academic Word List | — |
| Nghe từ đơn để chép (mình không phát được audio) | Anki — deck mình xuất, mặt trước chỉ audio | Anki tự tải audio khi import; bạn không thấy chữ cho tới khi lật thẻ |
| Đề mình ra (10 câu / 30 từ / đoạn sửa lỗi) | Nhắn "test [tên mục]" | Mình gửi đề, bạn làm, mình chấm và ghi ✓/✗ |
