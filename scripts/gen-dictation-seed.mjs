// Sinh migrations/0032_dictation_sentences.sql từ các bộ câu đã qua kiểm mù
// trong content/roadmap-dictation/*-b1.json (bỏ câu có dropped = true).
//
//   node scripts/gen-dictation-seed.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'migrations/0032_dictation_sentences.sql');
const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

// mode: targets = chấm từ chức năng · links = chấm chỗ nối · stress = bấm từ được nhấn
const ITEMS = [
  { item_key: 'nghe-06', file: 'nghe-06-b1.json', mode: 'targets', keyField: 'targets', sample: 10 },
  { item_key: 'nghe-07', file: 'nghe-07-b1.json', mode: 'links', keyField: 'links', sample: 10 },
  { item_key: 'nghe-08', file: 'nghe-08-b1.json', mode: 'stress', keyField: 'stressed', sample: 10 },
];

const rows = [];
for (const it of ITEMS) {
  const bank = JSON.parse(readFileSync(join(root, 'content/roadmap-dictation', it.file), 'utf8'));
  if (!Array.isArray(bank.verified_by) || bank.verified_by.length < 2) {
    throw new Error(`${it.file}: chưa đủ 2 phiên kiểm mù, không được nạp`);
  }
  const kept = bank.sentences.filter((s) => !s.dropped);
  if (kept.length < it.sample) throw new Error(`${it.file}: chỉ còn ${kept.length} câu, cần ≥ ${it.sample}`);
  for (const s of kept) {
    rows.push([s.id, it.item_key, bank.batch ?? 1, s.text, JSON.stringify(s[it.keyField]), s.note_vi ?? null]);
  }
  it.kept = kept.length;
}

const sql = `-- Ngân hàng câu cho bài nghe chép chính tả (nghe-06, nghe-07) và bấm từ được
-- nhấn (nghe-08). Soạn bởi agent theo src/doc/roadmap-question-authoring.md,
-- kiểm mù bởi 2 phiên khác model (Sonnet, Fable): 90 câu x 2 phiên, 0 chỗ lệch
-- đáp án. Câu nội dung mơ hồ đã bị bỏ (dropped trong file nguồn).
--
-- key_json theo mode: targets = chỉ số từ chức năng · links = cặp chỉ số chỗ
-- nối · stress = chỉ số từ được nhấn. Chỉ số tính trên text.split(/\\s+/) đã
-- bỏ dấu câu đầu cuối.
--
-- Sinh bởi scripts/gen-dictation-seed.mjs. Nội dung dùng chung, không user_id.

CREATE TABLE IF NOT EXISTS dictation_sentences (
  id TEXT PRIMARY KEY,
  item_key TEXT NOT NULL,
  batch INTEGER NOT NULL DEFAULT 1,
  text TEXT NOT NULL,
  key_json TEXT NOT NULL,
  note_vi TEXT
);

CREATE INDEX IF NOT EXISTS idx_dictation_sentences_item ON dictation_sentences(item_key);

INSERT INTO dictation_sentences (id, item_key, batch, text, key_json, note_vi) VALUES
${rows.map((r) => `  (${q(r[0])}, ${q(r[1])}, ${r[2]}, ${q(r[3])}, ${q(r[4])}, ${q(r[5])})`).join(',\n')};

INSERT INTO roadmap_item_tests (item_key, tool, list_code, config_json) VALUES
${ITEMS.map((it) => `  (${q(it.item_key)}, ${q(it.mode === 'stress' ? 'T3S' : 'T3')}, NULL, ${q(JSON.stringify({ mode: it.mode, sample: it.sample }))})`).join(',\n')};
`;

writeFileSync(OUT, sql, 'utf8');
console.log(`Wrote ${OUT}`);
for (const it of ITEMS) console.log(`  ${it.item_key} (${it.mode}): ${it.kept} câu, mỗi lượt ${it.sample}`);
