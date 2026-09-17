#!/usr/bin/env node
// Đưa Academic Collocation List (Pearson/PTE) từ collocations-import/colloc-01..30
// vào thư viện preset dưới list_code 'colloc'. Nội dung đã soạn sẵn (nghĩa, IPA,
// 3 ví dụ) nên KHÔNG cần authoring/enrich — chỉ tách lại thành block ≤ 30 và gom
// theo level, ghi content/preset-decks/colloc-<L>-<NN>.json + thêm vào manifest.
//
// Chạy: node scripts/build-colloc-preset.mjs   (idempotent — ghi đè phần colloc)

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'collocations-import');
const DIR = join(ROOT, 'content/preset-decks');
const MAX = 150; // thẻ mỗi block
const DECKS_PER_LEVEL = 1; // 1 block = 1 nhóm (150 cụm)

// Gom mọi thẻ theo thứ tự file colloc-01..30 (alphabet theo nguồn).
const files = readdirSync(SRC).filter((f) => /^colloc-\d+\.json$/.test(f)).sort();
const cards = [];
for (const f of files) {
  const j = JSON.parse(readFileSync(join(SRC, f), 'utf8'));
  for (const c of j.cards) {
    cards.push({
      english: c.english,
      vietnamese: c.vietnamese,
      part_of_speech: c.part_of_speech, // "adj + n" v.v. — hiển thị nguyên
      ipa: c.ipa || null,
      examples: (c.examples ?? []).map((e) => ({ en: e.en, vi: e.vi })),
    });
  }
}

// Tách block ≤ MAX.
const blocks = [];
for (let i = 0; i < cards.length; i += MAX) blocks.push(cards.slice(i, i + MAX));

const levels = [];
const decks = [];
const nLevels = Math.ceil(blocks.length / DECKS_PER_LEVEL);
for (let li = 0; li < nLevels; li++) {
  const levelCode = `colloc-${li + 1}`;
  const levelBlocks = blocks.slice(li * DECKS_PER_LEVEL, (li + 1) * DECKS_PER_LEVEL);
  const count = levelBlocks.reduce((a, b) => a + b.length, 0);
  levels.push({
    code: levelCode,
    list_code: 'colloc',
    label: `Cụm học thuật · Nhóm ${li + 1}`,
    description: `Academic Collocation List (Pearson/PTE) — nhóm ${li + 1} (${count} cụm, xếp theo bảng chữ cái)`,
    position: li + 1,
  });
  levelBlocks.forEach((ws, di) => {
    const code = `${levelCode}-${String(di + 1).padStart(2, '0')}`;
    const name =
      levelBlocks.length === 1
        ? `Cụm học thuật · Nhóm ${li + 1}`
        : `Cụm học thuật · Nhóm ${li + 1} · Bộ ${di + 1}`;
    decks.push({ code, level_code: levelCode, name, position: di + 1, words: ws.map((c) => c.english) });
    writeFileSync(
      join(DIR, `${code}.json`),
      JSON.stringify(
        {
          version: 1,
          deck: {
            name,
            description: `Academic Collocation List (Pearson/PTE)`,
            color: '#5fd4c8',
            icon: 'BookOpen',
            subtitle: code,
          },
          cards: ws,
        },
        null,
        2,
      ) + '\n',
    );
  });
}

// Ghép vào manifest: bỏ mọi level/deck colloc cũ rồi thêm mới (idempotent).
const manifest = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8'));
manifest.levels = manifest.levels.filter((l) => l.list_code !== 'colloc').concat(levels);
manifest.decks = manifest.decks.filter((d) => !d.code.startsWith('colloc-')).concat(decks);
writeFileSync(join(DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log(`colloc: ${cards.length} cụm → ${blocks.length} block, ${levels.length} level`);
console.log('deck codes:', decks.map((d) => d.code).join(' '));
