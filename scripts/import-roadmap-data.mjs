// Nạp dữ liệu bài nghe/đọc của lộ trình từ file JSON vào DB (qua migration).
//
//   node scripts/import-roadmap-data.mjs <file.json> [...more] --out migrations/00NN_ten.sql
//   node scripts/import-roadmap-data.mjs <file.json> --dry-run        # chỉ kiểm tra
//
// Mỗi file có trường "kind":
//   "sentences" → bảng dictation_sentences (bài nghe chép theo câu)
//   "passages"  → bảng listening_passages  (bài dựa trên đoạn văn)
// Định dạng + prompt soạn: src/doc/roadmap-data-format.md
//
// Kiểm tra CHẶT rồi mới sinh SQL: dữ liệu từ ngoài vào, sai một chỉ số từ là
// người học bị chấm trượt oan. Có lỗi thì không ghi file nào.
//
// Luật nhận đề (roadmap-question-authoring.md): file phải có ≥ 2 phiên kiểm mù
// trong verified_by. Bỏ qua bằng --allow-unverified (sẽ in cảnh báo).
//
// SQL sinh ra là UPSERT theo id — nạp lại cùng file là cập nhật, không nhân đôi.
// Câu/đoạn có "dropped": true sẽ bị XOÁ khỏi DB nếu trước đó đã nạp.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';

// ---------------------------------------------------------------------------
// Cấu hình mục lộ trình nhận bộ câu. Thêm mục mới: thêm một dòng ở đây.
// words = [min, max] số từ mỗi câu. keyField = trường đáp án (null = không cần).
// ---------------------------------------------------------------------------
const SENTENCE_ITEMS = {
  'nghe-06': { tool: 'T3', mode: 'targets', sample: 10, keyField: 'targets', words: [8, 12] },
  'nghe-07': { tool: 'T3', mode: 'links', sample: 10, keyField: 'links', words: [6, 10] },
  'nghe-08': { tool: 'T3S', mode: 'stress', sample: 10, keyField: 'stressed', words: [6, 10] },
  'nghe-15': { tool: 'T3', mode: 'words', sample: 10, keyField: null, words: [6, 8] },
  'nghe-16': { tool: 'T3', mode: 'words', sample: 10, keyField: null, words: [10, 13] },
};

const PASSAGE_TOPICS = [
  'science', 'economics', 'business', 'technology', 'health', 'environment',
  'education', 'society', 'history', 'culture', 'psychology',
];
const PASSAGE_WORDS = [120, 260];

