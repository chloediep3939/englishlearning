import { getAIProvider } from '@/lib/ai';
import type { SentenceEvaluation } from '@/lib/types';

interface TargetWord {
  english: string;
  vietnamese: string;
  part_of_speech: string | null;
}

function buildSentencePrompt(target: TargetWord, userSentence: string): string {
  const escaped = userSentence.replace(/"/g, '\\"');
  return `You are grading an English sentence written by a Vietnamese learner who is practicing a specific vocabulary word.

Target word: "${target.english}"
Vietnamese meaning: "${target.vietnamese}"
Part of speech: ${target.part_of_speech ?? 'unspecified'}

Sentence written by learner:
"${escaped}"

Evaluate strictly but fairly. Respond with ONLY a JSON object, no preamble, no markdown fences:
{
  "used_correctly": true if the sentence uses "${target.english}" with the correct part of speech and a meaning consistent with "${target.vietnamese}", else false,
  "grammar_ok": true if there are no major grammar errors (minor typos OK), else false,
  "semantic_ok": true if the sentence makes natural sense (not nonsensical or contradictory), else false,
  "feedback": "1-2 sentences in Vietnamese, friendly tone. If wrong, point out specifically what to fix. If correct, give one short tip to make it more natural."
}`;
}

function parseEvaluation(raw: string): SentenceEvaluation | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof (parsed as Record<string, unknown>).used_correctly !== 'boolean' ||
      typeof (parsed as Record<string, unknown>).grammar_ok !== 'boolean' ||
      typeof (parsed as Record<string, unknown>).semantic_ok !== 'boolean' ||
      typeof (parsed as Record<string, unknown>).feedback !== 'string'
    ) {
      return null;
    }
    return parsed as unknown as SentenceEvaluation;
  } catch {
    return null;
  }
}

/**
 * Ask the AI to grade a sentence the learner wrote using `target.english`.
 * Returns null when the provider is unavailable or returns malformed output —
 * callers should treat that as a transient failure (HTTP 502, retry button).
 */
export async function evaluateSentence(
  target: TargetWord,
  userSentence: string
): Promise<SentenceEvaluation | null> {
  const ai = await getAIProvider();
  if (!ai.available) {
    return {
      used_correctly: false,
      grammar_ok: false,
      semantic_ok: false,
      feedback:
        'AI chưa được cấu hình. Bạn vẫn có thể luyện viết — Bún chỉ chưa chấm được thôi.',
    };
  }
  const raw = await ai.generateText(buildSentencePrompt(target, userSentence), {
    json: true,
    temperature: 0.3,
    max_tokens: 600,
  });
  if (!raw) return null;
  return parseEvaluation(raw);
}
