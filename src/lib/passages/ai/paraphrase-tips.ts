import { getAIProvider } from '@/lib/ai';

const MAX_PASSAGE_CHARS = 5000;
const MAX_TIPS = 3;

/**
 * Produce 3 short paraphrase tips (Vietnamese) for an English passage:
 *   1. which key idea to preserve,
 *   2. one lexical upgrade ("X -> Y"),
 *   3. one structural variation suggestion.
 *
 * Returns null on transient AI failure or invalid JSON. Empty array stays
 * possible if the model returned nothing usable — caller treats that the
 * same as a cache-miss-with-no-tips.
 */
export async function getParaphraseTips(originalEnglish: string): Promise<string[] | null> {
  const ai = await getAIProvider();
  if (!ai.available) return null;

  const safe = originalEnglish.slice(0, MAX_PASSAGE_CHARS).replace(/"""/g, '\\"\\"\\"');
  const prompt = `Give 3 short tips (in Vietnamese, one sentence each) for a Vietnamese learner who is about to paraphrase the passage below. Focus on: (1) which key idea to preserve, (2) one lexical upgrade suggestion (swap a common word for a more vivid synonym, give the swap as "X -> Y"), (3) one structural variation suggestion (e.g., combining sentences, starting with a different clause). Speak to the learner as "bạn".

"""
${safe}
"""

Respond with ONLY a JSON array of 3 strings, no preamble, no markdown fences:
["tip 1", "tip 2", "tip 3"]`;

  const raw = await ai.generateText(prompt, {
    json: true,
    temperature: 0.5,
    max_tokens: 600,
  });
  if (!raw) return null;

  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed
      .slice(0, MAX_TIPS)
      .map((t) => String(t ?? '').trim())
      .filter((s) => s.length > 0);
  } catch {
    return null;
  }
}
