import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardDecksDb, flashcardsDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXPORT_VERSION = 1;

/**
 * Export a single deck (and its cards) as a JSON blob the user can
 * download and re-import later (or share with another account). SRS
 * state intentionally NOT included — re-import always treats cards as
 * fresh `new`, even when restoring your own backup. Keeps the contract
 * simple and prevents "I imported and lost my progress somehow".
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid deck id.' }, { status: 400 });
    }

    const deck = await flashcardDecksDb.getById(userId, id);
    if (!deck) {
      return NextResponse.json({ error: 'Deck not found.' }, { status: 404 });
    }

    const cards = await flashcardsDb.listByDeck(userId, id, { limit: 5000 });

    const payload = {
      version: EXPORT_VERSION,
      exported_at: new Date().toISOString(),
      deck: {
        name: deck.name,
        description: deck.description,
        color: deck.color,
        icon: deck.icon,
        subtitle: deck.subtitle,
      },
      cards: cards.map((c) => ({
        english: c.english,
        vietnamese: c.vietnamese,
        ipa: c.ipa,
        part_of_speech: c.part_of_speech,
        audio_url: c.audio_url,
        image_url: c.image_url,
        image_attribution: c.image_attribution,
        examples: c.examples,
        collocations: c.collocations,
        notes: c.notes,
      })),
    };

    // Sanitize filename: only ascii letters/digits/dash/underscore, fall back
    // to "deck" when the name becomes empty (e.g. all Vietnamese chars).
    const safeName =
      deck.name
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9-_]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 60) || 'deck';

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeName}.json"`,
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[deck export] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
