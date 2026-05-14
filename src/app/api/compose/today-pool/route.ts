import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardsDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const since = url.searchParams.get('since');
    const limitParam = url.searchParams.get('limit');

    if (!since) {
      return NextResponse.json({ error: 'Missing `since`.' }, { status: 400 });
    }
    if (Number.isNaN(Date.parse(since))) {
      return NextResponse.json({ error: 'Invalid `since`.' }, { status: 400 });
    }

    const limit = limitParam
      ? Math.min(100, Math.max(1, Number(limitParam) || 30))
      : 30;

    const cards = await flashcardsDb.getReviewedSince(userId, since, { limit });
    return NextResponse.json({ cards });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[compose today-pool] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
