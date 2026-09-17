// Sinh migrations/0030_word_stress.sql từ content/phonetics/word-stress.json
// (dựng bởi scripts/build-minimal-pairs.mjs, kiểm chứng với cmu-ipa.json).
//
//   node scripts/gen-word-stress-seed.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'migrations/0030_word_stress.sql');
const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

const words = JSON.parse(readFileSync(join(root, 'content/phonetics/word-stress.json'), 'utf8'));
for (const w of words) {
  if (!(w.stress_index >= 0 && w.stress_index < w.syllables)) {
    throw new Error(`${w.word}: stress_index ${w.stress_index} out of range for ${w.syllables} syllables`);
  }
}

// Ngưỡng gốc "≥ 17/20" → mỗi lượt bốc đúng 20 từ.
const ITEM = { item_key: 'nghe-05', sample: 20 };

const CHUNK = 200;
const inserts = [];
for (let i = 0; i < words.length; i += CHUNK) {
  inserts.push(
    `INSERT INTO word_stress (word, ipa, syllables, stress_index) VALUES\n${words
      .slice(i, i + CHUNK)
      .map((w) => `  (${q(w.word)}, ${q(w.ipa)}, ${w.syllables}, ${w.stress_index})`)
      .join(',\n')};`,
  );
}

const sql = `-- Trọng âm từ nhiều âm tiết cho bài nghe-05 (công cụ T8S).
-- Dữ liệu: content/phonetics/word-stress.json — 3+ âm tiết, trọng âm chính rõ
-- ràng; từ có trọng âm dao động (cigarette, especially) đã bị loại tay.
-- Sinh bởi scripts/gen-word-stress-seed.mjs. Nội dung dùng chung, không user_id.

CREATE TABLE IF NOT EXISTS word_stress (
  word TEXT PRIMARY KEY,
  ipa TEXT NOT NULL,
  syllables INTEGER NOT NULL,
  stress_index INTEGER NOT NULL
);

${inserts.join('\n\n')}

INSERT INTO roadmap_item_tests (item_key, tool, list_code, config_json) VALUES
  (${q(ITEM.item_key)}, 'T8S', NULL, ${q(JSON.stringify({ sample: ITEM.sample }))});
`;

writeFileSync(OUT, sql, 'utf8');
console.log(`Wrote ${OUT}: ${words.length} từ, nối ${ITEM.item_key} vào T8S`);
