import { getAIProvider } from '@/lib/ai';
import type { ParaphraseFeedback } from '@/lib/types';

const MAX_PASSAGE_CHARS = 5000;

function clampScore(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function safeStr(raw: unknown): string {
  return String(raw ?? '').trim();
}

function buildPrompt(originalEnglish: string, userParaphrase: string): string {
  const safeOriginal = originalEnglish.slice(0, MAX_PASSAGE_CHARS).replace(/"""/g, '\\"\\"\\"');
  const safeUser = userParaphrase.slice(0, MAX_PASSAGE_CHARS).replace(/"""/g, '\\"\\"\\"');
  return `You are grading an English paraphrase of an English passage by a Vietnamese learner.

Original passage:
"""
${safeOriginal}
"""

Learner's paraphrase:
"""
${safeUser}
"""

Grade on 4 criteria (each 0-100):
1. meaning_preserved: did the rewrite preserve the main ideas? Penalize info loss or invented content.
2. grammar: how correct is the English? Penalize tense, agreement, articles. Minor typos OK.
3. vocabulary: did the learner use their OWN words, or copy/paste? Reward synonyms + lexical range. Penalize >50% content-word overlap with the original.
4. naturalness: does it read like natural English, not Vietnamese-translated English?

overall_score = round(average of the 4).

Also return:
- issues: up to 5 problems. Each { excerpt (from the learner's paraphrase), problem (Vietnamese), suggestion (Vietnamese) }
- better_phrasings: up to 3 pairs. Each { original: "learner's phrase", suggested: "more natural alternative" }

Speak to the learner as "bạn" and refer to yourself (the mascot) as "mình".

Respond ONLY with JSON, no preamble, no markdown fences:
{ "meaning_preserved": number, "grammar": number, "vocabulary": number, "naturalness": number, "overall_score": number, "issues": [{"excerpt": string, "problem": string, "suggestion": string}], "better_phrasings": [{"original": string, "suggested": string}] }`;
}

function parse(raw: string): ParaphraseFeedback | null {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const meaning = clampScore(parsed.meaning_preserved);
    const grammar = clampScore(parsed.grammar);
    const vocabulary = clampScore(parsed.vocabulary);
    const naturalness = clampScore(parsed.naturalness);
    const overallRaw = parsed.overall_score;
    const overall = overallRaw !== undefined
      ? clampScore(overallRaw)
      : Math.round((meaning + grammar + vocabulary + naturalness) / 4);
    const issues = Array.isArray(parsed.issues)
      ? (parsed.issues as Array<Record<string, unknown>>)
          .slice(0, 5)
          .map((m) => ({
            excerpt: safeStr(m.excerpt),
            problem: safeStr(m.problem),
            suggestion: safeStr(m.suggestion),
          }))
          .filter((m) => m.excerpt && m.problem)
      : [];
    const betterPhrasings = Array.isArray(parsed.better_phrasings)
      ? (parsed.better_phrasings as Array<Record<string, unknown>>)
          .slice(0, 3)
          .map((p) => ({
            original: safeStr(p.original),
            suggested: safeStr(p.suggested),
          }))
          .filter((p) => p.original && p.suggested)
      : [];
    return {
      meaning_preserved: meaning,
      grammar,
      vocabulary,
      naturalness,
      overall_score: overall,
      issues,
      better_phrasings: betterPhrasings,
    };
  } catch {
    return null;
  }
}

export async function gradeParaphrase(
  originalEnglish: string,
  userParaphrase: string,
): Promise<ParaphraseFeedback | null> {
  const ai = await getAIProvider();
  if (!ai.available) {
    return {
      meaning_preserved: 0,
      grammar: 0,
      vocabulary: 0,
      naturalness: 0,
      overall_score: 0,
      issues: [],
      better_phrasings: [],
    };
  }
  const raw = await ai.generateText(buildPrompt(originalEnglish, userParaphrase), {
    json: true,
    temperature: 0.3,
    max_tokens: 1500,
  });
  if (!raw) return null;
  return parse(raw);
}
