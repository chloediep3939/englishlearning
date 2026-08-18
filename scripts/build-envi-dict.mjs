// Build public/envi-dict.json — offline English→Vietnamese dictionary asset.
//
// Source: the classic Hồ Ngọc Đức "Anh-Việt" dictionary (Free Vietnamese
// Dictionary Project, GPL), via the StarDict→JSON conversion shipped in
// github.com/iamstevendao/superfast-dictionary (app/src/main/assets/anhviet.json).
// The raw file is ~50MB / ~387K entries incl. jargon and phrases; this script
// keeps single common words only and trims each entry to its first senses, so
// the asset stays a few MB (same pattern as public/cmu-ipa.json).
//
// Usage:
//   node scripts/build-envi-dict.mjs [path-to-anhviet.json]
// With no arg it downloads the raw file from GitHub (~50MB).
//
// Output shape (tuple keeps the file small):
//   { "climate": ["khí hậu, thời tiết; miền khí hậu", "danh từ"], ... }
// pos may be "" when the entry has no part-of-speech header.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const RAW_URL =
  'https://raw.githubusercontent.com/iamstevendao/superfast-dictionary/master/app/src/main/assets/anhviet.json';
const OUT_PATH = join(process.cwd(), 'public', 'envi-dict.json');

const WORD_RE = /^[a-z][a-z'-]{1,23}$/; // single lowercase token, 2–24 chars
const MAX_SENSES = 3;
const MAX_GLOSS_LEN = 110;

async function loadRaw() {
  const arg = process.argv[2];
  if (arg) {
    console.log('reading', arg);
    return readFile(arg, 'utf-8');
  }
  console.log('downloading', RAW_URL);
  const res = await fetch(RAW_URL);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  return res.text();
}

/**
 * Entry format (Hồ Ngọc Đức):
 *   @word /pron/*  loại từ- nghĩa1=ví dụ+ dịch- nghĩa2 ...@Chuyên ngành ...
 * Take the FIRST part-of-speech block: pos = text between '*' and the first
 * '-', senses = '-'-separated chunks with '=example+translation' stripped.
 * Jargon-only entries (no '*') fall back to the first '-' chunk.
 */
function extractGloss(value) {
  // Cut at the first jargon section — everything after is domain noise.
  const main = value.split('@Chuyên ngành')[0].split('@Lĩnh vực')[0];

  const star = main.indexOf('*');
  let pos = '';
  let body = main;
  if (star >= 0) {
    body = main.slice(star + 1);
    const dash = body.indexOf('-');
    if (dash < 0) return null;
    pos = body.slice(0, dash).trim();
    body = body.slice(dash + 1);
  } else {
    const dash = main.indexOf('-');
    if (dash < 0) return null;
    body = main.slice(dash + 1);
  }

  const senses = [];
  // Lookbehind so the char before '-' isn't swallowed by the split; '=' / '+'
  // guards keep example markers ("=to buy and sell+ mua và bán") intact.
  for (const chunk of body.split(/(?<![=+])-/)) {
    // A sense chunk may carry examples ("=example+ translation") — drop them.
    const sense = chunk.split('=')[0].replace(/[!@].*$/, '').replace(/\s+/g, ' ').trim();
    if (!sense || /^\(.*\)$/.test(sense)) continue;
    senses.push(sense);
    if (senses.length >= MAX_SENSES) break;
  }
  if (senses.length === 0) return null;

  let gloss = senses.join('; ');
  if (gloss.length > MAX_GLOSS_LEN) {
    gloss = gloss.slice(0, MAX_GLOSS_LEN).replace(/[,;][^,;]*$/, '').trim();
  }
  if (!gloss) return null;
  return [gloss, pos];
}

const raw = await loadRaw();
const out = {};
let kept = 0;
let skipped = 0;

// The raw file is line-per-entry but NOT strictly valid JSON (keys with
// unescaped quotes), so parse line-wise: `"key": "value",`
for (const line of raw.split('\n')) {
  const sep = line.indexOf('": "');
  if (sep <= 1 || !line.startsWith('"')) continue;
  const key = line.slice(1, sep).trim().toLowerCase();
  if (!WORD_RE.test(key)) {
    skipped++;
    continue;
  }
  let value = line.slice(sep + 4).trim();
  if (value.endsWith(',')) value = value.slice(0, -1);
  if (value.endsWith('"')) value = value.slice(0, -1);
  const gloss = extractGloss(value);
  if (!gloss) {
    skipped++;
    continue;
  }
  // First entry wins (duplicates are rare; earlier entries are the main ones).
  if (!(key in out)) {
    out[key] = gloss;
    kept++;
  }
}

await writeFile(OUT_PATH, JSON.stringify(out), 'utf-8');
const { size } = await import('node:fs').then((fs) => fs.statSync(OUT_PATH));
console.log(`kept ${kept} words (skipped ${skipped}) → ${OUT_PATH} (${(size / 1024 / 1024).toFixed(2)} MB)`);
console.log('samples:', ['and', 'climate', 'consume', 'remain', 'go'].map((w) => `${w}=${JSON.stringify(out[w])}`).join(' | '));
