-- Roadmap: bảng checklist 4 kỹ năng (nội dung dùng chung cho mọi user) +
-- tiến độ per-user. Nội dung seed dưới đây được SINH RA từ
-- src/doc/prompts/roadmap-checklist.md bằng scripts/gen-roadmap-seed.mjs —
-- sửa nội dung ở file md rồi sinh migration MỚI, không sửa file này.
--
-- roadmap_items KHÔNG có user_id: đây là nội dung tham chiếu dùng chung, giống
-- flashcard_cloze_pool. Ranh giới multi-tenancy nằm ở roadmap_progress.
-- item_key là khoá liên kết bền: đừng đánh số lại các mục đã seed.

CREATE TABLE IF NOT EXISTS roadmap_skills (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  note TEXT,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS roadmap_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_key TEXT NOT NULL UNIQUE,
  skill_code TEXT NOT NULL,
  group_name TEXT NOT NULL,
  label TEXT NOT NULL,
  how_to_test TEXT NOT NULL,
  pass_when TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (skill_code) REFERENCES roadmap_skills(code)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_items_skill
  ON roadmap_items(skill_code, position);

CREATE TABLE IF NOT EXISTS roadmap_tools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task TEXT NOT NULL,
  tool TEXT NOT NULL,
  note TEXT,
  position INTEGER NOT NULL DEFAULT 0
);

-- status: 'pass' = đã test đạt, 'fail' = đã test chưa đạt.
-- Mục chưa test KHÔNG có row ở đây (mặc định 'untested' ở tầng app).
-- tested_at là ngày test gần nhất — dùng để tính badge "cần test lại sau 4 tuần".
CREATE TABLE IF NOT EXISTS roadmap_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail')),
  note TEXT,
  tested_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE (user_id, item_key),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_progress_user
  ON roadmap_progress(user_id, item_key);

-- ============================================================================
-- Seed: 4 kỹ năng, 141 mục, 9 công cụ
-- ============================================================================

INSERT INTO roadmap_skills (code, label, note, position) VALUES
  ('nghe', 'Nghe', NULL, 1),
  ('doc', 'Đọc', NULL, 2),
  ('viet', 'Viết', 'Với mỗi mục ngữ pháp: test = 10 câu mình ra (điền hoặc sửa lỗi) + soát 3 bài viết gần nhất. Đạt khi ≥ 9/10 và 0 lỗi mục đó trong 3 bài viết. Cột "cách test" dưới đây ghi dạng câu mình sẽ ra.', 3),
  ('noi', 'Nói', 'Cách test khi mình không nghe được audio: ghi âm trên APEUni, dùng phần chấm từng từ (từ xanh / vàng / đỏ) để thấy âm nào máy không nhận — phần này tin được để phát hiện lỗi âm, dù điểm tổng không tin. Với trôi chảy: ghi âm, nghe lại, tự đếm số lần ngắt và "ừm". Với ngữ pháp khi nói: ghi âm 2 phút rồi tự chép lại nguyên văn, gửi mình chấm như bài viết.', 4);

