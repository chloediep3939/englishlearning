import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardDecksDb, flashcardsDb, userSettingsDb } from '@/lib/db';
import type { Flashcard, StudyDeckGroup, StudySessionMode, StudySessionResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODES: ReadonlySet<string> = new Set(['review', 'new', 'mix']);
const GROUPS: ReadonlySet<string> = new Set(['full', 'recognition']);

function clampLimit(raw: string | null, fallback: number): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return Math.min(n, 200);
}

/**
 * Spread `fresh` (new) cards evenly among `due` cards, Anki-style — no
 * clumping at the start or the end. Proportional merge: at 1-based position
 * i the number of new cards emitted so far tracks floor(i·F/T), which keeps
 * the first slot a due card whenever any due cards exist.
 */
function interleave(due: Flashcard[], fresh: Flashcard[]): Flashcard[] {
  if (due.length === 0) return fresh;
  if (fresh.length === 0) return due;
  const total = due.length + fresh.length;
  const result: Flashcard[] = [];
  let di = 0;
  let fi = 0;
  for (let i = 1; i <= total; i++) {
    const targetFresh = Math.floor((i * fresh.length) / total);
    if (fi < targetFresh && fi < fresh.length) {
      result.push(fresh[fi++]);
    } else if (di < due.length) {
      result.push(due[di++]);
    } else {
      result.push(fresh[fi++]);
    }
  }
  return result;
}

/**
 * GET /api/study/session
 *   ?mode=review|new|mix   (default mix)
 *   &group=full|recognition (default full)
 *   &deckIds=1,2,3          (optional — narrows within the group)
 *   &reviewLimit=&newLimit= (per-session limits; defaults from settings)
 *   &countsOnly=1           (skip queue building, return pool counts only)
 *
 * The server owns queue construction (order, limits, interleave); the client
 * never re-derives it. Counts are always the FULL pool for the scope so the
 * setup screen can show "X từ cần ôn · Y từ mới" independent of limits.
 */
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);

    const modeRaw = url.searchParams.get('mode') ?? 'mix';
    const groupRaw = url.searchParams.get('group') ?? 'full';
    if (!MODES.has(modeRaw) || !GROUPS.has(groupRaw)) {
      return NextResponse.json({ error: 'Invalid mode or group.' }, { status: 400 });
    }
    const mode = modeRaw as StudySessionMode;
    const group = groupRaw as StudyDeckGroup;
    const countsOnly = url.searchParams.get('countsOnly') === '1';

    const settings = await userSettingsDb.getFlashcardSettings(userId);
    const reviewLimit = clampLimit(url.searchParams.get('reviewLimit'), settings.session_review_limit);
    const newLimit = clampLimit(url.searchParams.get('newLimit'), settings.session_new_limit);

    // Resolve deck scope: user's decks in the requested group, optionally
    // narrowed by deckIds. Ownership is enforced by intersecting with the
    // user's own deck list (never trust ids from the query directly).
    const allDecks = await flashcardDecksDb.getAll(userId);
    const groupDecks = allDecks.filter((d) => d.recognition_only === (group === 'recognition'));
    const deckIdsRaw = url.searchParams.get('deckIds');
    let scopedIds = groupDecks.map((d) => d.id);
    // Note: an EMPTY deckIds param means "nothing selected" (zero scope),
    // while an ABSENT param means "all decks in the group".
    if (deckIdsRaw !== null) {
      const requested = new Set(
        deckIdsRaw
          .split(',')
          .map((s) => Number(s))
          .filter((n) => Number.isInteger(n) && n > 0),
      );
      scopedIds = scopedIds.filter((id) => requested.has(id));
    }

    const { due, fresh } = await flashcardsDb.countStudyPool(
      userId,
      scopedIds,
      settings.mastered_hide_from_review,
    );

    const payload: StudySessionResponse = { due_count: due, new_count: fresh };
    if (countsOnly) return NextResponse.json(payload);

    const dueCards =
      mode === 'new'
        ? []
        : await flashcardsDb.getDueInDecks(
            userId,
            scopedIds,
            reviewLimit,
            settings.mastered_hide_from_review,
          );
    const newCards =
      mode === 'review' ? [] : await flashcardsDb.getNewRandomInDecks(userId, scopedIds, newLimit);

    payload.cards = interleave(dueCards, newCards);
    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[study session] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
