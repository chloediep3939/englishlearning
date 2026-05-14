import { getAIProvider } from '@/lib/ai';
import type { WordDefinitionInContext } from '@/lib/types';

const MAX_CONTEXT_CHARS = 500;

function buildDefinePrompt(word: string, sentenceContext: string): string {
  const safeWord = word.replace(/"/g, '');
  const safeContext = sentenceContext.slice(0, MAX_CONTEXT_CHARS).replace(/"/g, "'");
  return `You are helping a Vietnamese learner understand an English word as used in a specific sentence.

Word as clicked: "${safeWord}"
Sentence containing the word:
"${safeContext}"

Return:
- The lemma (base form) of the word as actually used here. E.g., "running" -> "run", "better" -> "good", "mice" -> "mouse".
- Vietnamese meaning (1 short phrase, the meaning in THIS context, not the dictionary headword).
- Part of speech in this context: "noun" / "verb" / "adjective" / "adverb" / "preposition" / "conjunction" / "pronoun" / "interjection" / "phrasal verb" / "idiom".
- One short example sentence using the lemma in a different but related context.
- IPA pronunciation of the lemma (US English). If unsure, return null.

Respond ONLY with JSON, no preamble, no markdown fences:
{ "english": "<lemma>", "vietnamese": "<VN meaning>", "part_of_speech": "<POS>", "example_sentence": "<English example>", "ipa": "<IPA or null>" }`;
}

function parseDefinition(raw: string): WordDefinitionInContext | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const english = String(parsed.english ?? '').trim().toLowerCase();
    const vietnamese = String(parsed.vietnamese ?? '').trim();
    const pos = String(parsed.part_of_speech ?? '').trim();
    const example = String(parsed.example_sentence ?? '').trim();
    const ipaRaw = parsed.ipa;
    const ipa = typeof ipaRaw === 'string' && ipaRaw.trim() ? ipaRaw.trim() : null;
    if (!english || !vietnamese || !pos) return null;
    return {
      english,
      vietnamese,
      part_of_speech: pos,
      example_sentence: example,
      ipa,
    };
  } catch {
    return null;
  }
}

/**
 * Look up an English word as used in a specific sentence: resolves inflections
 * to a lemma ("running" -> "run"), picks the in-context Vietnamese meaning, and
 * tags the part of speech. Returns null on transient AI failure (HTTP 502 +
 * retry from the caller). When AI is unavailable, returns a minimal placeholder
 * so the popup can still render without crashing.
 */
export async function defineWordInContext(
  word: string,
  sentenceContext: string,
): Promise<WordDefinitionInContext | null> {
  const ai = await getAIProvider();
  if (!ai.available) {
    return {
      english: word.toLowerCase(),
      vietnamese: '(chưa có)',
      part_of_speech: 'unknown',
      example_sentence: '',
      ipa: null,
    };
  }

  const raw = await ai.generateText(buildDefinePrompt(word, sentenceContext), {
    json: true,
    temperature: 0.2,
    max_tokens: 300,
  });
  if (!raw) return null;
  return parseDefinition(raw);
}
