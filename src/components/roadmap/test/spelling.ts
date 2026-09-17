/**
 * So đáp án gõ tay với từ gốc, chấp nhận khác biệt chính tả Anh–Mỹ.
 *
 * Academic Word List dùng chính tả Anh (analyse, maximise), người học quen
 * chính tả Mỹ (analyze, maximize). Cả hai đều ĐÚNG — gõ "analyze" mà bị chấm
 * sai là oan.
 *
 * ⚠️ Cố tình dùng danh sách tường minh, KHÔNG dùng luật đuôi -ise→-ize /
 * -our→-or. Luật đuôi sẽ nhận "yor" là đúng của "your", "hor" của "hour",
 * "rize" của "rise" — phá hỏng đúng bài chính tả. Đã rà cả 3 bộ từ: trong 29
 * từ có đuôi dễ nghi chỉ 6 cặp dưới đây là Anh–Mỹ thật (advise, exercise,
 * promise, surprise… là -ise ở cả hai bên). Thêm bộ từ mới thì rà lại.
 */
const BRITISH_TO_AMERICAN: Record<string, string> = {
  analyse: 'analyze',
  maximise: 'maximize',
  minimise: 'minimize',
  utilise: 'utilize',
  labour: 'labor',
  neighbour: 'neighbor',
};

export function isCorrectSpelling(typed: string, answer: string): boolean {
  const t = normalize(typed);
  const a = normalize(answer);
  if (t.length === 0) return false;
  if (t === a) return true;
  const american = BRITISH_TO_AMERICAN[a];
  return american !== undefined && t === american;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}
