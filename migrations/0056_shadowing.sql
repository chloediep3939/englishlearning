-- Shadowing (nhại theo giọng thật) — schema nền cho MVP S1–S3.
-- Kế hoạch: src/doc/prompts/shadowing-deployment-plan.md (§3 Dữ liệu).
--
-- Hai bảng nội dung dùng chung (KHÔNG scope theo user, giống preset decks /
-- pronunciation catalog): shadowing_lessons, shadowing_sentences.
-- Hai bảng theo user: shadowing_sessions, shadowing_attempts.
--
-- Audio gốc lưu trên R2 (binding AUDIO_BUCKET đã có) — chỉ giữ audio_key ở đây.
-- KHÔNG lưu audio người dùng ở giai đoạn này (ngoại lệ ngày 0/ngày 7 của S6 sẽ
-- có migration riêng khi tới phase đó).

-- Kho bài: một clip giọng thật + metadata. Nội dung dùng chung mọi user.
CREATE TABLE IF NOT EXISTS shadowing_lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,                      -- 'voa' | 'youtube'
  source_url TEXT,                           -- link bài gốc (ghi nguồn)
  title TEXT NOT NULL,
  program TEXT,                              -- vd 'English in a Minute'
  level INTEGER NOT NULL DEFAULT 0,          -- 0..5, gán tay lúc nhập
  audio_key TEXT NOT NULL,                   -- object key trên R2 (AUDIO_BUCKET)
  duration_ms INTEGER,
  word_count INTEGER,
  wpm INTEGER,                               -- số từ/phút, để tính nhãn độ khó
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_shadowing_lessons_level ON shadowing_lessons(level);

-- Từng câu trong một bài, kèm mốc thời gian từng từ (words_json) và bản đồ đọc
-- (marks_json — được S4 điền; null lúc nhập). idx là thứ tự câu trong bài.
CREATE TABLE IF NOT EXISTS shadowing_sentences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER NOT NULL REFERENCES shadowing_lessons(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,                      -- 0-based thứ tự trong bài
  text TEXT NOT NULL,
  translation_vi TEXT,                       -- dịch một lần lúc nhập
  start_ms INTEGER,                          -- mốc câu trong audio bài
  end_ms INTEGER,
  words_json TEXT,                           -- [{word,start_ms,end_ms}] — TEXT JSON
  marks_json TEXT,                           -- bản đồ đọc (S4) — TEXT JSON, null lúc nhập
  UNIQUE(lesson_id, idx)
);

CREATE INDEX IF NOT EXISTS idx_shadowing_sentences_lesson ON shadowing_sentences(lesson_id);

-- Một phiên luyện của user trên một bài, ở một bậc. Theo user.
CREATE TABLE IF NOT EXISTS shadowing_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES shadowing_lessons(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  ended_at TEXT,
  sentence_count INTEGER NOT NULL DEFAULT 0,
  avg_score INTEGER,                         -- 0..100, null tới khi có lần chấm
  speaking_seconds INTEGER NOT NULL DEFAULT 0  -- số giây "mở miệng"
);

CREATE INDEX IF NOT EXISTS idx_shadowing_sessions_user ON shadowing_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_shadowing_sessions_user_lesson ON shadowing_sessions(user_id, lesson_id);

-- Một lần nhại một câu: kết quả STT tạm + điểm Azure. Theo user.
-- scored=0 nghĩa là chưa gọi Azure (dưới cổng STT hoặc audio bị lọc).
CREATE TABLE IF NOT EXISTS shadowing_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES shadowing_sessions(id) ON DELETE CASCADE,
  sentence_id INTEGER NOT NULL REFERENCES shadowing_sentences(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stt_text TEXT,                             -- lời máy nghe được (lớp 1)
  stt_match_pct INTEGER,                     -- 0..100 khớp so với text câu
  scored INTEGER NOT NULL DEFAULT 0,         -- 0|1 đã chấm Azure chưa
  pron_score INTEGER,                        -- điểm phát âm tổng 0..100
  accuracy INTEGER,
  fluency INTEGER,
  completeness INTEGER,
  prosody INTEGER,                           -- chỉ có với tiếng Anh Mỹ
  words_json TEXT,                           -- kết quả từng từ + âm vị của Azure — TEXT JSON
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_shadowing_attempts_session ON shadowing_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_shadowing_attempts_user ON shadowing_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_shadowing_attempts_sentence ON shadowing_attempts(sentence_id);