// Chỉ cho phép dấu câu mà luật tách từ xử lý được — thêm ( ) – ... là lệch chỉ số.
const TEXT_CHARSET = /^[A-Za-z0-9 .,!?;:"']+$/;

// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const allowUnverified = args.includes('--allow-unverified');
const outIdx = args.indexOf('--out');
const outPath = outIdx >= 0 ? args[outIdx + 1] : null;
const files = args.filter((a, i) => !a.startsWith('--') && (outIdx < 0 || i !== outIdx + 1));

if (files.length === 0 || (!dryRun && !outPath)) {
  console.error('Dùng: node scripts/import-roadmap-data.mjs <file.json ...> --out migrations/00NN_ten.sql  (hoặc --dry-run)');
  process.exit(2);
}
if (outPath && existsSync(outPath)) {
  console.error(`${outPath} đã tồn tại — không ghi đè migration (CLAUDE.md §4.5). Chọn số mới.`);
  process.exit(2);
}

/** Đúng luật tách từ của app (dictation-grade.ts tokenizeReference). */
const tokenize = (text) =>
  text.split(/\s+/).map((t) => t.replace(/^[.,!?;:"]+|[.,!?;:"]+$/g, '')).filter((t) => t.length > 0);
const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const isInt = (n) => Number.isInteger(n);

const errors = [];
const warnings = [];
const sql = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

function checkMcq(where, block, nOptions) {
  if (!block || typeof block !== 'object') return err(where, 'phải là object');
  if (typeof block.question !== 'string' || !block.question.trim()) err(where, 'thiếu question');
  if (!Array.isArray(block.options) || block.options.length !== nOptions || block.options.some((o) => typeof o !== 'string' || !o.trim())) {
    err(where, `options phải là ${nOptions} chuỗi khác rỗng`);
  } else if (new Set(block.options.map((o) => o.trim().toLowerCase())).size !== nOptions) {
    err(where, 'options bị trùng nhau');
  }
  if (!isInt(block.answer) || block.answer < 0 || block.answer >= nOptions) err(where, `answer phải là số 0..${nOptions - 1}`);
}

// ---------------------------------------------------------------------------
function importSentences(file, data) {
  const cfg = SENTENCE_ITEMS[data.item_key];
  if (!cfg) return err(file, `item_key "${data.item_key}" không có trong SENTENCE_ITEMS`);
  if (!Array.isArray(data.sentences) || data.sentences.length === 0) return err(file, 'sentences rỗng');

  const ids = new Set();
  const keep = [];
  const drop = [];
  for (const [n, s] of data.sentences.entries()) {
    const where = `${file} câu #${n + 1}${s?.id ? ` (${s.id})` : ''}`;
    if (typeof s.id !== 'string' || !s.id.startsWith(`${data.item_key}-`)) { err(where, `id phải bắt đầu bằng "${data.item_key}-"`); continue; }
    if (ids.has(s.id)) { err(where, 'id bị trùng'); continue; }
    ids.add(s.id);
    if (s.dropped === true) { drop.push(s.id); continue; }
    if (typeof s.text !== 'string' || !TEXT_CHARSET.test(s.text)) { err(where, 'text có ký tự không cho phép (chỉ chữ, số, khoảng trắng, . , ! ? ; : " \')'); continue; }
    const tokens = tokenize(s.text);
    if (tokens.length < cfg.words[0] || tokens.length > cfg.words[1]) err(where, `${tokens.length} từ, cần ${cfg.words[0]}–${cfg.words[1]}`);

    let key = [];
    if (cfg.keyField) {
      key = s[cfg.keyField];
      if (!Array.isArray(key) || key.length === 0) { err(where, `thiếu ${cfg.keyField}`); continue; }
      if (cfg.mode === 'links') {
        for (const pair of key) {
          if (!Array.isArray(pair) || pair.length !== 2 || !isInt(pair[0]) || pair[1] !== pair[0] + 1 || pair[0] < 0 || pair[1] >= tokens.length) {
            err(where, `link ${JSON.stringify(pair)} phải là [i, i+1] trong phạm vi 0..${tokens.length - 1}`);
          }
        }
      } else {
        if (key.some((i) => !isInt(i) || i < 0 || i >= tokens.length)) err(where, `${cfg.keyField} có chỉ số ngoài 0..${tokens.length - 1}`);
        if (new Set(key).size !== key.length) err(where, `${cfg.keyField} bị trùng chỉ số`);
      }
    }
    keep.push({ id: s.id, text: s.text, key, note_vi: typeof s.note_vi === 'string' ? s.note_vi : null });
  }
  if (keep.length < cfg.sample) err(file, `chỉ còn ${keep.length} câu dùng được, mỗi lượt cần ${cfg.sample}`);

  sql.push(`-- ${basename(file)}: ${data.item_key} — nạp ${keep.length} câu, gỡ ${drop.length} câu`);
  if (keep.length > 0) {
    sql.push(
      `INSERT INTO dictation_sentences (id, item_key, batch, text, key_json, note_vi) VALUES\n` +
        keep.map((s) => `  (${q(s.id)}, ${q(data.item_key)}, ${isInt(data.batch) ? data.batch : 1}, ${q(s.text)}, ${q(JSON.stringify(s.key))}, ${q(s.note_vi)})`).join(',\n') +
        `\nON CONFLICT(id) DO UPDATE SET item_key = excluded.item_key, batch = excluded.batch, text = excluded.text, key_json = excluded.key_json, note_vi = excluded.note_vi;`,
    );
  }
  for (const id of drop) sql.push(`DELETE FROM dictation_sentences WHERE id = ${q(id)};`);
  sql.push(
    `INSERT INTO roadmap_item_tests (item_key, tool, list_code, config_json) VALUES (${q(data.item_key)}, ${q(cfg.tool)}, NULL, ${q(JSON.stringify({ mode: cfg.mode, sample: cfg.sample }))})\nON CONFLICT(item_key) DO NOTHING;`,
  );
}

// ---------------------------------------------------------------------------
function importPassages(file, data) {
  if (!Array.isArray(data.passages) || data.passages.length === 0) return err(file, 'passages rỗng');
  const ids = new Set();
  const rows = [];
  const drop = [];

  for (const [n, p] of data.passages.entries()) {
    const where = `${file} đoạn #${n + 1}${p?.id ? ` (${p.id})` : ''}`;
    if (typeof p.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(p.id)) { err(where, 'id chỉ gồm a-z 0-9 -'); continue; }
    if (ids.has(p.id)) { err(where, 'id bị trùng'); continue; }
    ids.add(p.id);
    if (p.dropped === true) { drop.push(p.id); continue; }
    if (typeof p.title !== 'string' || !p.title.trim()) err(where, 'thiếu title');
    if (!PASSAGE_TOPICS.includes(p.topic)) err(where, `topic phải là một trong: ${PASSAGE_TOPICS.join(', ')}`);
    if (p.level !== undefined && !['A2', 'B1', 'B2', 'C1'].includes(p.level)) err(where, 'level phải là A2/B1/B2/C1');
    if (typeof p.text !== 'string' || !TEXT_CHARSET.test(p.text)) { err(where, 'text có ký tự không cho phép (không ngoặc, không gạch ngang, không xuống dòng)'); continue; }

    const tokens = tokenize(p.text);
    const lower = tokens.map((t) => t.toLowerCase());
    if (tokens.length < PASSAGE_WORDS[0] || tokens.length > PASSAGE_WORDS[1]) err(where, `${tokens.length} từ, cần ${PASSAGE_WORDS[0]}–${PASSAGE_WORDS[1]}`);
    const sentences = p.text.split(/(?<=[.!?])\s+/).filter(Boolean);

    const a = p.annotations ?? {};
    if (typeof a !== 'object' || Array.isArray(a)) { err(where, 'annotations phải là object'); continue; }
    const known = ['main_ideas', 'keywords', 'hiw', 'smw', 'hcs', 'skim', 'scan', 'context_words', 'mc_single', 'mc_multiple', 'topic_sentence_index'];
    for (const k of Object.keys(a)) if (!known.includes(k)) err(where, `annotations.${k} không có trong đặc tả`);

    if (a.main_ideas !== undefined) {
      if (!Array.isArray(a.main_ideas) || a.main_ideas.length < 3 || a.main_ideas.length > 4 || a.main_ideas.some((x) => typeof x !== 'string' || !x.trim())) {
        err(where, 'main_ideas phải là 3–4 chuỗi');
      }
    }
    if (a.keywords !== undefined) {
      if (!Array.isArray(a.keywords) || a.keywords.length < 8 || a.keywords.length > 10) err(where, 'keywords phải có 8–10 mục');
      else for (const kw of a.keywords) {
        const parts = String(kw).toLowerCase().split(/\s+/);
        const found = lower.some((_, i) => parts.every((w, k) => lower[i + k] === w));
        if (!found) err(where, `keyword "${kw}" không xuất hiện nguyên văn trong text`);
      }
    }
    if (a.hiw !== undefined) {
      const reps = a.hiw?.replacements;
      if (!Array.isArray(reps) || reps.length < 5 || reps.length > 7) err(where, 'hiw.replacements phải có 5–7 mục');
      else {
        const seen = new Set();
        for (const r of reps) {
          if (!isInt(r.index) || r.index < 0 || r.index >= tokens.length) { err(where, `hiw index ${r.index} ngoài phạm vi`); continue; }
          if (seen.has(r.index)) err(where, `hiw index ${r.index} bị trùng`);
          seen.add(r.index);
          if (String(r.original).toLowerCase() !== lower[r.index]) err(where, `hiw index ${r.index}: original "${r.original}" nhưng từ tại đó là "${tokens[r.index]}"`);
          if (typeof r.replacement !== 'string' || !/^[A-Za-z]+$/.test(r.replacement) || r.replacement.toLowerCase() === lower[r.index]) {
            err(where, `hiw index ${r.index}: replacement phải là một từ chữ cái, khác từ gốc`);
          }
        }
      }
    }
    if (a.smw !== undefined) {
      const s = a.smw;
      if (!isInt(s?.cut_index) || s.cut_index <= 0 || s.cut_index >= tokens.length) err(where, 'smw.cut_index phải nằm trong đoạn');
      checkMcq(`${where} smw`, { question: 'smw', ...s }, 4);
      if (isInt(s?.cut_index) && Array.isArray(s?.options) && isInt(s?.answer)) {
        const tail = lower.slice(s.cut_index).join(' ');
        if (String(s.options[s.answer] ?? '').toLowerCase().replace(/[.,!?;:"]/g, '').trim() !== tail) {
          err(where, `smw: đáp án phải đúng bằng phần cuối từ cut_index: "${tail}"`);
        }
      }
    }
    if (a.hcs !== undefined) {
      const h = a.hcs;
      const n = Array.isArray(h?.options) ? h.options.length : 0;
      if (n < 3 || n > 4) err(where, 'hcs.options phải có 3–4 bản tóm tắt');
      else checkMcq(`${where} hcs`, { question: 'hcs', ...h }, n);
      if (typeof h?.explain_vi !== 'string' || !h.explain_vi.trim()) err(where, 'hcs.explain_vi bắt buộc — giải thích vì sao các bản kia sai');
    }
    if (a.skim !== undefined) checkMcq(`${where} skim`, a.skim, 4);
    if (a.scan !== undefined) {
      if (!Array.isArray(a.scan) || a.scan.length < 5) err(where, 'scan phải có ≥ 5 câu hỏi');
      else a.scan.forEach((x, i) => checkMcq(`${where} scan[${i}]`, x, 4));
    }
    if (a.context_words !== undefined) {
      if (!Array.isArray(a.context_words) || a.context_words.length === 0) err(where, 'context_words rỗng');
      else a.context_words.forEach((c, i) => {
        if (!isInt(c.index) || c.index < 0 || c.index >= tokens.length) err(where, `context_words[${i}].index ngoài phạm vi`);
        if (typeof c.word === 'string' && isInt(c.index) && c.word.toLowerCase() !== lower[c.index]) err(where, `context_words[${i}]: word "${c.word}" nhưng từ tại đó là "${tokens[c.index]}"`);
        checkMcq(`${where} context_words[${i}]`, { question: 'ctx', ...c }, 4);
      });
    }
    if (a.mc_single !== undefined) checkMcq(`${where} mc_single`, a.mc_single, 4);
    if (a.mc_multiple !== undefined) {
      const m = a.mc_multiple;
      const n = Array.isArray(m?.options) ? m.options.length : 0;
      if (n !== 5) err(where, 'mc_multiple.options phải có 5 lựa chọn');
      if (!Array.isArray(m?.answers) || m.answers.length < 2 || m.answers.length > 3 || m.answers.some((i) => !isInt(i) || i < 0 || i >= 5) || new Set(m.answers).size !== m.answers.length) {
        err(where, 'mc_multiple.answers phải là 2–3 chỉ số khác nhau trong 0..4');
      }
    }
    if (a.topic_sentence_index !== undefined && (!isInt(a.topic_sentence_index) || a.topic_sentence_index < 0 || a.topic_sentence_index >= sentences.length)) {
      err(where, `topic_sentence_index phải trong 0..${sentences.length - 1} (đoạn có ${sentences.length} câu)`);
    }

    rows.push({ ...p, word_count: tokens.length, annotations: a });
  }

  sql.push(`-- ${basename(file)}: nạp ${rows.length} đoạn, gỡ ${drop.length} đoạn`);
  if (rows.length > 0) {
    const verified = JSON.stringify(Array.isArray(data.verified_by) ? data.verified_by : []);
    // 1 đoạn/câu lệnh: đoạn văn + chú thích có thể dài, gộp nhiều đoạn dễ vượt giới hạn 100 KB/câu của D1.
    for (const r of rows) {
      sql.push(
        `INSERT INTO listening_passages (id, batch, title, topic, level, text, word_count, annotations_json, authored_by, verified_by_json) VALUES\n` +
          `  (${q(r.id)}, ${isInt(data.batch) ? data.batch : 1}, ${q(r.title)}, ${q(r.topic)}, ${q(r.level ?? null)}, ${q(r.text)}, ${r.word_count}, ${q(JSON.stringify(r.annotations))}, ${q(data.authored_by ?? null)}, ${q(verified)})\n` +
          `ON CONFLICT(id) DO UPDATE SET batch = excluded.batch, title = excluded.title, topic = excluded.topic, level = excluded.level, text = excluded.text, word_count = excluded.word_count, annotations_json = excluded.annotations_json, authored_by = excluded.authored_by, verified_by_json = excluded.verified_by_json;`,
      );
    }
  }
  for (const id of drop) sql.push(`DELETE FROM listening_passages WHERE id = ${q(id)};`);
}

// ---------------------------------------------------------------------------
for (const file of files) {
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    err(file, `không đọc được JSON: ${e.message}`);
    continue;
  }
  // Chuỗi còn dạng "<...>" là chỗ trống của file mẫu, chưa phải phiên kiểm thật.
  const verified = Array.isArray(data.verified_by)
    ? data.verified_by.filter((v) => typeof v === 'string' && v.trim() && !/^<.*>$/.test(v.trim())).length
    : 0;
  if (!allowUnverified && JSON.stringify(data).includes('<1 câu tiếng Việt')) err(file, 'còn chỗ trống "<...>" của file mẫu — điền nội dung thật');
  if (verified < 2) {
    if (allowUnverified) warnings.push(`${file}: chỉ có ${verified} phiên kiểm mù (cần 2) — nạp vì có --allow-unverified`);
    else err(file, `chỉ có ${verified} phiên kiểm mù trong verified_by, cần ≥ 2 (hoặc chạy với --allow-unverified)`);
  }
  if (data.kind === 'sentences') importSentences(file, data);
  else if (data.kind === 'passages') importPassages(file, data);
  else err(file, 'kind phải là "sentences" hoặc "passages"');
}

for (const w of warnings) console.warn('⚠️ ', w);
if (errors.length > 0) {
  console.error(`\n❌ ${errors.length} lỗi — không ghi file:`);
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}

// Ước kích thước từng câu lệnh — D1 giới hạn 100 KB/câu.
const statements = sql.filter((s) => !s.trimStart().startsWith('--'));
const biggest = Math.max(...statements.map((s) => Buffer.byteLength(s)));
if (biggest > 90_000) {
  console.error(`❌ Có câu lệnh ${biggest} bytes, sát/vượt giới hạn 100 KB của D1 — chia file nhỏ hơn.`);
  process.exit(1);
}

const header = `-- Nạp dữ liệu lộ trình. Sinh bởi scripts/import-roadmap-data.mjs từ:\n${files.map((f) => `--   ${f}`).join('\n')}\n-- Không sửa tay; muốn đổi thì sửa JSON rồi sinh migration MỚI.\n\n`;
const out = header + sql.join('\n\n') + '\n';

if (dryRun) {
  console.log(`✅ Hợp lệ. ${statements.length} câu lệnh, lớn nhất ${biggest} bytes. (--dry-run: không ghi file)`);
} else {
  writeFileSync(outPath, out, 'utf8');
  console.log(`✅ Đã ghi ${outPath}: ${statements.length} câu lệnh, lớn nhất ${biggest} bytes.`);
  console.log('   Tiếp theo: node scripts/check-d1-split.mjs ' + outPath + '  rồi apply --local, kiểm, rồi --remote.');
}
