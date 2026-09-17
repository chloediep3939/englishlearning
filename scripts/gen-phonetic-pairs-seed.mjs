// Sinh migration nạp cặp từ phân biệt âm (minimal pair) cho công cụ T8.
//
//   node scripts/gen-phonetic-pairs-seed.mjs
//
// Đọc content/phonetics/minimal-pairs.json (do scripts/build-minimal-pairs.mjs
// dựng và kiểm chứng với cmu-ipa.json), đổ vào bảng phonetic_pairs, và nối các
// mục roadmap vào bài T8.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'migrations/0028_phonetic_pairs.sql');
const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

// Hai nguồn: nguyên âm/phụ âm (build-minimal-pairs.mjs) và âm cuối từ
// (build-final-sound-pairs.mjs). Cùng một khuôn dữ liệu.
const groups = [
  ...JSON.parse(readFileSync(join(root, 'content/phonetics/minimal-pairs.json'), 'utf8')),
  ...JSON.parse(readFileSync(join(root, 'content/phonetics/final-sound-pairs.json'), 'utf8')),
];

// Mục roadmap → những nhóm tương phản nào, mỗi nhóm bốc bao nhiêu cặp.
// scoring 'min_group': ngưỡng gốc là "≥ 18/20 MỖI NHÓM", nên điểm nộp lên là
// nhóm TỆ NHẤT quy về thang 20. Đạt khi và chỉ khi mọi nhóm đều ≥ 90%.
const ITEM_TESTS = [
  {
    item_key: 'nghe-01',
    // ⚠️ Cố ý bỏ ɒ_ɔː. Giọng Mỹ gộp /ɒ/ và /ɔː/ (cot = caught), mà audio đang
    // dùng là giọng Mỹ — giữ lại thì người học trượt nhóm này dù tai ổn. Thêm
    // lại khi có audio giọng Anh.
    contrasts: ['ɪ_iː', 'æ_e', 'æ_ʌ', 'e_ʌ', 'ʊ_uː'],
    per_group: 10,
    scoring: 'min_group',
  },
  {
    item_key: 'nghe-02',
    contrasts: ['θ_s', 'ð_d', 'v_w', 'ʃ_s', 'tʃ_dʒ', 'r_l'],
    per_group: 10,
    scoring: 'min_group',
  },
  {
    // Ngưỡng gốc "≥ 90% đuôi đúng" — tính trên toàn bài, không theo nhóm.
    // per_group 6 vì nhóm /p/–/b/ chỉ có 16 cặp.
    item_key: 'nghe-03',
    contrasts: ['final_s_z', 'final_t_d', 'final_k_g', 'final_p_b', 'ending_s', 'ending_ed'],
    per_group: 6,
    scoring: 'overall',
  },
];

const byContrast = new Map(groups.map((g) => [g.contrast, g]));
for (const t of ITEM_TESTS) {
  for (const c of t.contrasts) {
    const g = byContrast.get(c);
    if (!g) throw new Error(`${t.item_key}: unknown contrast ${c}`);
    if (g.pairs.length < t.per_group) {
      throw new Error(`${t.item_key}: ${c} has ${g.pairs.length} pairs, need ${t.per_group}`);
    }
  }
}

const rows = [];
for (const g of groups) {
  for (const p of g.pairs) rows.push([g.contrast, g.label, g.kind, p.a, p.b, p.ipa_a, p.ipa_b]);
}

const sql = `-- Cặp từ phân biệt âm cho công cụ T8 (nghe chọn từ).
--
-- Dữ liệu dựng bởi scripts/build-minimal-pairs.mjs: cặp viết tay từ tài liệu
-- ESL rồi kiểm chứng máy với cmu-ipa.json (đúng một âm vị khác nhau). Không đào
-- từ điển ra vì cmudict ~40% là tên riêng. Migration này sinh bởi
-- scripts/gen-phonetic-pairs-seed.mjs.
--
-- Nội dung dùng chung, không có user_id.

CREATE TABLE IF NOT EXISTS phonetic_pairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contrast TEXT NOT NULL,         -- vd 'ɪ_iː'
  contrast_label TEXT NOT NULL,   -- vd '/ɪ/ – /iː/', hiện trên UI
  kind TEXT NOT NULL,
  word_a TEXT NOT NULL,
  word_b TEXT NOT NULL,
  ipa_a TEXT,
  ipa_b TEXT,
  UNIQUE (contrast, word_a, word_b)
);

CREATE INDEX IF NOT EXISTS idx_phonetic_pairs_contrast ON phonetic_pairs(contrast);

INSERT INTO phonetic_pairs (contrast, contrast_label, kind, word_a, word_b, ipa_a, ipa_b) VALUES
${rows.map((r) => `  (${r.map(q).join(', ')})`).join(',\n')};

-- config_json: { contrasts, per_group, scoring }
INSERT INTO roadmap_item_tests (item_key, tool, list_code, config_json) VALUES
${ITEM_TESTS.map(
  (t) =>
    `  (${q(t.item_key)}, 'T8', NULL, ${q(
      JSON.stringify({ contrasts: t.contrasts, per_group: t.per_group, scoring: t.scoring }),
    )})`,
).join(',\n')};
`;

writeFileSync(OUT, sql, 'utf8');
console.log(`Wrote ${OUT}`);
console.log(`  ${rows.length} cặp trong ${groups.length} nhóm; nối ${ITEM_TESTS.map((t) => t.item_key).join(', ')} vào T8`);
