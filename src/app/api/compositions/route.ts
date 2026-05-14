import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { compositionsDb } from '@/lib/compositions/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get('limit')) || 20),
    );
    const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
    const compositions = await compositionsDb.listByUser(userId, { limit, offset });
    return NextResponse.json({ compositions });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[compositions GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
