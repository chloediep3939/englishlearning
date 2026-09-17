// Generates a migration from the checklist source doc at
// src/doc/prompts/roadmap-checklist.md — the doc is the source of truth, the
// SQL is derived.
//
//   node scripts/gen-roadmap-seed.mjs
//     → rewrites migrations/0021_roadmap.sql (DDL + seed). Only useful before
//       0021 has been applied anywhere; it IS applied now, so don't.
//
//   node scripts/gen-roadmap-seed.mjs --sync migrations/0022_name.sql
//     → writes a NEW migration that UPDATEs every row to match the doc
//       (keyed by item_key / skill code / tool position). This is how you edit
//       checklist wording after 0021 shipped — CLAUDE.md §4.5 forbids touching
//       an applied migration.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src/doc/prompts/roadmap-checklist.md');

const syncFlag = process.argv.indexOf('--sync');
const SYNC = syncFlag !== -1;
const OUT = SYNC ? join(root, process.argv[syncFlag + 1]) : join(root, 'migrations/0021_roadmap.sql');
if (SYNC && !process.argv[syncFlag + 1]) throw new Error('--sync needs an output path');

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

const lines = readFileSync(SRC, 'utf8').split('\n');

const skills = [];
const items = [];
const tools = [];

let skill = null;
let group = null;
let inTools = false;

for (const raw of lines) {
  const line = raw.trim();

  const mSkill = line.match(/^## SKILL:\s*(\S+)\s*—\s*(.+)$/);
  if (mSkill) {
    skill = { code: mSkill[1], label: mSkill[2].trim(), note: null, position: skills.length + 1 };
    skills.push(skill);
    group = null;
    inTools = false;
    continue;
  }

  if (line === '## TOOLS') {
    inTools = true;
    skill = null;
    group = null;
    continue;
  }

  const mNote = line.match(/^>\s*SKILLNOTE:\s*(.+)$/);
  if (mNote && skill) {
    skill.note = mNote[1].trim();
    continue;
  }

  const mGroup = line.match(/^### GROUP:\s*(.+)$/);
  if (mGroup) {
    group = mGroup[1].trim();
    continue;
  }

  if (!line.startsWith('|')) continue;

  const cells = line.split('|').slice(1, -1).map((c) => c.trim());
  if (cells.length !== 3) continue;
  // Skip the header row and the --- separator row of every table.
  if (/^-{3,}$/.test(cells[0])) continue;
  if (cells[0] === 'Mục' || cells[0] === 'Việc') continue;

  if (inTools) {
    tools.push({
      position: tools.length + 1,
      task: cells[0],
      tool: cells[1],
      note: cells[2] === '—' ? null : cells[2],
    });
    continue;
  }

  if (!skill || !group) throw new Error(`Table row outside a SKILL/GROUP: ${line}`);

  const seq = items.filter((i) => i.skill_code === skill.code).length + 1;
  items.push({
    item_key: `${skill.code}-${String(seq).padStart(2, '0')}`,
    skill_code: skill.code,
    group_name: group,
    label: cells[0],
    how_to_test: cells[1],
    pass_when: cells[2],
    position: items.length + 1,
  });
}

if (skills.length !== 4) throw new Error(`Expected 4 skills, got ${skills.length}`);
if (items.length === 0) throw new Error('No checklist items parsed');

const sql = `-- Roadmap: bảng checklist 4 kỹ năng (nội dung dùng chung cho mọi user) +
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
-- Seed: ${skills.length} kỹ năng, ${items.length} mục, ${tools.length} công cụ
-- ============================================================================

INSERT INTO roadmap_skills (code, label, note, position) VALUES
${skills.map((s) => `  (${q(s.code)}, ${q(s.label)}, ${q(s.note)}, ${s.position})`).join(',\n')};

INSERT INTO roadmap_items (item_key, skill_code, group_name, label, how_to_test, pass_when, position) VALUES
${items
  .map(
    (i) =>
      `  (${q(i.item_key)}, ${q(i.skill_code)}, ${q(i.group_name)}, ${q(i.label)}, ${q(i.how_to_test)}, ${q(i.pass_when)}, ${i.position})`,
  )
  .join(',\n')};

INSERT INTO roadmap_tools (task, tool, note, position) VALUES
${tools.map((t) => `  (${q(t.task)}, ${q(t.tool)}, ${q(t.note)}, ${t.position})`).join(',\n')};
`;

const syncSql = `-- Đồng bộ nội dung checklist với src/doc/prompts/roadmap-checklist.md.
-- Sinh ra bởi: node scripts/gen-roadmap-seed.mjs --sync ${process.argv[syncFlag + 1] ?? ''}
-- Chỉ UPDATE chữ nghĩa, không đụng schema và không đụng roadmap_progress
-- (item_key giữ nguyên nên tiến độ của user không mất).

${items
  .map(
    (i) =>
      `UPDATE roadmap_items SET label = ${q(i.label)}, how_to_test = ${q(i.how_to_test)}, pass_when = ${q(i.pass_when)}, group_name = ${q(i.group_name)} WHERE item_key = ${q(i.item_key)};`,
  )
  .join('\n')}

${skills.map((s2) => `UPDATE roadmap_skills SET label = ${q(s2.label)}, note = ${q(s2.note)} WHERE code = ${q(s2.code)};`).join('\n')}

${tools
  .map(
    (t) =>
      `UPDATE roadmap_tools SET task = ${q(t.task)}, tool = ${q(t.tool)}, note = ${q(t.note)} WHERE position = ${t.position};`,
  )
  .join('\n')}
`;

writeFileSync(OUT, SYNC ? syncSql : sql, 'utf8');

const perSkill = skills.map((s) => `${s.code}=${items.filter((i) => i.skill_code === s.code).length}`);
console.log(`Wrote ${OUT}`);
console.log(`  skills: ${skills.length} (${perSkill.join(', ')})`);
console.log(`  items: ${items.length}, tools: ${tools.length}`);
