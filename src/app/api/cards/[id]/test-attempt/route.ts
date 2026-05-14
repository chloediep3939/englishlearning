import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardsDb, flashcardTestAttemptsDb } from '@/lib/db';
import type { TestMode } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_MODES = new Set<TestMode>(['speed', 'cloze', 'pronunciation', 'sentence']);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id: rawId } = await params;
    const cardId = Number(rawId);
    if (!Number.isInteger(cardId) || cardId <= 0) {
      return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      mode?: unknown;
      passed?: unknown;
      time_ms?: unknown;
      metadata?: unknown;
    };
    if (typeof body.mode !== 'string' || !VALID_MODES.has(body.mode as TestMode)) {
      return NextResponse.json({ error: 'Invalid mode.' }, { status: 400 });
    }
    if (typeof body.passed !== 'boolean') {
      return NextResponse.json({ error: 'Field "passed" must be boolean.' }, { status: 400 });
    }
    const timeMs =
      typeof body.time_ms === 'number' && Number.isFinite(body.time_ms) && body.time_ms >= 0
        ? Math.floor(body.time_ms)
        : null;
    const metadata =
      body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : null;

    // Ownership check
    const card = await flashcardsDb.getById(userId, cardId);
    if (!card) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const id = await flashcardTestAttemptsDb.create(userId, {
      flashcard_id: cardId,
      mode: body.mode as TestMode,
      passed: body.passed,
      time_ms: timeMs,
      metadata,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[test-attempt] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
