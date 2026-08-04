// Per-example Pexels illustration for "Học câu". Server-only (touches DB).
// Shared by the sentence-drill session route (lazy backfill) and the
// per-card example-images endpoint (the deck-detail "Sửa từ thiếu info"
// sweep).
import { flashcardsDb } from '@/lib/db';
import { getPexelsImage } from './pexels';

/**
 * Pexels search term for a sentence: the WHOLE sentence, cleaned of
 * punctuation and capped. Pexels ranks concrete nouns in the query highest,
 * so "I've been going to the gym less frequently this month" lands on gym
 * photos — far better than the old longest-words heuristic, which dropped
 * short concrete words ("gym" < 4 chars) and queried on filler like
 * "frequently month". Callers fall back to the headword on a miss.
 */
export function sentenceImageQuery(sentence: string): string {
  return sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

/**
 * Fetch a Pexels image for one example of a card and persist it into
 * `examples[index].image_url`. Best-effort: returns true only when a new
 * image was written. Re-reads the card before writing so concurrent
 * example edits are never clobbered with a stale copy.
 */
export async function fillExampleImage(
  userId: number,
  cardId: number,
  exampleIndex: number,
): Promise<boolean> {
  const card = await flashcardsDb.getById(userId, cardId);
  const ex = card?.examples?.[exampleIndex];
  if (!card || !ex || !ex.en.trim() || ex.image_url) return false;
  // Whole sentence first; headword as the fallback when Pexels has no hit.
  const pexels =
    (await getPexelsImage(sentenceImageQuery(ex.en))) ??
    (await getPexelsImage(card.english));
  if (!pexels) return false;
  const examples = card.examples.map((e, i) =>
    i === exampleIndex ? { ...e, image_url: pexels.image_url } : e,
  );
  await flashcardsDb.update(userId, cardId, { examples });
  return true;
}
