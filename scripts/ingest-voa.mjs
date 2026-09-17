// S1 ingest — nhập bài VOA Learning English vào kho shadowing.
// Chạy LOCAL (VOA/Azure chặn/không hợp Worker), đẩy dữ liệu qua route admin
// POST /api/shadowing/ingest trên worker đã deploy.
//
// Luồng mỗi bài:
//   trang mục lục → link bài /a/..id.html → parse (title/program/mp3/transcript)
//   → Azure batch transcription lấy mốc TỪNG TỪ → gán mốc câu + từ
//   → POST JSON lên route (route tự tải MP3 → R2, ghi D1).
//
// ENV cần:
//   AUTH_COOKIE           giá trị cookie `auth` của bạn (admin) — lấy từ trình duyệt
//   AZURE_SPEECH          key Azure Speech   (tự đọc .dev.vars nếu thiếu)
//   AZURE_SPEECH_REGION   vùng, vd southeastasia
// ENV tuỳ chọn:
//   INGEST_URL   mặc định https://english-learning.chloediep3939.workers.dev/api/shadowing/ingest
//   INGEST_LIMIT số bài mỗi chương trình (mặc định 2 để chạy thử)
//   TRANSLATOR_KEY / TRANSLATOR_REGION  nếu có thì dịch translation_vi (Azure Translator)
//
// Dùng:
//   AUTH_COOKIE="..." node scripts/ingest-voa.mjs
//   AUTH_COOKIE="..." node scripts/ingest-voa.mjs https://learningenglish.voanews.com/p/5644.html:1

import { readFileSync } from 'node:fs';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// Chương trình mặc định + bậc gán tay (URL:level). Đổi qua argv nếu muốn.
const DEFAULT_PROGRAMS = [
  { url: 'https://learningenglish.voanews.com/p/5644.html', level: 1 }, // Let's Learn English L1
  { url: 'https://learningenglish.voanews.com/p/6765.html', level: 2 }, // Let's Learn English L2
  { url: 'https://learningenglish.voanews.com/p/5610.html', level: 3 }, // Intermediate
  { url: 'https://learningenglish.voanews.com/p/5611.html', level: 3 }, // Intermediate
];

