/**
 * AI-generated example sentences. Used as a fallback when dictionaryapi.dev
 * returns few or no examples (the dictionaryapi has empty `example` for many
 * common words). Returns up to `count` natural English sentences with the
 * target word, plus a single Vietnamese translation for the first.
 */

import { getAIProvider } from '@/lib/ai';
import { translateEnToVi } from './translate';
import type { FlashcardExample } from '@/lib/types';

export async function generateExamples(word: string, count: number = 3): Promise<FlashcardExample[]> {
  const w = word.trim();
  if (!w) return [];

  const ai = await getAIProvider();
  if (!ai.available) return [];

  const prompt = `Give me ${count} natural English example sentences that use the word "${w}". Different contexts each. Plain JSON array of strings only, no commentary, no markdown fence. Example: ["First sentence.", "Second sentence.", "Third sentence."]`;

  const raw = await ai.generateText(prompt, { json: true, temperature: 0.6, max_tokens: 400 });
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const sentences = parsed
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .slice(0, count);
  if (sentences.length === 0) return [];

  // Translate only the first to keep latency low; matching the existing
  // dictionary-examples pattern in /api/cards/generate.
  const firstVi = await translateEnToVi(sentences[0]);
  return sentences.map((en, i) => ({
    en,
    vi: i === 0 && firstVi ? firstVi : undefined,
  }));
}
