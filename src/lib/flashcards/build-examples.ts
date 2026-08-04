// Auto-fill example sentences for a card that has NONE. Server-only.
//
// User-agreed rule: a card that already carries even ONE example is never
// touched — examples are user-controlled once present (no top-up, no
// re-translation). This function only fires for 0-example cards (bulk-added
// words, older cards) so "Học câu" has material to drill.
//
// Sources: Oxford Learner's entry-page examples (best quality, parsed from
// the same page the audio fetch already downloads), falling back to
// dictionaryapi.dev examples. Vietnamese translations via MyMemory
// (translateEnToVi) — free tier, best-effort: a quota miss leaves that
// example en-only (Học câu skips vi-less sentences until a later re-run).
import type { FlashcardExample } from '@/lib/types';
import { flashcardsDb } from '@/lib/db';
import { translateEnToVi } from './translate';

const TARGET_COUNT = 3;

export interface EnsureExamplesResult {
  added: number;
  translated: number;
}

/**
 * Pick up to 3 candidate sentences: prefer ones containing the headword
 * (loose match — headword or its first 4+ letters as a stem), Oxford before
 * dictionary, dedupe case-insensitively.
 */
export function pickExampleCandidates(
  english: string,
  oxfordExamples: string[],
  dictExamples: string[],
): string[] {
  const stem = english.trim().toLowerCase().slice(0, Math.max(4, english.trim().length - 2));
  const seen = new Set<string>();
  const pool: Array<{ en: string; hasWord: boolean }> = [];
  for (const en of [...oxfordExamples, ...dictExamples]) {
    const t = en.replace(/\s+/g, ' ').trim();
    if (t.length < 15 || t.length > 200) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push({ en: t, hasWord: key.includes(stem) });
  }
  pool.sort((a, b) => Number(b.hasWord) - Number(a.hasWord));
  return pool.slice(0, TARGET_COUNT).map((p) => p.en);
}

/**
 * Fill examples for a 0-example card and persist. No-op when the card
 * already has any example, is missing, or no candidates survive filtering.
 * Never throws.
 */
export async function ensureCardExamples(
  userId: number,
  cardId: number,
  sources: { oxfordExamples?: string[]; dictExamples?: string[] },
): Promise<EnsureExamplesResult> {
  const none: EnsureExamplesResult = { added: 0, translated: 0 };
  try {
    const card = await flashcardsDb.getById(userId, cardId);
    if (!card) return none;
    if (card.examples.length > 0) return none; // user-controlled — never touch

    const picked = pickExampleCandidates(
      card.english,
      sources.oxfordExamples ?? [],
      sources.dictExamples ?? [],
    );
    if (picked.length === 0) return none;

    let translated = 0;
    const examples: FlashcardExample[] = [];
    // Sequential — polite to MyMemory's shared free-tier quota.
    for (const en of picked) {
      const vi = await translateEnToVi(en);
      if (vi) translated++;
      examples.push(vi ? { en, vi } : { en });
    }

    // Re-read before write: if the user added examples while we were
    // translating, theirs win and we drop ours.
    const fresh = await flashcardsDb.getById(userId, cardId);
    if (!fresh || fresh.examples.length > 0) return none;
    await flashcardsDb.update(userId, cardId, { examples });
    return { added: examples.length, translated };
  } catch (err) {
    console.error('[ensure examples] error:', err);
    return none;
  }
}
