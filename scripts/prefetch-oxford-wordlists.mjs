// Prefetch Oxford Learner's Dictionaries US pronunciation (IPA + mp3 CDN URL)
// into the shared word_glossary cache (read by the read-along reader, the
// roadmap word-list test and the roadmap minimal-pair listening test), and
// write the result as an upsert migration.
//
//   node --no-warnings scripts/prefetch-oxford-wordlists.mjs [--source wordlists|pairs]
//        [--existing <wrangler --json export of word_glossary>] [--sql-only]
//
// Sources:
//   wordlists (default) → migrations/0026_word_glossary_oxford_prefetch.sql
//       content/wordlists/ngsl.json (rank <= 1500) + content/wordlists/awl.json
//   ngsl-upper → migrations/0035_word_glossary_oxford_ngsl_upper.sql
//       content/wordlists/ngsl.json (rank > 1500). Also reports heteronym
//       candidates: when the entry page links sibling entries of the same
//       headword (object_1 / object_2), each sibling is fetched once and its
//       US IPA compared (report only; siblings are never written).
//   pairs → migrations/0029_word_glossary_oxford_pairs.sql
//         + content/phonetics/oxford-ipa-mismatches.json
//       every a/b word in content/phonetics/minimal-pairs.json and
//       content/phonetics/final-sound-pairs.json
//
// --existing: a `wrangler d1 execute ... --json` dump of word_glossary. Words
//   whose row already has audio_src are not fetched and not written. In pairs
//   mode their stored IPA is still checked against the pair (see below).
// --sql-only: no network; rebuild the outputs from the cache.
//
// Parsing is NOT duplicated: this imports src/lib/oxford/pronunciation.ts
// directly (the file has no imports; Node >= 23 strips TS types natively).
// The page fetch is done here rather than via fetchOxfordPronunciationMeta()
// only because that helper hides the HTTP status, and we need 403/429 to back
// off politely.
//
// Lookup: /definition/english/<word> only (= lookupUrl('Oxford', word), what
// /api/words/lookup scrapes). A 404 is a miss. There is deliberately NO search
// fallback: for homographs (lead, wind, tear...) Oxford search lands on the
// first entry, and playing that pronunciation in every context is worse than
// the browser voice. (Cache entries from an older run with via 'search' are
// treated as misses.)
//
// Politeness: >= 1.5s between every request; on 403/429 or 3 consecutive
// failures wait 60s; after 3 back-offs stop and write what we have.
// Resumable: per-word results are cached in <os tmpdir>/bun-oxford-prefetch-cache.json
// (outside the repo, shared by both sources). Only definitive answers are
// cached (hit / real miss); transient failures are retried on the next run.
//
// SQL gotcha (wrangler's statement splitter, src/d1/splitter.ts): a `CASE`
// opens a compound block that only closes on `END` followed by whitespace or
// `;` — so the upsert writes `END ,`, never `END,`. Keep apostrophes out of
// the generated SQL comments too. Verify output with the splitter check
// before shipping.
//
// Pairs mode, IPA contrast check: the listening test is only valid when the
// Oxford recording has the phoneme the pair contrasts. Oxford US IPA and the
// pair IPA (CMU-derived) use different notation, so both are normalised to
// the CMU symbol inventory, aligned (edit distance over phoneme tokens), and
// ONLY the contrasted position is compared:
//   - same-length pairs (ship/sheep, bus/buzz): the one index where a and b
//     differ; Oxford must have the expected phoneme at the aligned position.
//   - suffix pairs (cat/cats, walk/walked): b must end in the suffix (ɪ/ə
//     treated as equal), a must end in the stem-final phoneme.
// Anything else is written as a mismatch with an UNVERIFIED note.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { parseOxfordUsPronunciation, BROWSER_UA } = await import(
  join(root, 'src/lib/oxford/pronunciation.ts')
);

const CACHE = join(tmpdir(), 'bun-oxford-prefetch-cache.json');
const NGSL_MAX_RANK = 1500;
const DELAY_MS = 1600; // >= 1.5s between requests
const BACKOFF_MS = 60_000;
const MAX_BACKOFFS = 3;
const TIMEOUT_MS = 20_000;
const ROWS_PER_STATEMENT = 50;
const MAX_STATEMENT_BYTES = 40_000; // D1 caps a statement at 100KB
const OXFORD = 'https://www.oxfordlearnersdictionaries.com';

