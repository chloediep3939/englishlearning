# SRS Audit — gathered files for bug diagnosis

> Collected on **2026-06-02**. This is a **gather-only** document — no code was
> changed. Purpose: provide enough source context to diagnose two reported bugs.
>
> - **Bug 1:** User is mid-study on a card (not yet rated), closes the
>   tab/browser, reopens — the card is marked as "learned/mastered".
> - **Bug 2:** The next day, no cards show up as due for review.

---

## srs.ts

`src/lib/flashcards/srs.ts` (full file):

```ts
import type { Flashcard, FlashcardStatus } from '@/lib/types';

const QUALITY_RATINGS = { again: 0, hard: 2, good: 4, easy: 5 } as const;
export type SRSQuality = (typeof QUALITY_RATINGS)[keyof typeof QUALITY_RATINGS];
export type ReviewQuality = SRSQuality;

/**
 * Compute the would-be next interval (in days) for each rating without
 * mutating the card. Used by the flashcard-session RevealStage to show
 * "ôn sau X" on the rating buttons so the learner sees what each choice
 * costs them in real time.
 *
 * Quality 0 ("Lại") returns 0 — same-session re-queue, not measured in days.
 */
export function previewIntervals(
  card: Flashcard,
  opts: { failedThisSession?: boolean } = {},
): Record<SRSQuality, number> {
  return {
    0: 0,
    2: calculateNextReview(card, 2, opts).interval_days,
    4: calculateNextReview(card, 4, opts).interval_days,
    5: calculateNextReview(card, 5, opts).interval_days,
  };
}

/**
 * Human-readable label for a day count.
 *   0      → "< 1 phút" (same-session retry)
 *   1      → "1 ngày"
 *   30+    → "1 tháng"
 *   365+   → "1 năm"
 */
export function intervalLabel(days: number): string {
  if (days === 0) return '< 1 phút';
  if (days < 30) return `${days} ngày`;
  if (days < 365) {
    const m = Math.round(days / 30);
    return `${m} tháng`;
  }
  const y = Math.round(days / 365);
  return `${y} năm`;
}

export interface SRSUpdate {
  status: FlashcardStatus;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string;
  prev_interval: number;
}

/**
 * Standard SM-2 algorithm with 4-button rating (again/hard/good/easy).
 * Returns next review state given current card state + user rating.
 *
 * - quality 0 (again): reset reps, 1 minute later
 * - quality 2 (hard):  same interval × 1.2, EF -0.15
 * - quality 4 (good):  interval × EF, EF unchanged
 * - quality 5 (easy):  interval × EF × 1.3, EF +0.15
 *
 * Mastered gate (count-based, runs after SM-2). `failedThisSession` is
 * scoped to a single FlashcardSession run — it does NOT persist across
 * sessions, so each new session starts the learner on the cleaner
 * 2-correct path.
 * - quality 5 (DỄ)                            → mastered immediately
 * - reps >= 2 AND !failedThisSession          → mastered (clean run, 2 corrects)
 * - reps >= 3                                 → mastered (had a wrong, need 3 corrects)
 * - interval >= 60                            → mastered (safety cap)
 */
export function calculateNextReview(
  card: Flashcard,
  quality: SRSQuality,
  opts: { failedThisSession?: boolean } = {},
): SRSUpdate {
  const prev_interval = card.interval_days;
  let ease = card.ease_factor;
  let interval = card.interval_days;
  let reps = card.repetitions;
  let status: FlashcardStatus = card.status;
  const failedThisSession = opts.failedThisSession === true || quality === 0;

  if (quality === 0) {
    reps = 0;
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
    status = 'learning';
  } else {
    reps += 1;
    if (reps === 1) {
      interval = 1;
      status = 'learning';
    } else if (reps === 2) {
      interval = quality === 2 ? 2 : quality === 4 ? 3 : 4;
      status = 'review';
    } else {
      const mult = quality === 2 ? 1.2 : quality === 4 ? ease : ease * 1.3;
      interval = Math.max(1, Math.round(interval * mult));
      status = 'review';
    }
    if (quality === 2) ease = Math.max(1.3, ease - 0.15);
    else if (quality === 5) ease = ease + 0.15;
  }

  if (quality === 5) status = 'mastered';
  else if (reps >= 3) status = 'mastered';
  else if (reps >= 2 && !failedThisSession) status = 'mastered';
  else if (interval >= 60) status = 'mastered';

  const next = new Date();
  if (quality === 0) {
    next.setMinutes(next.getMinutes() + 1);
  } else {
    next.setDate(next.getDate() + interval);
  }
  // ISO format: "YYYY-MM-DD HH:MM:SS"
  const next_review_at = next.toISOString().replace('T', ' ').slice(0, 19);

  return {
    status,
    ease_factor: Math.round(ease * 100) / 100,
    interval_days: interval,
    repetitions: reps,
    next_review_at,
    prev_interval,
  };
}
```

