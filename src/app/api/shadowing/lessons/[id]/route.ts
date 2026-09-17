import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { shadowingLessonsDb, shadowingSentencesDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/shadowing/lessons/:id → bài + toàn bộ câu (theo thứ tự idx).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUserId();
    const { id } = await params;
    const lessonId = Number(id);
    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
    }
    const lesson = await shadowingLessonsDb.getById(lessonId);
    if (!lesson) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    const sentences = await shadowingSentencesDb.listByLesson(lessonId);
    return NextResponse.json({ lesson, sentences });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[shadowing/lessons/:id GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
