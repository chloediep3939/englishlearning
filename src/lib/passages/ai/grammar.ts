import { getAIProvider } from '@/lib/ai';
import type { GrammarAnalysis, GrammarPattern } from '@/lib/types';

function buildGrammarPrompt(content: string): string {
  const safe = content.replace(/"""/g, '\\"\\"\\"');
  return `You are an English teacher analyzing grammar patterns for a Vietnamese learner.

Analyze the grammar patterns in this English text. List 3-6 patterns present in the text. For each, give a Vietnamese explanation (2-3 sentences, speak to the learner as "bạn") and 1-2 example sentences extracted directly from the text (verbatim — do not paraphrase).

Text:
"""
${safe}
"""

Respond ONLY with a JSON object, no preamble, no markdown fences:

{
  "patterns": [
    {
      "name": "Present perfect tense",
      "explanation_vi": "Diễn tả hành động bắt đầu trong quá khứ và còn liên quan đến hiện tại. Bạn dùng cấu trúc have/has + V3.",
      "examples": ["I have lived here for 5 years."]
    }
  ]
}`;
}

function parseGrammar(raw: string): GrammarAnalysis | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    if (!Array.isArray(parsed.patterns)) return null;
    const patterns: GrammarPattern[] = [];
    for (const item of parsed.patterns) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const name = typeof obj.name === 'string' ? obj.name.trim() : '';
      const explanation_vi =
        typeof obj.explanation_vi === 'string' ? obj.explanation_vi.trim() : '';
      const examples = Array.isArray(obj.examples)
        ? obj.examples
            .filter((x): x is string => typeof x === 'string')
            .map((x) => x.trim())
            .filter((x) => x.length > 0)
        : [];
      if (!name || !explanation_vi) continue;
      patterns.push({ name, explanation_vi, examples });
    }
    if (patterns.length === 0) return null;
    return { patterns };
  } catch {
    return null;
  }
}

/**
 * Ask Gemini to list grammar patterns in `content` with a Vietnamese
 * explanation per pattern. Returns null on AI / parse failure so the route
 * can surface 502. When AI isn't configured, returns null too (route then
 * tells the learner AI is offline).
 */
export async function analyzeGrammar(
  content: string,
): Promise<GrammarAnalysis | null> {
  const ai = await getAIProvider();
  if (!ai.available) return null;

  const raw = await ai.generateText(buildGrammarPrompt(content), {
    json: true,
    temperature: 0.3,
    max_tokens: 1500,
  });
  if (!raw) return null;
  return parseGrammar(raw);
}
