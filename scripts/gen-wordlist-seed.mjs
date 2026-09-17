// Sinh migrations/0025_word_lists.sql từ content/wordlists/*.json.
//
//   node scripts/gen-wordlist-seed.mjs
//
// Dữ liệu gốc do scripts/build-wordlists.mjs tải về từ nguồn công khai. Ở đây
// chỉ đổ vào D1 để truy vấn được (bốc ngẫu nhiên N từ, lọc bỏ từ user đã biết)
// — thứ mà file JSON tĩnh trong public/ không làm được.
//
// INSERT gộp nhiều dòng mỗi câu lệnh: ~4.000 từ mà chạy 4.000 statement thì
// migration lê lết, gộp 200 dòng/câu còn ~20 statement.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'migrations/0025_word_lists.sql');
const CHUNK = 200;

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const read = (name) => JSON.parse(readFileSync(join(root, 'content/wordlists', name), 'utf8'));

const ngsl = read('ngsl.json');
const awl = read('awl.json');
const phrasal = read('phrasal-verbs.json');
const misspelled = read('commonly-misspelled.json');

// code, label, nguồn — label hiện thẳng trên UI nên viết tiếng Việt.
const LISTS = [
  ['ngsl', 'New General Service List', 'Từ thông dụng, xếp theo tần suất 1–2.809', 'newgeneralservicelist.com'],
  ['awl', 'Academic Word List', '570 từ học thuật, chia 10 sublist', 'wgtn.ac.nz/lals (Coxhead)'],
  ['phrasal', 'Phrasal verb thông dụng', '100 phrasal verb hay gặp nhất', 'PHaVE List (Garnier & Schmitt 2015)'],
  ['misspelled', 'Từ hay sai chính tả', 'Từ người học hay viết sai', 'Wikipedia'],
];

const entries = [];
for (const w of ngsl) entries.push(['ngsl', w.word, w.rank, null, null, null]);
for (const w of awl) entries.push(['awl', w.word, null, w.sublist, null, null]);
for (const w of phrasal) entries.push(['phrasal', w.verb, null, null, w.meaning_en, null]);
// tier 1 = danh sách đã xuất bản (Oxford, YourDictionary…), tier 2 = lọc từ
// typo trên Wikipedia rồi chặn bằng cổng từ vựng NGSL/AWL. Giữ tier để bài
// test có thể ưu tiên tier 1 nếu thấy tier 2 nhiễu.
for (const w of misspelled) entries.push(['misspelled', w.word, null, null, null, w.tier ?? null]);

// Mỗi mục roadmap dùng bộ từ nào, lọc ra sao, bốc bao nhiêu từ.
// rank_min/rank_max và sublist_min/sublist_max là bộ lọc; sample là số từ bốc.
// mode: 'know' = bấm Biết/Không biết · 'meaning' = gõ nghĩa · 'listen' = nghe rồi gõ từ
const ITEM_TESTS = [
  ['doc-01', 'ngsl', { rank_max: 1500, sample: 50, mode: 'know' }],
  ['doc-02', 'ngsl', { rank_min: 1501, sample: 50, mode: 'know' }],
  ['doc-03', 'awl', { sublist_max: 3, sample: 50, mode: 'know' }],
  ['doc-04', 'awl', { sublist_min: 4, sample: 50, mode: 'know' }],
  ['doc-08', 'phrasal', { sample: 30, mode: 'know' }],
  ['nghe-09', 'ngsl', { rank_max: 1500, sample: 30, mode: 'listen' }],
  ['nghe-10', 'ngsl', { rank_min: 1501, sample: 30, mode: 'listen' }],
  ['nghe-11', 'awl', { sample: 30, mode: 'listen' }],
  ['nghe-04', 'awl', { sample: 30, mode: 'listen' }],
  ['nghe-18', 'misspelled', { sample: 30, mode: 'listen' }],
  ['viet-44', 'misspelled', { sample: 30, mode: 'listen' }],
];

