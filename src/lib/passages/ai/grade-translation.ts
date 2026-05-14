import { getAIProvider } from '@/lib/ai';
import type { TranslationFeedback } from '@/lib/types';

const MAX_PASSAGE_CHARS = 5000;

function clampScore(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function safeStr(raw: unknown): string {
  return String(raw ?? '').trim();
}

function buildPrompt(originalEnglish: string, userVietnamese: string): string {
  const safeOriginal = originalEnglish.slice(0, MAX_PASSAGE_CHARS).replace(/"""/g, '\\"\\"\\"');
  const safeUser = userVietnamese.slice(0, MAX_PASSAGE_CHARS).replace(/"""/g, '\\"\\"\\"');
  return `You are grading a Vietnamese translation of an English passage by a Vietnamese learner.

Original English passage:
"""
${safeOriginal}
"""

Learner's Vietnamese translation:
"""
${safeUser}
"""

Grade strictly but fairly:
1. accuracy_score (0-100): does the translation preserve the meaning? Penalize sentences omitted, key information lost, mistranslations.
2. naturalness_score (0-100): does the Vietnamese read naturally? Penalize literal/awkward phrasing, English word order leaking through.
3. overall_score: round(accuracy * 0.6 + naturalness * 0.4).
4. missed_meaning: up to 5 bullets (in Vietnamese) listing specific ideas from the original not in the translation. Empty array if none.
5. mistranslations: up to 5 errors. Each { excerpt, problem (Vietnamese), suggestion (Vietnamese) }.
6. suggested_translation: a polished Vietnamese rendering, 2-4 sentences max.

Speak to the learner as "bạn" and refer to yourself (the mascot) as "mình".

Respond ONLY with JSON, no preamble, no markdown fences:
{ "accuracy_score": number, "naturalness_score": number, "overall_score": number, "missed_meaning": [string], "mistranslations": [{"excerpt": string, "problem": string, "suggestion": string}], "suggested_translation": string }`;
}

function parse(raw: string): TranslationFeedback | null {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const accuracy = clampScore(parsed.accuracy_score);
    const naturalness = clampScore(parsed.naturalness_score);
    const overallRaw = parsed.overall_score;
    const overall = overallRaw !== undefined
      ? clampScore(overallRaw)
      : Math.round(accuracy * 0.6 + naturalness * 0.4);
    const missed = Array.isArray(parsed.missed_meaning)
      ? parsed.missed_meaning.slice(0, 5).map(safeStr).filter((s) => s.length > 0)
      : [];
    const mistranslations = Array.isArray(parsed.mistranslations)
      ? (parsed.mistranslations as Array<Record<string, unknown>>)
          .slice(0, 5)
          .map((m) => ({
            excerpt: safeStr(m.excerpt),
            problem: safeStr(m.problem),
            suggestion: safeStr(m.suggestion),
          }))
          .filter((m) => m.excerpt && m.problem)
      : [];
    const suggested = safeStr(parsed.suggested_translation);
    return {
      accuracy_score: accuracy,
      naturalness_score: naturalness,
      overall_score: overall,
      missed_meaning: missed,
      mistranslations,
      suggested_translation: suggested,
    };
  } catch {
    return null;
  }
}

/**
 * Grade a learner's Vietnamese translation of an English passage.
 *
 * Returns `null` on transient AI failure (HTTP 502 + retry from the caller).
 * When AI is unavailable, returns a zero-score placeholder so the route can
 * still produce a feedback object without crashing — the route should ALSO
 * 502 in that case, but we keep the object well-formed in case it doesn't.
 */
export async function gradeTranslation(
  originalEnglish: string,
  userVietnamese: string,
): Promise<TranslationFeedback | null> {
  const ai = await getAIProvider();
  if (!ai.available) {
    return {
      accuracy_score: 0,
      naturalness_score: 0,
      overall_score: 0,
      missed_meaning: [],
      mistranslations: [],
      suggested_translation: 'AI chưa được cấu hình.',
    };
  }

  const raw = await ai.generateText(buildPrompt(originalEnglish, userVietnamese), {
    json: true,
    temperature: 0.3,
    max_tokens: 1500,
  });
  if (!raw) return null;
  return parse(raw);
}
