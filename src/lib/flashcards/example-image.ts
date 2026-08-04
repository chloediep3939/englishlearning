// Per-example Pexels illustration for "Học câu". Server-only (touches DB).
// Shared by the sentence-drill session route (lazy backfill) and the
// per-card example-images endpoint (the deck-detail "Sửa từ thiếu info"
// sweep).
import { flashcardsDb } from '@/lib/db';
import { getPexelsImage } from './pexels';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for',
  'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'that', 'this', 'these', 'those', 'it', 'its', 'their', 'his', 'her', 'our',
  'your', 'they', 'he', 'she', 'we', 'you', 'have', 'has', 'had', 'will',
  'would', 'can', 'could', 'should', 'not', 'more', 'most', 'some', 'any',
  'there', 'which', 'who', 'when', 'where', 'than', 'into', 'about', 'also',
]);

/**
 * Pexels search term for a sentence: the card's headword + the sentence's
 * 2 longest content words. Full sentences make terrible search queries;
 * a few salient nouns/verbs land far closer.
 */
export function sentenceImageQuery(english: string, sentence: string): string {
  const content = sentence
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w) && !english.toLowerCase().includes(w))
    .sort((a, b) => b.length - a.length)
    .slice(0, 2);
  return [english, ...content].join(' ').trim();
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
  const pexels = await getPexelsImage(sentenceImageQuery(card.english, ex.en));
  if (!pexels) return false;
  const examples = card.examples.map((e, i) =>
    i === exampleIndex ? { ...e, image_url: pexels.image_url } : e,
  );
  await flashcardsDb.update(userId, cardId, { examples });
  return true;
}