INSERT INTO roadmap_items (item_key, skill_code, group_name, label, how_to_test, pass_when, position) VALUES
  ('nghe-01', 'nghe', 'Tầng âm — nghe ra từng âm', 'Nguyên âm /ɪ/–/iː/, /æ/–/e/–/ʌ/, /ɒ/–/ɔː/, /ʊ/–/uː/', 'Minimal pair quiz trên englishclub.com hoặc shiporsheep.com: 20 cặp mỗi nhóm, nghe chọn từ.', '≥ 18/20 mỗi nhóm', 1),
  ('nghe-02', 'nghe', 'Tầng âm — nghe ra từng âm', 'Phụ âm /θ/–/s/, /ð/–/d/, /v/–/w/, /ʃ/–/s/, /tʃ/–/dʒ/, /r/–/l/', 'Như trên, 20 cặp mỗi nhóm.', '≥ 18/20 mỗi nhóm', 2),
  ('nghe-03', 'nghe', 'Tầng âm — nghe ra từng âm', 'Âm cuối -s / -z / -t / -d / -k / -p', 'WFD 10 câu APEUni. Đếm riêng những từ có đuôi -s / -ed trong transcript và số bạn chép đúng đuôi.', '≥ 90% đuôi đúng', 3),
  ('nghe-04', 'nghe', 'Tầng âm — nghe ra từng âm', 'Hậu tố nhiều âm tiết -ment / -able / -tion / -er / -ing', 'Mình không phát được audio. Dùng Anki: mình xuất deck 30 từ AWL, mặt trước chỉ có audio (không hiện chữ), bạn nghe và gõ từ. Hoặc APEUni WFD: chọn 10 câu, chỉ chấm những từ có hậu tố này.', '≥ 27/30 đúng chính tả', 4),
  ('nghe-05', 'nghe', 'Tầng âm — nghe ra từng âm', 'Trọng âm từ nhiều âm tiết', 'Mình gửi 20 từ 3+ âm tiết. Bạn nghe từng từ trên dictionary.cambridge.org, đánh dấu âm tiết nhấn, gửi lại.', '≥ 17/20', 5),
  ('nghe-06', 'nghe', 'Tầng âm — nghe ra từng âm', 'Từ chức năng lướt: a / the / of / to / has / been', 'WFD 10 câu. Đếm riêng từ chức năng trong transcript và số chép đúng.', '≥ 85%', 6),
  ('nghe-07', 'nghe', 'Tầng âm — nghe ra từng âm', 'Nối âm phụ âm + nguyên âm', 'APEUni WFD: mình chỉ 10 câu có nối âm rõ, bạn nghe 1 lần, chép.', '≥ 8/10 câu đúng chỗ nối', 7),
  ('nghe-08', 'nghe', 'Tầng âm — nghe ra từng âm', 'Trọng âm câu, ngữ điệu', 'APEUni RA: mình chỉ 10 câu, bạn nghe audio mẫu, gạch từ được nhấn, gửi mình so.', '≥ 8/10', 8),
  ('nghe-09', 'nghe', 'Tầng từ — nhận ra từ khi nghe', 'NGSL 1–1.500 khi nghe', 'ASQ 20 câu APEUni.', '≥ 90%', 9),
  ('nghe-10', 'nghe', 'Tầng từ — nhận ra từ khi nghe', 'NGSL 1.500–2.800 khi nghe', 'Anki deck mình xuất: 30 từ, mặt trước chỉ audio, bạn nghe và gõ.', '≥ 85%', 10),
  ('nghe-11', 'nghe', 'Tầng từ — nhận ra từ khi nghe', 'AWL khi nghe', 'Anki deck mình xuất: 30 từ AWL, mặt trước chỉ audio, bạn gõ từ + nghĩa.', '≥ 80% chép đúng', 11),
  ('nghe-12', 'nghe', 'Tầng từ — nhận ra từ khi nghe', 'Từ khoa học / kinh tế phổ thông', '2 bài SST chủ đề khoa học, gạch từ không nghe ra, so transcript.', '≤ 3 từ/bài không nghe ra', 12),
  ('nghe-13', 'nghe', 'Tầng từ — nhận ra từ khi nghe', 'Không bịa khi không nghe ra', 'WFD 10 câu, luật: không chắc thì để trống. Sau đó đếm từ bạn viết mà không có trong transcript và không gần âm.', '0 từ bịa', 13),
  ('nghe-14', 'nghe', 'Tầng từ — nhận ra từ khi nghe', 'Nhận ra từ khi tốc độ nhanh / accent Anh, Úc', '3 bài SST accent Anh hoặc Úc; so % từ nghe ra với bài accent Mỹ.', 'Chênh ≤ 15%', 14),
  ('nghe-15', 'nghe', 'Tầng bộ nhớ và xử lý', 'Giữ câu 6–8 từ nguyên văn', 'WFD 10 câu ≤ 8 từ, nghe 1 lần.', '≥ 80% từ đúng', 15),
  ('nghe-16', 'nghe', 'Tầng bộ nhớ và xử lý', 'Giữ câu 10–13 từ nguyên văn', 'WFD 10 câu 10–13 từ, nghe 1 lần.', '≥ 70% từ đúng', 16),
  ('nghe-17', 'nghe', 'Tầng bộ nhớ và xử lý', 'Chép theo âm, không dựng lại theo nghĩa', 'WFD 10 câu. Đếm câu có ngữ pháp khác gốc nhưng nghĩa giống (vd has invested in → need to invest).', '≤ 1/10 câu bị dựng lại', 17),
  ('nghe-18', 'nghe', 'Tầng bộ nhớ và xử lý', 'Chính tả từ đã biết khi viết nhanh', 'Anki deck mình xuất: 30 từ NGSL hay sai chính tả, mặt trước chỉ audio, gõ trong 20 giây/từ.', '0 lỗi chính tả', 18),
  ('nghe-19', 'nghe', 'Tầng bộ nhớ và xử lý', 'Bắt ý chính bài dài 60–90 giây', 'SST 3 bài APEUni. So bản viết với đáp án mẫu: đếm ý chính có/thiếu.', '≥ 3/4 ý mỗi bài', 19),
  ('nghe-20', 'nghe', 'Tầng bộ nhớ và xử lý', 'Ghi keyword khi nghe', 'RL 5 bài: ghi chú xong, so với transcript, đếm keyword đúng.', '≥ 6 keyword/bài', 20),
  ('nghe-21', 'nghe', 'Tầng bộ nhớ và xử lý', 'Nghe và đọc song song (HIW)', '5 bài HIW APEUni.', '≥ 85%', 21),
  ('nghe-22', 'nghe', 'Tầng bộ nhớ và xử lý', 'Nghe điền từ (FIB-L)', '5 bài APEUni.', '≥ 70%', 22),
  ('nghe-23', 'nghe', 'Tầng bộ nhớ và xử lý', 'Nghe câu cuối đoán từ (SMW), chọn tóm tắt (HCS)', '3 bài mỗi dạng.', '≥ 2/3 — chỉ cần biết luật', 23),
  ('doc-01', 'doc', 'Từ vựng', 'NGSL 1–1.500 (nghĩa)', '50 từ ngẫu nhiên (mình ra hoặc Anki), viết nghĩa Việt.', '≥ 47/50', 24),
  ('doc-02', 'doc', 'Từ vựng', 'NGSL 1.500–2.800 (nghĩa)', '50 từ ngẫu nhiên.', '≥ 42/50', 25),
  ('doc-03', 'doc', 'Từ vựng', 'AWL sublist 1–3 (nghĩa + từ loại)', '50 từ ngẫu nhiên, viết từ loại + nghĩa.', '≥ 40/50 cả hai đúng', 26),
  ('doc-04', 'doc', 'Từ vựng', 'AWL sublist 4–10', '50 từ ngẫu nhiên.', '≥ 35/50', 27),
  ('doc-05', 'doc', 'Từ vựng', 'Phân biệt từ hình dạng giống nhau', '20 cặp (distribute/contribute, affect/effect, adapt/adopt, economic/economical…), chọn nghĩa đúng cho mỗi từ.', '≥ 18/20', 28),
  ('doc-06', 'doc', 'Từ vựng', 'Collocation thông dụng', '30 câu chọn từ (mình ra).', '≥ 27/30', 29),
  ('doc-07', 'doc', 'Từ vựng', 'Collocation học thuật', '30 câu từ Academic Collocation List.', '≥ 24/30', 30),
  ('doc-08', 'doc', 'Từ vựng', 'Phrasal verb thông dụng (100)', '30 câu điền phrasal verb.', '≥ 24/30', 31),
  ('doc-09', 'doc', 'Hình thái từ — nền của FIB', 'Đọc từ loại từ hậu tố', '40 từ bạn chưa biết nghĩa, chỉ ghi từ loại dựa đuôi.', '≥ 36/40', 32),
  ('doc-10', 'doc', 'Hình thái từ — nền của FIB', 'Tạo họ từ từ gốc', '30 gốc, viết N / V / Adj / Adv (dạng nào có).', '≥ 25 gốc đủ và đúng', 33),
  ('doc-11', 'doc', 'Hình thái từ — nền của FIB', 'Hậu tố danh từ -tion/-sion, -ment, -ness, -ity, -ance/-ence, -er/-or, -ism, -ship', '20 gốc → danh từ.', '≥ 18/20', 34),
  ('doc-12', 'doc', 'Hình thái từ — nền của FIB', 'Hậu tố tính từ -ive, -al, -ous, -ful, -less, -able/-ible, -ent/-ant, -ic, -y', '20 gốc → tính từ.', '≥ 18/20', 35),
  ('doc-13', 'doc', 'Hình thái từ — nền của FIB', 'Hậu tố động từ -ize, -ify, -en, -ate', '20 gốc → động từ.', '≥ 17/20', 36),
  ('doc-14', 'doc', 'Hình thái từ — nền của FIB', 'Hậu tố trạng từ -ly và các trạng từ bất quy tắc (well, fast, hard)', '20 gốc → trạng từ.', '≥ 19/20', 37),
  ('doc-15', 'doc', 'Hình thái từ — nền của FIB', 'Tiền tố un-, in-/im-/il-/ir-, dis-, re-, mis-, over-, under-, pre-, post-, anti-', '20 từ có tiền tố, đoán nghĩa không tra.', '≥ 16/20', 38),
  ('doc-16', 'doc', 'Hình thái từ — nền của FIB', 'Xác định từ loại cần điền từ ngữ cảnh', 'FIB D&D 20 chỗ trống, chỉ trả lời từ loại + lý do (sau mạo từ, sau be, trước danh từ…).', '≥ 18/20', 39),
  ('doc-17', 'doc', 'Hình thái từ — nền của FIB', 'Chọn đúng từ trong FIB dropdown', '5 bài APEUni, ghi lý do chọn từng chỗ.', '≥ 60%', 40),
  ('doc-18', 'doc', 'Hình thái từ — nền của FIB', 'Chọn đúng từ trong FIB drag & drop', '5 bài APEUni.', '≥ 60%', 41),
  ('doc-19', 'doc', 'Ngữ pháp phục vụ đọc', 'Tìm chủ ngữ và động từ chính của câu dài', '10 câu 25–35 từ, gạch S chính và V chính.', '≥ 9/10', 42),
  ('doc-20', 'doc', 'Ngữ pháp phục vụ đọc', 'Nhận diện mệnh đề quan hệ và mệnh đề rút gọn, biết nó bổ nghĩa cho từ nào', '10 câu, khoanh mệnh đề và nối mũi tên tới từ được bổ nghĩa.', '≥ 8/10', 43),
  ('doc-21', 'doc', 'Ngữ pháp phục vụ đọc', 'Hiểu đảo ngữ, cleft, bị động', '10 câu, viết lại thành câu thường cùng nghĩa.', '≥ 8/10', 44),
  ('doc-22', 'doc', 'Ngữ pháp phục vụ đọc', 'Từ nối và đại từ tham chiếu (this, such, the former / latter, it)', 'RO 5 bài, giải thích lý do ghép từng cặp câu.', '≥ 80% cặp đúng có lý do', 45),
  ('doc-23', 'doc', 'Ngữ pháp phục vụ đọc', 'Cấu trúc đoạn: câu chủ đề – hỗ trợ – ví dụ', '5 đoạn, chỉ ra câu chủ đề và câu ví dụ.', '≥ 4/5', 46),
  ('doc-24', 'doc', 'Kỹ thuật đọc', 'Skimming — lấy ý chính nhanh', '3 bài 800 từ, 2 phút/bài, viết ý chính 1 câu.', '3/3 đúng', 47),
  ('doc-25', 'doc', 'Kỹ thuật đọc', 'Scanning — tìm chi tiết', '1 bài 800 từ + 10 câu hỏi chi tiết, 5 phút.', '≥ 8/10', 48),
  ('doc-26', 'doc', 'Kỹ thuật đọc', 'Đoán nghĩa từ lạ từ ngữ cảnh', '10 từ lạ trong đoạn, không tra, viết nghĩa đoán và manh mối.', '≥ 6/10 gần đúng, có manh mối hợp lý', 49),
  ('doc-27', 'doc', 'Kỹ thuật đọc', 'SWT — bắt ý chính đoạn 300 từ', '5 bài APEUni.', '≥ 85% content', 50),
  ('doc-28', 'doc', 'Kỹ thuật đọc', 'MC đọc (single / multiple) — biết luật điểm trừ', '3 bài mỗi loại, ghi số đáp án chọn ở MCM.', '≥ 2/3, MCM chọn ≤ 2', 51),
  ('doc-29', 'doc', 'Kỹ thuật đọc', 'Quản lý thời gian phần Reading', '1 mock phần Reading (29–30 phút).', 'Làm hết, không bỏ câu, dư ≥ 1 phút', 52),
  ('viet-01', 'viet', 'Ngữ pháp A2', 'Hiện tại đơn, -s ngôi 3', '10 câu chia động từ.', '9/10 + 0 lỗi bài viết', 53),
  ('viet-02', 'viet', 'Ngữ pháp A2', 'Hiện tại tiếp diễn vs đơn', '10 câu chọn thì.', '9/10', 54),
  ('viet-03', 'viet', 'Ngữ pháp A2', 'Quá khứ đơn + 50 động từ bất quy tắc', '10 câu chia + đọc 50 V2 trong 3 phút.', '9/10 + 48/50', 55),
  ('viet-04', 'viet', 'Ngữ pháp A2', 'Hiện tại hoàn thành: dạng have/has + V3', '10 câu chia.', '9/10', 56),
  ('viet-05', 'viet', 'Ngữ pháp A2', 'for / since / ago / in / during', '10 câu điền.', '9/10', 57),
  ('viet-06', 'viet', 'Ngữ pháp A2', 'Hoàn thành vs quá khứ đơn', '10 câu chọn thì.', '9/10', 58),
  ('viet-07', 'viet', 'Ngữ pháp A2', 'some / any / much / many / a few / a little', '10 câu điền.', '9/10', 59),
  ('viet-08', 'viet', 'Ngữ pháp A2', 'So sánh hơn / nhất / as…as', '10 câu viết lại.', '9/10', 60),
  ('viet-09', 'viet', 'Ngữ pháp A2', 'Modal: must / mustn''t / have to / don''t have to / should / might', '10 câu chọn.', '9/10', 61),
  ('viet-10', 'viet', 'Ngữ pháp A2', 'Mạo từ a / an / the / không mạo từ', 'Đoạn 100 từ bỏ mạo từ, điền lại (15 chỗ).', '≥ 13/15', 62),
  ('viet-11', 'viet', 'Ngữ pháp A2', 'Giới từ thời gian in / on / at', '10 câu điền.', '10/10', 63),
  ('viet-12', 'viet', 'Ngữ pháp A2', 'Giới từ nơi chốn và giới từ đi với động từ (depend on, consist of…)', '10 câu điền.', '9/10', 64),
  ('viet-13', 'viet', 'Ngữ pháp A2', 'Vị trí trạng từ (always, usually, often, also)', '10 câu đặt trạng từ.', '9/10', 65),
  ('viet-14', 'viet', 'Ngữ pháp B1', 'Điều kiện loại 0 và 1', '10 câu chia.', '9/10', 66),
  ('viet-15', 'viet', 'Ngữ pháp B1', 'Điều kiện loại 2', '10 câu chia.', '9/10', 67),
  ('viet-16', 'viet', 'Ngữ pháp B1', 'Mệnh đề quan hệ who / which / that / whose / where / when', '10 câu nối.', '9/10', 68),
  ('viet-17', 'viet', 'Ngữ pháp B1', 'Defining vs non-defining (dấu phẩy)', '10 câu đặt dấu phẩy.', '8/10', 69),
  ('viet-18', 'viet', 'Ngữ pháp B1', 'Bị động mọi thì + với modal', '10 câu đổi.', '9/10', 70),
  ('viet-19', 'viet', 'Ngữ pháp B1', 'Câu gián tiếp, lùi thì', '10 câu đổi.', '9/10', 71),
  ('viet-20', 'viet', 'Ngữ pháp B1', 'Gerund vs infinitive (remember / stop / try / forget / regret)', '10 câu chọn.', '9/10', 72),
  ('viet-21', 'viet', 'Ngữ pháp B1', 'Verb pattern: suggest / recommend / advise / want / make / let / allow', '10 câu sửa lỗi.', '9/10', 73),
  ('viet-22', 'viet', 'Ngữ pháp B1', 'Danh từ không đếm được (information, advice, research, equipment, furniture, evidence)', '10 câu sửa lỗi.', '10/10', 74),
  ('viet-23', 'viet', 'Ngữ pháp B1', 'Although / though / despite / in spite of / however', '10 câu điền.', '9/10', 75),
  ('viet-24', 'viet', 'Ngữ pháp B1', 'Nhất quán thì trong đoạn', 'Đoạn 120 từ có 5 chỗ lệch thì, tìm và sửa.', '≥ 4/5', 76),
  ('viet-25', 'viet', 'Ngữ pháp B1', 'find it + adj + to V / It is + adj + to V', '10 câu viết lại.', '9/10', 77),
  ('viet-26', 'viet', 'Ngữ pháp B1', 'Cụm mở đầu thời gian: When you first…, At first, Once…, As soon as', '10 câu viết lại.', '9/10', 78),
  ('viet-27', 'viet', 'Ngữ pháp B1', 'Từ nối: besides / moreover / in addition / therefore / as a result / for example', '10 câu điền.', '9/10', 79),
  ('viet-28', 'viet', 'Ngữ pháp B1', 'used to / be used to / get used to', '10 câu chọn.', '9/10', 80),
  ('viet-29', 'viet', 'Ngữ pháp B1', 'Quá khứ hoàn thành, hoàn thành tiếp diễn', '10 câu chia.', '8/10', 81),
  ('viet-30', 'viet', 'Ngữ pháp B1', 'so / such / too / enough', '10 câu điền.', '9/10', 82),
  ('viet-31', 'viet', 'Ngữ pháp B1', 'both / either / neither / not only… but also', '10 câu điền.', '9/10', 83),
  ('viet-32', 'viet', 'Ngữ pháp B2', 'Điều kiện loại 3 và hỗn hợp', '10 câu chia.', '8/10', 84),
  ('viet-33', 'viet', 'Ngữ pháp B2', 'Đảo ngữ: No sooner / Hardly / Not only / Never / Only when', '10 câu viết lại.', '8/10', 85),
  ('viet-34', 'viet', 'Ngữ pháp B2', 'Mệnh đề rút gọn (Built in…, Having finished…, people living in…)', '10 câu rút gọn.', '8/10', 86),
  ('viet-35', 'viet', 'Ngữ pháp B2', 'Cleft sentence (It was X who… / What I need is…)', '10 câu viết lại.', '8/10', 87),
  ('viet-36', 'viet', 'Ngữ pháp B2', 'SVA với chủ ngữ dài / the number of / a number of / each / none of', '10 câu sửa lỗi.', '9/10', 88),
  ('viet-37', 'viet', 'Ngữ pháp B2', 'Modal hoàn thành: must have / can''t have / should have', '10 câu chọn.', '8/10', 89),
  ('viet-38', 'viet', 'Ngữ pháp B2', 'Danh hoá (decided → decision, grow → growth)', '10 câu viết lại dùng danh từ.', '8/10', 90),
  ('viet-39', 'viet', 'Ngữ pháp B2', 'Mệnh đề danh từ (what / that / whether)', '10 câu nối.', '8/10', 91),
  ('viet-40', 'viet', 'Ngữ pháp B2', 'wish / if only / would rather', '10 câu chia.', '8/10', 92),
  ('viet-41', 'viet', 'Câu và dấu câu', 'Không nối 2 câu độc lập bằng dấu phẩy (comma splice)', 'Đoạn 150 từ có 5 comma splice, tìm và sửa + soát 3 bài viết.', '5/5 + 0 lỗi bài viết', 93),
  ('viet-42', 'viet', 'Câu và dấu câu', 'Dấu phẩy với and / but / so và với mệnh đề phụ đứng trước', '10 câu đặt dấu phẩy.', '9/10', 94),
  ('viet-43', 'viet', 'Câu và dấu câu', 'Tham chiếu rõ (it / this / one / they chỉ cái gì)', 'Đoạn 150 từ, gạch mỗi đại từ và ghi nó chỉ gì.', '100% xác định được', 95),
  ('viet-44', 'viet', 'Câu và dấu câu', 'Chính tả 500 từ hay sai (experience, balance, environment, government, necessary…)', 'Anki deck mình xuất: 30 từ, mặt trước chỉ audio, bạn gõ.', '≥ 29/30', 96),
  ('viet-45', 'viet', 'Câu và dấu câu', 'Chấm phẩy, hai chấm, gạch ngang', '10 câu đặt dấu.', '8/10', 97),
  ('viet-46', 'viet', 'Câu và dấu câu', 'Viết hoa, dấu chấm cuối câu, khoảng trắng — lỗi máy chấm bắt', 'Soát 3 bài viết.', '0 lỗi', 98),
  ('viet-47', 'viet', 'Từ vựng để viết', 'Tự sinh collocation đúng (không chỉ nhận ra)', 'Viết 150 từ, mình đếm lỗi collocation.', '≤ 1 lỗi', 99),
  ('viet-48', 'viet', 'Từ vựng để viết', 'Từ nối theo 6 chức năng (thêm, đối lập, nguyên nhân, kết quả, ví dụ, kết luận)', 'Essay 250 từ, đếm số chức năng có dùng và dùng đúng.', '≥ 5/6 chức năng, 0 dùng sai', 100),
  ('viet-49', 'viet', 'Từ vựng để viết', 'Register học thuật', 'Đoạn 100 từ giọng nói (get, a lot of, big, you…), viết lại giọng học thuật.', '≥ 10 chỗ đổi đúng', 101),
  ('viet-50', 'viet', 'Từ vựng để viết', 'Dùng AWL đúng trong bài', 'Essay 250 từ, đếm từ AWL dùng đúng nghĩa và đúng dạng.', '≥ 6 từ', 102),
  ('viet-51', 'viet', 'Từ vựng để viết', 'Diễn đạt số liệu và xu hướng (increase, decline, peak, remain stable, account for)', 'Mô tả 1 biểu đồ bằng 5 câu.', '5/5 đúng ngữ pháp, ≥ 4 từ xu hướng', 103),
  ('viet-52', 'viet', 'Từ vựng để viết', 'Paraphrase — viết lại câu không lặp từ gốc', '5 câu, viết lại đổi ≥ 50% từ.', '≥ 4/5 giữ nghĩa', 104),
  ('viet-53', 'viet', 'Cấu trúc bài và dạng PTE', 'Nêu lập trường rõ ở mở bài', 'Soát 3 essay.', '3/3 có, 1 câu, không lặp', 105),
  ('viet-54', 'viet', 'Cấu trúc bài và dạng PTE', 'Chia đoạn mở – thân – kết', 'Soát 3 essay.', '3/3 có 4 đoạn', 106),
  ('viet-55', 'viet', 'Cấu trúc bài và dạng PTE', 'Đoạn thân theo PEEL (ý – giải thích – ví dụ – chốt)', 'Soát 3 essay, đánh dấu 4 phần mỗi đoạn.', '≥ 5/6 đoạn thân đủ 4 phần', 107),
  ('viet-56', 'viet', 'Cấu trúc bài và dạng PTE', 'Kết bài tóm ý, không thêm ý mới', 'Soát 3 essay.', '3/3', 108),
  ('viet-57', 'viet', 'Cấu trúc bài và dạng PTE', 'Độ dài: WE 200–300, SWT 5–75, SST 50–70', 'Soát 3 bài mỗi dạng.', '9/9 đúng khoảng', 109),
  ('viet-58', 'viet', 'Cấu trúc bài và dạng PTE', 'Ngôi học thuật (không you / I trừ khi đề hỏi)', 'Soát 3 essay.', '0 lần you', 110),
  ('viet-59', 'viet', 'Cấu trúc bài và dạng PTE', 'Template SWT / SST / WE viết từ trí nhớ', 'Viết ra giấy, so bản gốc.', '0 sai chữ', 111),
  ('viet-60', 'viet', 'Cấu trúc bài và dạng PTE', 'SWT — 1 câu đúng ngữ pháp, đủ ý', '5 bài APEUni.', '≥ 85% cả content và form', 112),
  ('viet-61', 'viet', 'Cấu trúc bài và dạng PTE', 'SST — 50–70 từ, đủ 3 ý', '5 bài APEUni.', '≥ 70%', 113),
  ('viet-62', 'viet', 'Cấu trúc bài và dạng PTE', 'WE — 200–300 từ trong 20 phút', '3 bài bấm giờ, mình chấm.', '≤ 3 lỗi/bài, đúng độ dài, đúng giờ', 114),
  ('noi-01', 'noi', 'Phát âm', 'Nguyên âm /ɪ/–/iː/, /æ/–/e/–/ʌ/, /ɒ/–/ɔː/, /ʊ/–/uː/', 'Đọc 20 cặp minimal pair vào APEUni RA hoặc ELSA; xem từ nào máy nhận sai.', '≥ 18/20 cặp máy nhận đúng cả 2 từ', 115),
  ('noi-02', 'noi', 'Phát âm', 'Phụ âm /θ/ /ð/ /v/ /w/ /ʃ/ /ʒ/ /tʃ/ /dʒ/ /r/–/l/', 'Như trên.', '≥ 18/20', 116),
  ('noi-03', 'noi', 'Phát âm', 'Âm cuối -s / -ed / -t / -d / -k / -l', 'Đọc 20 từ có đuôi (books, worked, wanted, cold, milk, feel) vào máy nhận diện.', '≥ 18/20 nhận đúng đuôi', 117),
  ('noi-04', 'noi', 'Phát âm', 'Trọng âm từ 3+ âm tiết', 'Đọc 20 từ AWL, ghi âm, tự đánh dấu âm tiết mình nhấn, so từ điển.', '≥ 17/20', 118),
  ('noi-05', 'noi', 'Phát âm', 'Nối âm phụ âm + nguyên âm', 'RA 3 bài, nghe lại, đếm chỗ nên nối mà tách rời.', '≤ 2 chỗ/bài', 119),
  ('noi-06', 'noi', 'Phát âm', 'Trọng âm câu — nhấn content word, lướt function word', 'RA 3 bài, nghe lại: có phân biệt to/the/of nhẹ hơn không.', 'Tự đánh giá + mình nghe transcript nhịp', 120),
  ('noi-07', 'noi', 'Phát âm', 'Ngữ điệu và ngắt theo dấu câu', 'RA 3 bài, đếm số lần ngắt sai chỗ (giữa cụm) và không ngắt ở dấu phẩy.', '≤ 2/bài', 121),
  ('noi-08', 'noi', 'Phát âm', 'RA tổng hợp', '5 bài RA APEUni, xem % từ xanh.', '≥ 85% từ xanh', 122),
  ('noi-09', 'noi', 'Trôi chảy', 'Nói liên tục 40 giây', 'DI 5 bài ghi âm, đếm số lần ngắt > 2 giây.', '≤ 1 lần/bài', 123),
  ('noi-10', 'noi', 'Trôi chảy', 'Không "ừm / à", không lặp từ, không tự sửa', 'Cùng 5 bài DI, đếm.', '≤ 1 lần/bài', 124),
  ('noi-11', 'noi', 'Trôi chảy', 'Tốc độ đều', 'Ghi âm 40 giây, đếm số từ ở 0–10s, 10–20s, 20–30s, 30–40s.', 'Chênh giữa các khoảng ≤ 20%', 125),
  ('noi-12', 'noi', 'Trôi chảy', 'Nhắc lại câu 8–12 từ nguyên văn (RS)', '20 câu RS APEUni, xem transcript máy nhận.', '≥ 70% từ đúng', 126),
  ('noi-13', 'noi', 'Trôi chảy', 'Nhắc lại câu 13+ từ', '10 câu RS dài.', '≥ 60%', 127),
  ('noi-14', 'noi', 'Trôi chảy', 'Nói 2 phút về chủ đề đời thường không chuyển tiếng Việt', 'Ghi âm 2 phút, tự chép lại.', '0 từ tiếng Việt, ≤ 3 ngắt > 2s', 128),
  ('noi-15', 'noi', 'Trôi chảy', 'Nói 4 phút có lập luận (B2)', 'Ghi âm 4 phút: quan điểm – 2 lý do – ví dụ – phản biện – kết. Chép lại.', 'Đủ 5 phần, ≤ 3 ngắt > 2s', 129),
  ('noi-16', 'noi', 'Ngữ pháp và từ vựng khi nói', 'SVA và thì khi nói nhanh', 'Ghi âm 2 phút, chép lại nguyên văn, gửi mình đếm lỗi.', '≤ 1 lỗi SVA, ≤ 1 lỗi thì', 130),
  ('noi-17', 'noi', 'Ngữ pháp và từ vựng khi nói', 'Câu ghép because / so / which khi nói', 'Cùng bản chép, đếm câu ghép đúng.', '≥ 3 câu ghép đúng / 2 phút', 131),
  ('noi-18', 'noi', 'Ngữ pháp và từ vựng khi nói', 'Mạo từ và số nhiều khi nói', 'Cùng bản chép.', '≤ 2 lỗi / 2 phút', 132),
  ('noi-19', 'noi', 'Ngữ pháp và từ vựng khi nói', 'Từ mô tả xu hướng và so sánh (DI)', 'DI 3 bài, chép lại, đếm từ xu hướng dùng đúng.', '≥ 4 từ/bài, 0 sai', 133),
  ('noi-20', 'noi', 'Ngữ pháp và từ vựng khi nói', 'Paraphrase ý người khác (RL / SGD)', 'RL 3 bài, so bản nói với transcript gốc.', 'Không lặp nguyên câu > 6 từ; đủ 3 ý', 134),
  ('noi-21', 'noi', 'Ngữ pháp và từ vựng khi nói', 'Từ vựng chủ đề học thuật khi nói (giáo dục, môi trường, công nghệ, kinh tế)', 'Nói 1 phút mỗi chủ đề, chép, đếm từ AWL dùng đúng.', '≥ 3 từ/phút', 135),
  ('noi-22', 'noi', 'Kỹ thuật dạng bài', 'Template DI / RL / SGD / RTS thuộc lòng', 'Viết ra giấy từ trí nhớ, so bản gốc.', '0 sai chữ mỗi template', 136),
  ('noi-23', 'noi', 'Kỹ thuật dạng bài', 'Dùng template trơn khi có nội dung thật', 'DI 5 bài, nghe lại: template có bị vấp ở chỗ nối nội dung không.', '≤ 1 vấp/bài', 137),
  ('noi-24', 'noi', 'Kỹ thuật dạng bài', 'Ghi keyword trong lúc nghe (RL / SGD)', '5 bài, so keyword ghi được với transcript.', '≥ 6 keyword đúng/bài', 138),
  ('noi-25', 'noi', 'Kỹ thuật dạng bài', 'Chuẩn bị DI trong 25 giây', '5 bài DI, ghi lại số ý chuẩn bị được trước khi mic bật.', '≥ 3 ý/bài', 139),
  ('noi-26', 'noi', 'Kỹ thuật dạng bài', 'Kỹ thuật mic: không ngắt > 3 giây, giọng đều, không thổi mic', 'Mock speaking 1 lần, đếm số bài mic tắt sớm.', '0 bài', 140),
  ('noi-27', 'noi', 'Kỹ thuật dạng bài', 'ASQ — trả lời trong 3 giây, không bỏ trống', '20 câu APEUni.', '0 câu bỏ trống', 141);

