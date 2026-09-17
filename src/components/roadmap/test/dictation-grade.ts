// Chấm bài chép chính tả. File THUẦN — không import gì, để chạy thử thẳng
// bằng Node và dùng được ở cả client lẫn server.
//
// Vì sao phải GIÓNG TỪ chứ không so theo vị trí: người học nghe đúng mà gõ
// "It's important" thay cho "It is important" thì số từ lệch đi một, mọi từ
// phía sau trượt vị trí — so theo số thứ tự sẽ đánh trượt oan cả câu. Hai phiên
// kiểm mù độc lập đều chỉ ra đúng lỗi này.

/** Tách câu gốc đúng luật soạn đề: tách khoảng trắng, bỏ dấu câu đầu/cuối. */
export function tokenizeReference(text: string): string[] {
  return text
    .split(/\s+/)
    .map((t) => t.replace(/^[.,!?;:"]+|[.,!?;:"]+$/g, ''))
    .filter((t) => t.length > 0);
}

// Token đánh dấu cho viết tắt nhập nhằng: 's = is | has, 'd = had | would.
// Có dấu "<" nên không thể trùng một từ người học gõ (bài gõ chỉ giữ a-z 0-9 ').
const AMBIGUOUS_S = '<s>';
const AMBIGUOUS_D = '<d>';

const NEGATIVE_STEMS: Record<string, string[]> = {
  "can't": ['can', 'not'],
  cannot: ['can', 'not'],
  "won't": ['will', 'not'],
  "shan't": ['shall', 'not'],
};

// Nháy cong (bàn phím điện thoại tự đổi ' thành ’).
const CURLY_QUOTES = new RegExp(`[${String.fromCharCode(0x2018)}${String.fromCharCode(0x2019)}]`, 'g');

/** Tách bài gõ của người học, mở rộng dạng viết tắt. */
export function tokenizeTyped(text: string): string[] {
  const out: string[] = [];
  const raw = text
    .toLowerCase()
    .replace(CURLY_QUOTES, "'")
    .split(/\s+/)
    .map((t) => t.replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, ''))
    .filter((t) => t.length > 0);

  for (const t of raw) {
    if (NEGATIVE_STEMS[t]) out.push(...NEGATIVE_STEMS[t]);
    else if (t.endsWith("n't")) out.push(t.slice(0, -3), 'not');
    else if (t.endsWith("'m")) out.push(t.slice(0, -2), 'am');
    else if (t.endsWith("'re")) out.push(t.slice(0, -3), 'are');
    else if (t.endsWith("'ve")) out.push(t.slice(0, -3), 'have');
    else if (t.endsWith("'ll")) out.push(t.slice(0, -3), 'will');
    else if (t.endsWith("'s")) out.push(t.slice(0, -2), AMBIGUOUS_S);
    else if (t.endsWith("'d")) out.push(t.slice(0, -2), AMBIGUOUS_D);
    else out.push(t);
  }
  return out.filter((t) => t.length > 0);
}

function tokenEquals(ref: string, typed: string): boolean {
  const r = ref.toLowerCase();
  if (typed === AMBIGUOUS_S) return r === 'is' || r === 'has';
  if (typed === AMBIGUOUS_D) return r === 'had' || r === 'would';
  return r === typed;
}

/**
 * Gióng bài gõ vào câu gốc bằng LCS (dãy con chung dài nhất). Trả về, cho MỖI
 * từ của câu gốc, người học có gõ đúng từ đó ở đúng thứ tự tương đối hay không.
 * Gõ thừa từ, thiếu từ, hay viết tắt đều không làm lệch các từ còn lại.
 */
export function alignDictation(reference: string, typed: string): boolean[] {
  return alignFull(reference, typed).refMatched;
}

/**
 * Như alignDictation nhưng trả cả hai phía: từ nào của câu gốc được gõ đúng,
 * và từ nào người học gõ ra khớp với câu gốc (từ không khớp = gõ thừa/sai).
 */
