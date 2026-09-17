/**
 * Types + light constants for the "Phát âm" catalog. Kept SEPARATE from the
 * bulk word data (data/*) so that client components can import the types and
 * GROUP_META / PLAYLIST_URL without pulling all 44 sounds' example words into
 * the browser bundle. The data + lookups live in `catalog.ts`.
 */

export type SoundGroup =
  | 'vowel-short'
  | 'vowel-long'
  | 'diphthong'
  | 'consonant-voiceless'
  | 'consonant-voiced';

export interface ExampleWord {
  /** The word as written, e.g. "sheep". */
  word: string;
  /** IPA transcription including slashes, e.g. "/ʃiːp/". */
  ipa: string;
  /** Vietnamese meaning. */
  vi: string;
}

/** A sound as authored in the `data/*` files (mouthClip is derived, not stored). */
export interface SoundSeed {
  slug: string;
  /** Display glyph, e.g. "iː" (no slashes — the UI wraps it in /…/). */
  ipa: string;
  group: SoundGroup;
  /** Short Vietnamese name / keyword, e.g. "âm i dài". */
  name: string;
  /**
   * YouTube video id for the BBC lesson. Empty string → the UI falls back to a
   * link to the full playlist (PLAYLIST_URL). Only embed verified ids.
   */
  youtubeId: string;
  examples: ExampleWord[];
  /** Vietnamese pronunciation tips (how to place tongue/lips). */
  tipsVi: string;
  /** Việt–Anh contrast note — the mistake Vietnamese speakers usually make. */
  contrastVi: string;
}

/** A fully-resolved sound (seed + derived mouthClip). */
export interface Sound extends SoundSeed {
  /** Local mouth-shape clip path, derived from the slug. */
  mouthClip: string;
}

/** BBC "The Sounds of English" playlist — fallback when a per-sound id is absent. */
export const PLAYLIST_URL =
  'https://www.youtube.com/playlist?list=PLD6B222E02447DC07';

/** Group display order for the overview. */
export const GROUP_ORDER: SoundGroup[] = [
  'vowel-short',
  'vowel-long',
  'diphthong',
  'consonant-voiceless',
  'consonant-voiced',
];

export const GROUP_META: Record<
  SoundGroup,
  { label: string; sub: string; color: string }
> = {
  'vowel-short': { label: 'Nguyên âm ngắn', sub: 'Short vowels', color: 'var(--v-blue)' },
  'vowel-long': { label: 'Nguyên âm dài', sub: 'Long vowels', color: 'var(--v-teal)' },
  diphthong: { label: 'Nguyên âm đôi', sub: 'Diphthongs', color: 'var(--v-purple)' },
  'consonant-voiceless': {
    label: 'Phụ âm vô thanh',
    sub: 'Voiceless consonants',
    color: 'var(--v-orange)',
  },
  'consonant-voiced': {
    label: 'Phụ âm hữu thanh',
    sub: 'Voiced consonants',
    color: 'var(--v-primary)',
  },
};

/** Derive the mouth-clip path from a slug. Single source of the naming scheme. */
export function mouthClipFor(slug: string): string {
  return `/pronunciation/mouth/${slug}.mp4`;
}
