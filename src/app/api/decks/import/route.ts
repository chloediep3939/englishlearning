import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardDecksDb, flashcardsDb } from '@/lib/db';
import type {
  FlashcardCollocation,
  FlashcardExample,
  FlashcardImageAttribution,
} from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ImportCard {
  english: string;
  vietnamese: string;
  ipa?: string | null;
  part_of_speech?: string | null;
  audio_url?: string | null;
  image_url?: string | null;
  image_attribution?: unknown;
  examples?: unknown;
  collocations?: unknown;
  notes?: string | null;
}

interface ImportPayload {
  version?: number;
  deck?: {
    name?: string;
    description?: string | null;
    color?: string;
    icon?: string | null;
    subtitle?: string | null;
  };
  cards?: ImportCard[];
}

interface ImportResult {
  deck_id: number;
  deck_name: string;
  inserted: number;
  skipped_dupe: number;
  skipped_invalid: number;
  total: number;
}

/**
 * Import one or more deck JSON files (each produced by
 * `GET /api/decks/[id]/export`).
 *
 * Body shape:
 *   {
 *     files: <export payload>[],   // one entry per JSON file
 *     mode: 'new' | 'existing',
 *     target_deck_id?: number,     // required when mode === 'existing'
 *   }
 *   (legacy single-file form `{ data: <payload>, ... }` is still accepted.)
 *
 * - `mode: 'new'`  → create ONE deck per file using that file's deck
 *   metadata (or a fallback name) and insert its cards under it.
 * - `mode: 'existing'` → require `target_deck_id`, verify ownership, and
 *   merge the cards from EVERY file into that single deck. Each file's deck
 *   metadata is ignored.
 *
 * Dedupe: within a file, only the first card per `english` is kept. Against
 *   the target deck (in existing mode this set accumulates across files)
 *   cards whose `english` already exists are skipped (case-insensitive trim).
 *
 * SRS state is NOT honored — every imported card starts as `new` with
 * fresh defaults. The export endpoint already omits SRS fields.
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => null)) as
      | {
          data?: ImportPayload;
          files?: ImportPayload[];
          mode?: 'new' | 'existing';
          target_deck_id?: number;
        }
      | null;

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
    }
    const mode = body.mode;
    if (mode !== 'new' && mode !== 'existing') {
      return NextResponse.json({ error: 'mode must be "new" or "existing".' }, { status: 400 });
    }

    // Accept the new `files[]` contract; fall back to a single legacy `data`.
    // Keep only payloads that actually carry a `cards` array.
    const rawPayloads: ImportPayload[] = Array.isArray(body.files)
      ? body.files
      : body.data
        ? [body.data]
        : [];
    const payloads = rawPayloads.filter(
      (p): p is ImportPayload => !!p && typeof p === 'object' && Array.isArray(p.cards),
    );
    if (payloads.length === 0) {
      return NextResponse.json({ error: 'File JSON không hợp lệ.' }, { status: 400 });
    }

    const results: ImportResult[] = [];

    if (mode === 'existing') {
      // One target deck; merge every file's cards into it.
      const t = Number(body.target_deck_id);
      if (!Number.isInteger(t) || t <= 0) {
        return NextResponse.json(
          { error: 'target_deck_id is required for mode=existing.' },
          { status: 400 },
        );
      }
      const target = await flashcardDecksDb.getById(userId, t);
      if (!target) {
        return NextResponse.json({ error: 'Deck đích không tồn tại.' }, { status: 404 });
      }

      // Existing headwords (case-insensitive). Shared across files so a word
      // already present — or inserted from an earlier file — is skipped.
      const existingCards = await flashcardsDb.listByDeck(userId, target.id, { limit: 5000 });
      const existingEnglish = new Set(existingCards.map((c) => c.english.trim().toLowerCase()));

      let inserted = 0;
      let skippedDupe = 0;
      let skippedInvalid = 0;
      let total = 0;
      for (const payload of payloads) {
        const cards = payload.cards ?? [];
        const r = await importCardsIntoDeck(userId, target.id, cards, existingEnglish);
        inserted += r.inserted;
        skippedDupe += r.skipped_dupe;
        skippedInvalid += r.skipped_invalid;
        total += cards.length;
      }
      results.push({
        deck_id: target.id,
        deck_name: target.name,
        inserted,
        skipped_dupe: skippedDupe,
        skipped_invalid: skippedInvalid,
        total,
      });
    } else {
      // New mode: one fresh deck per file, each deduped on its own.
      // Resolve every file's deck name first; files that share the same name
      // get numbered (" 1", " 2", …) so we don't create a pile of decks with
      // identical names (e.g. chunked exports of one big collocation list).
      const fallback = `Import ${new Date().toISOString().slice(0, 10)}`;
      const baseNames = payloads.map(
        (p) =>
          (typeof p.deck?.name === 'string' && p.deck.name.trim().slice(0, 80)) || fallback,
      );
      const nameCounts = new Map<string, number>();
      for (const n of baseNames) nameCounts.set(n, (nameCounts.get(n) ?? 0) + 1);
      const nameSeen = new Map<string, number>();

      for (let i = 0; i < payloads.length; i++) {
        const payload = payloads[i];
        const cards = payload.cards ?? [];
        const base = baseNames[i];
        // Only number names that actually collide within this batch.
        let name = base;
        if ((nameCounts.get(base) ?? 0) > 1) {
          const seq = (nameSeen.get(base) ?? 0) + 1;
          nameSeen.set(base, seq);
          name = `${seq}. ${base}`;
        }
        const deckId = await flashcardDecksDb.create(userId, {
          name,
          description:
            typeof payload.deck?.description === 'string' ? payload.deck.description : null,
          color: typeof payload.deck?.color === 'string' ? payload.deck.color : undefined,
          icon: typeof payload.deck?.icon === 'string' ? payload.deck.icon : null,
          subtitle: typeof payload.deck?.subtitle === 'string' ? payload.deck.subtitle : null,
        });
        const r = await importCardsIntoDeck(userId, deckId, cards, new Set<string>());
        results.push({
          deck_id: deckId,
          deck_name: name,
          inserted: r.inserted,
          skipped_dupe: r.skipped_dupe,
          skipped_invalid: r.skipped_invalid,
          total: cards.length,
        });
      }
    }

    return NextResponse.json({
      results,
      decks_created: mode === 'new' ? results.length : 0,
      total_inserted: results.reduce((a, r) => a + r.inserted, 0),
      total_skipped_dupe: results.reduce((a, r) => a + r.skipped_dupe, 0),
      total_skipped_invalid: results.reduce((a, r) => a + r.skipped_invalid, 0),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[deck import] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

/**
 * Insert `cards` into `deckId`, mutating `existingEnglish` as it goes.
 *
 * - Within this call, only the first card per `english` is kept.
 * - A card whose `english` is already in `existingEnglish` (the deck's
 *   headwords, possibly seeded by an earlier file) is skipped as a dupe.
 * Pass a fresh empty set for an isolated import; pass a shared set to merge
 * several files into one deck without re-inserting duplicates.
 */