export function alignFull(reference: string, typed: string) {
  const ref = tokenizeReference(reference);
  const typ = tokenizeTyped(typed);
  const n = ref.length;
  const m = typ.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = tokenEquals(ref[i], typ[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const refMatched = new Array<boolean>(n).fill(false);
  const typedMatched = new Array<boolean>(m).fill(false);
  // pairs[k] = [i, j]: từ gốc i khớp từ gõ j (theo thứ tự tăng dần)
  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (tokenEquals(ref[i], typ[j]) && dp[i][j] === dp[i + 1][j + 1] + 1) {
      refMatched[i] = true;
      typedMatched[j] = true;
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return { ref, typ, refMatched, typedMatched, pairs };
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[a.length];
}

// Cặp đồng âm hay gặp — khác chữ nhiều nhưng đọc y hệt, luật theo chữ không bắt được.
const HOMOPHONE_GROUPS: string[][] = [
  ['their', 'there', 'theyre'], ['to', 'too', 'two'], ['for', 'four'], ['its', 'it'],
  ['your', 'youre'], ['here', 'hear'], ['whether', 'weather'], ['right', 'write'],
  ['know', 'no'], ['new', 'knew'], ['buy', 'by', 'bye'], ['sea', 'see'], ['week', 'weak'],
  ['wait', 'weight'], ['one', 'won'], ['son', 'sun'], ['hour', 'our'], ['which', 'witch'],
  ['piece', 'peace'], ['whole', 'hole'], ['road', 'rode'], ['made', 'maid'],
  ['plane', 'plain'], ['flour', 'flower'], ['meet', 'meat'], ['would', 'wood'],
  ['pair', 'pear'], ['tail', 'tale'], ['sale', 'sail'], ['steal', 'steel'],
  ['break', 'brake'], ['past', 'passed'], ['allowed', 'aloud'], ['than', 'then'],
  ['accept', 'except'], ['affect', 'effect'], ['quite', 'quiet'],
];
const HOMOPHONE_OF = new Map<string, Set<string>>();
for (const group of HOMOPHONE_GROUPS) {
  for (const w of group) HOMOPHONE_OF.set(w, new Set(group));
}

/**
 * Hai từ có "gần âm" không — phép GẦN ĐÚNG theo chữ, vì máy không nghe được.
 * Gần khi một trong ba:
 *   - là cặp đồng âm trong danh sách (their/there, wait/weight)
 *   - lệch ≤ 1/3 độ dài (prizes/prices, its/it)
 *   - cùng chữ đầu, cùng chữ cuối, dài hơn kém ≤ 2 (profits/prices)
 * Đã thử: luật lỏng hơn ("lệch ≤ nửa độ dài") coi cars ≈ has — sai, nên siết.
 */
export function soundsClose(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x === y) return true;
  if (HOMOPHONE_OF.get(x)?.has(y)) return true;
  const maxLen = Math.max(x.length, y.length);
  if (levenshtein(x, y) <= Math.floor(maxLen / 3)) return true;
  return x.length > 2 && y.length > 2 && x[0] === y[0] && x[x.length - 1] === y[y.length - 1] && Math.abs(x.length - y.length) <= 2;
}

/**
 * nghe-13 "Không bịa khi không nghe ra": đếm từ người học GÕ RA mà không có
 * trong câu gốc và không gần âm với từ gốc nào đang bị thiếu ở ĐÚNG KHOẢNG đó
 * (giữa hai từ khớp liền kề). Để trống chỗ không nghe ra thì không bị tính.
 */
export function gradeFabrication(reference: string, typed: string) {
  const { ref, typ, refMatched, typedMatched, pairs } = alignFull(reference, typed);
  const fabricated: string[] = [];
  // Duyệt từng khoảng giữa hai cặp khớp liên tiếp (thêm biên đầu/cuối).
  const bounds: Array<[number, number]> = [[-1, -1], ...pairs, [ref.length, typ.length]];
  for (let k = 0; k + 1 < bounds.length; k++) {
    const [ri0, tj0] = bounds[k];
    const [ri1, tj1] = bounds[k + 1];
    const missingRef = ref.slice(ri0 + 1, ri1).filter((_, idx) => !refMatched[ri0 + 1 + idx]);
    for (let t = tj0 + 1; t < tj1; t++) {
      if (typedMatched[t]) continue;
      const word = typ[t];
      if (word.startsWith('<')) continue; // token đánh dấu viết tắt
      if (!missingRef.some((r) => soundsClose(r, word))) fabricated.push(word);
    }
  }
  const hits = refMatched.filter(Boolean).length;
  return { refMatched, hits, total: ref.length, fabricated };
}

/** nghe-14/15/16/17: % từ của câu được gõ đúng. */
export function gradeWords(reference: string, typed: string) {
  const refMatched = alignDictation(reference, typed);
  const hits = refMatched.filter(Boolean).length;
  return { refMatched, hits, total: refMatched.length };
}

/** nghe-06: bao nhiêu từ chức năng mục tiêu được gõ đúng. */
export function gradeTargets(reference: string, typed: string, targets: number[]) {
  const matched = alignDictation(reference, typed);
  const hits = targets.filter((t) => matched[t]).length;
  return { matched, hits, total: targets.length };
}

/** nghe-07: câu đúng khi MỌI chỗ nối đều có cả hai từ được gõ đúng. */
export function gradeLinks(reference: string, typed: string, links: [number, number][]) {
  const matched = alignDictation(reference, typed);
  const okLinks = links.map(([a, b]) => matched[a] && matched[b]);
  return { matched, okLinks, correct: okLinks.every(Boolean) };
}
