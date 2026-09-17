// Sinh migrations/0024_roadmap_thresholds_and_runs.sql từ cột "Đạt khi" trong
// src/doc/prompts/roadmap-checklist.md.
//
// Mục đích: biến ngưỡng đang là chữ ("≥ 47/50", "≤ 3 từ/bài") thành số để máy
// so được, và tạo bảng lưu kết quả mỗi lần tự kiểm tra.
//
//   node scripts/gen-roadmap-thresholds.mjs
//
// Migration này đã apply — muốn đổi ngưỡng thì sửa file md rồi sinh migration
// MỚI (CLAUDE.md §4.5: không sửa migration đã chạy).

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src/doc/prompts/roadmap-checklist.md');
const OUT = join(root, 'migrations/0024_roadmap_thresholds_and_runs.sql');

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

/**
 * Đọc ngưỡng từ câu tiếng Việt ở cột "Đạt khi".
 * Trả về { dir, value, total, unit } hoặc null nếu ngưỡng thuần chữ.
 *
 *   "≥ 47/50"        → gte 47/50 count
 *   "≥ 90% đuôi đúng"→ gte 90/100 percent
 *   "≤ 3 từ/bài"     → lte 3, total null
 *   "0 lỗi chính tả" → lte 0  (đếm lỗi: 0 nghĩa là không được có lỗi nào)
 */
function parseThreshold(passWhen) {
  const frac = passWhen.match(/(≤|≥|<|>)?\s*(\d+)\s*\/\s*(\d+)/);
  const pct = passWhen.match(/(≤|≥|<|>)?\s*(\d+)\s*%/);
  const bare = passWhen.match(/^(≤|≥|<|>)?\s*(\d+)\b/);
  const pick = frac || pct || bare;
  if (!pick) return null;

  let dir = pick[1] === '≤' || pick[1] === '<' ? 'lte' : 'gte';
  let value;
  let total = null;
  let unit = 'count';

  if (frac) {
    value = Number(frac[2]);
    total = Number(frac[3]);
  } else if (pct) {
    value = Number(pct[2]);
    total = 100;
    unit = 'percent';
  } else {
    value = Number(bare[2]);
    // "0 lỗi" / "0 từ bịa" — con số trần không dấu mà bằng 0 luôn là đếm lỗi.
    if (value === 0) dir = 'lte';
  }
  return { dir, value, total, unit };
}

const lines = readFileSync(SRC, 'utf8').split('\n');
const items = [];
let skill = null;
const seq = {};

for (const raw of lines) {
  const line = raw.trim();
  const mSkill = line.match(/^## SKILL:\s*(\S+)\s*—/);
  if (mSkill) {
    skill = mSkill[1];
    continue;
  }
  if (line === '## TOOLS') {
    skill = null;
    continue;
  }
  if (!line.startsWith('|') || !skill) continue;
  const cells = line.split('|').slice(1, -1).map((c) => c.trim());
  if (cells.length !== 3 || /^-{3,}$/.test(cells[0]) || cells[0] === 'Mục') continue;

  seq[skill] = (seq[skill] || 0) + 1;
  items.push({
    item_key: `${skill}-${String(seq[skill]).padStart(2, '0')}`,
    pass_when: cells[2],
    t: parseThreshold(cells[2]),
  });
}

if (items.length !== 141) throw new Error(`Expected 141 items, got ${items.length}`);

const parsed = items.filter((i) => i.t);
const manual = items.filter((i) => !i.t);

const sql = `-- Hạ tầng cho công cụ tự kiểm tra roadmap (phase 0).
--
-- 1. Bốn cột ngưỡng trên roadmap_items: đổi "Đạt khi" từ chữ sang số để máy so
--    được. pass_dir 'gte' = càng nhiều càng tốt, 'lte' = càng ít càng tốt
--    (đếm lỗi). pass_total NULL khi ngưỡng không có mẫu số ("≥ 6 keyword/bài").
--    ${manual.length} mục có ngưỡng thuần chữ → để NULL, chỉ đánh dấu tay được.
-- 2. roadmap_test_runs: lịch sử mỗi lần tự kiểm tra. Tách khỏi
--    flashcard_test_attempts vì bảng đó khoá cứng mode bằng CHECK và gắn với
--    flashcard_id, không dùng lại được.
--
-- Sinh bởi scripts/gen-roadmap-thresholds.mjs từ src/doc/prompts/roadmap-checklist.md.

ALTER TABLE roadmap_items ADD COLUMN pass_dir TEXT;
ALTER TABLE roadmap_items ADD COLUMN pass_value INTEGER;
ALTER TABLE roadmap_items ADD COLUMN pass_total INTEGER;
ALTER TABLE roadmap_items ADD COLUMN pass_unit TEXT;

CREATE TABLE IF NOT EXISTS roadmap_test_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_key TEXT NOT NULL,
  -- 'manual' = user tự nhập điểm sau khi test ở đâu đó (APEUni, giấy…).
  -- Các công cụ trong app sau này dùng mã riêng: 'T1', 'T2', …
  source TEXT NOT NULL DEFAULT 'manual',
  score INTEGER NOT NULL,
  total INTEGER,
  passed INTEGER NOT NULL,
  note TEXT,
  detail_json TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE (user_id, item_key, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_test_runs_user_item
  ON roadmap_test_runs(user_id, item_key, created_at DESC);

-- Ngưỡng số cho ${parsed.length}/141 mục
${parsed
  .map(
    (i) =>
      `UPDATE roadmap_items SET pass_dir = ${q(i.t.dir)}, pass_value = ${i.t.value}, pass_total = ${
        i.t.total === null ? 'NULL' : i.t.total
      }, pass_unit = ${q(i.t.unit)} WHERE item_key = ${q(i.item_key)};`,
  )
  .join('\n')}

-- ${manual.length} mục ngưỡng thuần chữ, để NULL:
${manual.map((i) => `--   ${i.item_key}: ${i.pass_when}`).join('\n')}
`;

writeFileSync(OUT, sql, 'utf8');
console.log(`Wrote ${OUT}`);
console.log(`  có ngưỡng số: ${parsed.length}  |  thuần chữ: ${manual.length}`);
console.log(`  gte: ${parsed.filter((i) => i.t.dir === 'gte').length}  lte: ${parsed.filter((i) => i.t.dir === 'lte').length}`);