const argv = process.argv.slice(2);
const argValue = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const SQL_ONLY = argv.includes('--sql-only');
const SOURCE = argValue('--source') ?? 'wordlists';
const EXISTING = argValue('--existing');
if (!['wordlists', 'ngsl-upper', 'pairs'].includes(SOURCE)) {
  console.error(`unknown --source "${SOURCE}" (expected wordlists | ngsl-upper | pairs)`);
  process.exit(1);
}

const read = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
// Same normalisation as cleanWord() in src/lib/reading/tokenizer.ts — the
// reader keys word_glossary on it.
const cleanWord = (s) => s.toLowerCase().replace(/[^a-z']/g, '');

// ---- word set -------------------------------------------------------------

const PAIR_FILES = ['content/phonetics/minimal-pairs.json', 'content/phonetics/final-sound-pairs.json'];
const pairGroups = SOURCE === 'pairs' ? PAIR_FILES.flatMap((f) => read(f)) : [];

let attempted;
if (SOURCE === 'wordlists') {
  const ngsl = read('content/wordlists/ngsl.json').filter((e) => e.rank <= NGSL_MAX_RANK);
  const awl = read('content/wordlists/awl.json');
  attempted = [...ngsl, ...awl].map((e) => e.word);
} else if (SOURCE === 'ngsl-upper') {
  attempted = read('content/wordlists/ngsl.json')
    .filter((e) => e.rank > NGSL_MAX_RANK)
    .map((e) => e.word);
} else {
  attempted = pairGroups.flatMap((g) => g.pairs.flatMap((p) => [p.a, p.b]));
}
const unique = [...new Set(attempted)];

// Production rows (optional). Words that already have audio are left alone.
const existing = new Map();
if (EXISTING) {
  const dump = JSON.parse(readFileSync(EXISTING, 'utf8'));
  for (const block of Array.isArray(dump) ? dump : [dump]) {
    for (const r of block.results ?? []) existing.set(r.word, r);
  }
}
const skippedHaveAudio = unique.filter((w) => existing.get(w)?.audio_src);

// A word whose cleaned form differs ("I", "so-called") can't be keyed so that
// both the reader (cleaned key) and the roadmap join (raw word) find it — skip.
const skippedUnclean = unique.filter((w) => cleanWord(w) !== w);
const words = unique.filter((w) => cleanWord(w) === w && !existing.get(w)?.audio_src);

// ---- cache ----------------------------------------------------------------

let cache = {};
if (existsSync(CACHE)) cache = JSON.parse(readFileSync(CACHE, 'utf8'));
const saveCache = () => writeFileSync(CACHE, JSON.stringify(cache, null, 1));
// Older runs stored search-fallback hits; those words 404 at /definition.
const isHit = (w) => cache[w]?.status === 'hit' && cache[w].via === 'definition';

// ---- fetching -------------------------------------------------------------

class Throttled extends Error {}
class Transient extends Error {}

let lastRequestAt = 0;
async function politeGet(url) {
  const wait = lastRequestAt + DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
  let res;
  try {
    res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en' },
    });
  } catch (err) {
    throw new Transient(`network: ${err?.message ?? err}`);
  }
  if (res.status === 403 || res.status === 429) throw new Throttled(`HTTP ${res.status}`);
  if (res.status >= 500) throw new Transient(`HTTP ${res.status}`);
  const html = res.status === 200 ? await res.text() : '';
  return { status: res.status, url: res.url, html };
}

const isOxfordMp3 = (u) => {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' && x.hostname.endsWith('oxfordlearnersdictionaries.com');
  } catch {
    return false;
  }
};

