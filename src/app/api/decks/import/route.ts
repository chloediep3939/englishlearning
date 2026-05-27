import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardDecksDb, flashcardsDb } from '@/lib/db';
import type { FlashcardCollocation, FlashcardExample } from '@/lib/types';

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

/**
 * Import a deck JSON (produced by `GET /api/decks/[id]/export`).
 *
 * Body shape:
 *   { data: <export payload>, mode: 'new' | 'existing', target_deck_id?: number }
 *
 * - `mode: 'new'`  → create a deck using the payload's deck metadata (or a
 *   fallback name) and insert every card under it.
 * - `mode: 'existing'` → require `target_deck_id`, verify ownership, and
 *   insert cards there. The payload's deck metadata is ignored.
 *
 * Dedupe: within the import file, only the first card per `english` is
 *   kept. Within the target deck, cards whose `english` already exists
 *   are skipped (case-insensitive trim).
 *
 * SRS state is NOT honored — every imported card starts as `new` with
 * fresh defaults. The export endpoint already omits SRS fields.
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => null)) as
      | { data?: ImportPayload; mode?: 'new' | 'existing'; target_deck_id?: number }
      | null;

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
    }
    const mode = body.mode;
    if (mode !== 'new' && mode !== 'existing') {
      return NextResponse.json({ error: 'mode must be "new" or "existing".' }, { status: 400 });
    }
    const payload = body.data;
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.cards)) {
      return NextResponse.json({ error: 'File JSON không hợp lệ.' }, { status: 400 });
    }

    // Resolve target deck.
    let deckId: number;
    let deckName: string;
    if (mode === 'new') {
      const name =
        (typeof payload.deck?.name === 'string' && payload.deck.name.trim().slice(0, 80)) ||
        `Import ${new Date().toISOString().slice(0, 10)}`;
      deckId = await flashcardDecksDb.create(userId, {
        name,
        description: typeof payload.deck?.description === 'string' ? payload.deck.description : null,
        color: typeof payload.deck?.color === 'string' ? payload.deck.color : undefined,
        icon: typeof payload.deck?.icon === 'string' ? payload.deck.icon : null,
        subtitle: typeof payload.deck?.subtitle === 'string' ? payload.deck.subtitle : null,
      });
      deckName = name;
    } else {
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
      deckId = target.id;
      deckName = target.name;
    }

    // Existing english headwords in the target deck (case-insensitive) so we
    // can skip dupes even when importing into an already-populated deck.
    const existingCards = await flashcardsDb.listByDeck(userId, deckId, { limit: 5000 });
    const existingEnglish = new Set(
      existingCards.map((c) => c.english.trim().toLowerCase()),
    );

    // Dedupe the import file itself (first occurrence wins) so a sloppy
    // export doesn't double-insert.
    const seenInFile = new Set<string>();
    let inserted = 0;
    let skippedDupe = 0;
    let skippedInvalid = 0;

    for (const raw of payload.cards) {
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
      if (seenInFile.has(key)) {
        skippedDupe++;
        continue;
      }
      seenInFile.add(key);
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
          image_attribution: isImageAttribution(raw.image_attribution)
            ? raw.image_attribution
            : null,
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

    return NextResponse.json({
      deck_id: deckId,
      deck_name: deckName,
      inserted,
      skipped_dupe: skippedDupe,
      skipped_invalid: skippedInvalid,
      total: payload.cards.length,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[deck import] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
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

function isImageAttribution(raw: unknown): raw is {
  source?: string;
  author?: string;
  author_url?: string;
  source_url?: string;
} {
  return Boolean(raw && typeof raw === 'object');
}
