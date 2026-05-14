import { getAIProvider } from '@/lib/ai';

export async function generateDistractorPool(count: number = 40): Promise<string[]> {
  const ai = await getAIProvider();
  if (!ai.available) return [];

  const prompt = `Generate exactly ${count} common Vietnamese vocabulary phrases for an English-learning context.

Requirements:
- Each phrase 1-4 words in Vietnamese
- Mix of nouns, verbs, adjectives, and short noun phrases
- Common everyday vocabulary (B1-B2 equivalent)
- Diverse domains: work, family, food, travel, technology, emotions, actions, objects, abstract concepts
- No duplicates
- No English mixed in

Return ONLY a JSON object (no markdown, no prose):
{"words": ["...", "...", ...]}

The "words" array must contain exactly ${count} unique Vietnamese phrases.`;

  const response = await ai.generateText(prompt, {
    json: true,
    temperature: 0.95,
    max_tokens: 2000,
  });
  if (!response) return [];

  try {
    const cleaned = response
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned) as { words?: unknown };
    if (!Array.isArray(parsed.words)) return [];

    const seen = new Set<string>();
    const result: string[] = [];
    for (const w of parsed.words) {
      if (typeof w !== 'string') continue;
      const trimmed = w.trim();
      if (trimmed.length === 0) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(trimmed);
      if (result.length >= count) break;
    }
    return result;
  } catch (err) {
    console.error('[distractors] JSON parse failed:', err);
    return [];
  }
}
