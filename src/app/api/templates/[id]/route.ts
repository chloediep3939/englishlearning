import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { pteTemplatesDb } from '@/lib/templates/db';
import { extractSlots } from '@/lib/templates/slots';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_CHARS = 20;
const MAX_CHARS = 10_000;
const MAX_TITLE = 200;
const MAX_SLOTS = 40;
const MAX_NOTE = 2_000;

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const n = parseId(id);
    if (n === null) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
    const template = await pteTemplatesDb.getById(userId, n);
    if (!template) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json({ template });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[template GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const n = parseId(id);
    if (n === null) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const updates: Parameters<typeof pteTemplatesDb.update>[2] = {};

    if (typeof body.title === 'string') {
      const t = body.title.trim();
      if (t.length === 0) {
        return NextResponse.json({ error: 'Tên template rỗng.' }, { status: 400 });
      }
      updates.title = t.slice(0, MAX_TITLE);
    }
    if (typeof body.frame_text === 'string') {
      const frame = body.frame_text.trim();
      if (frame.length < MIN_CHARS || frame.length > MAX_CHARS) {
        return NextResponse.json(
          { error: `Khung phải dài từ ${MIN_CHARS} đến ${MAX_CHARS.toLocaleString('vi-VN')} ký tự.` },
          { status: 400 },
        );
      }
      const slots = extractSlots(frame);
      if (slots.length === 0) {
        return NextResponse.json(
          { error: 'Khung cần ít nhất một chỗ trống dạng [tên].' },
          { status: 400 },
        );
      }
      if (slots.length > MAX_SLOTS) {
        return NextResponse.json(
          { error: `Khung có quá nhiều chỗ trống (tối đa ${MAX_SLOTS}).` },
          { status: 400 },
        );
      }
      updates.frame_text = frame;
    }
    // Note clears to NULL when the client sends an empty string or null.
    if (typeof body.note === 'string' || body.note === null) {
      const n2 = typeof body.note === 'string' ? body.note.trim().slice(0, MAX_NOTE) : '';
      updates.note = n2.length > 0 ? n2 : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Không có trường hợp lệ để cập nhật.' }, { status: 400 });
    }

    const updated = await pteTemplatesDb.update(userId, n, updates);
    if (!updated) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json({ template: updated });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[template PATCH] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const n = parseId(id);
    if (n === null) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
    const ok = await pteTemplatesDb.deleteById(userId, n);
    if (!ok) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[template DELETE] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
