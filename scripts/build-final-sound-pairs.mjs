#!/usr/bin/env node
// Build the listening dataset for roadmap item nghe-03
// "Âm cuối -s / -z / -t / -d / -k / -p" — hearing word endings. The learner
// hears one word of a pair and picks which one they heard.
//
// Usage:
//   node scripts/build-final-sound-pairs.mjs
//     → writes content/phonetics/final-sound-pairs.json
//       (same shape as content/phonetics/minimal-pairs.json)
//
// -------------------------------------------------------------------------
// APPROACH — identical to scripts/build-minimal-pairs.mjs
// -------------------------------------------------------------------------
// Pairs are hand-written from common B1 vocabulary, then machine-validated
// against `public/cmu-ipa.json`. The dictionary is NOT mined for output:
// cmudict is ~40% proper nouns with no capitalisation, so mined pairs test
// vocabulary rather than hearing. Anything that fails validation is dropped
// and printed in the run report.
//
// The tokeniser below is a copy (comments trimmed) of the one in
// build-minimal-pairs.mjs (that script runs its main body at import time, so
// it cannot be imported). See that file's header for the symbol inventory and
// its known weak spots. The relevant one here is the "ər" ambiguity: it only
// shifts indices when a reduced syllable is followed by an r-onset syllable.
// Every check in this script looks only at the END of the phoneme sequence,
// and no seed word ends in such a sequence, so it cannot bite here — but a
// word-final /ər/ + suffix (offer/offered → ɔ f ər | d) still tokenises
// consistently in both words, which is all the suffix check needs.
//
// -------------------------------------------------------------------------
// TWO VALIDATION MODES
// -------------------------------------------------------------------------
//  kind 'final'  (final_s_z, final_t_d, final_k_g, final_p_b)
//      Same phoneme count; the sequences differ at exactly one index, that
//      index is the LAST phoneme, and the two phonemes there are the two
//      symbols of the contrast. `a` = voiceless word, `b` = voiced word.
//
//  kind 'ending' (ending_s, ending_ed)
//      `b` = `a` + a suffix. Token-wise: b.tokens starts with every token of
//      a.tokens, and the remainder is exactly one of the allowed suffixes.
//      `a` = bare word, `b` = inflected word. The spelling is not checked
//      (cry/cried, stop/stopped are legitimate), only the sound.
//      ending_ed deliberately allows only /t/ and /d/ — /ɪd/ (want/wanted)
//      adds a syllable and is easy to hear, so it is not what nghe-03 tests.
//      ending_s allows /s/, /z/ and /ɪz/ /əz/ by spec, but the seed list only
//      contains /s/ /z/ plurals for the same reason (bus/buses is a syllable
//      contrast, not an ending contrast).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DICT_PATH = join(ROOT, 'public', 'cmu-ipa.json');
const OUT_DIR = join(ROOT, 'content', 'phonetics');

const MAX_PAIRS_PER_CONTRAST = 40;

// ---------------------------------------------------------------------------
// Tokeniser (copied from build-minimal-pairs.mjs — keep in sync)
// ---------------------------------------------------------------------------

const MULTI = ['aʊ', 'aɪ', 'eɪ', 'oʊ', 'ɔɪ', 'iː', 'uː', 'ɜr', 'ər', 'tʃ', 'dʒ'];

const VOWELS = new Set([
  'ɑ', 'æ', 'ʌ', 'ɔ', 'aʊ', 'aɪ', 'ɛ', 'ɜr', 'ər', 'eɪ',
  'ɪ', 'iː', 'oʊ', 'ɔɪ', 'ʊ', 'uː', 'ə',
]);

const CONSONANTS = new Set([
  'b', 'tʃ', 'd', 'ð', 'f', 'ɡ', 'h', 'dʒ', 'k', 'l', 'm', 'n', 'ŋ',
  'p', 'r', 's', 'ʃ', 't', 'θ', 'v', 'w', 'j', 'z', 'ʒ',
]);

