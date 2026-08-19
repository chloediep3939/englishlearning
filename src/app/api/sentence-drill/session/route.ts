import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardDecksDb, flashcardsDb, sentenceDrillsDb, userSettingsDb } from '@/lib/db';
import { fillExampleImage } from '@/lib/flashcards/example-image';
import type { SentenceStudyItem, SentenceStudyResponse, StudySessionMode } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODES: ReadonlySet<string> = new Set(['review', 'new', 'mix']);
/** Max background Pexels lookups per session start — keeps quota polite. */
const IMAGE_FILL_CAP = 10;

function clampLimit(raw: string | null, fallback: number): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return Math.min(n, 200);
}

/** Same proportional Anki-style merge as /api/study/session. */
function interleave<T>(due: T[], fresh: T[]): T[] {
  if (due.length === 0) return fresh;
  if (fresh.length === 0) return due;
  const total = due.length + fresh.length;
  const result: T[] = [];
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
 * GET /api/sentence-drill/session — queue builder for "Học câu".
 *   ?exampleIndex=0|1|2     (which example number the whole session drills)
 *   &mode=review|new|mix    (default mix)
 *   &deckIds=1,2,3          (optional — absent = all decks, empty = none)
 *   &reviewLimit=&newLimit= (defaults from study-session settings)
 *   &countsOnly=1           (pool counts only)
 *
 * Eligible sentence = card.examples[exampleIndex] with non-empty en AND vi
 * (the prompt IS the vi translation). Cards without that example are simply
 * skipped, per spec. Missing example images are backfilled from Pexels in
 * the background (capped) — they show up from the next session on.
 */
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);

    const modeRaw = url.searchParams.get('mode') ?? 'mix';
    if (!MODES.has(modeRaw)) {
      return NextResponse.json({ error: 'Invalid mode.' }, { status: 400 });
    }
    const mode = modeRaw as StudySessionMode;
    const exampleIndex = Number(url.searchParams.get('exampleIndex'));
    if (![0, 1, 2].includes(exampleIndex)) {
      return NextResponse.json({ error: 'Invalid exampleIndex.' }, { status: 400 });
    }
    const countsOnly = url.searchParams.get('countsOnly') === '1';

    const settings = await userSettingsDb.getFlashcardSettings(userId);
    const reviewLimit = clampLimit(url.searchParams.get('reviewLimit'), settings.session_review_limit);
    const newLimit = clampLimit(url.searchParams.get('newLimit'), settings.session_new_limit);

    // Deck scope — same ownership rule as /api/study/session: intersect the
    // requested ids with the user's own decks; absent param = all decks.
    // Recognition-only ("Chỉ hiểu nghĩa") decks are always excluded — the
    // sentence drill runs on full-study decks only.
    const allDecks = await flashcardDecksDb.getAll(userId);
    const deckIdsRaw = url.searchParams.get('deckIds');
    let scopedIds = allDecks.filter((d) => !d.recognition_only).map((d) => d.id);
    if (deckIdsRaw !== null) {
      const requested = new Set(
        deckIdsRaw
          .split(',')
          .map((s) => Number(s))
          .filter((n) => Number.isInteger(n) && n > 0),
      );
      scopedIds = scopedIds.filter((id) => requested.has(id));
    }

    const cards = await flashcardsDb.getWithExamplesInDecks(userId, scopedIds);
    const eligible = cards.filter((c) => {
      const ex = c.examples[exampleIndex];
      return !!ex && ex.en.trim().length > 0 && (ex.vi ?? '').trim().length > 0;
    });

    const drills = await sentenceDrillsDb.getForCards(
      userId,
      eligible.map((c) => c.id),
      exampleIndex,
    );

    const nowUtc = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const toItem = (c: (typeof eligible)[number]): SentenceStudyItem => {
      const d = drills.get(c.id);
      return {
        card_id: c.id,
        english: c.english,
        example_index: exampleIndex,
        example: c.examples[exampleIndex],
        drill: d
          ? {
              status: d.status,
              ease_factor: Number(d.ease_factor),
              interval_days: Number(d.interval_days),
              repetitions: Number(d.repetitions),
            }
          : { status: 'new', ease_factor: 2.5, interval_days: 0, repetitions: 0 },
      };
    };

    // Due = has a drill row past its schedule; fresh = never rated (no row /
    // still 'new'). Same semantics as the unified study pool.
    const dueAll = eligible
      .filter((c) => {
        const d = drills.get(c.id);
        return !!d && d.status !== 'new' && d.next_review_at !== null && d.next_review_at <= nowUtc;
      })
      .sort((a, b) => (drills.get(a.id)!.next_review_at! < drills.get(b.id)!.next_review_at! ? -1 : 1));
    const freshAll = eligible.filter((c) => {
      const d = drills.get(c.id);
      return !d || d.status === 'new';
    });

    const payload: SentenceStudyResponse = {
      due_count: dueAll.length,
      new_count: freshAll.length,
    };
    if (countsOnly) return NextResponse.json(payload);

    // Slice picks the most-overdue sentences; the shuffle below randomizes
    // their presentation order so deck order can't be predicted (bulk
    // imports share one next_review_at).
    const duePicked = mode === 'new' ? [] : dueAll.slice(0, reviewLimit);
    for (let i = duePicked.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [duePicked[i], duePicked[j]] = [duePicked[j], duePicked[i]];
    }
    const dueItems = duePicked.map(toItem);
    // Fisher–Yates on a copy; Math.random is intentional (fresh-order shuffle,
    // same rationale as getNewRandomInDecks).
    const freshShuffled = [...freshAll];
    for (let i = freshShuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [freshShuffled[i], freshShuffled[j]] = [freshShuffled[j], freshShuffled[i]];
    }
    const freshItems = mode === 'review' ? [] : freshShuffled.slice(0, newLimit).map(toItem);

    payload.items = interleave(dueItems, freshItems);

    // Background image backfill for queued sentences missing image_url.
    // Sequential + capped; per-card re-read before write so we never clobber
    // concurrent example edits with a stale copy.
    const needImages = payload.items
      .filter((it) => !it.example.image_url)
      .slice(0, IMAGE_FILL_CAP);
    if (needImages.length > 0) {
      const fillTask = (async () => {
        for (const it of needImages) {
          try {
            await fillExampleImage(userId, it.card_id, it.example_index);
          } catch (err) {
            console.error('[sentence-drill bg image] error:', err);
          }
        }
      })();
      try {
        const cf = await getCloudflareContext({ async: true });
        cf.ctx.waitUntil(fillTask);
      } catch {
        fillTask.catch(() => {});
      }
    }

    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[sentence-drill session] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
