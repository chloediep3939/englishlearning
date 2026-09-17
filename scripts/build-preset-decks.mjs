#!/usr/bin/env node
// Split the NGSL / AWL word lists into preset decks of ≤ 30 words and write
// content/preset-decks/manifest.json. Deterministic: same input lists → same
// deck codes and word order, so content files and seeded rows stay aligned.
//
// Usage: node scripts/build-preset-decks.mjs
//
// Levels:
//   NGSL — rank bands of 500 (1–500, 501–1000, …, 2501–2809). Closed-class
//          words (articles, pronouns, auxiliaries/modals, basic prepositions,
//          numbers…) are skipped: they make poor flashcards. Discourse words
//          such as however / although / whether are kept.
//   AWL  — one level per sublist (1–10), split into balanced decks.
// Inside a level words keep list order (rank / sublist order) and are split
// into ceil(n / 30) decks of near-equal size.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAX = 30;

const NGSL_SKIP = new Set(
  `the a an be and of to in have it you he she we they I me us him her them
   my your his its our their mine yours ours theirs hers myself yourself
   himself herself itself ourselves themselves this that these those
   for not on with do as at but from by will would can could shall should
   may might must or so all if one about which there who what when where how
   why whose whom up some other out no than now then into only over any after
   most much many here such through down both own too each off every very just
   also yes two three four five six seven eight nine ten eleven twelve fifteen
   twenty thirty forty fifty sixty seventy eighty ninety hundred thousand
   million billion oh ok okay mr mrs ms dr etc`.split(/\s+/).filter(Boolean),
);

const NGSL_BANDS = [
  [1, 500], [501, 1000], [1001, 1500], [1501, 2000], [2001, 2500], [2501, 2809],
];

function chunk(words) {
  const n = Math.ceil(words.length / MAX);
  const size = Math.ceil(words.length / n);
  const out = [];
  for (let i = 0; i < words.length; i += size) out.push(words.slice(i, i + size));
  return out;
}

const fmt = (n) => n.toLocaleString('de-DE'); // 1.500 — Vietnamese grouping

const ngsl = JSON.parse(readFileSync(join(ROOT, 'content/wordlists/ngsl.json'), 'utf8'));
const awl = JSON.parse(readFileSync(join(ROOT, 'content/wordlists/awl.json'), 'utf8'));

const levels = [];
const decks = [];

NGSL_BANDS.forEach(([lo, hi], li) => {
  const levelCode = `ngsl-${li + 1}`;
  const words = ngsl
    .filter((e) => e.rank >= lo && e.rank <= hi && !NGSL_SKIP.has(e.word))
    .map((e) => e.word);
  levels.push({
    code: levelCode,
    list_code: 'ngsl',
    label: `Từ thông dụng ${fmt(lo)}–${fmt(hi)}`,
    description: `New General Service List, thứ hạng ${fmt(lo)}–${fmt(hi)}`,
    position: li + 1,
  });
  chunk(words).forEach((ws, di) => {
    decks.push({
      code: `${levelCode}-${String(di + 1).padStart(2, '0')}`,
      level_code: levelCode,
      name: `Thông dụng ${fmt(lo)}–${fmt(hi)} · Bộ ${di + 1}`,
      position: di + 1,
      words: ws,
    });
  });
});

for (let s = 1; s <= 10; s++) {
  const levelCode = `awl-${s}`;
  const words = awl.filter((e) => e.sublist === s).map((e) => e.word);
  levels.push({
    code: levelCode,
    list_code: 'awl',
    label: `Học thuật · Sublist ${s}`,
    description: `Academic Word List, sublist ${s}`,
    position: 100 + s,
  });
  chunk(words).forEach((ws, di) => {
    decks.push({
      code: `${levelCode}-${String(di + 1).padStart(2, '0')}`,
      level_code: levelCode,
      name: `Học thuật Sublist ${s} · Bộ ${di + 1}`,
      position: di + 1,
      words: ws,
    });
  });
}

writeFileSync(
  join(ROOT, 'content/preset-decks/manifest.json'),
  JSON.stringify({ max_per_deck: MAX, levels, decks }, null, 2) + '\n',
);
console.log(`levels=${levels.length} decks=${decks.length} words=${decks.reduce((a, d) => a + d.words.length, 0)}`);
