import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { passagesDb, passageAttemptsDb } from '@/lib/passages/db';
import { gradeTranslation } from '@/lib/passages/ai/grade-translation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_INPUT_LEN = 20;
const MAX_INPUT_LEN = 8000;

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const n = parseId(id);
    if (n === null) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as { user_input?: unknown };
    const input = typeof body.user_input === 'string' ? body.user_input.trim() : '';
    if (input.length < MIN_INPUT_LEN) {
      return NextResponse.json(
        { error: `Bài dịch quá ngắn (≥ ${MIN_INPUT_LEN} ký tự).` },
        { status: 400 },
      );
    }
    if (input.length > MAX_INPUT_LEN) {
      return NextResponse.json({ error: 'Bài dịch quá dài.' }, { status: 400 });
    }

    const passage = await passagesDb.getById(userId, n);
    if (!passage) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const feedback = await gradeTranslation(passage.content, input);
    if (!feedback) {
      return NextResponse.json({ error: 'AI tạm thời không phản hồi, thử lại nhé.' }, { status: 502 });
    }

    const attempt = await passageAttemptsDb.record(userId, passage.id, {
      step_kind: 'translate',
      user_input: input,
      ai_feedback: feedback,
      score: feedback.overall_score,
    });

    return NextResponse.json({ attempt, feedback });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[passage translate-grade] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
