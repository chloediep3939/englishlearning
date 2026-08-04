/**
 * Sentence comparison for "Học câu": case- and punctuation-insensitive.
 * Hyphens/apostrophes normalize to spaces on BOTH sides, so
 * "anti-depressant" vs "anti depressant" and "don't" vs "dont" never flip
 * a correct answer to wrong.
 */
export function normalizeSentence(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeSentence(s: string): string[] {
  const n = normalizeSentence(s);
  return n.length === 0 ? [] : n.split(' ');
}

export function sentencesMatch(guess: string, answer: string): boolean {
  return normalizeSentence(guess) === normalizeSentence(answer);
}
