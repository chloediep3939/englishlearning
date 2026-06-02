// Base-form candidates via wink-lemmatizer (rule + dictionary based, no AI).
// Replaces the old regex deinflector — wink also handles irregulars
// (ran→run, went→go, better→good, mice→mouse), not just regular +s/+ed/+ies.
// Used by /api/words/lookup to retry Oxford / MS Dictionary when the inflected
// form isn't found.
import * as lemmatize from 'wink-lemmatizer';

/**
 * Distinct base-form candidates for a cleaned word (lowercase, a–z + apostrophe),
 * trying verb → noun → adjective. Excludes the input itself and anything
 * shorter than 2 chars. Capped to the first 3 to bound Oxford retries.
 */
export function lemmaCandidates(word: string): string[] {
  const w = word;
  if (w.length < 3) return [];
  const raw = [lemmatize.verb(w), lemmatize.noun(w), lemmatize.adjective(w)];
  return [...new Set(raw)].filter((x) => x.length >= 2 && x !== w).slice(0, 3);
}
