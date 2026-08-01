/**
 * Deck progress percentages, shared by the /decks cards and the dashboard
 * "Bộ từ" widget. The bar renders two layers:
 *   - green (`learnedPct`): cards the user has started studying (non-new)
 *   - yellow overlay (`masteredPct`): cards fully mastered ("thuộc kĩ")
 * Yellow is always ≤ green, so the overlay never overshoots the green fill.
 * (Yellow here is a user-requested exception to the speed-quiz-only yellow
 * convention.)
 *
 * Pure and client-safe (no server-only imports).
 */

interface DeckCounts {
  total: number;
  new_count: number;
  mastered_count: number;
}

/** % of cards the user has started studying (no longer `new`). */
export function learnedPct(deck: DeckCounts): number {
  if (deck.total <= 0) return 0;
  return Math.round(((deck.total - deck.new_count) / deck.total) * 100);
}

/** % of cards fully mastered ("thuộc kĩ"). */
export function masteredPct(deck: DeckCounts): number {
  if (deck.total <= 0) return 0;
  return Math.round((deck.mastered_count / deck.total) * 100);
}
