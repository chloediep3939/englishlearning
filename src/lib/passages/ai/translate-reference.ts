import { getAIProvider } from '@/lib/ai';

const MAX_PASSAGE_CHARS = 5000;

/**
 * Produce a polished Vietnamese reference translation for an English passage.
 * Used by the pre-fetch path on Step 3 and by Step 7's feedback view (so the
 * learner can compare their attempt against a model rendering).
 *
 * Returns `null` on transient AI failure; route caller surfaces 502 + retry.
 * Returns `null` when AI is unavailable (no placeholder string — the route's
 * `if (!ref)` branch treats this case the same as "AI temporarily down").
 */
export async function getTranslationReference(originalEnglish: string): Promise<string | null> {
  const ai = await getAIProvider();
  if (!ai.available) return null;

  const safe = originalEnglish.slice(0, MAX_PASSAGE_CHARS).replace(/"""/g, '\\"\\"\\"');
  const prompt = `Translate the following English passage into natural Vietnamese. Keep the tone and register; this is a model reference for a Vietnamese learner.

"""
${safe}
"""

Respond with ONLY the Vietnamese translation, no preamble, no quotes, no markdown.`;

  const raw = await ai.generateText(prompt, {
    temperature: 0.4,
    max_tokens: 1500,
  });
  if (!raw) return null;
  // Strip stray markdown fences just in case the model ignored the instruction.
  return raw.trim().replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim() || null;
}
