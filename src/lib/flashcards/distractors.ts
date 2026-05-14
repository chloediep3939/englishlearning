import { getDb } from '@/lib/db';
import { levenshtein } from '@/lib/pronounce/match';
import { getFallbackPool } from './common-words';

export type DistractorLang = 'en' | 'vi';

export interface DistractorOptions {
  userId: number;
  lang?: DistractorLang;       // default 'en'
  count?: number;              // default 3
  pos?: string | null;         // null/undefined = any POS
  deckId?: number;             // prefer same-deck words (Tier 1)
  excludeWords?: string[];     // additional skips on top of targetWord
}

// Distractors closer than this Levenshtein distance to the target are skipped
// (catches inflections like prefer / preferred / preferential). English only —
// Vietnamese edit distance doesn't track inflectional similarity meaningfully.
const LEVENSHTEIN_MIN = 3;

export async function generateDistractorPool(
  targetWord: string,
  options: DistractorOptions
): Promise<string[]> {
  const lang: DistractorLang = options.lang ?? 'en';
  const count = options.count ?? 3;
  const targetLower = targetWord.toLowerCase();
  const excludeLower = new Set<string>(
    (options.excludeWords ?? []).map((w) => w.toLowerCase())
  );
  excludeLower.add(targetLower);

  // Column is interpolated from a closed two-value union — not user input.
  // Values still bound via .bind().
  const column = lang === 'vi' ? 'vietnamese' : 'english';
  const applyLevenshtein = lang === 'en';

  const db = await getDb();
  const seenLower = new Set<string>();
  const candidates: string[] = []; // preserve original casing for display

  const addRow = (value: string) => {
    const lower = value.toLowerCase();
    if (seenLower.has(lower)) return;
    seenLower.add(lower);
    candidates.push(value);
  };

  // ----- Tier 1: same deck -----
  if (options.deckId !== undefined) {
    const sql = options.pos
      ? `SELECT DISTINCT ${column} AS word FROM flashcards
         WHERE user_id = ? AND deck_id = ? AND LOWER(${column}) != ? AND part_of_speech = ?`
      : `SELECT DISTINCT ${column} AS word FROM flashcards
         WHERE user_id = ? AND deck_id = ? AND LOWER(${column}) != ?`;
    const stmt = db.prepare(sql);
    const res = options.pos
      ? await stmt.bind(options.userId, options.deckId, targetLower, options.pos).all<{ word: string }>()
      : await stmt.bind(options.userId, options.deckId, targetLower).all<{ word: string }>();
    for (const row of res.results ?? []) addRow(row.word);
  }

  // ----- Tier 2: user's full vocab (if Tier 1 short after filtering) -----
  if (countKept(candidates, excludeLower, targetLower, applyLevenshtein) < count) {
    const sql = options.pos
      ? `SELECT DISTINCT ${column} AS word FROM flashcards
         WHERE user_id = ? AND LOWER(${column}) != ? AND part_of_speech = ?`
      : `SELECT DISTINCT ${column} AS word FROM flashcards
         WHERE user_id = ? AND LOWER(${column}) != ?`;
    const stmt = db.prepare(sql);
    const res = options.pos
      ? await stmt.bind(options.userId, targetLower, options.pos).all<{ word: string }>()
      : await stmt.bind(options.userId, targetLower).all<{ word: string }>();
    for (const row of res.results ?? []) addRow(row.word);
  }

  // ----- Tier 3: static fallback (English only) -----
  if (lang === 'en' && countKept(candidates, excludeLower, targetLower, applyLevenshtein) < count) {
    for (const word of getFallbackPool(options.pos)) addRow(word);
  }

  const kept = candidates.filter((w) => keep(w, excludeLower, targetLower, applyLevenshtein));
  return shuffle(kept).slice(0, count);
}

function keep(
  word: string,
  excludeLower: Set<string>,
  targetLower: string,
  applyLevenshtein: boolean
): boolean {
  const wordLower = word.toLowerCase();
  if (excludeLower.has(wordLower)) return false;
  if (applyLevenshtein && levenshtein(wordLower, targetLower) < LEVENSHTEIN_MIN) return false;
  return true;
}

function countKept(
  pool: string[],
  excludeLower: Set<string>,
  targetLower: string,
  applyLevenshtein: boolean
): number {
  let n = 0;
  for (const w of pool) if (keep(w, excludeLower, targetLower, applyLevenshtein)) n++;
  return n;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
