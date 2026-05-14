import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { compositionsDb } from '@/lib/compositions/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const n = Number(id);
    if (!Number.isInteger(n) || n <= 0) {
      return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
    }
    const composition = await compositionsDb.getById(userId, n);
    if (!composition) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    return NextResponse.json({ composition });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[composition GET] error:', err);
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
    const n = Number(id);
    if (!Number.isInteger(n) || n <= 0) {
      return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
    }
    const ok = await compositionsDb.deleteById(userId, n);
    if (!ok) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[composition DELETE] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