---

## Schema

The live schema is `migrations/0004_flashcards_multiuser.sql` — it **drops and
recreates** the tables originally defined in `0002_flashcards.sql`, so 0004 is
authoritative for `flashcards` and `flashcard_reviews`. (Later migrations
`0008_decks_polish.sql` and `0012_oxford_audio.sql` add columns like `icon`,
`subtitle`, `audio_us_key`, `audio_us_status`, `source_passage_id`,
`source_context` — none touch SRS fields.)

`migrations/0004_flashcards_multiuser.sql` (full file):

```sql
-- ============================================================================
-- M1a-multiuser: replace single-user flashcard schema (from 0002) with
-- user-scoped tables. Drop+recreate is safe: 0002 only seeded one default
-- deck row, which we no longer want (default decks are created lazily per
-- user via `flashcardDecksDb.ensureDefault(userId)`).
-- ============================================================================

DROP TABLE IF EXISTS flashcard_practice_sentences;
DROP TABLE IF EXISTS flashcard_test_attempts;
DROP TABLE IF EXISTS flashcard_reviews;
DROP TABLE IF EXISTS flashcards;
DROP TABLE IF EXISTS flashcard_decks;

-- Decks (user-scoped)
CREATE TABLE flashcard_decks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#7ac143',
  position INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX idx_decks_user ON flashcard_decks(user_id);
CREATE INDEX idx_decks_user_position ON flashcard_decks(user_id, position);

-- Cards (user-scoped via deck; user_id denormalised for query simplicity)
CREATE TABLE flashcards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id INTEGER NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  english TEXT NOT NULL,
  vietnamese TEXT NOT NULL,
  ipa TEXT,
  part_of_speech TEXT,
  audio_url TEXT,
  examples TEXT,
  image_url TEXT,
  image_attribution TEXT,
  notes TEXT,
  collocations TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','learning','review','mastered')),
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT,
  last_reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX idx_cards_user        ON flashcards(user_id);
CREATE INDEX idx_cards_user_deck   ON flashcards(user_id, deck_id);
CREATE INDEX idx_cards_user_status ON flashcards(user_id, status);
CREATE INDEX idx_cards_next_review ON flashcards(user_id, next_review_at);

-- Reviews
CREATE TABLE flashcard_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flashcard_id INTEGER NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quality INTEGER NOT NULL CHECK(quality IN (0,2,4,5)),
  prev_interval INTEGER NOT NULL DEFAULT 0,
  new_interval INTEGER NOT NULL DEFAULT 0,
  reviewed_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX idx_reviews_card      ON flashcard_reviews(flashcard_id);
CREATE INDEX idx_reviews_user_date ON flashcard_reviews(user_id, reviewed_at);

-- Test attempts
CREATE TABLE flashcard_test_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flashcard_id INTEGER NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK(mode IN ('speed','cloze','pronunciation','sentence')),
  passed INTEGER NOT NULL,
  time_ms INTEGER,
  metadata TEXT,
  attempted_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX idx_attempts_card ON flashcard_test_attempts(flashcard_id);
CREATE INDEX idx_attempts_user_mode_date ON flashcard_test_attempts(user_id, mode, attempted_at);

-- Practice sentences (Cloze pool — FK to card, no user_id needed; ownership checked via card)
CREATE TABLE flashcard_practice_sentences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flashcard_id INTEGER NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  sentence TEXT NOT NULL,
  vi_translation TEXT,
  times_shown INTEGER NOT NULL DEFAULT 0,
  last_shown_at TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX idx_practice_card ON flashcard_practice_sentences(flashcard_id, times_shown);
```

