import { getAIProvider } from '@/lib/ai';

const POOL_SIZE = 10;

interface GeneratedItem {
  en: string;
  vi: string | null;
}

function generatePrompt(word: string, partOfSpeech?: string | null): string {
  const pos = partOfSpeech ? ` (${partOfSpeech})` : '';
  return `Generate exactly ${POOL_SIZE} natural English example sentences using the word "${word}"${pos}.

Strict requirements:
- 10-20 words per sentence
- B1-B2 intermediate level
- The word "${word}" MUST appear in its base/lemma form exactly as given (no inflections)
- The word MUST appear as a standalone token (not as part of another word)
- Each sentence in a DIFFERENT context: work, daily life, education, technology, travel, relationships, science, sports
- Natural, conversational English
- Include a Vietnamese translation for each sentence

Return ONLY a JSON object (no markdown, no prose):
{
  "sentences": [
    { "en": "...", "vi": "..." },
    { "en": "...", "vi": "..." }
  ]
}

The "sentences" array must contain exactly ${POOL_SIZE} items.`;
}

export async function generateClozeSentences(
  word: string,
  partOfSpeech?: string | null
): Promise<GeneratedItem[]> {
  const ai = await getAIProvider();
  if (!ai.available) return [];

  const response = await ai.generateText(generatePrompt(word, partOfSpeech), {
    json: true,
    temperature: 0.85,
    max_tokens: 3000,
  });
  if (!response) return [];

  try {
    const cleaned = response
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned) as {
      sentences?: Array<{ en?: unknown; vi?: unknown }>;
    };
    if (!Array.isArray(parsed.sentences)) return [];

    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordRegex = new RegExp(`\\b${escaped}\\b`, 'i');

    return parsed.sentences
      .filter((s): s is { en: string; vi?: unknown } =>
        typeof s.en === 'string' && s.en.length > 0
      )
      .filter((s) => wordRegex.test(s.en))
      .slice(0, POOL_SIZE)
      .map((s) => ({
        en: s.en,
        vi: typeof s.vi === 'string' && s.vi.length > 0 ? s.vi : null,
      }));
  } catch (err) {
    console.error('[cloze] JSON parse failed:', err);
    return [];
  }
}

export function blankOutWord(sentence: string, word: string): string {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  return sentence.replace(regex, '_____');
}
