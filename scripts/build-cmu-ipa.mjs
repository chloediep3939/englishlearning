#!/usr/bin/env node
// Pre-process the CMU Pronouncing Dictionary into a compact word→IPA JSON
// blob that the runtime can ship as a static asset.
//
// Usage:
//   1. Download cmudict:
//        curl -sL -o /tmp/cmudict.dict \
//          https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict
//   2. Run:
//        node scripts/build-cmu-ipa.mjs /tmp/cmudict.dict public/cmu-ipa.json
//
// Conversion notes:
// - ARPABET → IPA mapping follows the conventions used by Wiktionary's
//   General American phonemic transcriptions (r not ɹ, long vowels use ː,
//   schwa for unstressed AH).
// - Syllabification: max-onset rule. All consonants between two vowels go
//   to the next syllable's onset. Final consonants attach to the last
//   syllable. Stress mark (ˈ for primary, ˌ for secondary) goes at the
//   START of the syllable, matching Oxford / dictionary convention.
// - Multiple pronunciations: only the canonical (first) entry is kept.
//   Alternates like `recreate(2)` are skipped — most learners want one
//   answer.

import { readFile, writeFile } from 'node:fs/promises';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('usage: build-cmu-ipa.mjs <cmudict.dict> <output.json>');
  process.exit(1);
}

const ARPABET_VOWELS = new Set([
  'AA', 'AE', 'AH', 'AO', 'AW', 'AY',
  'EH', 'ER', 'EY',
  'IH', 'IY',
  'OW', 'OY',
  'UH', 'UW',
]);

const VOWEL_STRESSED = {
  AA: 'ɑ', AE: 'æ', AH: 'ʌ', AO: 'ɔ',
  AW: 'aʊ', AY: 'aɪ',
  EH: 'ɛ', ER: 'ɜr', EY: 'eɪ',
  IH: 'ɪ', IY: 'iː',
  OW: 'oʊ', OY: 'ɔɪ',
  UH: 'ʊ', UW: 'uː',
};
// Unstressed AH → schwa; ER unstressed → ər (rhotic schwa). Other vowels
// keep their stressed form (close enough for a learning aid).
const VOWEL_UNSTRESSED = {
  ...VOWEL_STRESSED,
  AH: 'ə',
  ER: 'ər',
};

const CONSONANT = {
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð',
  F: 'f', G: 'ɡ', HH: 'h', JH: 'dʒ',
  K: 'k', L: 'l', M: 'm', N: 'n', NG: 'ŋ',
  P: 'p', R: 'r', S: 's', SH: 'ʃ',
  T: 't', TH: 'θ',
  V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
};

function arpabetToIpa(phonemes) {
  // phonemes: array like ['R', 'IY1', 'K', 'R', 'IY0', 'EY2', 'T']
  // Parse each into { p: 'IY', stress: 1 } or { p: 'K', stress: null }
  const tokens = phonemes.map((raw) => {
    const m = raw.match(/^([A-Z]+)(\d?)$/);
    if (!m) return null;
    return {
      p: m[1],
      stress: m[2] === '' ? null : parseInt(m[2], 10),
      isVowel: ARPABET_VOWELS.has(m[1]),
    };
  }).filter(Boolean);

  if (tokens.length === 0) return null;

  // Group into syllables. Max-onset rule: consonants between two vowels go
  // to the right syllable. Initial consonants attach to first syllable.
  // Final consonants attach to last syllable (coda).
  const syllables = [];
  let cursor = 0;
  const vowelIdx = tokens
    .map((t, i) => (t.isVowel ? i : -1))
    .filter((i) => i >= 0);

  if (vowelIdx.length === 0) return null; // pure consonants, weird, skip

  for (let v = 0; v < vowelIdx.length; v++) {
    const isLast = v === vowelIdx.length - 1;
    const vIdx = vowelIdx[v];
    const stress = tokens[vIdx].stress;
    let sylEnd;
    if (isLast) {
      sylEnd = tokens.length;
    } else {
      // Max onset: all consonants between this vowel and the next vowel go
      // to the next syllable. So this syllable ends right after the vowel.
      sylEnd = vIdx + 1;
    }
    syllables.push({ tokens: tokens.slice(cursor, sylEnd), stress });
    cursor = sylEnd;
  }

  // Render each syllable: stress mark + phonemes converted to IPA.
  const rendered = syllables.map((syl) => {
    let body = '';
    for (const t of syl.tokens) {
      if (t.isVowel) {
        const table = t.stress === 0 ? VOWEL_UNSTRESSED : VOWEL_STRESSED;
        body += table[t.p] ?? '';
      } else {
        body += CONSONANT[t.p] ?? '';
      }
    }
    const prefix = syl.stress === 1 ? 'ˈ' : syl.stress === 2 ? 'ˌ' : '';
    return prefix + body;
  });

  return '/' + rendered.join('') + '/';
}

const raw = await readFile(inPath, 'utf-8');
const out = {};
let processed = 0;
let kept = 0;

for (const lineRaw of raw.split('\n')) {
  const line = lineRaw.trim();
  if (!line || line.startsWith(';;;')) continue;
  processed++;

  // CMU format: `word PHONEME PHONEME ...` separated by spaces. Some entries
  // have inline `#` comments and alternates like `recreate(2)`. Strip
  // `(N)` suffix from the headword and skip if it's an alternate.
  const parts = line.split(/\s+/);
  let word = parts[0];
  const phonemes = parts.slice(1).filter((p) => !p.startsWith('#'));
  if (phonemes.length === 0) continue;

  const altMatch = word.match(/^(.+)\((\d+)\)$/);
  if (altMatch) {
    // Skip alternates — only keep the canonical first entry.
    continue;
  }

  // Skip words with non-letter chars in the headword (apostrophes, dots,
  // etc.) — they're abbreviations or contractions that confuse the UI.
  // Keep simple hyphenated words.
  if (!/^[a-z][a-z'-]*$/i.test(word)) continue;

  const ipa = arpabetToIpa(phonemes);
  if (!ipa) continue;
  out[word.toLowerCase()] = ipa;
  kept++;
}

await writeFile(outPath, JSON.stringify(out));
const sizeKb = (await readFile(outPath)).length / 1024;
console.log(`Processed ${processed} lines, kept ${kept} entries.`);
console.log(`Output: ${outPath} (${sizeKb.toFixed(0)} KB)`);
console.log(`Sample: recreate → ${out['recreate']}, onward → ${out['onward']}, hello → ${out['hello']}`);
