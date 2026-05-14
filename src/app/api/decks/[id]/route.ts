import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardDecksDb } from '@/lib/db';
import { DECK_ICON_OPTIONS } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });

    const deck = await flashcardDecksDb.getById(userId, id);
    if (!deck) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json(deck);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[deck GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as {
      name?: unknown;
      description?: unknown;
      color?: unknown;
      position?: unknown;
      icon?: unknown;
      subtitle?: unknown;
      is_default?: unknown;
    };
    const fields: Parameters<typeof flashcardDecksDb.update>[2] = {};
    if (typeof body.name === 'string') {
      const trimmed = body.name.trim();
      if (trimmed.length === 0 || trimmed.length > 100) {
        return NextResponse.json({ error: 'Tên bộ từ không hợp lệ.' }, { status: 400 });
      }
      fields.name = trimmed;
    }
    if (body.description === null) fields.description = null;
    else if (typeof body.description === 'string') fields.description = body.description.slice(0, 500);
    if (typeof body.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(body.color)) fields.color = body.color;
    if (typeof body.position === 'number' && Number.isFinite(body.position)) fields.position = Math.floor(body.position);
    if (body.icon === null) fields.icon = null;
    else if (typeof body.icon === 'string' && (DECK_ICON_OPTIONS as readonly string[]).includes(body.icon)) {
      fields.icon = body.icon;
    }
    if (body.subtitle === null) fields.subtitle = null;
    else if (typeof body.subtitle === 'string') {
      const trimmed = body.subtitle.trim();
      fields.subtitle = trimmed.length === 0 ? null : trimmed.slice(0, 60);
    }

    const existing = await flashcardDecksDb.getById(userId, id);
    if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    await flashcardDecksDb.update(userId, id, fields);

    // is_default flip lives in a dedicated wrapper so the
    // single-default-per-user invariant is preserved transactionally.
    // We only support setting (true) — there's no "no default" state.
    if (body.is_default === true) {
      await flashcardDecksDb.setDefault(userId, id);
    }

    const updated = await flashcardDecksDb.getById(userId, id);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[deck PUT] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });

    const existing = await flashcardDecksDb.getById(userId, id);
    if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    try {
      await flashcardDecksDb.delete(userId, id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[deck DELETE] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