// ---- env ----
function loadDevVars() {
  try {
    const txt = readFileSync(
      new URL('../.dev.vars', import.meta.url),
      'utf-8'
    );
    for (const line of txt.split('\n')) {
      const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* .dev.vars có thể không tồn tại — bỏ qua */
  }
}
loadDevVars();

const INGEST_URL =
  process.env.INGEST_URL ||
  'https://english-learning.chloediep3939.workers.dev/api/shadowing/ingest';
const LIMIT = Number(process.env.INGEST_LIMIT || 2);
const AUTH_COOKIE = process.env.AUTH_COOKIE;
const AZ_KEY = process.env.AZURE_SPEECH_KEY || process.env.AZURE_SPEECH;
const AZ_REGION = process.env.AZURE_SPEECH_REGION;

if (!AUTH_COOKIE) fail('Thiếu AUTH_COOKIE (cookie `auth` admin từ trình duyệt).');
if (!AZ_KEY || !AZ_REGION) fail('Thiếu AZURE_SPEECH / AZURE_SPEECH_REGION.');

function fail(msg) {
  console.error('✗', msg);
  process.exit(1);
}
function log(...a) {
  console.log(...a);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' } });
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
  return res.text();
}

// ---- parse VOA ----
function decodeEntities(s) {
  return s
    .replace(/&#x27;|&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&hellip;/g, '…')
    .replace(/&#x2019;/g, "'")
    .replace(/&[a-z#0-9]+;/gi, ' ');
}

function extractArticleLinks(html) {
  const set = new Set();
  const re = /href="(\/a\/[^"]+?\.html)"/gi;
  let m;
  while ((m = re.exec(html))) set.add('https://learningenglish.voanews.com' + m[1]);
  return [...set];
}

function extractLdJson(html) {
  const m = /<script type="application\/ld\+json">(.*?)<\/script>/is.exec(html);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function extractMp3(html) {
  const m = /https?:\/\/[^"'\s]+?\.mp3/i.exec(html);
  return m ? m[0].replace(/\?.*$/, '') : null;
}

// Bóc transcript trong <div class="wsw">…</div> — bỏ header/embed/boilerplate,
// lấy các dòng text (thoại <div> hoặc đoạn <p>), trả về 1 chuỗi.
function extractTranscript(html) {
  const start = html.search(/<div class="wsw">/i);
  if (start < 0) return '';
  // Cắt tới hết article-content (đủ dùng cho spike/ingest v1).
  const chunk = html.slice(start, start + 200000);
  // Bỏ script/style/figure/embed/iframe.
  let s = chunk
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<figure[\s\S]*?<\/figure>/gi, ' ')
    .replace(/<div class="wsw__embed"[\s\S]*?<\/div>/gi, ' ')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ');
  // Tách theo thẻ block để giữ ranh giới dòng.
  s = s.replace(/<\/(p|div|h2|h3|li|br)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s);
  const lines = s
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    // Bỏ boilerplate VOA.
    .filter((l) => !/^download\b/i.test(l))
    .filter((l) => !/^_+$/.test(l))
    .filter((l) => !/^(words in this story|quiz|see comments|comments)\b/i.test(l));
  // Cắt phần "Words in This Story" trở đi (glossary, không phải transcript).
  const cut = lines.findIndex((l) => /words in this story/i.test(l));
  const body = cut >= 0 ? lines.slice(0, cut) : lines;
  return body.join(' ');
}

// Tách câu: bỏ nhãn thoại "Anna:" đầu dòng, cắt theo . ! ? … giữ dấu.
function splitSentences(text) {
  const cleaned = text.replace(/\b[A-Z][a-zA-Z]+:\s/g, ' '); // nhãn thoại
  const parts = cleaned.match(/[^.!?…]+[.!?…]+|\S[^.!?…]*$/g) || [];
  return parts
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length >= 2 && /[a-zA-Z]/.test(p));
}

// ---- Azure batch transcription ----
function azBase() {
  return `https://${AZ_REGION}.api.cognitive.microsoft.com/speechtotext/v3.2`;
}
async function azFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Ocp-Apim-Subscription-Key': AZ_KEY,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  return res;
}

async function transcribeWordTimings(mp3Url) {
  // 1. tạo job
  const createRes = await azFetch(`${azBase()}/transcriptions`, {
    method: 'POST',
    body: JSON.stringify({
      contentUrls: [mp3Url],
      locale: 'en-US',
      displayName: `voa-${Date.now()}`,
      properties: {
        wordLevelTimestampsEnabled: true,
        punctuationMode: 'DictatedAndAutomatic',
        profanityFilterMode: 'None',
      },
    }),
  });
  if (!createRes.ok) {
    throw new Error(`Azure create HTTP ${createRes.status}: ${(await createRes.text()).slice(0, 300)}`);
  }
  const created = await createRes.json();
  const self = created.self;

  // 2. poll
  let status = 'NotStarted';
  for (let i = 0; i < 120; i++) {
    await sleep(5000);
    const r = await azFetch(self);
    const j = await r.json();
    status = j.status;
    if (status === 'Succeeded') break;
    if (status === 'Failed') throw new Error(`Azure transcription Failed: ${JSON.stringify(j.properties?.error || j)}`);
    if (i % 4 === 0) log(`   … Azure ${status} (${(i + 1) * 5}s)`);
  }
  if (status !== 'Succeeded') throw new Error('Azure transcription timeout (>10 phút).');

  // 3. lấy file kết quả
  const filesRes = await azFetch(`${self}/files`);
  const files = await filesRes.json();
  const trFile = (files.values || []).find((f) => f.kind === 'Transcription');
  if (!trFile) throw new Error('Không thấy file Transcription.');
  const contentUrl = trFile.links.contentUrl;
  const resultRes = await fetch(contentUrl); // SAS URL — không cần key
  const result = await resultRes.json();

  // 4. flatten words (ticks 100ns → ms)
  const words = [];
  for (const ph of result.recognizedPhrases || []) {
    const best = (ph.nBest || [])[0];
    for (const w of best?.words || []) {
      words.push({
        w: normalize(w.word),
        start_ms: Math.round((w.offsetInTicks ?? 0) / 10000),
        end_ms: Math.round(((w.offsetInTicks ?? 0) + (w.durationInTicks ?? 0)) / 10000),
      });
    }
  }
  // dọn job cho gọn
  azFetch(self, { method: 'DELETE' }).catch(() => {});
  return words;
}

function normalize(w) {
  return String(w).toLowerCase().replace(/[^a-z0-9']/g, '');
}

// ---- gán mốc: câu (official) ↔ từ ASR (greedy + nội suy khoảng trống) ----
function alignSentences(sentences, asrWords) {
  const out = [];
  let ai = 0;
  for (const text of sentences) {
    const toks = text.split(/\s+/).map((t) => ({ raw: t, n: normalize(t) })).filter((t) => t.n);
    const marks = [];
    let sStart = null;
    let sEnd = null;
    for (const tk of toks) {
      // tìm asr khớp trong cửa sổ nhỏ phía trước.
      let hit = -1;
      for (let j = ai; j < Math.min(ai + 8, asrWords.length); j++) {
        if (asrWords[j].w === tk.n) {
          hit = j;
          break;
        }
      }
      if (hit >= 0) {
        const a = asrWords[hit];
        marks.push({ word: tk.raw, start_ms: a.start_ms, end_ms: a.end_ms });
        if (sStart == null) sStart = a.start_ms;
        sEnd = a.end_ms;
        ai = hit + 1;
      } else {
        marks.push({ word: tk.raw, start_ms: null, end_ms: null });
      }
    }
    // nội suy các từ chưa khớp giữa 2 mốc đã biết.
    interpolate(marks);
    out.push({
      text,
      start_ms: sStart,
      end_ms: sEnd,
      words: marks.every((m) => m.start_ms != null) ? marks : marks.filter((m) => m.start_ms != null),
    });
  }
  return out;
}

function interpolate(marks) {
  let i = 0;
  while (i < marks.length) {
    if (marks[i].start_ms != null) {
      i++;
      continue;
    }
    let j = i;
    while (j < marks.length && marks[j].start_ms == null) j++;
    const prev = i > 0 ? marks[i - 1].end_ms : null;
    const next = j < marks.length ? marks[j].start_ms : null;
    if (prev != null && next != null && next >= prev) {
      const gap = (next - prev) / (j - i + 1);
      for (let k = i; k < j; k++) {
        marks[k].start_ms = Math.round(prev + gap * (k - i));
        marks[k].end_ms = Math.round(prev + gap * (k - i + 1));
      }
    }
    i = j;
  }
}

// ---- translate (tuỳ chọn) ----
async function translateVi(sentences) {
  const key = process.env.TRANSLATOR_KEY;
  const region = process.env.TRANSLATOR_REGION || AZ_REGION;
  if (!key) return sentences.map(() => null);
  const res = await fetch(
    'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=vi',
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Ocp-Apim-Subscription-Region': region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sentences.map((t) => ({ Text: t }))),
    }
  );
  if (!res.ok) {
    log('   ⚠️ translate lỗi HTTP', res.status, '→ để trống translation_vi');
    return sentences.map(() => null);
  }
  const j = await res.json();
  return j.map((x) => x.translations?.[0]?.text ?? null);
}

// ---- POST route ----
async function postLesson(payload) {
  const res = await fetch(INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `auth=${AUTH_COOKIE}` },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  return { status: res.status, json };
}

// ---- main ----
async function ingestArticle(articleUrl, program, level) {
  const html = await getText(articleUrl);
  const ld = extractLdJson(html);
  const title = (ld?.headline || ld?.name || 'Untitled').trim();
  const programName = program || ld?.articleSection || null;
  const mp3Url = extractMp3(html);
  if (!mp3Url) {
    log('   ✗ không thấy MP3 — bỏ qua');
    return;
  }
  const transcript = extractTranscript(html);
  const sentences = splitSentences(transcript);
  if (sentences.length === 0) {
    log('   ✗ transcript rỗng — bỏ qua');
    return;
  }
  log(`   ${sentences.length} câu, MP3 ${mp3Url.split('/').pop()}`);

  log('   … Azure lấy mốc từ (batch, có thể vài phút)');
  let asrWords = [];
  try {
    asrWords = await transcribeWordTimings(mp3Url);
  } catch (e) {
    log('   ⚠️ Azure lỗi → nhập không mốc:', String(e).slice(0, 200));
  }
  const aligned = asrWords.length
    ? alignSentences(sentences, asrWords)
    : sentences.map((text) => ({ text, start_ms: null, end_ms: null, words: [] }));

  const vis = await translateVi(sentences);
  const durationMs = asrWords.length ? asrWords[asrWords.length - 1].end_ms : null;

  const payload = {
    source: 'voa',
    source_url: articleUrl,
    mp3_url: mp3Url,
    title,
    program: programName,
    level,
    duration_ms: durationMs,
    sentences: aligned.map((a, i) => ({
      text: a.text,
      translation_vi: vis[i] ?? null,
      start_ms: a.start_ms,
      end_ms: a.end_ms,
      words: a.words,
    })),
  };
  const { status, json } = await postLesson(payload);
  if (status === 200) {
    if (json.skipped) log(`   ↷ đã có (id ${json.id})`);
    else log(`   ✓ nhập id ${json.id} — ${json.sentences} câu, ${json.word_count} từ, wpm ${json.wpm}`);
  } else {
    log(`   ✗ POST HTTP ${status}:`, JSON.stringify(json).slice(0, 200));
  }
}

async function main() {
  // argv: "url:level" hoặc "url" (level mặc định 3). Không có → DEFAULT_PROGRAMS.
  const programs =
    process.argv.length > 2
      ? process.argv.slice(2).map((a) => {
          const m = /^(.*?):(\d)$/.exec(a);
          return m ? { url: m[1], level: Number(m[2]) } : { url: a, level: 3 };
        })
      : DEFAULT_PROGRAMS;

  log(`INGEST_URL: ${INGEST_URL}`);
  log(`LIMIT ${LIMIT} bài/chương trình\n`);

  for (const prog of programs) {
    log(`=== Chương trình: ${prog.url} (bậc ${prog.level}) ===`);
    let links;
    try {
      links = extractArticleLinks(await getText(prog.url)).slice(0, LIMIT);
    } catch (e) {
      log('  ✗ lỗi tải mục lục:', String(e).slice(0, 150));
      continue;
    }
    log(`  ${links.length} bài`);
    for (const url of links) {
      log(` • ${url}`);
      try {
        await ingestArticle(url, null, prog.level);
      } catch (e) {
        log('   ✗ lỗi bài:', String(e).slice(0, 200));
      }
    }
  }
  log('\nXong.');
}

main().catch((e) => fail(String(e)));
