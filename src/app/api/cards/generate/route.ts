import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { generateCardData } from '@/lib/flashcards/generate';
import { flashcardsDb, flashcardDecksDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();

    const body = (await req.json().catch(() => ({}))) as {
      english?: unknown;
      image_skip?: unknown;
      skip_image?: unknown;
      deck_id?: unknown;
    };
    const english = typeof body.english === 'string' ? body.english.trim() : '';
    if (english.length === 0 || english.length > 100) {
      return NextResponse.json({ error: 'Từ tiếng Anh không hợp lệ.' }, { status: 400 });
    }
    const imageSkip = Number(body.image_skip) || 0;
    const skipImage = body.skip_image === true;

    // Optional persist-on-generate path (used by bulk import). When deck_id is
    // present, we both generate and save in one shot — the single-word UI keeps
    // the two-step flow and never passes deck_id here.
    let deckId: number | null = null;
    if (body.deck_id !== undefined && body.deck_id !== null && body.deck_id !== '') {
      const n = Number(body.deck_id);
      if (!Number.isInteger(n) || n <= 0) {
        return NextResponse.json({ error: 'Invalid deck_id.' }, { status: 400 });
      }
      const deck = await flashcardDecksDb.getById(userId, n);
      if (!deck) {
        return NextResponse.json({ error: 'Deck not found.' }, { status: 404 });
      }
      deckId = n;
    }

    const data = await generateCardData(english, imageSkip, skipImage);

    if (deckId !== null) {
      const vi = (data.vietnamese ?? '').trim();
      if (vi.length === 0) {
        return NextResponse.json(
          { error: 'Không sinh được nghĩa tiếng Việt cho từ này.' },
          { status: 422 }
        );
      }
      const id = await flashcardsDb.create(userId, {
        deck_id: deckId,
        english,
        vietnamese: vi,
        ipa: data.ipa,
        part_of_speech: data.part_of_speech,
        audio_url: data.audio_url,
        examples: data.examples,
        collocations: data.collocations,
        image_url: data.image_url,
        image_attribution: data.image_attribution,
        notes: null,
      });
      const card = await flashcardsDb.getById(userId, id);
      return NextResponse.json({ saved: true, card }, { status: 201 });
    }

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[card generate] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
