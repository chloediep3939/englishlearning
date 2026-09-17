import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { pronunciationProgressDb } from '@/lib/db';
import { getSound } from '@/lib/pronunciation/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Action = 'complete' | 'uncomplete' | 'score';
const VALID_ACTIONS = new Set<Action>(['complete', 'uncomplete', 'score']);

export async function GET() {
  try {
    const userId = await requireUserId();
    const progress = await pronunciationProgressDb.getAll(userId);
    return NextResponse.json({ progress });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[pronunciation/progress GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as {
      slug?: unknown;
      action?: unknown;
      score?: unknown;
    };

    if (typeof body.slug !== 'string' || !getSound(body.slug)) {
      // Reject slugs that aren't in the static catalog — no arbitrary writes.
      return NextResponse.json({ error: 'Invalid slug.' }, { status: 400 });
    }
    if (typeof body.action !== 'string' || !VALID_ACTIONS.has(body.action as Action)) {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }
    const slug = body.slug;
    const action = body.action as Action;

    if (action === 'score') {
      const raw = body.score;
      if (typeof raw !== 'number' || !Number.isFinite(raw)) {
        return NextResponse.json({ error: 'Field "score" must be a number.' }, { status: 400 });
      }
      const score = Math.max(0, Math.min(100, Math.round(raw)));
      await pronunciationProgressDb.recordScore(userId, slug, score);
    } else {
      await pronunciationProgressDb.markCompleted(userId, slug, action === 'complete');
    }

    const row = await pronunciationProgressDb.getBySlug(userId, slug);
    return NextResponse.json({ progress: row }, { status: 200 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[pronunciation/progress POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