function insertChunks(table, columns, rows, toValues) {
  const out = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    out.push(
      `INSERT INTO ${table} (${columns}) VALUES\n${slice.map(toValues).join(',\n')};`,
    );
  }
  return out.join('\n\n');
}

const sql = `-- Bộ từ chuẩn cho công cụ tự kiểm tra T1 (phase 1).
--
-- word_lists / word_list_entries KHÔNG có user_id: nội dung tham chiếu dùng
-- chung, giống roadmap_items. Ranh giới multi-tenancy nằm ở user_word_known.
--
-- Dữ liệu do scripts/build-wordlists.mjs tải từ nguồn công khai; migration này
-- sinh bởi scripts/gen-wordlist-seed.mjs. Sửa bộ từ thì sinh migration MỚI.

CREATE TABLE IF NOT EXISTS word_lists (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  source TEXT
);

CREATE TABLE IF NOT EXISTS word_list_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list_code TEXT NOT NULL,
  word TEXT NOT NULL,
  rank INTEGER,          -- chỉ NGSL
  sublist INTEGER,       -- chỉ Academic Word List
  meaning_en TEXT,       -- chỉ phrasal verb
  tier INTEGER,          -- chỉ danh sách chính tả: 1 = nguồn xuất bản, 2 = suy ra
  UNIQUE (list_code, word),
  FOREIGN KEY (list_code) REFERENCES word_lists(code)
);

CREATE INDEX IF NOT EXISTS idx_word_list_entries_rank
  ON word_list_entries(list_code, rank);
CREATE INDEX IF NOT EXISTS idx_word_list_entries_sublist
  ON word_list_entries(list_code, sublist);

-- User tick "từ này tôi biết rồi" để nó không hiện lại ở lần kiểm sau và
-- không bị đẩy vào bộ từ để học.
CREATE TABLE IF NOT EXISTS user_word_known (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  list_code TEXT NOT NULL,
  word TEXT NOT NULL,
  known_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE (user_id, list_code, word),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_word_known_user
  ON user_word_known(user_id, list_code);

-- Mục roadmap nào dùng bộ từ nào, lọc và bốc bao nhiêu.
-- config_json giữ { rank_min, rank_max, sublist_min, sublist_max, sample, mode }.
CREATE TABLE IF NOT EXISTS roadmap_item_tests (
  item_key TEXT PRIMARY KEY,
  tool TEXT NOT NULL,
  list_code TEXT,
  config_json TEXT NOT NULL,
  FOREIGN KEY (item_key) REFERENCES roadmap_items(item_key)
);

-- ============================================================================
-- Seed: ${LISTS.length} bộ từ, ${entries.length} từ, ${ITEM_TESTS.length} mục roadmap nối vào T1
-- ============================================================================

INSERT INTO word_lists (code, label, description, source) VALUES
${LISTS.map(([c, l, d, s]) => `  (${q(c)}, ${q(l)}, ${q(d)}, ${q(s)})`).join(',\n')};

${insertChunks(
  'word_list_entries',
  'list_code, word, rank, sublist, meaning_en, tier',
  entries,
  ([list, word, rank, sublist, meaning, tier]) =>
    `  (${q(list)}, ${q(word)}, ${rank ?? 'NULL'}, ${sublist ?? 'NULL'}, ${q(meaning)}, ${tier ?? 'NULL'})`,
)}

INSERT INTO roadmap_item_tests (item_key, tool, list_code, config_json) VALUES
${ITEM_TESTS.map(([key, list, cfg]) => `  (${q(key)}, 'T1', ${q(list)}, ${q(JSON.stringify(cfg))})`).join(',\n')};
`;

writeFileSync(OUT, sql, 'utf8');
const byList = LISTS.map(([c]) => `${c}=${entries.filter((e) => e[0] === c).length}`);
console.log(`Wrote ${OUT}`);
console.log(`  ${entries.length} từ (${byList.join(', ')})`);
console.log(`  ${ITEM_TESTS.length} mục roadmap nối vào T1`);