function tokenize(ipa) {
  const s = ipa.replace(/^\//, '').replace(/\/$/, '');
  const tokens = [];
  const stress = [];
  let pending = 0;

  for (let i = 0; i < s.length; ) {
    const c = s[i];
    if (c === 'ˈ') { pending = 1; i += 1; continue; }
    if (c === 'ˌ') { pending = 2; i += 1; continue; }

    let tok = MULTI.find((m) => s.startsWith(m, i)) ?? c;
    if (!VOWELS.has(tok) && !CONSONANTS.has(tok)) return null;

    if (VOWELS.has(tok)) {
      stress.push(pending);
      pending = 0;
    }
    tokens.push(tok);
    i += tok.length;
  }

  if (tokens.length === 0 || stress.length === 0) return null;
  return { tokens, stress };
}

// ---------------------------------------------------------------------------
// Contrast groups
// ---------------------------------------------------------------------------

const CONTRASTS = [
  {
    id: 'final_s_z', label: '/s/ – /z/ (cuối từ)', kind: 'final', symbols: ['s', 'z'],
    example: 'bus – buzz',
    seed: [
      ['bus', 'buzz'], ['place', 'plays'], ['rice', 'rise'], ['peace', 'peas'],
      ['price', 'prize'], ['race', 'raise'], ['loose', 'lose'], ['ice', 'eyes'],
      ['face', 'phase'], ['false', 'falls'], ['niece', 'knees'], ['once', 'ones'],
      ['advice', 'advise'], ['hiss', 'his'], ['since', 'sins'],
      ['tense', 'tens'], ['cease', 'seize'], ['fleece', 'flees'], ['pace', 'pays'],
      ['base', 'bays'], ['lace', 'lays'], ['trace', 'trays'], ['dose', 'doze'],
      ['gross', 'grows'], ['lice', 'lies'], ['dice', 'dies'], ['spice', 'spies'],
      ['fuss', 'fuzz'], ['course', 'cores'], ['grace', 'grays'],
    ],
  },
  {
    id: 'final_t_d', label: '/t/ – /d/ (cuối từ)', kind: 'final', symbols: ['t', 'd'],
    example: 'bat – bad',
    seed: [
      ['bat', 'bad'], ['cart', 'card'], ['write', 'ride'], ['hat', 'had'],
      ['bet', 'bed'], ['set', 'said'], ['neat', 'need'], ['seat', 'seed'],
      ['let', 'led'], ['heart', 'hard'], ['coat', 'code'], ['white', 'wide'],
      ['light', 'lied'], ['site', 'side'], ['mat', 'mad'], ['sat', 'sad'],
      ['feet', 'feed'], ['but', 'bud'], ['not', 'nod'], ['got', 'god'],
      ['hurt', 'heard'], ['built', 'build'], ['tent', 'tend'], ['bent', 'bend'],
      ['spent', 'spend'], ['sent', 'send'], ['wrote', 'road'], ['height', 'hide'],
      ['bright', 'bride'], ['fate', 'fade'], ['late', 'laid'], ['great', 'grade'],
      ['wait', 'weighed'], ['plate', 'played'], ['state', 'stayed'], ['bit', 'bid'],
      ['debt', 'dead'], ['kit', 'kid'], ['hit', 'hid'], ['lit', 'lid'],
    ],
  },
  {
    id: 'final_k_g', label: '/k/ – /ɡ/ (cuối từ)', kind: 'final', symbols: ['k', 'ɡ'],
    example: 'back – bag',
    seed: [
      ['back', 'bag'], ['duck', 'dug'], ['pick', 'pig'],
      ['rack', 'rag'], ['sack', 'sag'], ['tack', 'tag'], ['buck', 'bug'],
      ['tuck', 'tug'], ['pluck', 'plug'], ['snack', 'snag'],
      ['clock', 'clog'], ['peck', 'peg'], ['lack', 'lag'], ['leak', 'league'],
      ['frock', 'frog'], ['muck', 'mug'], ['wick', 'wig'], ['luck', 'lug'],
      ['stack', 'stag'], ['knack', 'nag'], ['jock', 'jog'], ['hack', 'hag'],
      ['puck', 'pug'],
      // Kept for the report: the source dictionary mixes GenAm LOT/THOUGHT
      // (lock /ɑ/ but log /ɔ/), so these real pairs differ at two phonemes.
      ['lock', 'log'], ['dock', 'dog'],
    ],
  },
  {
    id: 'final_p_b', label: '/p/ – /b/ (cuối từ)', kind: 'final', symbols: ['p', 'b'],
    example: 'cap – cab',
    note: 'Under 20. English has few common word-final /b/ words, so real /p/–/b/ minimal pairs run out quickly; the remainder (sop/sob, lope/lobe, dap/dab, tup/tub) would test vocabulary rather than hearing and were left out. Reuse pairs across rounds rather than padding.',
    seed: [
      ['cap', 'cab'], ['rope', 'robe'], ['tap', 'tab'], ['lap', 'lab'],
      ['cup', 'cub'], ['mop', 'mob'], ['rip', 'rib'], ['pup', 'pub'],
      ['slap', 'slab'], ['gap', 'gab'], ['flap', 'flab'], ['cop', 'cob'],
      ['hop', 'hob'], ['nip', 'nib'], ['swap', 'swab'], ['sup', 'sub'],
    ],
  },
  {
    id: 'ending_s', label: 'đuôi -s /s/ /z/', kind: 'ending',
    symbols: ['s', 'z', 'ɪz', 'əz'],
    suffixes: [['s'], ['z'], ['ɪ', 'z'], ['ə', 'z']],
    example: 'cat – cats',
    seed: [
      ['cat', 'cats'], ['play', 'plays'], ['book', 'books'], ['car', 'cars'],
      // Kept for the report: dog/dogs has a LOT/THOUGHT vowel mismatch in the
      // source, and "read" is transcribed with the past-tense vowel /ɛ/.
      ['dog', 'dogs'], ['read', 'reads'],
      ['bag', 'bags'], ['cup', 'cups'], ['day', 'days'], ['key', 'keys'],
      ['tree', 'trees'], ['bird', 'birds'], ['hand', 'hands'], ['friend', 'friends'],
      ['road', 'roads'], ['shop', 'shops'], ['map', 'maps'], ['desk', 'desks'],
      ['street', 'streets'], ['name', 'names'], ['song', 'songs'], ['girl', 'girls'],
      ['boy', 'boys'], ['shoe', 'shoes'], ['room', 'rooms'], ['pen', 'pens'],
      ['phone', 'phones'], ['run', 'runs'], ['sing', 'sings'], ['eat', 'eats'],
      ['drink', 'drinks'], ['stop', 'stops'], ['like', 'likes'], ['need', 'needs'],
      ['see', 'sees'], ['make', 'makes'], ['help', 'helps'], ['work', 'works'],
      ['call', 'calls'], ['come', 'comes'], ['week', 'weeks'], ['sock', 'socks'],
    ],
  },
  {
    id: 'ending_ed', label: 'đuôi -ed /t/ /d/', kind: 'ending', symbols: ['t', 'd'],
    suffixes: [['t'], ['d']],
    example: 'walk – walked',
    seed: [
      ['walk', 'walked'], ['play', 'played'], ['miss', 'missed'], ['stop', 'stopped'],
      ['work', 'worked'], ['call', 'called'], ['open', 'opened'], ['clean', 'cleaned'],
      ['cook', 'cooked'], ['help', 'helped'], ['like', 'liked'], ['look', 'looked'],
      ['watch', 'watched'], ['wash', 'washed'], ['jump', 'jumped'], ['kiss', 'kissed'],
      ['laugh', 'laughed'], ['pass', 'passed'], ['stay', 'stayed'], ['try', 'tried'],
      ['cry', 'cried'], ['love', 'loved'], ['move', 'moved'], ['change', 'changed'],
      ['agree', 'agreed'], ['rain', 'rained'], ['turn', 'turned'], ['listen', 'listened'],
      ['answer', 'answered'], ['show', 'showed'], ['fix', 'fixed'], ['finish', 'finished'],
      ['ask', 'asked'], ['dance', 'danced'], ['hope', 'hoped'], ['smile', 'smiled'],
      ['learn', 'learned'], ['plan', 'planned'], ['relax', 'relaxed'],
      // Kept for the report: the dictionary picks the other reading of these
      // homographs (close adj /s/, use noun /s/, live adj /aɪ/).
      ['close', 'closed'], ['use', 'used'], ['live', 'lived'],
      // Kept for the report: /ɪd/ endings are out of scope and must be rejected.
      ['want', 'wanted'], ['need', 'needed'],
    ],
  },
];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function lookup(dict, wordA, wordB) {
  const ipaA = dict[wordA];
  const ipaB = dict[wordB];
  if (!ipaA) return { ok: false, reason: `"${wordA}" not in dictionary` };
  if (!ipaB) return { ok: false, reason: `"${wordB}" not in dictionary` };
  if (wordA === wordB) return { ok: false, reason: 'same word' };
  const tA = tokenize(ipaA);
  const tB = tokenize(ipaB);
  if (!tA) return { ok: false, reason: `unparseable IPA for "${wordA}": ${ipaA}` };
  if (!tB) return { ok: false, reason: `unparseable IPA for "${wordB}": ${ipaB}` };
  return { ok: true, ipaA, ipaB, tA: tA.tokens, tB: tB.tokens };
}

/** Groups 1–4: same length, differ only at the last phoneme, by the contrast. */
function validateFinal(dict, contrast, wordA, wordB) {
  const l = lookup(dict, wordA, wordB);
  if (!l.ok) return l;
  const { ipaA, ipaB, tA, tB } = l;
  const [symA, symB] = contrast.symbols;

  if (tA.length !== tB.length) {
    return { ok: false, reason: `length differs (${ipaA} vs ${ipaB})` };
  }
  const diffs = [];
  for (let i = 0; i < tA.length; i++) if (tA[i] !== tB[i]) diffs.push(i);
  if (diffs.length === 0) {
    return { ok: false, reason: `homophones in this dictionary (both ${ipaA})` };
  }
  if (diffs.length > 1) {
    return { ok: false, reason: `differs at ${diffs.length} phonemes (${ipaA} vs ${ipaB})` };
  }
  const i = diffs[0];
  if (i !== tA.length - 1) {
    return { ok: false, reason: `differs at phoneme ${i + 1}/${tA.length}, not the final one (${ipaA} vs ${ipaB})` };
  }
  const got = [tA[i], tB[i]];
  const fwd = got[0] === symA && got[1] === symB;
  const rev = got[0] === symB && got[1] === symA;
  if (!fwd && !rev) {
    return { ok: false, reason: `final differs by /${got[0]}/–/${got[1]}/, not /${symA}/–/${symB}/ (${ipaA} vs ${ipaB})` };
  }
  const a = fwd ? wordA : wordB;
  const b = fwd ? wordB : wordA;
  return { ok: true, entry: { a, b, ipa_a: dict[a], ipa_b: dict[b] } };
}

/** Groups 5–6: b = a + one allowed suffix (token-wise). a = bare word. */
function validateEnding(dict, contrast, wordA, wordB) {
  const l = lookup(dict, wordA, wordB);
  if (!l.ok) return l;
  const { ipaA, ipaB, tA, tB } = l;

  const extra = tB.length - tA.length;
  if (extra < 1 || extra > 2) {
    return { ok: false, reason: `"${wordB}" is not "${wordA}" + 1–2 phonemes (${ipaA} vs ${ipaB})` };
  }
  for (let i = 0; i < tA.length; i++) {
    if (tA[i] !== tB[i]) {
      return { ok: false, reason: `stem differs at phoneme ${i + 1} (/${tA[i]}/ vs /${tB[i]}/: ${ipaA} vs ${ipaB})` };
    }
  }
  const tail = tB.slice(tA.length);
  const match = contrast.suffixes.some((s) => s.length === tail.length && s.every((x, k) => x === tail[k]));
  if (!match) {
    return { ok: false, reason: `suffix /${tail.join('')}/ not in {${contrast.symbols.map((s) => `/${s}/`).join(', ')}} (${ipaA} vs ${ipaB})` };
  }
  return { ok: true, entry: { a: wordA, b: wordB, ipa_a: ipaA, ipa_b: ipaB } };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const dict = JSON.parse(await readFile(DICT_PATH, 'utf-8'));

const groups = [];
const rejected = [];

for (const contrast of CONTRASTS) {
  const validate = contrast.kind === 'final' ? validateFinal : validateEnding;
  const pairs = [];
  const seen = new Set();
  for (const [wa, wb] of contrast.seed) {
    const res = validate(dict, contrast, wa, wb);
    if (!res.ok) {
      rejected.push(`${contrast.id.padEnd(9)} ${wa}/${wb}: ${res.reason}`);
      continue;
    }
    const key = `${res.entry.a}|${res.entry.b}`;
    if (seen.has(key)) {
      rejected.push(`${contrast.id.padEnd(9)} ${wa}/${wb}: duplicate`);
      continue;
    }
    seen.add(key);
    pairs.push(res.entry);
    if (pairs.length >= MAX_PAIRS_PER_CONTRAST) break;
  }
  const group = {
    contrast: contrast.id,
    label: contrast.label,
    kind: contrast.kind,
    example: contrast.example,
    ipa_symbols: contrast.symbols,
    pairs,
  };
  if (contrast.note) group.note = contrast.note;
  groups.push(group);
}

await mkdir(OUT_DIR, { recursive: true });
await writeFile(
  join(OUT_DIR, 'final-sound-pairs.json'),
  `${JSON.stringify(groups, null, 2)}\n`,
);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log('final-sound-pairs.json');
for (const g of groups) {
  const flag = g.pairs.length < 20 ? '  ** under target of 20 **' : '';
  console.log(`  ${g.contrast.padEnd(9)} ${String(g.pairs.length).padStart(3)} pairs${flag}`);
}
console.log(`  total ${groups.reduce((n, g) => n + g.pairs.length, 0)} pairs`);

if (rejected.length) {
  console.log(`\nRejected ${rejected.length} candidate pair(s):`);
  for (const r of rejected) console.log(`  ${r}`);
}