**Key schema facts for the bugs:** `next_review_at TEXT` has **no default → NULL**
for new cards. `status` defaults to `'new'`. `interval_days` defaults to `0`,
`repetitions` to `0`, `ease_factor` to `2.5`.

---

## recordRating grep

```
src/app/api/cards/generate/route.ts:4      (generateCardData import — unrelated)
src/app/api/cards/from-passage/route.ts:5  (generateCardData import — unrelated)
src/app/api/cards/[id]/rate/route.ts:36     const result = await flashcardReviewsDb.recordRating(
src/app/api/sentence/timeout/route.ts:19    await flashcardReviewsDb.recordRating(userId, flashcardId, 2);
src/components/flashcard-session/types.ts:4 // SM-2 quality buckets. Matches `recordRating` in @/lib/db.
src/lib/db.ts:635                           async recordRating(
```

The rate/review function lives in **`src/lib/db.ts`** (`flashcardReviewsDb.recordRating`
+ `flashcardsDb.updateSRS`).

---

## recordRating file: `src/lib/db.ts` (SRS-relevant slice)

```ts
  async getDueForReview(
    userId: number,
    limit: number = 50,
    exclude_mastered: boolean = true,
    deck_id: number | null = null,
  ): Promise<Flashcard[]> {
    const db = await getDb();
    const masteredClause = exclude_mastered ? "AND status != 'mastered'" : '';
    const deckClause = deck_id ? 'AND deck_id = ?' : '';
    // NULL next_review_at = brand-new card never reviewed → treat as "due now"
    // so it shows in /review. The previous `IS NOT NULL` filter excluded these
    // entirely, which is why /review appeared empty for users whose only cards
    // were freshly added. NULLS FIRST is the natural ordering since they
    // haven't been scheduled yet.
    const stmt = db.prepare(
      `SELECT * FROM flashcards
       WHERE user_id = ?
       AND (next_review_at IS NULL OR next_review_at <= datetime('now'))
       ${masteredClause}
       ${deckClause}
       ORDER BY next_review_at IS NULL DESC, next_review_at ASC
       LIMIT ?`,
    );
    const result = deck_id
      ? await stmt.bind(userId, deck_id, limit).all<Record<string, unknown>>()
      : await stmt.bind(userId, limit).all<Record<string, unknown>>();
    return result.results.map((r) => hydrateCard(r)!).filter(Boolean);
  },

  // ... getReviewedSince, getAll ...

  async getNewForToday(userId: number, limit: number = 10, deck_id: number | null = null): Promise<Flashcard[]> {
    const db = await getDb();
    const sql = deck_id
      ? `SELECT * FROM flashcards WHERE user_id = ? AND status = 'new' AND deck_id = ? ORDER BY created_at ASC LIMIT ?`
      : `SELECT * FROM flashcards WHERE user_id = ? AND status = 'new' ORDER BY created_at ASC LIMIT ?`;
    const stmt = db.prepare(sql);
    const result = deck_id
      ? await stmt.bind(userId, deck_id, limit).all<Record<string, unknown>>()
      : await stmt.bind(userId, limit).all<Record<string, unknown>>();
    return result.results.map((r) => hydrateCard(r)!).filter(Boolean);
  },

  async create(userId: number, input: Partial<Flashcard> & { english: string; vietnamese: string }): Promise<number> {
    const db = await getDb();
    const deckId = input.deck_id ?? (await flashcardDecksDb.ensureDefault(userId));
    const result = await db
      .prepare(
        `INSERT INTO flashcards (
           user_id, deck_id, english, vietnamese, ipa, part_of_speech, audio_url,
           audio_us_key, audio_us_status,
           examples, image_url, image_attribution, notes, collocations,
           status, source_passage_id, source_context
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        userId, deckId, input.english, input.vietnamese,
        input.ipa ?? null, input.part_of_speech ?? null, input.audio_url ?? null,
        input.audio_us_key ?? null, input.audio_us_status ?? null,
        input.examples ? JSON.stringify(input.examples) : null,
        input.image_url ?? null,
        input.image_attribution ? JSON.stringify(input.image_attribution) : null,
        input.notes ?? null,
        input.collocations ? JSON.stringify(input.collocations) : null,
        input.status ?? 'new',
        input.source_passage_id ?? null,
        input.source_context ?? null
      )
      .run();
    return Number(result.meta.last_row_id);
  },
  // NOTE: `next_review_at` and `last_reviewed_at` are NOT in the INSERT column
  // list → they default to NULL for every newly created card.

  async updateSRS(userId: number, id: number, fields: { status?: FlashcardStatus; ease_factor: number; interval_days: number; repetitions: number; next_review_at: string; last_reviewed_at: string }): Promise<void> {
    const db = await getDb();
    await db
      .prepare(
        `UPDATE flashcards
         SET status = COALESCE(?, status),
             ease_factor = ?,
             interval_days = ?,
             repetitions = ?,
             next_review_at = ?,
             last_reviewed_at = ?,
             updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`
      )
      .bind(
        fields.status ?? null,
        fields.ease_factor,
        fields.interval_days,
        fields.repetitions,
        fields.next_review_at,
        fields.last_reviewed_at,
        id,
        userId
      )
      .run();
  },

