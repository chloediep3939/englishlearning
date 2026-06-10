// validate.mjs — sanity-check the 30 colloc-*.json import files against the spine.
// Run:  node collocations-import/validate.mjs   (from repo root)
//   or: node validate.mjs                       (from collocations-import/)
import fs from 'node:fs';
import path from 'node:path';

const dir = fs.existsSync('collocations.json') ? '.' : 'collocations-import';
const spine = JSON.parse(fs.readFileSync(path.join(dir, 'collocations.json'), 'utf8'));
const spineEng = spine.map((x) => x.english);

let all = [];
let fieldErr = 0;
let exErr = 0;
let ipaErr = 0;
const deckNames = new Set();

for (let i = 1; i <= 30; i++) {
  const fn = path.join(dir, `colloc-${String(i).padStart(2, '0')}.json`);
  const d = JSON.parse(fs.readFileSync(fn, 'utf8'));
  deckNames.add(d.deck?.name);
  for (const c of d.cards) {
    all.push(c.english);
    if (!c.english || !c.vietnamese || !c.ipa || !c.part_of_speech) fieldErr++;
    if (!Array.isArray(c.examples) || c.examples.length !== 3) exErr++;
    else for (const e of c.examples) if (!e?.en || !e?.vi) exErr++;
    if (typeof c.ipa === 'string' && (!c.ipa.startsWith('/') || !c.ipa.endsWith('/'))) ipaErr++;
  }
}

const lc = (s) => s.toLowerCase();
const counts = {};
all.forEach((e) => (counts[lc(e)] = (counts[lc(e)] || 0) + 1));
const dupes = Object.entries(counts).filter(([, v]) => v > 1);

let orderMismatch = 0;
for (let i = 0; i < Math.max(all.length, spineEng.length); i++) {
  if (lc(all[i] ?? '') !== lc(spineEng[i] ?? '')) orderMismatch++;
}

const fileSet = new Set(all.map(lc));
const missing = spineEng.filter((e) => !fileSet.has(lc(e)));

console.log('deck names          :', [...deckNames]);
console.log('total cards         :', all.length, '/ spine', spine.length);
console.log('field-missing errors:', fieldErr);
console.log('examples errors     :', exErr);
console.log('ipa-format errors   :', ipaErr);
console.log('duplicate english   :', dupes.length, dupes.slice(0, 10));
console.log('order mismatch      :', orderMismatch);
console.log('spine entries missing:', missing.length, missing.slice(0, 10));

const ok =
  all.length === spine.length &&
  fieldErr === 0 &&
  exErr === 0 &&
  ipaErr === 0 &&
  dupes.length === 0 &&
  orderMismatch === 0 &&
  missing.length === 0 &&
  deckNames.size === 1;
console.log(ok ? '\nALL CHECKS PASSED ✅' : '\nFAILED ❌');
process.exit(ok ? 0 : 1);
