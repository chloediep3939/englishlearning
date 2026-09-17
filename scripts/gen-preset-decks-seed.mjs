#!/usr/bin/env node
// Generate a migration that seeds preset decks ("Thư viện bộ từ") from
// content/preset-decks/manifest.json + content/preset-decks/<code>.json.
//
// Usage:
//   node scripts/gen-preset-decks-seed.mjs <out.sql> --ddl <code> [<code> …]
//   node scripts/gen-preset-decks-seed.mjs <out.sql> <code> [<code> …]
//
//   --ddl   include CREATE TABLE statements (first migration only).
// Levels are always upserted for every manifest level (INSERT OR IGNORE), so a
// later batch never has to worry about a missing level row. Decks are only
// seeded when their content file exists and passes scripts/check-preset-deck.mjs
// — run that first; this script re-checks the word list and aborts on mismatch.
//
// Never edit an applied migration: for new decks generate a NEW migration with
// just those codes; for content fixes write an UPDATE migration by hand.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'content/preset-decks');

//   --enrich        emit UPDATEs of the enrichment fields (ipa, audio_src,
//                   image_url, image_attribution, examples with image_url)
//                   written by scripts/enrich-preset-decks.mjs, for decks that
//                   are ALREADY seeded. Add --alter the first time (0037) to
//                   also add those columns.
const args = process.argv.slice(2);
const out = args.shift();
const withDdl = args.includes('--ddl');
const enrich = args.includes('--enrich');
const withAlter = args.includes('--alter');
// --codes-file <path>: đọc danh sách code (mỗi dòng một code) để tránh giới hạn
// dòng lệnh / word-splitting của shell khi có nhiều deck.
let codes = args.filter((a) => !a.startsWith('--'));
const cfIdx = args.indexOf('--codes-file');
if (cfIdx >= 0) {
  const path = args[cfIdx + 1];
  codes = readFileSync(path, 'utf8').split(/\s+/).map((s) => s.trim()).filter(Boolean);
}
if (!out || codes.length === 0) {
  console.error('usage: gen-preset-decks-seed.mjs <out.sql> [--ddl | --enrich [--alter]] <code>…');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8'));
const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

const toExamples = (c) =>
  (c.examples ?? []).map((e) => ({ en: e.en, vi: e.vi, ...(e.image_url ? { image_url: e.image_url } : {}) }));

if (enrich) {
  const lines = [];
  if (withAlter) {
    lines.push(`-- Thông tin bổ sung cho bộ gốc (chạy "sửa từ thiếu info" một lần cho mọi user):
-- IPA Oxford US (CMU khi Oxford không có), URL mp3 Oxford US, hình Pexels cho từ
-- và cho từng câu ví dụ. Sinh bởi scripts/enrich-preset-decks.mjs +
-- scripts/gen-preset-decks-seed.mjs --enrich.
ALTER TABLE preset_deck_cards ADD COLUMN ipa TEXT;
ALTER TABLE preset_deck_cards ADD COLUMN audio_src TEXT;
ALTER TABLE preset_deck_cards ADD COLUMN image_url TEXT;
ALTER TABLE preset_deck_cards ADD COLUMN image_attribution TEXT;
`);
  }
  let n = 0;
  for (const code of codes) {
    const file = JSON.parse(readFileSync(join(DIR, `${code}.json`), 'utf8'));
    lines.push(`-- ${code}`);
    for (const c of file.cards) {
      lines.push(
        `UPDATE preset_deck_cards SET ipa = ${q(c.ipa)}, audio_src = ${q(c.audio_src)}, ` +
          `image_url = ${q(c.image_url)}, image_attribution = ${q(c.image_attribution ? JSON.stringify(c.image_attribution) : null)}, ` +
          `examples = ${q(JSON.stringify(toExamples(c)))} ` +
          `WHERE deck_code = ${q(code)} AND english = ${q(c.english)};`,
      );
      n++;
    }
  }
  writeFileSync(out, lines.join('\n') + '\n');
  console.log(`wrote ${out}: ${codes.length} decks, ${n} card updates`);
  process.exit(0);
}

const DDL = `-- Thư viện bộ từ có sẵn (preset decks): bộ NGSL / AWL chia theo level, mỗi bộ
-- ≤ 30 từ, nội dung soạn sẵn (nghĩa, 3 ví dụ en+vi, collocation).
--
-- Ba bảng dưới KHÔNG có user_id: nội dung tham chiếu dùng chung, giống
-- word_list_entries. User "lấy bộ về" = CHÉP các từ đã chọn thành
-- flashcards của user; bộ gốc không bao giờ bị sửa.
--
-- Sinh bởi scripts/gen-preset-decks-seed.mjs từ content/preset-decks/.
-- IPA không lưu ở đây: đọc từ word_glossary (Oxford US) lúc hiển thị / chép.

CREATE TABLE IF NOT EXISTS preset_deck_levels (
  code TEXT PRIMARY KEY,
  list_code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS preset_decks (
  code TEXT PRIMARY KEY,
  level_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  icon TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (level_code) REFERENCES preset_deck_levels(code)
);

CREATE INDEX IF NOT EXISTS idx_preset_decks_level
  ON preset_decks(level_code, position);

CREATE TABLE IF NOT EXISTS preset_deck_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_code TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  english TEXT NOT NULL,
  vietnamese TEXT NOT NULL,
  part_of_speech TEXT,
  examples TEXT NOT NULL DEFAULT '[]',
  collocations TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  UNIQUE (deck_code, english),
  FOREIGN KEY (deck_code) REFERENCES preset_decks(code)
);

CREATE INDEX IF NOT EXISTS idx_preset_deck_cards_deck
  ON preset_deck_cards(deck_code, position);
`;

const lines = [];
if (withDdl) lines.push(DDL);

lines.push('-- Levels (tất cả, INSERT OR IGNORE)');
lines.push('INSERT OR IGNORE INTO preset_deck_levels (code, list_code, label, description, position) VALUES');
lines.push(
  manifest.levels
    .map((l) => `  (${q(l.code)}, ${q(l.list_code)}, ${q(l.label)}, ${q(l.description)}, ${l.position})`)
    .join(',\n') + ';',
);

let cardTotal = 0;
for (const code of codes) {
  const deck = manifest.decks.find((d) => d.code === code);
  if (!deck) throw new Error(`${code}: not in manifest`);
  const path = join(DIR, `${code}.json`);
  if (!existsSync(path)) throw new Error(`${code}: content file missing`);
  const file = JSON.parse(readFileSync(path, 'utf8'));
  const words = file.cards.map((c) => c.english);
  if (JSON.stringify(words) !== JSON.stringify(deck.words)) {
    throw new Error(`${code}: word list differs from manifest — run check-preset-deck.mjs`);
  }
  const level = manifest.levels.find((l) => l.code === deck.level_code);

  lines.push('');
  lines.push(`-- ${code}: ${deck.name} (${file.cards.length} từ)`);
  lines.push(
    `INSERT INTO preset_decks (code, level_code, name, description, color, icon, position) VALUES ` +
      `(${q(code)}, ${q(deck.level_code)}, ${q(deck.name)}, ${q(level.description)}, ` +
      `${q(file.deck?.color ?? '#3da9fc')}, ${q(file.deck?.icon ?? 'BookOpen')}, ${deck.position});`,
  );
  // One INSERT per card keeps each statement small (D1 statement size limit).
  file.cards.forEach((c, i) => {
    const collocations = (c.collocations ?? []).map((p) => ({ phrase: p }));
    if (withDdl) {
      // 0033 shape — enrichment columns did not exist yet.
      const examples = (c.examples ?? []).map((e) => ({ en: e.en, vi: e.vi }));
      lines.push(
        `INSERT INTO preset_deck_cards (deck_code, position, english, vietnamese, part_of_speech, examples, collocations, notes) VALUES ` +
          `(${q(code)}, ${i + 1}, ${q(c.english)}, ${q(c.vietnamese)}, ${q(c.part_of_speech)}, ` +
          `${q(JSON.stringify(examples))}, ${q(JSON.stringify(collocations))}, ${q(c.notes)});`,
      );
    } else {
      // After 0037: run enrich-preset-decks.mjs first so new decks ship complete.
      lines.push(
        `INSERT INTO preset_deck_cards (deck_code, position, english, vietnamese, part_of_speech, examples, collocations, notes, ipa, audio_src, image_url, image_attribution) VALUES ` +
          `(${q(code)}, ${i + 1}, ${q(c.english)}, ${q(c.vietnamese)}, ${q(c.part_of_speech)}, ` +
          `${q(JSON.stringify(toExamples(c)))}, ${q(JSON.stringify(collocations))}, ${q(c.notes)}, ` +
          `${q(c.ipa)}, ${q(c.audio_src)}, ${q(c.image_url)}, ${q(c.image_attribution ? JSON.stringify(c.image_attribution) : null)});`,
      );
    }
  });
  cardTotal += file.cards.length;
}

writeFileSync(out, lines.join('\n') + '\n');
console.log(`wrote ${out}: ${codes.length} decks, ${cardTotal} cards`);