// ============================================================================
// Reviews
// ============================================================================

export class CardNotFoundError extends Error {
  constructor() {
    super('Card not found');
    this.name = 'CardNotFoundError';
  }
}

export const flashcardReviewsDb = {
  async create(userId: number, input: { flashcard_id: number; quality: 0 | 2 | 4 | 5; prev_interval: number; new_interval: number }): Promise<number> {
    const db = await getDb();
    const result = await db
      .prepare(
        `INSERT INTO flashcard_reviews (user_id, flashcard_id, quality, prev_interval, new_interval)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(userId, input.flashcard_id, input.quality, input.prev_interval, input.new_interval)
      .run();
    return Number(result.meta.last_row_id);
  },

  /**
   * Apply an SM-2 rating to a card: compute next interval, insert a
   * flashcard_reviews row, and update the card's SRS state. Single source of
   * truth for both `/api/cards/[id]/rate` and `/api/sentence/timeout`.
   * Throws CardNotFoundError when the card is missing / not owned by user.
   */
  async recordRating(
    userId: number,
    flashcardId: number,
    quality: SRSQuality,
    opts: { failedThisSession?: boolean } = {},
  ): Promise<{ prev_interval: number; new_interval: number; next_review_at: string; new_status: FlashcardStatus }> {
    const card = await flashcardsDb.getById(userId, flashcardId);
    if (!card) throw new CardNotFoundError();

    const update = calculateNextReview(card, quality, opts);

    await flashcardsDb.updateSRS(userId, flashcardId, {
      status: update.status,
      ease_factor: update.ease_factor,
      interval_days: update.interval_days,
      repetitions: update.repetitions,
      next_review_at: update.next_review_at,
      last_reviewed_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    });
    await flashcardReviewsDb.create(userId, {
      flashcard_id: flashcardId,
      quality,
      prev_interval: update.prev_interval,
      new_interval: update.interval_days,
    });

    return {
      prev_interval: update.prev_interval,
      new_interval: update.interval_days,
      next_review_at: update.next_review_at,
      new_status: update.status,
    };
  },
```

The HTTP entry point, `src/app/api/cards/[id]/rate/route.ts` (full file):

```ts
import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardsDb, flashcardReviewsDb, CardNotFoundError } from '@/lib/db';
import type { SRSQuality } from '@/lib/flashcards/srs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_QUALITIES = new Set([0, 2, 4, 5]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id: rawId } = await params;
    const cardId = Number(rawId);
    if (!Number.isInteger(cardId) || cardId <= 0) {
      return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      quality?: unknown;
      failed_this_session?: unknown;
    };
    const quality = Number(body.quality);
    if (!VALID_QUALITIES.has(quality)) {
      return NextResponse.json(
        { error: 'Quality must be 0, 2, 4, or 5.' },
        { status: 400 }
      );
    }
    const failedThisSession = body.failed_this_session === true;

    const result = await flashcardReviewsDb.recordRating(
      userId,
      cardId,
      quality as SRSQuality,
      { failedThisSession },
    );

    const updated = await flashcardsDb.getById(userId, cardId);
    return NextResponse.json({
      card: updated,
      prev_interval: result.prev_interval,
      new_interval: result.new_interval,
      next_review_at: result.next_review_at,
      new_status: result.new_status,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (err instanceof CardNotFoundError) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    console.error('[card rate] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
```

---

## Due cards grep

```
src/app/dashboard/page.tsx:40           AND (next_review_at IS NULL OR next_review_at <= datetime('now'))
src/app/api/stats/route.ts:21           AND (next_review_at IS NULL OR next_review_at <= datetime('now'))
src/app/stats/page.tsx:19               AND (next_review_at IS NULL OR next_review_at <= datetime('now'))
src/app/api/cards/[id]/rate/route.ts:48   next_review_at: result.next_review_at,
src/lib/types.ts:122                    next_review_at: string | null;
src/lib/demo/seed-user.ts:140 / :171      next_review_at = ?,
src/lib/flashcards/srs.ts:50 / :118 / :125
src/lib/db.ts:201      SUM(CASE WHEN c.next_review_at IS NULL OR c.next_review_at <= datetime('now') ...)  (deck due_count)
src/lib/db.ts:379–390  getDueForReview WHERE (next_review_at IS NULL OR next_review_at <= datetime('now'))
src/lib/db.ts:558–583  updateSRS
```

## Due cards file: `src/lib/db.ts`

The due-cards query (`getDueForReview`) and new-cards query (`getNewForToday`)
are both in the **recordRating file** slice above. The list each page receives:

- **`/study`** → `flashcardsDb.getNewForToday(userId, 1000, deckFilter)` — filters
  `status = 'new'`, ordered `created_at ASC`. **Does not look at `next_review_at`.**
- **`/review`** → `flashcardsDb.getDueForReview(userId, 50, mastered_hide, deckFilter)`
  — `WHERE (next_review_at IS NULL OR next_review_at <= datetime('now'))`, excludes
  `mastered` when the setting is on.

---

## study/page.tsx

`src/app/study/page.tsx` (data logic; static markup trimmed):

```tsx
export const dynamic = 'force-dynamic';

import SessionFlow from '@/components/flashcard-session/SessionFlow';
import DeckPickerStep, { DeckEyebrow } from '@/components/flashcard-session/DeckPickerStep';
import { requireUserId } from '@/lib/current-user';
import { flashcardsDb, flashcardDecksDb, userSettingsDb } from '@/lib/db';

export default async function StudyPage({ searchParams }: StudyPageProps) {
  const { deck_id } = await searchParams;
  const userId = await requireUserId();
  const settings = await userSettingsDb.getFlashcardSettings(userId);
  const decks = await flashcardDecksDb.getAllWithCounts(userId);

  const showDeckPicker = decks.length > 1 && deck_id === undefined;

  const deckFilter: number | null =
    deck_id && deck_id !== 'all' && /^\d+$/.test(deck_id) ? Number(deck_id) : null;

  const cards = showDeckPicker
    ? []
    : await flashcardsDb.getNewForToday(userId, 1000, deckFilter);

  // ... render: DeckPickerStep | StudyEmpty | <SessionFlow mode="study" initialCards={cards} defaultPick={settings.daily_new_limit} />
}
```

`StudyEmpty()` is a static empty state (mascot + "Hôm nay chưa có từ mới" + Add /
Dashboard links). No SRS logic.

---

## review/page.tsx

`src/app/review/page.tsx` (data logic; static markup trimmed):

```tsx
export const dynamic = 'force-dynamic';

import SessionFlow from '@/components/flashcard-session/SessionFlow';
import DeckPickerStep, { DeckEyebrow } from '@/components/flashcard-session/DeckPickerStep';
import { requireUserId } from '@/lib/current-user';
import { flashcardsDb, flashcardDecksDb, userSettingsDb } from '@/lib/db';

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const { deck_id } = await searchParams;
  const userId = await requireUserId();
  const settings = await userSettingsDb.getFlashcardSettings(userId);
  const decks = await flashcardDecksDb.getAllWithCounts(userId);

  const showDeckPicker = decks.length > 1 && deck_id === undefined;

  const deckFilter: number | null =
    deck_id && deck_id !== 'all' && /^\d+$/.test(deck_id) ? Number(deck_id) : null;

  const cards = showDeckPicker
    ? []
    : await flashcardsDb.getDueForReview(
        userId,
        50,
        settings.mastered_hide_from_review,
        deckFilter,
      );

  // ... render: DeckPickerStep | ReviewEmpty | <SessionFlow mode="review" initialCards={cards} />
}
```

`ReviewEmpty()` is a static empty state ("Bún đang ngủ — hôm nay chưa có thẻ nào
cần ôn tập 💤"). No SRS logic.

---

## Session component: `src/components/flashcard-session/SessionFlow.tsx`

(full file)

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FlashcardSession from './FlashcardSession';
import SessionPicker from './SessionPicker';
import { reviewConfig, studyConfig } from './configs';
import type { SessionMode } from './types';
import type { Flashcard } from '@/lib/types';

interface Props {
  mode: SessionMode;
  initialCards: Flashcard[];
  defaultPick?: number;
}

type Stage = 'picking' | 'studying';

export default function SessionFlow({ mode, initialCards, defaultPick }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('picking');
  const [selected, setSelected] = useState<Flashcard[]>([]);
  const [candidates, setCandidates] = useState<Flashcard[]>(initialCards);

  useEffect(() => {
    setCandidates(initialCards);
  }, [initialCards]);

  const config = mode === 'study' ? studyConfig : reviewConfig;

  const handleStart = useCallback((picked: Flashcard[]) => {
    setSelected(picked);
    setStage('studying');
  }, []);

  const handleAnotherSession = useCallback(() => {
    router.refresh();
    setStage('picking');
    setSelected([]);
  }, [router]);

  if (stage === 'picking') {
    return (
      <SessionPicker mode={mode} candidates={candidates} onStart={handleStart} defaultPick={defaultPick} />
    );
  }
  return (
    <FlashcardSession cards={selected} config={config} onAnotherSession={handleAnotherSession} />
  );
}
```

---

## Session component: `src/components/flashcard-session/FlashcardSession.tsx`

Core session state owner. The header docblock states explicitly:
*"Reload mid-session: state is in memory only. Acceptable v1 trade-off."*

The **only** code path that POSTs to `/api/cards/[id]/rate` is `handleRate`,
fired solely on an explicit user rating (button click or `1`/`2`/`3`/`4`/`Enter`
during the REVEAL phase):

```tsx
  const handleRate = useCallback(
    (quality: Quality) => {
      if (!current) return;
      setQualityCounts((prev) => ({ ...prev, [quality]: prev[quality] + 1 }));

      if (quality === 0) {
        failedThisSessionRef.current.add(current.id);
        correctCountRef.current.set(current.id, 0);
      } else {
        const prev = correctCountRef.current.get(current.id) ?? 0;
        correctCountRef.current.set(current.id, prev + 1);
      }
      const failedThisSession = failedThisSessionRef.current.has(current.id);
      const correctCount = correctCountRef.current.get(current.id) ?? 0;

      void fetch(`/api/cards/${current.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quality, failed_this_session: failedThisSession }),
      })
        .then((res) => { if (!res.ok) { /* show transient error */ } })
        .catch(() => { /* show transient error */ });

      const shouldMaster =
        quality === 5 || correctCount >= 3 || (correctCount >= 2 && !failedThisSession);

      if (shouldMaster) {
        setMastered((prev) => new Set(prev).add(current.id));
        setQueue((prev) => prev.slice(1));
      } else {
        const offset = REQUEUE_OFFSET[quality]!;
        setQueue((prev) => {
          const rest = prev.slice(1);
          const insertAt = Math.min(offset, rest.length);
          return [...rest.slice(0, insertAt), current, ...rest.slice(insertAt)];
        });
      }
      // reset typing state; router.refresh() if this rate emptied the queue
    },
    [current, queue.length, router]
  );
```

The three `useEffect`s in this component are: (1) autofocus on TYPING phase,
(2) audio autoplay on REVEAL entry (cleanup cancels audio / `speechSynthesis`
only — does NOT rate), (3) window `keydown` listener for REVEAL-phase keys +
`Escape` (which only does `window.confirm('Thoát luôn?')` → `router.push('/dashboard')`).
**No `beforeunload` / `visibilitychange` / `pagehide` listener exists.**

---

## Q1 — Server timezone: **UTC default (Cloudflare Workers).**

No timezone configured in `wrangler.jsonc` (grep for `timezone`/`TZ`/`tz`
returned nothing). All server-side time uses UTC: `srs.ts` uses `new Date()` +
`.toISOString()` (UTC), and all queries use SQLite `datetime('now')` (UTC).

> ⚠️ `getReviewedSince` (dashboard "reviewed today" strip) deliberately delegates
> "start of today" to the **client's local timezone** via a passed ISO cutoff —
> a known UTC-server / local-client split in that one path. The `/review` due
> query itself is pure UTC.

## Q2 — Auto-fire on exit: **None. Nothing auto-fires on tab close / unmount.**

- No `beforeunload`, `visibilitychange`, or `pagehide` listeners anywhere in
  `src/components/flashcard-session/` (or the rest of `src/`, per grep).
- `FlashcardSession` docblock: *"Reload mid-session: state is in memory only.
  Acceptable v1 trade-off."*
- The **only** client call site that POSTs `/api/cards/[id]/rate` is `handleRate`,
  fired solely on an explicit user rating.
- The autoplay `useEffect` cleanup only cancels audio / `speechSynthesis`.

> ⚠️ The one *other* server path that calls `recordRating` is
> `POST /api/sentence/timeout` (`src/app/api/sentence/timeout/route.ts`), which
> fires `recordRating(userId, flashcardId, 2)` (a "hard" pass) on the **Sentence**
> quiz timer — a different feature, but a server route that mutates SRS state
> without an explicit rate. Worth knowing about.

## Q3 — When is `next_review` set for a new card: **NULL at creation; set only on first rating.**

- `flashcardsDb.create` (`src/lib/db.ts`) omits `next_review_at` and
  `last_reviewed_at` from the INSERT column list → SQLite stores **NULL**
  (schema: `next_review_at TEXT` with no `DEFAULT`).
- A new card is therefore: `status='new'`, `interval_days=0`, `repetitions=0`,
  `ease_factor=2.5`, `next_review_at=NULL`, `last_reviewed_at=NULL`.
- `next_review_at` is first written by `flashcardsDb.updateSRS`, called only from
  `recordRating` (i.e. on the first rating). No `NOW()`/`+1 day` default seeding.

> ⚠️ Consequence pair worth flagging (mechanism, not a fix):
> - `getDueForReview` treats `next_review_at IS NULL` as **"due now"**, so a
>   brand-new, never-rated card appears in `/review` immediately.
> - `getNewForToday` filters `status = 'new'` and ignores `next_review_at`
>   entirely.

---

## Not yet gathered (available on request)

- Full bodies of `SessionPicker.tsx` and `SummaryScreen.tsx` (only their
  relevant comments were read, not the full component logic).
- `userSettingsDb.getFlashcardSettings` — to confirm the default of
  `mastered_hide_from_review` (affects whether `mastered` cards are filtered out
  of `/review`).
