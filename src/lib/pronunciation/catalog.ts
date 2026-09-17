/**
 * Static catalog for the "Phát âm" module: the 44 English (RP) sounds, their
 * example words, Vietnamese tips and the Việt–Anh contrast note.
 *
 * This is READ-ONLY editorial data — it never changes per user, so it lives in
 * the repo (type-safe, no DB round-trip, editable by PR) rather than a D1 seed.
 * Only per-user progress goes to D1 (see `pronunciationProgressDb`). This
 * mirrors how sentence text stays in `flashcards.examples` while `sentence_drills`
 * holds only per-user state.
 *
 * SLUG = the single ASCII identity of a sound. It is the URL segment
 * (`/pronunciation/[slug]`), the mouth-clip filename
 * (`/pronunciation/mouth/<slug>.mp4`) and the D1 `sound_slug`. NEVER put an IPA
 * glyph in a filename or URL. Keep the slug set stable — renaming a slug orphans
 * a user's progress row and its MP4.
 *
 * Types + light constants (GROUP_META, PLAYLIST_URL, …) live in `catalog-meta.ts`
 * so client components can import them WITHOUT bundling all the word data below.
 * Bulk word data lives in `./data/*` (split per group, each under the 500-line rule).
 */

import type { Sound, SoundSeed, SoundGroup } from './catalog-meta';
import { GROUP_ORDER, mouthClipFor } from './catalog-meta';
import { VOWELS_SHORT } from './data/vowels-short';
import { VOWELS_LONG } from './data/vowels-long';
import { DIPHTHONGS } from './data/diphthongs';
import { CONSONANTS_VOICELESS } from './data/consonants-voiceless';
import { CONSONANTS_VOICED } from './data/consonants-voiced';

// Re-export the meta so existing `from '.../catalog'` imports keep working.
export type { Sound, SoundSeed, SoundGroup, ExampleWord } from './catalog-meta';
export { GROUP_ORDER, GROUP_META, PLAYLIST_URL, mouthClipFor } from './catalog-meta';

// Build the resolved list once at module load, and an index for O(1) lookup.
const ALL_SEEDS: SoundSeed[] = [
  ...VOWELS_SHORT,
  ...VOWELS_LONG,
  ...DIPHTHONGS,
  ...CONSONANTS_VOICELESS,
  ...CONSONANTS_VOICED,
];

const ALL_SOUNDS: Sound[] = ALL_SEEDS.map((s) => ({
  ...s,
  mouthClip: mouthClipFor(s.slug),
}));

const BY_SLUG: Map<string, Sound> = new Map(ALL_SOUNDS.map((s) => [s.slug, s]));

/** All 44 sounds in catalog order. */
export function allSounds(): Sound[] {
  return ALL_SOUNDS;
}

/** Look up one sound by slug, or `undefined` if it isn't in the catalog. */
export function getSound(slug: string): Sound | undefined {
  return BY_SLUG.get(slug);
}

/** Sounds grouped for the overview, in `GROUP_ORDER`. */
export function getGroups(): Array<{ group: SoundGroup; sounds: Sound[] }> {
  return GROUP_ORDER.map((group) => ({
    group,
    sounds: ALL_SOUNDS.filter((s) => s.group === group),
  }));
}

/** Total sound count — handy for the overview header. */
export function soundCount(): number {
  return ALL_SOUNDS.length;
}
