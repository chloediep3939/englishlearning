#!/usr/bin/env node
// Structural check of content/preset-decks/<code>.json against manifest.json.
// Content quality (naturalness, correct translation) is NOT checked here — see
// content/preset-decks/AUTHORING.md.
//
// Usage: node scripts/check-preset-deck.mjs <code> [<code> …]

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'content/preset-decks');
const manifest = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8'));

const POS = new Set([
  'noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction',
  'determiner', 'pronoun', 'exclamation',
]);

let failed = false;
for (const code of process.argv.slice(2)) {
  const errors = [];
  const deck = manifest.decks.find((d) => d.code === code);
  const path = join(DIR, `${code}.json`);
  if (!deck) errors.push('not in manifest');
  else if (!existsSync(path)) errors.push('file missing');
  else {
    let file;
    try {
      file = JSON.parse(readFileSync(path, 'utf8'));
    } catch (e) {
      errors.push(`invalid JSON: ${e.message}`);
    }
    if (file) {
      const words = (file.cards ?? []).map((c) => c.english);
      if (JSON.stringify(words) !== JSON.stringify(deck.words)) {
        errors.push(`word list differs from manifest: ${JSON.stringify(words)}`);
      }
      for (const c of file.cards ?? []) {
        const w = c.english;
        const stem = w.toLowerCase().slice(0, Math.max(3, w.length - 3));
        if (typeof c.vietnamese !== 'string' || !c.vietnamese.trim()) errors.push(`${w}: vietnamese empty`);
        if (!POS.has(c.part_of_speech)) errors.push(`${w}: bad part_of_speech "${c.part_of_speech}"`);
        if (!Array.isArray(c.examples) || c.examples.length !== 3) errors.push(`${w}: need exactly 3 examples`);
        for (const ex of c.examples ?? []) {
          const len = ex.en?.trim().split(/\s+/).length ?? 0;
          if (!ex.en?.trim() || !ex.vi?.trim()) errors.push(`${w}: example missing en/vi`);
          else if (len < 5 || len > 18) errors.push(`${w}: example has ${len} words (need 7–16): "${ex.en}"`);
          else if (len < 7 || len > 16) console.warn(`  warn ${code} ${w}: example has ${len} words: "${ex.en}"`);
          // Loose headword check: irregular forms (took, children) get a warning only.
          else if (!ex.en.toLowerCase().includes(stem)) console.warn(`  warn ${code} ${w}: headword stem not found in "${ex.en}"`);
        }
        if (!Array.isArray(c.collocations) || c.collocations.length < 2 || c.collocations.length > 4) {
          errors.push(`${w}: need 2–4 collocations`);
        }
        // ipa / audio_src / image_* are added later by enrich-preset-decks.mjs.
      }
    }
  }
  if (errors.length) {
    failed = true;
    console.log(`✗ ${code}\n  - ${errors.join('\n  - ')}`);
  } else {
    console.log(`✓ ${code}`);
  }
}
process.exit(failed ? 1 : 0);