INSERT INTO roadmap_tools (task, tool, note, position) VALUES
  ('Minimal pairs nghe', 'englishclub.com/pronunciation/minimal-pairs · shiporsheep.com', 'Miễn phí, có audio', 1),
  ('Audio từ đơn', 'dictionary.cambridge.org · youglish.com', 'Cambridge có cả giọng Anh/Mỹ', 2),
  ('WFD / RS / RA / SST / FIB / HIW / RO', 'APEUni', 'Tin phần chấm khớp chữ; không tin điểm Speaking tổng', 3),
  ('Nhận diện từ khi nói', 'APEUni RA (chấm từng từ) · ELSA Speak · Google Docs voice typing', 'Voice typing miễn phí: nói vào, xem nó gõ ra gì', 4),
  ('Chấm viết theo CEFR', 'writeandimprove.com', 'Miễn phí, Cambridge', 5),
  ('Test ngữ pháp tổng', 'Cambridge "Test your English" · bài test cuối sách Murphy', 'Cho thẳng CEFR', 6),
  ('Test từ vựng theo mốc', 'newgeneralservicelist.com (NGSL test) · Anki deck AWL', NULL, 7),
  ('Nghe từ đơn để chép (mình không phát được audio)', 'Anki — deck mình xuất, mặt trước chỉ audio', 'Anki tự tải audio khi import; bạn không thấy chữ cho tới khi lật thẻ', 8),
  ('Đề mình ra (10 câu / 30 từ / đoạn sửa lỗi)', 'Nhắn "test [tên mục]"', 'Mình gửi đề, bạn làm, mình chấm và ghi ✓/✗', 9);
