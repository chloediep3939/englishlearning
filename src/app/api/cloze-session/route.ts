import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_COUNT = 10;
const MAX_COUNT = 30;

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const cnt = Number(url.searchParams.get('count'));
    const count = Number.isFinite(cnt) && cnt > 0
      ? Math.min(MAX_COUNT, Math.max(1, Math.floor(cnt)))
      : DEFAULT_COUNT;
    const deckIdParam = url.searchParams.get('deck_id');
    const deckId = deckIdParam ? Number(deckIdParam) : null;

    const db = await getDb();
    const sql = deckId
      ? `SELECT id FROM flashcards
         WHERE user_id = ?
         AND status IN ('learning', 'review')
         AND deck_id = ?
         ORDER BY RANDOM()
         LIMIT ?`
      : `SELECT id FROM flashcards
         WHERE user_id = ?
         AND status IN ('learning', 'review')
         ORDER BY RANDOM()
         LIMIT ?`;
    const stmt = db.prepare(sql);
    const result = deckId
      ? await stmt.bind(userId, deckId, count).all<{ id: number }>()
      : await stmt.bind(userId, count).all<{ id: number }>();
    return NextResponse.json({ card_ids: result.results.map((r) => r.id) });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[cloze-session] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
