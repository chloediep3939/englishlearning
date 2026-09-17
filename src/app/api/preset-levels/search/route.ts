import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { presetDecksDb } from '@/lib/preset-decks/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/preset-levels/search?q=... — tìm cụm/từ trong toàn thư viện preset. */
export async function GET(req: Request) {
  try {
    await requireUserId();
    const q = new URL(req.url).searchParams.get('q') ?? '';
    const results = await presetDecksDb.search(q, 40);
    return NextResponse.json({ results });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[preset-levels search] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
