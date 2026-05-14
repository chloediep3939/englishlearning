import { getAIProvider } from '@/lib/ai';
import type { CefrLevel, DifficultyAnalysis, LevelVerdict } from '@/lib/types';

const VALID_LEVELS: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const VALID_VERDICTS: readonly LevelVerdict[] = ['too_easy', 'just_right', 'too_hard'];

// Cap how much of the passage we send to Gemini. Anything beyond a few thousand
// chars is plenty to gauge CEFR — bigger payloads just blow the latency budget.
const MAX_PASSAGE_CHARS = 5000;

function buildDifficultyPrompt(passage: string, userLevel: CefrLevel): string {
  const safe = passage.slice(0, MAX_PASSAGE_CHARS).replace(/"""/g, '\\"\\"\\"');
  return `You are a CEFR-trained English teacher. A Vietnamese learner whose current self-reported level is "${userLevel}" wants to read the following passage:

"""
${safe}
"""

Analyze:
1. CEFR level of this passage (A1 / A2 / B1 / B2 / C1 / C2). Consider vocabulary range, grammar complexity, sentence length, idiomatic density.
2. Verdict relative to the learner: "too_easy" if 2+ levels below the learner, "too_hard" if 2+ levels above, else "just_right" (1 level above is fine — gentle challenge).
3. One short paragraph in Vietnamese (2-3 sentences) explaining the verdict AND giving 1 actionable note. If "too_hard", suggest skipping or finding easier text. If "too_easy", note they can still benefit from translation/paraphrase practice. If "just_right", encourage them. Speak to the learner as "bạn" and refer to yourself (the mascot) as "mình".

Respond ONLY with JSON, no preamble, no markdown fences:
{ "level": "<one of A1-C2>", "verdict": "<too_easy|just_right|too_hard>", "suggestion": "<Vietnamese paragraph>" }`;
}

function parseDifficulty(raw: string): DifficultyAnalysis | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const level = String(parsed.level ?? '').toUpperCase();
    const verdict = String(parsed.verdict ?? '');
    const suggestion = String(parsed.suggestion ?? '').trim();
    if (!(VALID_LEVELS as readonly string[]).includes(level)) return null;
    if (!(VALID_VERDICTS as readonly string[]).includes(verdict)) return null;
    if (!suggestion) return null;
    return {
      level: level as CefrLevel,
      verdict: verdict as LevelVerdict,
      suggestion,
    };
  } catch {
    return null;
  }
}

/**
 * Ask Gemini to estimate the CEFR level of `passage` and judge whether it
 * matches the learner's self-reported level. Returns null on transient
 * failure (no key, AI returned nothing, parse error) so the route can
 * surface a 502 + "Thử lại" UI. When AI is unavailable, returns a safe
 * B1/just_right placeholder so the learner is never blocked from reading.
 */
export async function analyzeDifficulty(
  passage: string,
  userLevel: CefrLevel,
): Promise<DifficultyAnalysis | null> {
  const ai = await getAIProvider();
  if (!ai.available) {
    return {
      level: 'B1',
      verdict: 'just_right',
      suggestion:
        'AI chưa được cấu hình nên mình chưa chấm độ khó được. Bạn vẫn có thể đọc bài bình thường nhé.',
    };
  }

  const raw = await ai.generateText(buildDifficultyPrompt(passage, userLevel), {
    json: true,
    temperature: 0.3,
    max_tokens: 500,
  });
  if (!raw) return null;
  return parseDifficulty(raw);
}
