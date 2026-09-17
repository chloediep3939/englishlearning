#!/usr/bin/env node
// Build content/wordlists/*.json — the standard word lists the roadmap
// "word-list check" tool (T1) draws from. See src/doc/roadmap-self-test-plan.md,
// section "Word lists (phase 1)".
//
// Usage:
//   node scripts/build-wordlists.mjs            # downloads everything, writes all 4 files
//   node scripts/build-wordlists.mjs ngsl awl   # only the named lists
//
// Downloads are cached under <tmpdir>/bun-wordlist-cache/ (outside the repo)
// so reruns are cheap and the parse can be iterated without hammering the
// sources. Delete that directory to force a fresh fetch.
//
// Every list below comes from a real published source. Nothing here is
// hand-written or generated: if a source cannot be parsed the script throws
// rather than emitting a short or invented list, because the whole point of
// the roadmap thresholds ("≥47/50") is that they are measured against the
// actual list.
//
// ---------------------------------------------------------------------------
// 1. ngsl.json — New General Service List 1.2 (Browne, Culligan & Phillips)
//    Source: https://www.newgeneralservicelist.com/s/NGSL_12_stats.csv
//    linked from https://www.newgeneralservicelist.com/new-general-service-list
//    Licence: CC BY-SA 4.0 (stated on that page).
//    2,809 lemmas, already ordered by SFI rank → { word, rank }.
//    The roadmap split (doc-01 = ranks 1–1500, doc-02 = 1500–2800) is just a
//    filter on `rank`.
//    Gotcha: the published CSV is a spreadsheet export, so the lemmas `true`
//    and `false` arrive as `TRUE` / `FALSE`. Repaired below; `I` is left
//    capitalised because that is its real spelling.
//
// 2. awl.json — Academic Word List (Coxhead, 2000)
//    Source: the author's own department, one page per sublist:
//    https://www.wgtn.ac.nz/lals/resources/academicwordlist/sublist/sublist01 … 10
//    570 head words → { word, sublist }.
//    Gotchas — two markup bugs on the official pages, both confirmed against
//    the independent copy at https://www.eapfoundation.com/vocab/academic/awllists/ :
//      a) sublist 3 wraps the family member "reliability" in its own <p>, so a
//         naive parse reads it as a 61st head word. Fixed by ignoring any <p>
//         nested inside a family <ul>.
//      b) sublist 7 is missing the <p> around the head word "confirm" — it sits
//         as an <li> inside the previous head word's family list, leaving 59.
//         Repaired explicitly below (AWL_UPSTREAM_FIXES).
//      c) sublist 10 prints "so called" without its hyphen; Coxhead's published
//         list and eapfoundation both have "so-called" (AWL_SPELLING_FIXES).
//    The script asserts the canonical shape (60×9 + 30 = 570) afterwards.
//
// 3. phrasal-verbs.json — the 100 most frequent English phrasal verbs
//    Source: the PHaVE List (Garnier & Schmitt 2015, Language Teaching Research
//    19(6)), distributed by the author at
//    https://www.norbertschmitt.co.uk/_files/ugd/5f2482_fb2f15be0d104d08802d9ffd722e5782.pdf
//    (linked from https://www.norbertschmitt.co.uk/vocabulary-resources)
//    The PDF numbers its 150 entries in COCA frequency order; we keep the top
//    100 and take each item's most frequent meaning sense as `meaning_en`.
//    There is no pdftotext dependency — the PDF's content streams are Flate
//    text, extracted by extractPdfText() below.
//
// 4. commonly-misspelled.json — commonly misspelled English words
//    Two tiers, both from Wikipedia, because no single public list of 500
//    learner-grade words could be sourced. Each row carries its `tier`.
//      Tier 1 — the article "Commonly misspelled English words", section
//        "Documented list of common misspellings". Every entry there is
//        footnoted to a published top-100/200/400 misspelling list.
//        https://en.wikipedia.org/wiki/Commonly_misspelled_English_words
//        Kept whole: no filtering, this is the learner-grade half.
//      Tier 2 — top-up from the editor-facing machine-readable list,
//        https://en.wikipedia.org/wiki/Wikipedia:Lists_of_common_misspellings/For_machines
//        ranked by how many distinct misspellings are recorded for the word.
//        Objective rule, no hand-picking: ≥2 recorded misspellings, ≥6 letters,
//        lowercase a–z only, most-misspelled first.
//    That machine list records what Wikipedia *editors* mistype, so on its own
//    it drags in words a B2 learner will never write ("autochthonous",
//    "apennines", "parallelly") — testing those measures nothing. So tier 2 is
//    additionally gated on vocabulary the learner is actually studying: a word
//    survives only if it, or a lemma it could inflect from, appears in
//    ngsl.json or awl.json (see lemmaCandidates()). Both files must therefore
//    be built before this one; the script says so if they are missing.
//    MISSPELLED_TARGET is a cap, not a quota — if the filter leaves fewer, the
//    file is simply shorter. The rule is never relaxed to reach a round number.
//    Licence for both: CC BY-SA 4.0.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { inflateSync } from 'node:zlib';
import { join } from 'node:path';

