import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { roadmapTestRunsDb } from '@/lib/roadmap/db';
import { stressDb } from '@/lib/roadmap/stress-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — bốc N từ ngẫu nhiên.
export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  try {
    await requireUserId();
    const { key } = await ctx.params;
    const test = await stressDb.getTest(key);
    if (!test) {
      return NextResponse.json({ error: 'Mục này chưa có bài trọng âm.' }, { status: 404 });
    }
    return NextResponse.json({ questions: await stressDb.sample(test.sample), sample: test.sample });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[stress-test GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

// POST — nộp bài: { answers: [{ word, correct }], partial }.
export async function POST(req: Request, ctx: { params: Promise<{ key: string }> }) {
  try {
    const userId = await requireUserId();
    const { key } = await ctx.params;
    const test = await stressDb.getTest(key);
    if (!test) {
      return NextResponse.json({ error: 'Mục này chưa có bài trọng âm.' }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as { answers?: unknown; partial?: unknown };
    if (!Array.isArray(body.answers) || body.answers.length === 0 || body.answers.length > test.sample) {
      return NextResponse.json({ error: 'Dữ liệu bài làm không hợp lệ.' }, { status: 400 });
    }
    let correct = 0;
    const missed: string[] = [];
    for (const raw of body.answers) {
      const a = raw as { word?: unknown; correct?: unknown };
      if (typeof a.word !== 'string' || a.word.length > 60 || typeof a.correct !== 'boolean') {
        return NextResponse.json({ error: 'Dữ liệu bài làm không hợp lệ.' }, { status: 400 });
      }
      if (a.correct) correct += 1;
      else missed.push(a.word);
    }

    const answered = body.answers.length;
    const complete = body.partial !== true && answered === test.sample;

    const outcome = await roadmapTestRunsDb.record(userId, key, {
      source: 'T8S',
      score: correct,
      note: complete ? null : `Làm dở ${answered} từ`,
      completed: complete,
      totalOverride: complete ? undefined : answered,
      detail: { missed },
    });

    return NextResponse.json(
      { ...outcome, correct, wrong: answered - correct, answered, partial: !complete },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[stress-test POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
