/**
 * Datamuse API: https://www.datamuse.com/api/
 * No key. Returns collocations (words frequently appearing before/after).
 */

const API_URL = 'https://api.datamuse.com';
const MAX_COLLOCATIONS = 5;

import type { FlashcardCollocation } from '@/lib/types';

export async function getCollocations(word: string): Promise<FlashcardCollocation[]> {
  if (!word || word.length === 0) return [];
  try {
    const [before, after] = await Promise.all([
      fetch(`${API_URL}/words?rc=${encodeURIComponent(word)}&max=${MAX_COLLOCATIONS}`, {
        signal: AbortSignal.timeout(6000),
      }).then((r) => (r.ok ? r.json() : []) as Promise<Array<{ word?: string; score?: number }>>),
      fetch(`${API_URL}/words?lc=${encodeURIComponent(word)}&max=${MAX_COLLOCATIONS}`, {
        signal: AbortSignal.timeout(6000),
      }).then((r) => (r.ok ? r.json() : []) as Promise<Array<{ word?: string; score?: number }>>),
    ]);

    const result: FlashcardCollocation[] = [];
    for (const b of before) {
      if (typeof b.word === 'string' && b.word.length > 0) {
        result.push({ phrase: `${b.word} ${word}`, word: b.word, position: 'before' });
      }
    }
    for (const a of after) {
      if (typeof a.word === 'string' && a.word.length > 0) {
        result.push({ phrase: `${word} ${a.word}`, word: a.word, position: 'after' });
      }
    }
    return result.slice(0, 8);
  } catch (err) {
    console.error('[datamuse] error:', err);
    return [];
  }
}
