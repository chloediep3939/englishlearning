import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { shadowingLessonsDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/shadowing/lessons[?level=0..5]
// Danh sách bài shadowing (nội dung dùng chung). Vẫn gate đăng nhập.
export async function GET(req: Request) {
  try {
    await requireUserId();
    const url = new URL(req.url);
    const levelRaw = url.searchParams.get('level');
    let level: number | undefined;
    if (levelRaw !== null) {
      const n = Number(levelRaw);
      if (!Number.isInteger(n) || n < 0 || n > 5) {
        return NextResponse.json({ error: 'Invalid level.' }, { status: 400 });
      }
      level = n;
    }
    const lessons = await shadowingLessonsDb.list(level === undefined ? {} : { level });
    return NextResponse.json({ lessons });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[shadowing/lessons GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