const OUT_DIR = join(process.cwd(), 'content', 'wordlists');
const CACHE_DIR = join(tmpdir(), 'bun-wordlist-cache');

const SOURCES = {
  ngsl: 'https://www.newgeneralservicelist.com/s/NGSL_12_stats.csv',
  awlSublist: (n) =>
    `https://www.wgtn.ac.nz/lals/resources/academicwordlist/sublist/sublist${n}`,
  phave:
    'https://www.norbertschmitt.co.uk/_files/ugd/5f2482_fb2f15be0d104d08802d9ffd722e5782.pdf',
  misspellArticle:
    'https://en.wikipedia.org/wiki/Special:Export/Commonly_misspelled_English_words',
  misspellMachine:
    'https://en.wikipedia.org/wiki/Special:Export/Wikipedia:Lists_of_common_misspellings/For_machines',
};

const MISSPELLED_TARGET = 500;
const PHRASAL_VERB_TARGET = 100;

// Sublist 7's head word "confirm" has no <p> on the official page (see header).
const AWL_UPSTREAM_FIXES = [{ word: 'confirm', sublist: 7 }];
// Sublist 10 drops the hyphen from "so-called" (see header).
const AWL_SPELLING_FIXES = { 'so called': 'so-called' };

// ---------------------------------------------------------------------------
// plumbing
// ---------------------------------------------------------------------------

