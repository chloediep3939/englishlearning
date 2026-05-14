import { lookupWord } from './dictionary';
import { getCollocations } from './datamuse';
import { translateEnToVi } from './translate';
import { getPexelsImage } from './pexels';
import { generateExamples } from './examples';
import type {
  FlashcardCollocation,
  FlashcardExample,
  FlashcardImageAttribution,
} from '@/lib/types';

const MIN_EXAMPLES = 2;

/**
 * Shape returned by `generateCardData` — the auto-fill payload used by both
 * `POST /api/cards/generate` (manual add) and `POST /api/cards/from-passage`
 * (Word Bank save from passage reader).
 *
 * `ipa_alt`, `audio_url_alt`, `accent`, `definitions` are surfaced for the
 * manual-add UI but ignored when saving from a passage (the popup only needs
 * the headline fields).
 */
export interface GeneratedCardData {
  english: string;
  vietnamese: string | null;
  ipa: string | null;
  audio_url: string | null;
  ipa_alt: string | null;
  audio_url_alt: string | null;
  accent: string | null;
  part_of_speech: string | null;
  examples: FlashcardExample[];
  collocations: FlashcardCollocation[];
  definitions: string[];
  image_url: string | null;
  image_attribution: FlashcardImageAttribution | null;
}

/**
 * Auto-fill pipeline for a new flashcard. Fans out to dictionary, datamuse,
 * translation, Pexels in parallel, then tops up examples via Gemini when the
 * dictionary doesn't have enough. Always returns a payload — individual
 * upstream failures degrade fields to null rather than throw.
 *
 * `imageSkip` lets the manual-add UI re-roll the Pexels result; pass 0 for
 * first-time generation. When `skipImage` is true, Pexels is skipped entirely
 * (used by bulk import, where image fetch is the slowest leg).
 */
export async function generateCardData(
  english: string,
  imageSkip: number = 0,
  skipImage: boolean = false,
): Promise<GeneratedCardData> {
  const [dict, collocations, wordVi, pexels] = await Promise.all([
    lookupWord(english),
    getCollocations(english),
    translateEnToVi(english),
    skipImage ? Promise.resolve(null) : getPexelsImage(english, imageSkip),
  ]);

  const dictExamples: FlashcardExample[] = (dict?.examples ?? []).map((e) => ({ en: e.en }));
  let examples: FlashcardExample[] = [...dictExamples];

  if (examples.length < MIN_EXAMPLES) {
    const aiExamples = await generateExamples(english, 3);
    const seen = new Set(examples.map((e) => e.en.toLowerCase()));
    for (const ex of aiExamples) {
      if (!seen.has(ex.en.toLowerCase())) {
        examples.push(ex);
        seen.add(ex.en.toLowerCase());
      }
    }
  }

  if (examples.length > 0 && !examples[0].vi) {
    const firstVi = await translateEnToVi(examples[0].en);
    if (firstVi) examples[0] = { ...examples[0], vi: firstVi };
  }
  examples = examples.slice(0, 3);

  return {
    english,
    vietnamese: wordVi,
    ipa: dict?.ipa ?? null,
    audio_url: dict?.audio_url ?? null,
    ipa_alt: dict?.ipa_alt ?? null,
    audio_url_alt: dict?.audio_url_alt ?? null,
    accent: dict?.accent ?? null,
    part_of_speech: dict?.part_of_speech ?? null,
    examples,
    collocations,
    definitions: dict?.definitions ?? [],
    image_url: pexels?.image_url ?? null,
    image_attribution: pexels?.image_attribution ?? null,
  };
}
