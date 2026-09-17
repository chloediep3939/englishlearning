import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { roadmapDb } from '@/lib/roadmap/db';
import type { RoadmapStatus } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_NOTE = 1_000;
const STATUSES: RoadmapStatus[] = ['untested', 'pass', 'fail'];

interface Body {
  status?: unknown;
  note?: unknown;
}

// PUT /api/roadmap/<item_key> — ghi trạng thái ✓ / ✗ / chưa test + ghi chú.
export async function PUT(req: Request, ctx: { params: Promise<{ key: string }> }) {
  try {
    const userId = await requireUserId();
    const { key } = await ctx.params;

    const body = (await req.json().catch(() => ({}))) as Body;
    const status = typeof body.status === 'string' ? body.status : '';
    if (!(STATUSES as string[]).includes(status)) {
      return NextResponse.json({ error: 'Trạng thái không hợp lệ.' }, { status: 400 });
    }

    if (!(await roadmapDb.itemExists(key))) {
      return NextResponse.json({ error: 'Không tìm thấy mục này.' }, { status: 404 });
    }

    // Ghi chú rỗng lưu thành NULL để "không ghi chú" chỉ có một hình dạng.
    const rawNote = typeof body.note === 'string' ? body.note.trim().slice(0, MAX_NOTE) : '';
    const note = rawNote.length > 0 ? rawNote : null;

    await roadmapDb.setProgress(userId, key, { status: status as RoadmapStatus, note });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[roadmap PUT] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
