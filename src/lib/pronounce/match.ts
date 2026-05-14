/**
 * Normalize a string for comparison: lowercase, trim, strip punctuation,
 * collapse internal whitespace.
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ');
}

/** Standard Levenshtein edit distance. */
export function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m: number[][] = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        m[i][j] = m[i - 1][j - 1];
      } else {
        m[i][j] = Math.min(
          m[i - 1][j - 1] + 1, // substitution
          m[i][j - 1] + 1,     // insertion
          m[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return m[b.length][a.length];
}

/** Per-word fuzzy match. Short words tolerate 1 edit, longer words 2. */
function wordMatches(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const tolerance = b.length <= 5 ? 1 : 2;
  return levenshtein(a, b) <= tolerance;
}

/**
 * Check if any of the ASR alternatives matches the target word/phrase.
 * Multi-word targets: all target words must appear in the alternative
 * (order does NOT need to match, per design decision in m3-spec.md).
 */
export function isMatch(transcripts: string[], target: string): boolean {
  const t = normalize(target);
  if (!t) return false;

  const targetWords = t.split(' ').filter(Boolean);

  return transcripts.some((alt) => {
    const altWords = normalize(alt).split(' ').filter(Boolean);
    if (altWords.length === 0) return false;
    return targetWords.every((tw) => altWords.some((aw) => wordMatches(aw, tw)));
  });
}
