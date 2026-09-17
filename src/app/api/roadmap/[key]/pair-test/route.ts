import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { roadmapDb, roadmapTestRunsDb } from '@/lib/roadmap/db';
import { pairsDb } from '@/lib/roadmap/pairs-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SubmitBody {
  answers?: unknown;
  partial?: unknown;
}

// GET — bốc đề: mỗi nhóm âm N cặp, trộn xen kẽ các nhóm, mỗi câu chọn ngẫu
// nhiên từ nào trong cặp sẽ được phát. (Math.random chỉ để xáo đề — CLAUDE.md
// §6.8 cho phép với việc trộn câu hỏi.)
export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  try {
    await requireUserId();
    const { key } = await ctx.params;

    const config = await pairsDb.getTest(key);
    if (!config) {
      return NextResponse.json({ error: 'Mục này chưa có bài nghe cặp từ.' }, { status: 404 });
    }

    const pairs = await pairsDb.sample(config);
    // Fisher–Yates: xen kẽ các nhóm để không bị 10 câu cùng một âm liền nhau.
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    const questions = pairs.map((p) => ({ ...p, target: Math.random() < 0.5 ? 'a' : 'b' }));

    return NextResponse.json({
      questions,
      per_group: config.per_group,
      contrasts: config.contrasts,
      scoring: config.scoring,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[pair-test GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

// POST — nộp bài.
export async function POST(req: Request, ctx: { params: Promise<{ key: string }> }) {
  try {
    const userId = await requireUserId();
    const { key } = await ctx.params;

    const config = await pairsDb.getTest(key);
    if (!config) {
      return NextResponse.json({ error: 'Mục này chưa có bài nghe cặp từ.' }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as SubmitBody;
    const partial = body.partial === true;
    const maxAnswers = config.contrasts.length * config.per_group;
    if (!Array.isArray(body.answers) || body.answers.length === 0 || body.answers.length > maxAnswers) {
      return NextResponse.json({ error: 'Dữ liệu bài làm không hợp lệ.' }, { status: 400 });
    }

    const allowed = new Set(config.contrasts);
    const groups: Record<string, { correct: number; total: number }> = {};
    for (const raw of body.answers) {
      const a = raw as { contrast?: unknown; correct?: unknown };
      if (typeof a.contrast !== 'string' || !allowed.has(a.contrast) || typeof a.correct !== 'boolean') {
        return NextResponse.json({ error: 'Dữ liệu bài làm không hợp lệ.' }, { status: 400 });
      }
      const g = (groups[a.contrast] ??= { correct: 0, total: 0 });
      g.total += 1;
      if (a.correct) g.correct += 1;
    }

    const answered = body.answers.length;
    const correct = Object.values(groups).reduce((n, g) => n + g.correct, 0);
    const threshold = await roadmapDb.getThreshold(key);

    // Bài đủ phải có mặt mọi nhóm đã cấu hình — thiếu nhóm nào thì "mỗi nhóm
    // đều đạt" không kiểm được, coi như chưa đủ bài.
    const complete = !partial && config.contrasts.every((c) => (groups[c]?.total ?? 0) > 0);

    let score: number;
    if (!complete) {
      score = correct;
    } else if (config.scoring === 'min_group') {
      const worst = Math.min(...config.contrasts.map((c) => groups[c].correct / groups[c].total));
      // floor, không round: 17,5 phải là 17 (trượt), không được làm tròn thành đạt.
      score = Math.floor(worst * (threshold?.pass_total ?? 20));
    } else {
      score = Math.floor((correct / answered) * 100);
    }

    const outcome = await roadmapTestRunsDb.record(userId, key, {
      source: 'T8',
      score,
      note: complete ? null : `Làm dở ${answered} câu`,
      completed: complete,
      totalOverride: complete ? undefined : answered,
      detail: { scoring: config.scoring, groups },
    });

    return NextResponse.json(
      { ...outcome, correct, wrong: answered - correct, answered, partial: !complete, groups },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[pair-test POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
