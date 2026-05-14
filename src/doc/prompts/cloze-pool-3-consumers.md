<!-- Saved 2026-05-14 -->

# Cloze pool — Part 3/3: Wire up consumers

## Prerequisite

Parts 1 & 2 done. Table exists, `ensureClozePool()` works, background trigger fires on add word.

## Goal

Update 3 places to read from the pool instead of calling AI directly:
1. Cloze quiz endpoint
2. Compose suggest endpoint
3. Card example sentences display (UI)

Plus: add a new endpoint `/api/cloze/pool` that the card detail UI queries.

## Doc workflow

- Save this prompt to `src/doc/prompts/cloze-pool-3-consumers.md`.
- Append "Part 3" section to `src/doc/results/cloze-pool-result.md`.

## Pre-reading

Grep to find the actual paths:
- Cloze quiz endpoint: `grep -rn "generateClozeSentences" src/app/api/`
- Compose suggest: `src/app/api/compose/suggest/route.ts`
- Card detail UI: grep for where existing card examples are rendered.

## 1. Cloze quiz endpoint

Find the endpoint and the call to `generateClozeSentences`. Replace:

```ts
// Before:
const sentences = await generateClozeSentences(word);

// After:
import { flashcardClozePoolDb } from '@/lib/db';
import { ensureClozePool } from '@/lib/flashcards/cloze';

let sentences = await flashcardClozePoolDb.getByWord(word, N);

if (sentences.length < N) {
  // Lazy fallback: pool not ready (rare — only if user opens cloze quiz immediately
  // after add, before background gen finishes). Sync-generate now.
  await ensureClozePool(word, { minimum: N });
  sentences = await flashcardClozePoolDb.getByWord(word, N);
}
```

⚠️ If `sentences.length` is still 0 after fallback (AI failed) — don't 500; return the empty array. UI shows "Cloze chưa sẵn sàng, thử lại sau."

## 2. New endpoint: `/api/cloze/pool/route.ts`

GET endpoint, authed:

```ts
// src/app/api/cloze/pool/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/current-user';
import { flashcardClozePoolDb } from '@/lib/db';
import { ensureClozePool } from '@/lib/flashcards/cloze';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  await requireUserId();
  const url = new URL(req.url);
  const word = (url.searchParams.get('word') ?? '').trim().toLowerCase();
  const limitRaw = Number(url.searchParams.get('limit') ?? '3');
  const limit = Math.min(Math.max(1, isFinite(limitRaw) ? limitRaw : 3), 10);

  if (!word) {
    return NextResponse.json({ error: 'word required' }, { status: 400 });
  }

  let sentences = await flashcardClozePoolDb.getByWord(word, limit);
  if (sentences.length === 0) {
    // Lazy gen if pool empty (existing cards from before pool was added)
    await ensureClozePool(word, { minimum: limit });
    sentences = await flashcardClozePoolDb.getByWord(word, limit);
  }
  return NextResponse.json({ sentences });
}
```

## 3. Compose suggest endpoint

In `src/app/api/compose/suggest/route.ts`, replace AI call entirely:

```ts
import { flashcardClozePoolDb } from '@/lib/db';
import { ensureClozePool } from '@/lib/flashcards/cloze';

export async function POST(req: NextRequest) {
  await requireUserId();
  const { word } = await req.json();

  if (!word) {
    return NextResponse.json({ error: 'word required' }, { status: 400 });
  }

  let pool = await flashcardClozePoolDb.getByWord(word, 1);
  if (pool.length === 0) {
    await ensureClozePool(word, { minimum: 1 });
    pool = await flashcardClozePoolDb.getByWord(word, 1);
  }

  if (pool.length === 0) {
    return NextResponse.json({ suggestion: null, source: 'empty' });
  }

  const s = pool[0];
  return NextResponse.json({
    suggestion: s.sentence.replace('__', s.blank_word),
    source: 'cloze_pool',
  });
}
```

Remove the AI import and prompt from this file entirely.

## 4. Card detail — example sentences

Find where card examples are currently displayed (grep card detail components). Add a fetch to the new endpoint:

```ts
// In card detail client component (or server component if applicable):
const res = await fetch(`/api/cloze/pool?word=${encodeURIComponent(card.headword)}&limit=2`);
const { sentences } = await res.json() as { sentences: ClozeSentence[] };

// Render each as: sentence.replace('__', blank_word) — show the complete sentence,
// with the target word bolded or color-highlighted.
```

If card examples were previously stored in a column on the `flashcards` table (e.g. `examples_json`), STOP populating that column going forward — the data comes from the pool instead. Don't drop the column (per CLAUDE.md §9), just stop writing to it.

In `/api/cards/generate`, remove the "examples" field from the AI prompt. Saves tokens per card creation.

## Constraints

- All endpoints use `requireUserId()` for auth.
- `runtime = 'nodejs'` on new route.
- `apiJson` helper if the project uses it for client fetches — use it instead of raw `fetch`.
- Don't introduce new types — reuse `ClozeSentence` from Part 1.

## Verification

1. **Cloze quiz**: Open cloze quiz for a word with pool ≥ N → no AI call in logs. Sentences appear from pool.
2. **Card examples**: Open a card detail page → 1-2 sentences rendered, no AI call.
3. **Compose suggest**: Click suggest in compose page → 1 sentence rendered from pool, no AI call.
4. **Empty pool fallback**: Manually delete pool rows for a word, refresh card detail → AI fires (lazy gen), pool repopulates, sentences appear on next refresh.
5. `npm run build` passes.
6. Grep `generateClozeSentences(` — should only appear in `ensureClozePool`'s implementation. No other direct callers.

## Done

After Part 3 verified, the result file `src/doc/results/cloze-pool-result.md` should have all 3 sections filled. Report total AI calls eliminated (estimated).
