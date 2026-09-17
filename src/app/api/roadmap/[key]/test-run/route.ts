import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { roadmapDb, roadmapTestRunsDb } from '@/lib/roadmap/db';
import type { RoadmapTestSource } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_NOTE = 1_000;
const SOURCES: RoadmapTestSource[] = ['manual', 'T1', 'T2', 'T3', 'T3S', 'T4', 'T5', 'T6', 'T7', 'T8', 'T8S'];

interface Body {
  score?: unknown;
  note?: unknown;
  source?: unknown;
}

// GET /api/roadmap/<item_key>/test-run — lịch sử tự kiểm tra của mục.
export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  try {
    const userId = await requireUserId();
    const { key } = await ctx.params;
    const runs = await roadmapTestRunsDb.listByItem(userId, key);
    return NextResponse.json({ runs });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[roadmap test-run GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

// POST /api/roadmap/<item_key>/test-run — ghi điểm một lần tự kiểm tra.
// Nếu mục có ngưỡng số thì tự đánh dấu ✓/✗ luôn.
export async function POST(req: Request, ctx: { params: Promise<{ key: string }> }) {
  try {
    const userId = await requireUserId();
    const { key } = await ctx.params;

    if (!(await roadmapDb.itemExists(key))) {
      return NextResponse.json({ error: 'Không tìm thấy mục này.' }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;

    // Coerce rồi mới validate — client có thể gửi chuỗi từ ô input.
    const score = Number(body.score);
    if (!Number.isFinite(score) || !Number.isInteger(score) || score < 0) {
      return NextResponse.json({ error: 'Điểm phải là số nguyên không âm.' }, { status: 400 });
    }
    if (score > 10_000) {
      return NextResponse.json({ error: 'Điểm quá lớn.' }, { status: 400 });
    }

    const rawSource = typeof body.source === 'string' ? body.source : 'manual';
    if (!(SOURCES as string[]).includes(rawSource)) {
      return NextResponse.json({ error: 'Nguồn không hợp lệ.' }, { status: 400 });
    }

    const rawNote = typeof body.note === 'string' ? body.note.trim().slice(0, MAX_NOTE) : '';
    const note = rawNote.length > 0 ? rawNote : null;

    const outcome = await roadmapTestRunsDb.record(userId, key, {
      source: rawSource as RoadmapTestSource,
      score,
      note,
    });

    return NextResponse.json(outcome, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[roadmap test-run POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