/** Download `url` once, keeping a copy in CACHE_DIR/<name>. */
async function fetchCached(url, name, { binary = false } = {}) {
  await mkdir(CACHE_DIR, { recursive: true });
  const path = join(CACHE_DIR, name);
  if (existsSync(path)) return readFile(path, binary ? null : 'utf-8');

  const res = await fetch(url, {
    headers: { 'user-agent': 'bun-wordlist-build/1.0 (english-learning app)' },
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(path, buf);
  return binary ? buf : buf.toString('utf-8');
}

async function writeList(name, rows) {
  await mkdir(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, name);
  await writeFile(path, JSON.stringify(rows, null, 2) + '\n');
  console.log(`${name}: ${rows.length} entries → ${path}`);
}

/** Strip HTML tags, decode the few entities these pages actually use. */
function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
}

// ---------------------------------------------------------------------------
// 1. NGSL
// ---------------------------------------------------------------------------

// Spreadsheet export damage: the lemmas true/false were coerced to booleans.
const NGSL_LEMMA_FIXES = { TRUE: 'true', FALSE: 'false' };

async function buildNgsl() {
  const csv = await fetchCached(SOURCES.ngsl, 'ngsl_12_stats.csv');
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  const header = lines.shift();
  if (!/^Lemma,\s*SFI Rank/i.test(header)) {
    throw new Error(`NGSL: unexpected CSV header: ${header}`);
  }

  const rows = [];
  for (const line of lines) {
    const [lemmaRaw, rankRaw] = line.split(',');
    const rank = Number(rankRaw);
    if (!lemmaRaw || !Number.isInteger(rank)) {
      throw new Error(`NGSL: cannot parse row: ${line}`);
    }
    const word = NGSL_LEMMA_FIXES[lemmaRaw] ?? lemmaRaw.trim();
    if (!/^[A-Za-z][A-Za-z'-]*$/.test(word)) {
      throw new Error(`NGSL: unexpected lemma: ${word}`);
    }
    rows.push({ word, rank });
  }

  rows.sort((a, b) => a.rank - b.rank);
  if (rows.length < 2800) throw new Error(`NGSL: only ${rows.length} rows`);
  rows.forEach((r, i) => {
    if (r.rank !== i + 1) throw new Error(`NGSL: rank gap at ${r.word} (${r.rank})`);
  });
  const belowSplit = rows.filter((r) => r.rank <= 1500).length;
  if (belowSplit !== 1500) throw new Error(`NGSL: split at 1500 is broken`);

  await writeList('ngsl.json', rows);
}

// ---------------------------------------------------------------------------
// 2. AWL
// ---------------------------------------------------------------------------

async function buildAwl() {
  const rows = [];
  for (let n = 1; n <= 10; n++) {
    const nn = String(n).padStart(2, '0');
    const html = await fetchCached(SOURCES.awlSublist(nn), `awl_sublist${nn}.html`);

    const start = html.indexOf('<h2>The Academic Word List</h2>');
    const end = html.indexOf('</main>', start);
    if (start < 0 || end < 0) throw new Error(`AWL sublist ${nn}: content block not found`);

    // Family members live in <ul>…</ul> after each head word. Drop them first
    // so a stray nested <p> (sublist 3's "reliability") cannot be read as a
    // head word.
    const body = html.slice(start, end).replace(/<ul>[\s\S]*?<\/ul>/g, '');

    for (const m of body.matchAll(/<p>\s*([A-Za-z][A-Za-z\- ]*?)\s*<\/p>/g)) {
      const word = decodeEntities(m[1]).trim().toLowerCase();
      rows.push({ word: AWL_SPELLING_FIXES[word] ?? word, sublist: n });
    }
  }

  for (const fix of AWL_UPSTREAM_FIXES) {
    if (rows.some((r) => r.word === fix.word)) {
      throw new Error(`AWL: "${fix.word}" now parses on its own — drop the upstream fix`);
    }
    rows.push(fix);
  }

  rows.sort((a, b) => a.sublist - b.sublist || a.word.localeCompare(b.word));

  const seen = new Set();
  for (const r of rows) {
    if (seen.has(r.word)) throw new Error(`AWL: duplicate head word ${r.word}`);
    seen.add(r.word);
  }
  const perSublist = rows.reduce((acc, r) => ((acc[r.sublist] = (acc[r.sublist] ?? 0) + 1), acc), {});
  for (let n = 1; n <= 10; n++) {
    const expected = n === 10 ? 30 : 60;
    if (perSublist[n] !== expected) {
      throw new Error(`AWL: sublist ${n} has ${perSublist[n]} head words, expected ${expected}`);
    }
  }
  if (rows.length !== 570) throw new Error(`AWL: ${rows.length} head words, expected 570`);

  await writeList('awl.json', rows);
}

// ---------------------------------------------------------------------------
// 3. Phrasal verbs (PHaVE List)
// ---------------------------------------------------------------------------

const PDF_OCTAL = /\\([0-7]{1,3})/g;
const PDF_ESCAPE = /\\([nrtbf()\\])/g;
// The PDF was exported from Word, so the "high" bytes are cp1252, not latin-1.
const CP1252 = { 0x91: "'", 0x92: "'", 0x93: '"', 0x94: '"', 0x95: '-', 0x96: '-', 0x97: '-' };

function unescapePdfString(s) {
  return s
    .replace(PDF_OCTAL, (_, oct) => {
      const code = parseInt(oct, 8);
      return CP1252[code] ?? String.fromCharCode(code);
    })
    .replace(PDF_ESCAPE, (_, ch) => ({ n: '\n', r: '', t: '\t', b: '', f: '' }[ch] ?? ch));
}

/**
 * Minimal PDF text extraction: inflate every Flate content stream and read the
 * strings handed to the Tj / TJ show-text operators. Enough for a PDF exported
 * from a word processor; it is not a general PDF renderer.
 */
function extractPdfText(buf) {
  const bytes = buf.toString('latin1');
  const chunks = [];
  const streamRe = /stream\r?\n/g;
  let m;
  while ((m = streamRe.exec(bytes))) {
    const from = m.index + m[0].length;
    const to = bytes.indexOf('endstream', from);
    if (to < 0) continue;
    let inflated;
    try {
      inflated = inflateSync(Buffer.from(bytes.slice(from, to), 'latin1')).toString('latin1');
    } catch {
      continue; // font programs, images, object streams — not text
    }
    if (!inflated.includes('Tj') && !inflated.includes('TJ')) continue;
    chunks.push(inflated);
  }
  if (chunks.length === 0) throw new Error('PDF: no text content streams found');

  const blob = chunks.join('\n');
  const opRe = /\((?:[^()\\]|\\[\s\S])*\)\s*Tj|\[(?:[^[\]\\]|\\[\s\S])*\]\s*TJ/g;
  const out = [];
  let op;
  while ((op = opRe.exec(blob))) {
    const t = op[0];
    if (t.endsWith('Tj')) {
      out.push(unescapePdfString(t.slice(1, t.lastIndexOf(')'))));
    } else {
      for (const part of t.match(/\((?:[^()\\]|\\[\s\S])*\)/g) ?? []) {
        out.push(unescapePdfString(part.slice(1, -1)));
      }
    }
  }
  return out.join('');
}

async function buildPhrasalVerbs() {
  const pdf = await fetchCached(SOURCES.phave, 'phave_list.pdf', { binary: true });
  const text = extractPdfText(pdf).replace(/\s+/g, ' ');

  // Entry shape in the PDF:
  //   "12. TURN OUT 1. Prove or be discovered to happen or be (91%) It turned…"
  // Some percentages are written "(81.5 %)".
  const entryRe =
    /(\d{1,3})\.\s+([A-Z]{2,}(?:\s+[A-Z]{2,}){1,2})\s+1\.\s+(.*?)\(\s*\d+(?:\.\d+)?\s*%\s*\)/g;

  const byRank = new Map();
  for (const m of text.matchAll(entryRe)) {
    const rank = Number(m[1]);
    const verb = m[2].toLowerCase().replace(/\s+/g, ' ').trim();
    const meaning = m[3].replace(/\s+/g, ' ').trim().replace(/[;,]$/, '');
    if (byRank.has(rank)) throw new Error(`PHaVE: rank ${rank} seen twice`);
    if (!meaning) throw new Error(`PHaVE: empty meaning for ${verb}`);
    byRank.set(rank, { verb, meaning_en: meaning });
  }

  if (byRank.size !== 150) {
    throw new Error(`PHaVE: parsed ${byRank.size} entries, expected 150`);
  }

  const rows = [];
  for (let rank = 1; rank <= PHRASAL_VERB_TARGET; rank++) {
    const row = byRank.get(rank);
    if (!row) throw new Error(`PHaVE: rank ${rank} missing`);
    rows.push(row);
  }

  await writeList('phrasal-verbs.json', rows);
}

// ---------------------------------------------------------------------------
// 4. Commonly misspelled words
// ---------------------------------------------------------------------------

/** Special:Export gives MediaWiki XML; the wikitext sits in <text …>…</text>. */
function wikitextOf(xml) {
  const open = xml.indexOf('<text');
  const start = xml.indexOf('>', open) + 1;
  const end = xml.indexOf('</text>', start);
  if (open < 0 || end < 0) throw new Error('wiki: no <text> element');
  return decodeEntities(xml.slice(start, end));
}

/** Tier 1 — the article's documented list, one head word per bullet. */
function parseDocumentedList(wikitext) {
  const start = wikitext.indexOf('== Documented list of common misspellings ==');
  const end = wikitext.indexOf('== Common causes of misspellings ==', start);
  if (start < 0 || end < 0) throw new Error('misspellings: article section not found');

  const words = [];
  for (const line of wikitext.slice(start, end).split('\n')) {
    if (!line.startsWith('* ')) continue;
    const m = line.match(/^\*\s*(.+?)\s*[–—]\s/); // "word – misspelling, …"
    if (!m) continue;
    const head = m[1]
      .replace(/'''/g, '')
      .replace(/\([^)]*\)/g, '') // "prophecy (as noun)", "jewelry (US)"
      .split('/')[0] // "accidentally/accidently", "hypocrisy/hypocrite"
      .trim()
      .toLowerCase();
    // Single plain word only: drops "a lot", "hors d'oeuvres", "you're".
    if (!/^[a-z][a-z-]{2,}$/.test(head)) continue;
    words.push(head);
  }
  if (words.length < 150) {
    throw new Error(`misspellings: tier 1 parsed only ${words.length} words`);
  }
  return words;
}

/** Tier 2 — correct spellings from the machine list, most-misspelled first. */
function parseMachineList(wikitext) {
  const start = wikitext.indexOf('==The Machine-Readable List==');
  if (start < 0) throw new Error('misspellings: machine list section not found');

  const counts = new Map();
  for (const m of wikitext.slice(start).matchAll(/^ [A-Za-z'-]+->([A-Za-z',\- ]+)$/gm)) {
    for (const correct of m[1].split(',')) {
      const w = correct.trim().toLowerCase();
      if (!w) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  if (counts.size < 1000) {
    throw new Error(`misspellings: machine list parsed only ${counts.size} words`);
  }

  return [...counts.entries()]
    .filter(([w, n]) => n >= 2 && /^[a-z]{6,}$/.test(w))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([w]) => w);
}

/**
 * Surface forms a learner word list might store the word under. Both NGSL and
 * AWL are lemma lists, so an inflected surface form ("references",
 * "abilities", "occurred") has to be reduced before it can be looked up.
 * Deliberately generous in both directions — a spurious candidate only matters
 * if it happens to collide with a real NGSL/AWL lemma.
 */
function lemmaCandidates(word) {
  const out = new Set([word]);
  const add = (w) => {
    if (w.length >= 2) out.add(w);
  };

  if (word.endsWith('ies')) add(word.slice(0, -3) + 'y');
  if (word.endsWith('es')) add(word.slice(0, -2));
  if (word.endsWith('s')) add(word.slice(0, -1));
  if (word.endsWith('ed')) {
    add(word.slice(0, -2)); // worked → work
    add(word.slice(0, -1)); // used → use
  }
  if (word.endsWith('ied')) add(word.slice(0, -3) + 'y'); // applied → apply
  if (word.endsWith('ing')) {
    add(word.slice(0, -3)); // working → work
    add(word.slice(0, -3) + 'e'); // using → use
  }
  if (word.endsWith('ly')) add(word.slice(0, -2)); // publicly → public
  if (word.endsWith('ally')) add(word.slice(0, -4)); // basically → basic
  if (word.endsWith('ily')) add(word.slice(0, -3) + 'y'); // easily → easy
  if (word.endsWith('er')) {
    add(word.slice(0, -2)); // higher → high
    add(word.slice(0, -1)); // finer → fine
  }
  if (word.endsWith('est')) {
    add(word.slice(0, -3)); // highest → high
    add(word.slice(0, -2)); // finest → fine
  }

  // Doubled final consonant before -ed / -ing / -er: occurred → occur.
  const undouble = word.match(/^(.*([^aeiou]))\2(ed|ing|er|est)$/);
  if (undouble) add(undouble[1]);

  return [...out];
}

async function buildCommonlyMisspelled() {
  const article = wikitextOf(
    await fetchCached(SOURCES.misspellArticle, 'wiki_misspelled_article.xml'),
  );
  const machine = wikitextOf(
    await fetchCached(SOURCES.misspellMachine, 'wiki_misspelled_machine.xml'),
  );

  // Tier 2's vocabulary gate — the lists the learner is actually studying.
  const studied = new Set();
  for (const file of ['ngsl.json', 'awl.json']) {
    const path = join(OUT_DIR, file);
    if (!existsSync(path)) {
      throw new Error(
        `misspellings: ${file} is needed to filter tier 2 — run ` +
          `\`node scripts/build-wordlists.mjs ngsl awl\` first`,
      );
    }
    for (const row of JSON.parse(await readFile(path, 'utf-8'))) {
      studied.add(row.word.toLowerCase());
    }
  }

  const rows = [];
  const seen = new Set();
  const push = (word, tier) => {
    if (seen.has(word)) return;
    seen.add(word);
    rows.push({ word, tier });
  };

  // Tier 1 is kept whole — no vocabulary gate.
  for (const w of parseDocumentedList(article)) push(w, 1);
  const tier1Count = rows.length;

  const tier2Raw = parseMachineList(machine);
  const rejected = [];
  for (const w of tier2Raw) {
    if (rows.length >= MISSPELLED_TARGET) break;
    if (seen.has(w)) continue;
    if (lemmaCandidates(w).some((c) => studied.has(c))) push(w, 2);
    else rejected.push(w);
  }

  rows.sort((a, b) => a.word.localeCompare(b.word));

  // MISSPELLED_TARGET is a ceiling. Falling short is a reportable fact, not an
  // error, and is never fixed by loosening the filter.
  console.log(
    `  tier 1 (article, unfiltered): ${tier1Count}\n` +
      `  tier 2 (machine list): ${tier2Raw.length} candidates → ` +
      `${rows.length - tier1Count} kept, ${rejected.length} dropped as ` +
      `outside NGSL/AWL\n` +
      `  dropped sample: ${rejected.slice(0, 10).join(', ')}`,
  );
  if (rows.length < MISSPELLED_TARGET) {
    console.log(`  note: ${rows.length} words, below the ${MISSPELLED_TARGET} ceiling`);
  }

  await writeList('commonly-misspelled.json', rows);
}

// ---------------------------------------------------------------------------

const BUILDERS = {
  ngsl: buildNgsl,
  awl: buildAwl,
  'phrasal-verbs': buildPhrasalVerbs,
  'commonly-misspelled': buildCommonlyMisspelled,
};

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(BUILDERS);
for (const name of names) {
  const builder = BUILDERS[name];
  if (!builder) {
    console.error(`unknown list "${name}" — pick from: ${Object.keys(BUILDERS).join(', ')}`);
    process.exit(1);
  }
  await builder();
}
