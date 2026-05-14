import { getAIProvider } from '@/lib/ai';
import { flashcardClozePoolDb } from '@/lib/db';
import type { ClozeSentence } from '@/lib/types';

const POOL_SIZE = 10;

function generatePrompt(word: string): string {
  return `Generate exactly ${POOL_SIZE} fill-in-blank sentences using the English word "${word}".
Each sentence must contain "${word}" (or an inflected form of it) replaced by __ (two underscores).
Vary contexts (work, school, daily life, news, casual) and CEFR levels (mix B1, B2, C1).
Return ONLY a JSON array — no markdown fences, no prose:
[{"sentence": "She received __ treatment from the staff.", "blank_word": "preferential", "pos": "adj", "difficulty": "B2"}, ...]`;
}

export async function generateClozeSentences(word: string): Promise<ClozeSentence[]> {
  const ai = await getAIProvider();
  if (!ai.available) return [];

  const response = await ai.generateText(generatePrompt(word), {
    json: true,
    temperature: 0.85,
    max_tokens: 3000,
  });
  if (!response) return [];

  try {
    const cleaned = response
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned) as unknown;
    if (!Array.isArray(parsed)) return [];

    const lower = word.toLowerCase();
    return parsed
      .filter(
        (s): s is { sentence: string; blank_word: string; pos?: unknown; difficulty?: unknown } =>
          typeof s === 'object' &&
          s !== null &&
          typeof (s as { sentence?: unknown }).sentence === 'string' &&
          (s as { sentence: string }).sentence.length > 0 &&
          typeof (s as { blank_word?: unknown }).blank_word === 'string' &&
          (s as { blank_word: string }).blank_word.length > 0 &&
          // Cheap sanity check: sentence must actually contain the blank marker.
          (s as { sentence: string }).sentence.includes('__')
      )
      .slice(0, POOL_SIZE)
      .map((s) => ({
        word: lower,
        sentence: s.sentence,
        blank_word: s.blank_word,
        pos: typeof s.pos === 'string' && s.pos.length > 0 ? s.pos : null,
        difficulty:
          typeof s.difficulty === 'string' && s.difficulty.length > 0 ? s.difficulty : null,
      }));
  } catch (err) {
    console.error('[cloze] JSON parse failed:', err);
    return [];
  }
}

/**
 * Cache-then-generate for the shared cloze pool. Safe to call repeatedly —
 * the `hasMinimum` check guarantees we only hit the AI when the pool is thin.
 * Designed for background invocation via `ctx.waitUntil`; errors are swallowed
 * so they don't crash the calling request.
 *
 * This is the ONLY function callers should use going forward.
 */
export async function ensureClozePool(
  word: string,
  options: { minimum?: number } = {}
): Promise<void> {
  const min = options.minimum ?? 5;
  const lower = word.toLowerCase();

  try {
    if (await flashcardClozePoolDb.hasMinimum(lower, min)) {
      return; // cache hit, skip AI
    }
    const sentences = await generateClozeSentences(lower);
    if (sentences.length === 0) {
      console.warn(`[cloze-pool] AI returned 0 sentences for "${lower}"`);
      return;
    }
    await flashcardClozePoolDb.bulkInsert(lower, sentences);
    console.log(`[cloze-pool] saved ${sentences.length} sentences for "${lower}"`);
  } catch (err) {
    // Swallow — this is background work. Log and move on.
    console.error(`[cloze-pool] failed for "${lower}":`, err);
  }
}

export function blankOutWord(sentence: string, word: string): string {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  return sentence.replace(regex, '_____');
}
