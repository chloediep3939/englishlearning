/**
 * Weighted deck progress percent, shared by the /decks cards and the
 * dashboard "Bộ từ" widget (extracted because the old mastered-only formula
 * was duplicated in both and drifted).
 *
 * Each card contributes by SRS stage: new = 0, learning = 1/3,
 * review = 2/3, mastered = 1 — so the bar moves from the very first study
 * session instead of staying at 0% until cards mature.
 *
 * Pure and client-safe (no server-only imports).
 */
export function deckProgressPct(deck: {
  total: number;
  learning_count: number;
  review_count: number;
  mastered_count: number;
}): number {
  if (deck.total <= 0) return 0;
  const score = deck.learning_count + 2 * deck.review_count + 3 * deck.mastered_count;
  return Math.round((score / (3 * deck.total)) * 100);
}