async function lookup(word) {
  const def = await politeGet(`${OXFORD}/definition/english/${encodeURIComponent(word)}`);
  if (def.status === 404) return { status: 'miss', via: 'definition', reason: 'HTTP 404', url: def.url };
  if (def.status !== 200) throw new Transient(`HTTP ${def.status}`);
  // A 200 without any entry markup is not a real Oxford page (bot wall?).
  if (!def.html.includes('class="webtop"')) throw new Transient('200 without entry markup');
  const { ipaUs, mp3SourceUrl } = parseOxfordUsPronunciation(def.html);
  const ipa = ipaUs || null;
  const mp3 = mp3SourceUrl && isOxfordMp3(mp3SourceUrl) ? mp3SourceUrl : null;
  const hit = !!(ipa || mp3);
  return { ipa, mp3, status: hit ? 'hit' : 'miss', via: 'definition', reason: hit ? undefined : 'entry has no US pronunciation', url: def.url, siblings: siblingEntries(word, def) };
}

// Other entries of the same headword linked from the page (object_1 → object_2).
function siblingEntries(word, page) {
  const self = new URL(page.url).pathname.split('/').pop() ?? '';
  const re = new RegExp(`/definition/english/(${escapeRe(word)}\\d*_\\d+)["?#]`, 'g');
  return [...new Set([...page.html.matchAll(re)].map((m) => m[1]))].filter((slug) => slug !== self);
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Sibling entry page → its US IPA only. Cached under `entry:<slug>` (a colon
// never appears in a cleaned word, so no clash with word keys).
async function lookupEntry(slug) {
  const page = await politeGet(`${OXFORD}/definition/english/${encodeURIComponent(slug)}`);
  if (page.status === 404) return { status: 'miss', reason: 'HTTP 404' };
  if (page.status !== 200) throw new Transient(`HTTP ${page.status}`);
  if (!page.html.includes('class="webtop"')) throw new Transient('200 without entry markup');
  const { ipaUs } = parseOxfordUsPronunciation(page.html);
  return { status: ipaUs ? 'hit' : 'miss', ipa: ipaUs || null, url: page.url };
}

async function fetchAll(keys = words, fetchOne = lookup, label = 'words') {
  const todo = keys.filter((w) => !cache[w]);
  console.log(`${keys.length} ${label}, ${keys.length - todo.length} cached, ${todo.length} to fetch`);
  console.log(`cache: ${CACHE}`);
  let backoffs = 0;
  let consecutiveFailures = 0;
  const attempts = {};
  for (let i = 0; i < todo.length; i++) {
    const word = todo[i];
    try {
      const r = await fetchOne(word.startsWith('entry:') ? word.slice(6) : word);
      cache[word] = { ...r, fetchedAt: new Date().toISOString() };
      saveCache();
      consecutiveFailures = 0;
      console.log(`[${i + 1}/${todo.length}] ${word}: ${r.status}${r.ipa ? ' ' + r.ipa : ''}${r.mp3 ? ' mp3' : ''}${r.reason ? ' (' + r.reason + ')' : ''}`);
    } catch (err) {
      const throttled = err instanceof Throttled;
      if (!throttled) consecutiveFailures++;
      console.log(`[${i + 1}/${todo.length}] ${word}: FAIL ${err.message}`);
      if (!throttled && !(err instanceof Transient)) throw err;
      if (throttled || consecutiveFailures >= 3) {
        backoffs++;
        if (backoffs > MAX_BACKOFFS) {
          console.log(`stopping: back-off limit (${MAX_BACKOFFS}) exceeded`);
          return false;
        }
        console.log(`back-off ${backoffs}/${MAX_BACKOFFS}: waiting ${BACKOFF_MS / 1000}s`);
        await sleep(BACKOFF_MS);
        consecutiveFailures = 0;
      }
      attempts[word] = (attempts[word] ?? 0) + 1;
      if (throttled || attempts[word] < 3) i--; // retry the same word
      else console.log(`giving up on "${word}" for this run (not cached, retried next run)`);
    }
  }
  return true;
}

// ---- SQL ------------------------------------------------------------------

// `END ,` (space before the comma) is required — see the splitter gotcha above.
const UPSERT_TAIL = `
ON CONFLICT(word) DO UPDATE SET
  vn        = COALESCE(word_glossary.vn, excluded.vn),
  pos       = CASE WHEN word_glossary.vn IS NULL AND excluded.vn IS NOT NULL
                   THEN COALESCE(word_glossary.pos, excluded.pos)
                   ELSE word_glossary.pos END ,
  ipa       = COALESCE(word_glossary.ipa, excluded.ipa),
  audio_src = COALESCE(word_glossary.audio_src, excluded.audio_src),
  source    = CASE
                WHEN word_glossary.vn IS NULL AND excluded.vn IS NOT NULL THEN 'oxford+dict'
                WHEN word_glossary.source = 'dict+nox' THEN 'oxford+dict'
                WHEN word_glossary.source = 'ms+nox'   THEN 'oxford+ms'
                WHEN word_glossary.source = 'mm+nox'   THEN 'oxford+mm'
                WHEN word_glossary.source = 'err'      THEN 'oxford+err'
                WHEN word_glossary.source = 'miss'     THEN 'oxford'
                ELSE word_glossary.source
              END
WHERE (word_glossary.ipa IS NULL OR word_glossary.audio_src IS NULL
       OR (word_glossary.vn IS NULL AND excluded.vn IS NOT NULL))
  AND NOT (COALESCE(word_glossary.source, '') = 'ms' AND word_glossary.ipa IS NULL
           AND word_glossary.vn IS NOT NULL);`;

// Header comments: no apostrophes / backticks / dollar signs (splitter).
const SAFETY_HEADER = `--
-- Why this keeps /api/words/lookup (read-along) intact:
--   * The lookup treats a row as a complete hit iff vn IS NOT NULL and NOT
--     (ipa IS NULL AND source = ms). Any other row falls through, re-resolves
--     the meaning, and reuses the row ipa/audio_src.
--   * New rows: vn/pos come from the SAME offline dictionary the lookup tries
--     first (public/envi-dict.json), exact headword only, and source is
--     oxford+dict, exactly what the lookup would itself write for this word.
--     When the exact word is not in envi-dict, vn stays NULL (source oxford),
--     so the reader still resolves the meaning itself (lemma/MS/MyMemory) on
--     first tap and simply reuses the IPA/audio stored here.
--   * Existing rows: only gaps are filled (COALESCE); a non-null vn/pos/ipa/
--     audio_src is never overwritten. pos is only filled together with vn.
--     Legacy rows (source ms, ipa NULL, vn set) are left untouched so their
--     one-time fall-through still happens. Rows with nothing to fill are not
--     updated at all.
--   * Only Oxford hits at /definition/english/WORD get a row (no search
--     fallback); misses are not written at all.`;

function buildSql(outFile, title, description, list) {
  const envi = read('public/envi-dict.json'); // { word: [gloss, pos] }
  const row = (word) => {
    const c = cache[word];
    const hit = envi[word]; // exact headword only — see header
    const vn = hit ? hit[0] : null;
    const pos = hit && hit[1] ? hit[1] : null;
    return `(${q(word)}, ${q(vn)}, ${q(pos)}, ${q(c.ipa)}, ${q(vn ? 'oxford+dict' : 'oxford')}, ${q(c.mp3)})`;
  };

  const out = [];
  let chunk = [];
  let bytes = 0;
  const flush = () => {
    if (chunk.length === 0) return;
    out.push(`INSERT INTO word_glossary (word, vn, pos, ipa, source, audio_src) VALUES\n  ${chunk.join(',\n  ')}${UPSERT_TAIL}`);
    chunk = [];
    bytes = 0;
  };
  for (const w of list) {
    const r = row(w);
    const len = Buffer.byteLength(r);
    if (chunk.length >= ROWS_PER_STATEMENT || bytes + len > MAX_STATEMENT_BYTES) flush();
    chunk.push(r);
    bytes += len;
  }
  flush();

  const sql = `-- ${title}
-- GENERATED by scripts/prefetch-oxford-wordlists.mjs --source ${SOURCE} (do not edit by hand).
--
${description}
-- Rows: ${list.length}.
${SAFETY_HEADER}

${out.join('\n\n') || '-- (no rows)'}
`;
  writeFileSync(join(root, outFile), sql);
  return { envi };
}

// ---- IPA contrast check (pairs) --------------------------------------------

// CMU-derived inventory used by content/phonetics (see scripts/build-minimal-pairs.mjs).
const INVENTORY = [
  'aʊ', 'aɪ', 'ɜr', 'ər', 'eɪ', 'iː', 'oʊ', 'ɔɪ', 'uː', 'tʃ', 'dʒ',
  'ɑ', 'æ', 'ʌ', 'ɔ', 'ɛ', 'ɪ', 'ʊ', 'ə',
  'b', 'd', 'ð', 'f', 'ɡ', 'h', 'k', 'l', 'm', 'n', 'ŋ', 'p', 'r', 's', 'ʃ', 't', 'θ', 'v', 'w', 'j', 'z', 'ʒ',
];
const VOWELS = new Set(['aʊ', 'aɪ', 'ɜr', 'ər', 'eɪ', 'iː', 'oʊ', 'ɔɪ', 'uː', 'ɑ', 'æ', 'ʌ', 'ɔ', 'ɛ', 'ɪ', 'ʊ', 'ə']);

function tokenize(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    const two = s.slice(i, i + 2);
    if (INVENTORY.includes(two)) {
      out.push(two);
      i += 2;
    } else {
      out.push(s[i]);
      i += 1;
    }
  }
  return out;
}

const stripMarks = (s) => s.replace(/[ˈˌ.‿/()\s'-]/g, '');

const cmuTokens = (ipa) => tokenize(stripMarks(ipa).replace(/g/g, 'ɡ'));

// Oxford American notation → CMU inventory.
function oxfordTokens(ipa) {
  const s = stripMarks(ipa.normalize('NFD').replace(/[̀-ͯ]/g, '')) // t̬ → t, n̩ → n
    .replace(/ʧ/g, 'tʃ')
    .replace(/ʤ/g, 'dʒ')
    .replace(/g/g, 'ɡ')
    .replace(/ɹ/g, 'r')
    .replace(/ɚ/g, 'ər')
    .replace(/ɝ/g, 'ɜr')
    .replace(/əʊ/g, 'oʊ')
    .replace(/eə/g, 'ɛr')
    .replace(/ɪə/g, 'ɪr')
    .replace(/ʊə/g, 'ʊr')
    .replace(/ɜːr|ɜː/g, 'ɜr')
    .replace(/ɑː|ɒ/g, 'ɑ')
    .replace(/ɔː/g, 'ɔ')
    .replace(/i(?!ː)/g, 'iː')
    .replace(/u(?!ː)/g, 'uː')
    .replace(/e(?!ɪ)/g, 'ɛ');
  return tokenize(s);
}

// Edit-distance alignment; returns for each index of `a` the aligned index in `b` (or -1).
function align(a, b) {
  const sub = (x, y) => (x === y ? 0 : VOWELS.has(x) === VOWELS.has(y) ? 1 : 2);
  const D = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) D[i][0] = i;
  for (let j = 0; j <= b.length; j++) D[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + sub(a[i - 1], b[j - 1]));
  const map = new Array(a.length).fill(-1);
  let i = a.length;
  let j = b.length;
  while (i > 0 && j > 0) {
    if (D[i][j] === D[i - 1][j - 1] + sub(a[i - 1], b[j - 1])) {
      map[i - 1] = j - 1;
      i--;
      j--;
    } else if (D[i][j] === D[i - 1][j] + 1) i--;
    else j--;
  }
  return map;
}

const schwaEq = (t) => (t === 'ə' ? 'ɪ' : t);
const show = (toks) => `/${toks.join('')}/`;

/** Returns null when the Oxford IPA carries the contrasted phoneme, else a note. */
function checkContrast(pair, side, oxIpa) {
  const ta = cmuTokens(pair.ipa_a);
  const tb = cmuTokens(pair.ipa_b);
  const mine = side === 'a' ? ta : tb;
  const ox = oxfordTokens(oxIpa);

  if (ta.length === tb.length) {
    const diffs = ta.map((t, i) => (t !== tb[i] ? i : -1)).filter((i) => i >= 0);
    if (diffs.length !== 1) return `UNVERIFIED: pair IPA differs at ${diffs.length} positions after tokenising`;
    const i = diffs[0];
    const expected = mine[i];
    const other = side === 'a' ? tb[i] : ta[i];
    const j = align(mine, ox)[i];
    const got = j >= 0 ? ox[j] : null;
    if (got === expected) return null;
    if (got === other) return `Oxford has /${other}/ (the other side of the contrast) where the pair expects /${expected}/`;
    if (got === null) return `no Oxford phoneme aligns with the contrasted /${expected}/ (Oxford ${show(ox)})`;
    return `Oxford has /${got}/ where the pair expects /${expected}/`;
  }

  const [stem, long] = ta.length < tb.length ? [ta, tb] : [tb, ta];
  const stemSide = ta.length < tb.length ? 'a' : 'b';
  if (!stem.every((t, i) => t === long[i])) return 'UNVERIFIED: pair is neither same-length nor stem + suffix after tokenising';
  const suffix = long.slice(stem.length);
  if (side !== stemSide) {
    const tail = ox.slice(-suffix.length).map(schwaEq).join(' ');
    if (ox.length <= suffix.length || tail !== suffix.map(schwaEq).join(' ')) {
      return `Oxford lacks the ending ${show(suffix)} (Oxford ${show(ox)}; likely the base-form entry)`;
    }
    // The suffix must attach directly to the stem-final phoneme — otherwise
    // e.g. learned /ˈlɜːrnɪd/ (the adjective) would pass as /lɜrnd/.
    const beforeSuffix = ox[ox.length - suffix.length - 1];
    if (beforeSuffix === stem[stem.length - 1]) return null;
    return `Oxford has /${beforeSuffix}/ before the ending ${show(suffix)}, the stem ends in /${stem[stem.length - 1]}/ (different form or extra syllable)`;
  }
  if (ox[ox.length - 1] === stem[stem.length - 1]) return null;
  return `Oxford ends in /${ox[ox.length - 1]}/, the stem should end in /${stem[stem.length - 1]}/`;
}

function checkPairs() {
  const mismatches = [];
  let checked = 0;
  const redirectNote = (w) => {
    const url = cache[w]?.url;
    if (!url) return '';
    const slug = new URL(url).pathname.split('/').pop() ?? '';
    const base = slug.replace(/_\d+$/, '').replace(/\d+$/, '');
    return base && base !== w ? ` [Oxford redirected ${w} to entry ${slug}]` : '';
  };
  for (const g of pairGroups) {
    for (const p of g.pairs) {
      for (const side of ['a', 'b']) {
        const w = p[side];
        let oxIpa = null;
        let origin = '';
        if (existing.get(w)?.audio_src) {
          oxIpa = existing.get(w).ipa;
          origin = ' [row already in production, not refetched]';
        } else if (isHit(w) && cache[w].mp3) {
          oxIpa = cache[w].ipa;
        } else {
          continue; // no Oxford audio for this word → the test cannot play a wrong recording
        }
        checked++;
        const note = oxIpa
          ? checkContrast(p, side, oxIpa)
          : 'UNVERIFIED: Oxford audio stored but no Oxford IPA to compare';
        if (note) {
          mismatches.push({
            word: w,
            pair: `${p.a}/${p.b}`,
            contrast: g.contrast,
            ipa_pair: side === 'a' ? p.ipa_a : p.ipa_b,
            ipa_oxford: oxIpa,
            note: note + redirectNote(w) + origin,
          });
        }
      }
    }
  }
  return { mismatches, checked };
}

// ---- main -----------------------------------------------------------------

const siblingKeys = () =>
  SOURCE === 'ngsl-upper'
    ? [...new Set(words.filter(isHit).flatMap((w) => (cache[w].siblings ?? []).map((s) => `entry:${s}`)))]
    : [];
if (!SQL_ONLY) {
  const finished = await fetchAll();
  if (finished && siblingKeys().length) await fetchAll(siblingKeys(), lookupEntry, 'sibling entries');
}

const hits = words.filter(isHit);
const misses = words.filter((w) => cache[w] && !isHit(w));
let outFile;
let envi;
if (SOURCE === 'wordlists') {
  outFile = 'migrations/0026_word_glossary_oxford_prefetch.sql';
  ({ envi } = buildSql(
    outFile,
    '0026_word_glossary_oxford_prefetch.sql',
    `-- Prefetched Oxford Learners Dictionaries US pronunciation (IPA + mp3 CDN URL)
-- for NGSL rank <= ${NGSL_MAX_RANK} + AWL, so the roadmap word-list test (which
-- LEFT JOINs word_glossary) and the read-along reader have real audio ready.`,
    hits,
  ));
} else if (SOURCE === 'ngsl-upper') {
  outFile = 'migrations/0035_word_glossary_oxford_ngsl_upper.sql';
  ({ envi } = buildSql(
    outFile,
    '0035_word_glossary_oxford_ngsl_upper.sql',
    `-- Prefetched Oxford Learners Dictionaries US pronunciation (IPA + mp3 CDN URL)
-- for NGSL rank > ${NGSL_MAX_RANK} words that had no audio_src yet (roadmap
-- listen-and-type word test + read-along reader).`,
    hits,
  ));
} else {
  outFile = 'migrations/0029_word_glossary_oxford_pairs.sql';
  ({ envi } = buildSql(
    outFile,
    '0029_word_glossary_oxford_pairs.sql',
    `-- Prefetched Oxford Learners Dictionaries US pronunciation (IPA + mp3 CDN URL)
-- for every a/b word of content/phonetics/minimal-pairs.json and
-- final-sound-pairs.json that had no audio_src yet. Words whose Oxford IPA does
-- not carry the contrasted phoneme are STILL written here (the reader needs
-- them); they are listed in content/phonetics/oxford-ipa-mismatches.json so the
-- listening test can drop those pairs.`,
    hits,
  ));
}

console.log('\n==== summary ====');
console.log(`source: ${SOURCE}`);
console.log(`list entries: ${attempted.length} (unique ${unique.length})`);
console.log(`skipped (cleanWord mismatch): ${skippedUnclean.join(', ') || 'none'}`);
console.log(`skipped (already have audio_src): ${skippedHaveAudio.length}`);
console.log(`attempted: ${words.length}, resolved: ${hits.length + misses.length}`);
console.log(`hits with mp3: ${hits.filter((w) => cache[w].mp3).length}`);
console.log(`hits with IPA only: ${hits.filter((w) => !cache[w].mp3).length}`);
console.log(`hits with envi-dict vn: ${hits.filter((w) => envi[w]).length}`);
console.log(`misses: ${misses.length}`);
for (const w of misses) console.log(`  miss ${w}: ${cache[w].via === 'search' ? 'HTTP 404 (old run)' : cache[w].reason}`);
console.log(`wrote ${outFile}`);

if (SOURCE === 'ngsl-upper') {
  const bare = (ipa) => (ipa ?? '').replace(/[/\s]/g, '');
  const het = [];
  for (const w of hits) {
    const variants = (cache[w].siblings ?? [])
      .map((s) => ({ slug: s, ...cache[`entry:${s}`] }))
      .filter((e) => e.status === 'hit' && bare(e.ipa) !== bare(cache[w].ipa));
    if (variants.length) het.push(`${w}: stored ${cache[w].ipa} (${new URL(cache[w].url).pathname.split('/').pop()}) vs ${variants.map((v) => `${v.ipa} (${v.slug})`).join(', ')}`);
  }
  const unchecked = hits.filter((w) => (cache[w].siblings ?? []).some((s) => !cache[`entry:${s}`]));
  console.log(`heteronym candidates (sibling entry with a different US IPA): ${het.length}`);
  for (const line of het) console.log(`  ${line}`);
  if (unchecked.length) console.log(`sibling entries not fetched yet for: ${unchecked.join(', ')}`);
}

if (SOURCE === 'pairs') {
  const { mismatches, checked } = checkPairs();
  const MISMATCH_OUT = 'content/phonetics/oxford-ipa-mismatches.json';
  writeFileSync(join(root, MISMATCH_OUT), JSON.stringify(mismatches, null, 2) + '\n');
  console.log(`contrast checks (word x pair with Oxford audio): ${checked}`);
  console.log(`mismatches: ${mismatches.length} (unverified ${mismatches.filter((m) => m.note.startsWith('UNVERIFIED')).length}), pairs affected: ${new Set(mismatches.map((m) => m.contrast + ' ' + m.pair)).size}`);
  console.log(`wrote ${MISMATCH_OUT}`);
}