async function importCardsIntoDeck(
  userId: number,
  deckId: number,
  cards: ImportCard[],
  existingEnglish: Set<string>,
): Promise<{ inserted: number; skipped_dupe: number; skipped_invalid: number }> {
  let inserted = 0;
  let skippedDupe = 0;
  let skippedInvalid = 0;

  for (const raw of cards) {
    if (!raw || typeof raw !== 'object') {
      skippedInvalid++;
      continue;
    }
    const english = typeof raw.english === 'string' ? raw.english.trim() : '';
    const vietnamese = typeof raw.vietnamese === 'string' ? raw.vietnamese.trim() : '';
    if (english.length === 0 || vietnamese.length === 0) {
      skippedInvalid++;
      continue;
    }
    const key = english.toLowerCase();
    if (existingEnglish.has(key)) {
      skippedDupe++;
      continue;
    }

    try {
      await flashcardsDb.create(userId, {
        deck_id: deckId,
        english: english.slice(0, 200),
        vietnamese: vietnamese.slice(0, 500),
        ipa: typeof raw.ipa === 'string' ? raw.ipa : null,
        part_of_speech: typeof raw.part_of_speech === 'string' ? raw.part_of_speech : null,
        audio_url: typeof raw.audio_url === 'string' ? raw.audio_url : null,
        image_url: typeof raw.image_url === 'string' ? raw.image_url : null,
        image_attribution: normalizeImageAttribution(raw.image_attribution),
        examples: normalizeExamples(raw.examples),
        collocations: normalizeCollocations(raw.collocations),
        notes: typeof raw.notes === 'string' ? raw.notes.slice(0, 2000) : null,
      });
      existingEnglish.add(key);
      inserted++;
    } catch (e) {
      console.error('[deck import] insert failed:', english, e);
      skippedInvalid++;
    }
  }

  return { inserted, skipped_dupe: skippedDupe, skipped_invalid: skippedInvalid };
}

// ─── normalizers ────────────────────────────────────────────────────────

function normalizeExamples(raw: unknown): FlashcardExample[] {
  if (!Array.isArray(raw)) return [];
  const out: FlashcardExample[] = [];
  for (const it of raw) {
    if (it && typeof it === 'object') {
      const en = (it as { en?: unknown }).en;
      const vi = (it as { vi?: unknown }).vi;
      if (typeof en === 'string' && en.trim()) {
        out.push({
          en: en.trim().slice(0, 500),
          ...(typeof vi === 'string' && vi.trim() ? { vi: vi.trim().slice(0, 500) } : {}),
        });
      }
    }
    if (out.length >= 5) break;
  }
  return out;
}

function normalizeCollocations(raw: unknown): FlashcardCollocation[] {
  if (!Array.isArray(raw)) return [];
  const out: FlashcardCollocation[] = [];
  for (const it of raw) {
    if (typeof it === 'string' && it.trim()) {
      out.push({ phrase: it.trim().slice(0, 200) });
    } else if (it && typeof it === 'object') {
      const phrase = (it as { phrase?: unknown }).phrase;
      const word = (it as { word?: unknown }).word;
      const position = (it as { position?: unknown }).position;
      if (typeof phrase === 'string' && phrase.trim()) {
        out.push({
          phrase: phrase.trim().slice(0, 200),
          ...(typeof word === 'string' ? { word } : {}),
          ...(position === 'before' || position === 'after' ? { position } : {}),
        });
      }
    }
    if (out.length >= 20) break;
  }
  return out;
}

function normalizeImageAttribution(raw: unknown): FlashcardImageAttribution | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const src = r.source;
  // Clamp the loose `string` source to the type's literal union; anything
  // else becomes "other" so the row still saves.
  const source: FlashcardImageAttribution['source'] =
    src === 'pexels' || src === 'unsplash' || src === 'other' ? src : 'other';
  return {
    source,
    author: typeof r.author === 'string' ? r.author : '',
    author_url: typeof r.author_url === 'string' ? r.author_url : '',
    source_url: typeof r.source_url === 'string' ? r.source_url : '',
  };
}
