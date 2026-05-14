import type {
  AIProvider,
  AIGenerateOptions,
  CompositionPoolWord,
} from './types';
import type { CompositionAiFeedback } from '@/lib/types';

const MODEL = 'gemini-2.5-flash';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const TIMEOUT_MS = 20_000;

/**
 * Build a Gemini provider with the given key.
 * Key is captured in closure so `available` getter stays sync.
 * Caller (getAIProvider in ./index) reads key from `getCloudflareContext().env`.
 */
export function makeGeminiProvider(rawKey: string | undefined | null): AIProvider {
  const key = rawKey?.trim() || null;

  async function generateText(prompt: string, options: AIGenerateOptions = {}) {
    if (!key) return null;
    try {
      const res = await fetch(
        `${BASE_URL}/models/${MODEL}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: options.max_tokens ?? 2000,
              temperature: options.temperature ?? 0.7,
              ...(options.json ? { responseMimeType: 'application/json' } : {}),
            },
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        }
      );
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error('[gemini] HTTP', res.status, errText.slice(0, 200));
        return null;
      }
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return typeof text === 'string' ? text.trim() : null;
    } catch (err) {
      console.error('[gemini] error:', err);
      return null;
    }
  }

  async function evaluateComposition(
    pool: CompositionPoolWord[],
    content: string,
  ): Promise<CompositionAiFeedback> {
    if (!key) return fallbackFeedback(pool);
    const prompt = buildCompositionPrompt(pool, content);
    const raw = await generateText(prompt, {
      json: true,
      temperature: 0.4,
      max_tokens: 1500,
    });
    if (!raw) {
      throw new Error('Gemini returned no text for composition evaluation');
    }
    return parseCompositionFeedback(raw, pool);
  }

  return {
    name: 'gemini',
    available: key !== null && key.length > 0,
    generateText,
    evaluateComposition,
  };
}

function fallbackFeedback(pool: CompositionPoolWord[]): CompositionAiFeedback {
  const word_usage: Record<string, boolean> = {};
  for (const w of pool) word_usage[w.english] = false;
  return {
    coherence_score: 0,
    word_usage,
    issues: [],
    suggested_additions: [],
    passed: false,
  };
}

function buildCompositionPrompt(
  pool: CompositionPoolWord[],
  content: string,
): string {
  const poolList = pool
    .map((w, i) => `${i + 1}. ${w.english} (${w.vietnamese})`)
    .join('\n');
  const safeContent = content.slice(0, 3000).replace(/"""/g, '\\"\\"\\"');

  return `You are evaluating a short composition by a Vietnamese English learner. The learner is practicing a set of vocabulary words.

Vocabulary pool the learner chose:
${poolList}

The learner wrote (it may mix Vietnamese and English — that is acceptable as long as the passage is coherent):

"""
${safeContent}
"""

Evaluate and respond with ONLY a JSON object, no preamble, no markdown fences:

{
  "coherence_score": integer 0-10 (10 = perfectly natural; 7 = passable; 5 = readable but awkward; below 5 = confusing or broken),
  "word_usage": {"<english_word>": true|false, ...},
  "issues": [
    {
      "excerpt": "exact phrase copied from the learner's text (verbatim, case-preserved)",
      "problem": "what is wrong, in Vietnamese, one sentence",
      "suggestion": "how to fix it, in Vietnamese, one sentence"
    }
  ],
  "suggested_additions": [
    {
      "word": "the exact English word from the pool (must be one of the pool words above)",
      "hint": "1 short sentence in Vietnamese suggesting how to use it in this context"
    }
  ],
  "passed": true if coherence_score >= 7 AND there are no critical grammar issues, else false
}

Rules:
- word_usage must include one entry per pool word using the exact English word as key. Any form / inflection / capitalization counts as used.
- issues: up to 5, in order of importance. Empty array if none.
- suggested_additions: up to 3 unused pool words. Empty array if all used. The "word" value MUST be one of the pool words above (exact spelling).
- Be encouraging but honest. Code-switching between Vietnamese and English is acceptable when natural.`;
}

function parseCompositionFeedback(
  raw: string,
  pool: CompositionPoolWord[],
): CompositionAiFeedback {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  const coherence_score = Math.max(
    0,
    Math.min(10, Math.round(Number(parsed.coherence_score ?? 0))),
  );

  // Default all pool words to false, then apply parsed values via case-insensitive match.
  const poolLower = new Map(pool.map((w) => [w.english.toLowerCase(), w.english]));
  const word_usage: Record<string, boolean> = {};
  for (const w of pool) word_usage[w.english] = false;
  const rawUsage =
    parsed.word_usage && typeof parsed.word_usage === 'object'
      ? (parsed.word_usage as Record<string, unknown>)
      : {};
  for (const [k, v] of Object.entries(rawUsage)) {
    const canonical = poolLower.get(k.toLowerCase());
    if (canonical) word_usage[canonical] = Boolean(v);
  }

  const issues = Array.isArray(parsed.issues)
    ? (parsed.issues as Array<Record<string, unknown>>)
        .slice(0, 5)
        .map((it) => ({
          excerpt: String(it.excerpt ?? ''),
          problem: String(it.problem ?? ''),
          suggestion: String(it.suggestion ?? ''),
        }))
        .filter((it) => it.excerpt && it.problem)
    : [];

  const suggested_additions = Array.isArray(parsed.suggested_additions)
    ? (parsed.suggested_additions as Array<Record<string, unknown>>)
        .slice(0, 3)
        .map((s) => ({ word: String(s.word ?? ''), hint: String(s.hint ?? '') }))
        .filter((s) => poolLower.has(s.word.toLowerCase()) && s.hint)
        .map((s) => ({
          // Normalize back to the canonical pool spelling
          word: poolLower.get(s.word.toLowerCase())!,
          hint: s.hint,
        }))
    : [];

  const passed = Boolean(parsed.passed);

  return { coherence_score, word_usage, issues, suggested_additions, passed };
}
