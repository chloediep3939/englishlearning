/**
 * Free Dictionary API: https://dictionaryapi.dev
 * No key required. Returns IPA, audio, examples, part of speech.
 */

const API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

export interface DictionaryResult {
  word: string;
  ipa: string | null;
  audio_url: string | null;
  /** The OTHER accent's audio + IPA when both are available. Used for the
   *  client-side "swap accent" button on the Add preview. */
  ipa_alt: string | null;
  audio_url_alt: string | null;
  /** Which accent the primary `audio_url` / `ipa` represents. */
  accent: 'us' | 'uk' | 'unknown' | null;
  part_of_speech: string | null;
  examples: Array<{ en: string }>;
  definitions: string[];
}

export async function lookupWord(word: string): Promise<DictionaryResult | null> {
  if (!word || word.length === 0) return null;
  try {
    const res = await fetch(`${API_URL}/${encodeURIComponent(word.toLowerCase())}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      word: string;
      phonetics?: Array<{ text?: string; audio?: string }>;
      meanings?: Array<{
        partOfSpeech?: string;
        definitions?: Array<{ definition?: string; example?: string }>;
      }>;
    }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0];

    // Phonetic selection: prefer American English (-us audio file). The
    // dictionaryapi.dev response usually contains entries for both UK and US
    // accents — picking the one paired with `-us.mp3` ensures audio and IPA
    // match the same accent the learner studies (AmE).
    const phonetics = first.phonetics ?? [];
    const american = phonetics.find((p) => p.audio?.includes('-us'));
    const british = phonetics.find((p) => p.audio?.includes('-uk'));
    const anyWithAudio = phonetics.find((p) => p.audio && p.audio.length > 0);
    const anyWithText = phonetics.find((p) => p.text && p.text.length > 0);
    const preferred = american ?? anyWithAudio ?? british;
    const accent: 'us' | 'uk' | 'unknown' | null = preferred
      ? preferred === american
        ? 'us'
        : preferred === british
          ? 'uk'
          : 'unknown'
      : null;
    const audio_url = preferred?.audio || null;
    // Take IPA from the preferred entry when possible, else any non-empty.
    const ipa = preferred?.text || anyWithText?.text || null;

    // Alt accent: whichever of US/UK we did NOT pick. Lets the client swap.
    const altCandidate =
      preferred === american ? british : preferred === british ? american : null;
    const audio_url_alt = altCandidate?.audio || null;
    const ipa_alt = altCandidate?.text || null;

    // Part of speech: first meaning
    const part_of_speech = first.meanings?.[0]?.partOfSpeech ?? null;

    // Collect up to 3 examples + 3 definitions across all meanings
    const examples: Array<{ en: string }> = [];
    const definitions: string[] = [];
    for (const m of first.meanings ?? []) {
      for (const d of m.definitions ?? []) {
        if (d.example && examples.length < 3) examples.push({ en: d.example });
        if (d.definition && definitions.length < 3) definitions.push(d.definition);
      }
    }

    return {
      word: first.word,
      ipa,
      audio_url,
      ipa_alt,
      audio_url_alt,
      accent,
      part_of_speech,
      examples,
      definitions,
    };
  } catch (err) {
    console.error('[dictionary] error:', err);
    return null;
  }
}
