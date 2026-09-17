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

/**
 * Normalized similarity in [0, 1] between two strings (1 = identical after
 * `normalize`). Built on the same Levenshtein distance used for matching, so
 * the read-aloud score stays consistent with `isMatch`.
 */
export function similarity(a: string, b: string): number {
  const x = normalize(a);
  const y = normalize(b);
  if (!x && !y) return 1;
  const maxLen = Math.max(x.length, y.length);
  if (maxLen === 0) return 0;
  return 1 - levenshtein(x, y) / maxLen;
}

/**
 * Honest 0..100 "match score" for a read-aloud attempt.
 *
 * IMPORTANT: this is NOT a phoneme / native-accent accuracy score. The Web
 * Speech API only returns a transcript plus a coarse confidence, so we score
 * how closely what the recognizer HEARD matches the target word, blended with
 * the recognizer's own confidence. The UI must label it as a recognition/match
 * score, never as "chuẩn giọng bản xứ".
 *
 *   score = round( 100 * (0.7 * bestSim + 0.3 * conf) )
 *     bestSim = max similarity(target, alt) across the (up to 3) alternatives
 *     conf    = confidence when it's a usable (> 0) number, else bestSim —
 *               many browsers report confidence as 0, so we fall back there.
 */
export function scoreReading(
  transcripts: string[],
  confidence: number | undefined,
  target: string,
): number {
  const sims = transcripts.map((t) => similarity(t, target));
  const bestSim = sims.length > 0 ? Math.max(0, ...sims) : 0;
  const conf = typeof confidence === 'number' && confidence > 0 ? confidence : bestSim;
  return Math.round(100 * (0.7 * bestSim + 0.3 * conf));
}
