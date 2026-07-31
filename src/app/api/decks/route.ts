import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardDecksDb } from '@/lib/db';
import { DECK_ICON_OPTIONS } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await requireUserId();
    const decks = await flashcardDecksDb.getAllWithCounts(userId);
    return NextResponse.json({ decks });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[decks GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as {
      name?: unknown;
      description?: unknown;
      color?: unknown;
      icon?: unknown;
      subtitle?: unknown;
      recognition_only?: unknown;
    };

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length === 0 || name.length > 100) {
      return NextResponse.json({ error: 'Tên bộ từ không hợp lệ.' }, { status: 400 });
    }
    const description =
      typeof body.description === 'string' && body.description.length > 0
        ? body.description.slice(0, 500)
        : null;
    const color =
      typeof body.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(body.color)
        ? body.color
        : '#7ac143';
    const icon =
      typeof body.icon === 'string' && (DECK_ICON_OPTIONS as readonly string[]).includes(body.icon)
        ? body.icon
        : null;
    let subtitle: string | null = null;
    if (typeof body.subtitle === 'string') {
      const trimmed = body.subtitle.trim();
      subtitle = trimmed.length === 0 ? null : trimmed.slice(0, 60);
    }

    const recognition_only = body.recognition_only === true;

    const id = await flashcardDecksDb.create(userId, { name, description, color, icon, subtitle, recognition_only });
    const deck = await flashcardDecksDb.getById(userId, id);
    return NextResponse.json(deck, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[decks POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
