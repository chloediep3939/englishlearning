import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardsDb, flashcardDecksDb } from '@/lib/db';
import type { FlashcardExample, FlashcardCollocation, FlashcardImageAttribution } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const deckIdParam = url.searchParams.get('deck_id');
    const queryParam = url.searchParams.get('q')?.trim();
    const dueParam = url.searchParams.get('due');
    const newParam = url.searchParams.get('new');
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit')) || 100));

    if (dueParam === '1') {
      const cards = await flashcardsDb.getDueForReview(userId, limit, true);
      return NextResponse.json({ cards });
    }
    const sourcePassageIdParam = url.searchParams.get('source_passage_id');
    if (sourcePassageIdParam) {
      const passageId = Number(sourcePassageIdParam);
      if (!Number.isInteger(passageId) || passageId <= 0) {
        return NextResponse.json({ error: 'Invalid source_passage_id.' }, { status: 400 });
      }
      const cards = await flashcardsDb.listBySourcePassage(userId, passageId);
      return NextResponse.json({ cards });
    }
    if (newParam === '1') {
      const deckId = deckIdParam ? Number(deckIdParam) : null;
      const cards = await flashcardsDb.getNewForToday(
        userId,
        limit,
        Number.isInteger(deckId) && deckId! > 0 ? deckId : null
      );
      return NextResponse.json({ cards });
    }
    if (queryParam && queryParam.length > 0) {
      const cards = await flashcardsDb.search(userId, queryParam, limit);
      return NextResponse.json({ cards });
    }
    if (deckIdParam) {
      const deckId = Number(deckIdParam);
      if (!Number.isInteger(deckId) || deckId <= 0) {
        return NextResponse.json({ error: 'Invalid deck_id.' }, { status: 400 });
      }
      const cards = await flashcardsDb.getByDeck(userId, deckId, limit);
      return NextResponse.json({ cards });
    }
    // Bare `?limit=N` (no filter): return the user's most recent cards across
    // all decks. Used by F1 Luyện đọc when the user picks "Tất cả bộ từ".
    if (url.searchParams.has('limit')) {
      const cards = await flashcardsDb.getAll(userId, limit);
      return NextResponse.json({ cards });
    }
    return NextResponse.json(
      { error: 'Specify deck_id, q, due=1, new=1, source_passage_id, or limit.' },
      { status: 400 }
    );
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[cards GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

interface CreateCardBody {
  english?: unknown;
  vietnamese?: unknown;
  deck_id?: unknown;
  ipa?: unknown;
  part_of_speech?: unknown;
  audio_url?: unknown;
  examples?: unknown;
  image_url?: unknown;
  image_attribution?: unknown;
  notes?: unknown;
  collocations?: unknown;
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as CreateCardBody;

    const english = typeof body.english === 'string' ? body.english.trim() : '';
    const vietnamese = typeof body.vietnamese === 'string' ? body.vietnamese.trim() : '';
    if (english.length === 0 || english.length > 200) {
      return NextResponse.json({ error: 'Từ tiếng Anh không hợp lệ.' }, { status: 400 });
    }
    if (vietnamese.length === 0 || vietnamese.length > 500) {
      return NextResponse.json({ error: 'Nghĩa tiếng Việt không hợp lệ.' }, { status: 400 });
    }

    let deckId: number | undefined;
    if (body.deck_id !== undefined && body.deck_id !== null) {
      const n = Number(body.deck_id);
      if (!Number.isInteger(n) || n <= 0) {
        return NextResponse.json({ error: 'Invalid deck_id.' }, { status: 400 });
      }
      // Verify deck belongs to user
      const deck = await flashcardDecksDb.getById(userId, n);
      if (!deck) {
        return NextResponse.json({ error: 'Deck not found.' }, { status: 404 });
      }
      deckId = n;
    }

    const id = await flashcardsDb.create(userId, {
      english,
      vietnamese,
      deck_id: deckId,
      ipa: typeof body.ipa === 'string' && body.ipa.length > 0 ? body.ipa : null,
      part_of_speech:
        typeof body.part_of_speech === 'string' && body.part_of_speech.length > 0
          ? body.part_of_speech
          : null,
      audio_url:
        typeof body.audio_url === 'string' && body.audio_url.length > 0 ? body.audio_url : null,
      examples: Array.isArray(body.examples)
        ? (body.examples as FlashcardExample[]).filter((e) => e && typeof e.en === 'string')
        : undefined,
      image_url:
        typeof body.image_url === 'string' && body.image_url.length > 0 ? body.image_url : null,
      image_attribution: (body.image_attribution as FlashcardImageAttribution) ?? undefined,
      notes: typeof body.notes === 'string' && body.notes.length > 0 ? body.notes : null,
      collocations: Array.isArray(body.collocations)
        ? (body.collocations as FlashcardCollocation[]).filter(
            (c) => c && typeof c.phrase === 'string' && typeof c.word === 'string'
          )
        : undefined,
    });
    const card = await flashcardsDb.getById(userId, id);
    return NextResponse.json(card, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[cards POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
