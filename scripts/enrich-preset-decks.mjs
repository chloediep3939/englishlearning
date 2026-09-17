#!/usr/bin/env node
// "Sửa từ thiếu info" for the preset decks, run once on the source content
// instead of per user copy. Fills, in content/preset-decks/<code>.json:
//   - ipa        Oxford US IPA; CMU (public/cmu-ipa.json) when Oxford misses
//   - audio_src  Oxford US mp3 URL (null → browser TTS). Copied into the
//                user's R2 per card at copy time.
//   - image_url + image_attribution   Pexels photo for the headword
//   - examples[i].image_url           Pexels photo per sentence ("Học câu")
// Only missing fields are filled, so it is resumable and safe to rerun.
//
//   node --env-file=<path to .dev.vars> scripts/enrich-preset-decks.mjs <code> [<code> …]
//
// Needs PEXELS_API_KEY in the env (images are skipped without it).
// Then generate the DB update: scripts/gen-preset-decks-seed.mjs --enrich …
//
// Same sources as the in-app sweep: Oxford parsing is imported from
// src/lib/oxford/pronunciation.ts and Pexels from src/lib/flashcards/pexels.ts
// (both import-free apart from types; Node >= 23 strips TS types).
// Oxford results are shared with scripts/prefetch-oxford-wordlists.mjs via its
// tmp cache, so words it already fetched cost no request.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'content/preset-decks');
const { parseOxfordUsPronunciation, BROWSER_UA } = await import(join(ROOT, 'src/lib/oxford/pronunciation.ts'));
const pexels = await import(join(ROOT, 'src/lib/flashcards/pexels.ts'));

// Pexels throttles bursts (non-ok → getPexelsImage returns null), so pace the
// calls; a rerun fills whatever still missed.
const PEXELS_DELAY_MS = 1200;
let lastPexels = 0;
async function getPexelsImage(query) {
  const wait = lastPexels + PEXELS_DELAY_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastPexels = Date.now();
  return pexels.getPexelsImage(query);
}

const OXFORD_CACHE = join(tmpdir(), 'bun-oxford-prefetch-cache.json');
const OXFORD_DELAY_MS = 1600;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const codes = process.argv.slice(2);
if (codes.length === 0) {
  console.error('usage: enrich-preset-decks.mjs <code>…');
  process.exit(1);
}
if (!process.env.PEXELS_API_KEY) console.warn('PEXELS_API_KEY missing — images will be skipped');

let oxfordCache = existsSync(OXFORD_CACHE) ? JSON.parse(readFileSync(OXFORD_CACHE, 'utf8')) : {};
const cmu = JSON.parse(readFileSync(join(ROOT, 'public/cmu-ipa.json'), 'utf8'));

let lastOxford = 0;
async function oxford(word) {
  const cached = oxfordCache[word];
  if (cached?.status === 'hit') return { ipa: cached.ipa ?? null, mp3: cached.mp3 ?? null };
  if (cached?.status === 'miss') return { ipa: null, mp3: null };

  const wait = lastOxford + OXFORD_DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastOxford = Date.now();
  const url = `https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(word.toLowerCase())}`;
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en' },
    });
    if (res.status === 404) {
      oxfordCache[word] = { status: 'miss', via: 'definition', url, fetchedAt: new Date().toISOString() };
    } else if (res.ok) {
      const p = parseOxfordUsPronunciation(await res.text());
      oxfordCache[word] = p.ipaUs || p.mp3SourceUrl
        ? { ipa: p.ipaUs, mp3: p.mp3SourceUrl, status: 'hit', via: 'definition', url, fetchedAt: new Date().toISOString() }
        : { status: 'miss', via: 'definition', url, fetchedAt: new Date().toISOString() };
    } else {
      console.warn(`  oxford ${word}: HTTP ${res.status} (retry next run)`);
      return null;
    }
    writeFileSync(OXFORD_CACHE, JSON.stringify(oxfordCache, null, 1));
    return cachedResult(word);
  } catch (err) {
    console.warn(`  oxford ${word}: ${err?.message ?? err} (retry next run)`);
    return null;
  }
}
function cachedResult(word) {
  const c = oxfordCache[word];
  return c?.status === 'hit' ? { ipa: c.ipa ?? null, mp3: c.mp3 ?? null } : { ipa: null, mp3: null };
}

// Same cleaning as sentenceImageQuery() in src/lib/flashcards/example-image.ts
// (that module imports the DB layer, so it can't be loaded here).
const sentenceQuery = (s) =>
  s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);

const stats = { ipa: 0, audio: 0, image: 0, exImage: 0, misses: [] };

for (const code of codes) {
  const path = join(DIR, `${code}.json`);
  const file = JSON.parse(readFileSync(path, 'utf8'));
  console.log(`▸ ${code}`);
  const save = () => writeFileSync(path, JSON.stringify(file, null, 2) + '\n');

  for (const card of file.cards) {
    const w = card.english;

    if (!card.ipa || card.audio_src === undefined) {
      const o = await oxford(w);
      if (o) {
        if (!card.ipa) {
          card.ipa = o.ipa ?? cmu[w.toLowerCase()] ?? null;
          if (card.ipa) stats.ipa++;
          else stats.misses.push(`${w}: ipa`);
        }
        if (card.audio_src === undefined) {
          card.audio_src = o.mp3 ?? null;
          if (o.mp3) stats.audio++;
        }
      }
    }

    if (process.env.PEXELS_API_KEY) {
      if (!card.image_url) {
        const img = await getPexelsImage(w);
        if (img) {
          card.image_url = img.image_url;
          card.image_attribution = img.image_attribution;
          stats.image++;
        } else stats.misses.push(`${w}: image`);
      }
      for (const ex of card.examples) {
        if (ex.image_url) continue;
        const img = (await getPexelsImage(sentenceQuery(ex.en))) ?? (await getPexelsImage(w));
        if (img) {
          ex.image_url = img.image_url;
          stats.exImage++;
        } else stats.misses.push(`${w}: example image "${ex.en.slice(0, 30)}…"`);
      }
    }
    save(); // after every card — resumable
  }
}

console.log(`filled: ipa ${stats.ipa}, audio ${stats.audio}, image ${stats.image}, example images ${stats.exImage}`);
if (stats.misses.length) console.log(`misses (${stats.misses.length}):\n  ${stats.misses.join('\n  ')}`);
