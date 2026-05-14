import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { passagesDb } from '@/lib/passages/db';
import { userSettingsDb } from '@/lib/db';
import { analyzeDifficulty } from '@/lib/passages/ai/difficulty';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const n = parseId(id);
    if (n === null) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });

    const passage = await passagesDb.getById(userId, n);
    if (!passage) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const settings = await userSettingsDb.getFlashcardSettings(userId);
    const analysis = await analyzeDifficulty(passage.content, settings.user_cefr_level);
    if (!analysis) {
      return NextResponse.json(
        { error: 'AI tạm thời không phản hồi. Thử lại nhé.' },
        { status: 502 },
      );
    }

    const updated = await passagesDb.update(userId, passage.id, {
      level_estimate: analysis.level,
      level_verdict: analysis.verdict,
      level_suggestion: analysis.suggestion,
    });
    if (!updated) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    return NextResponse.json({ passage: updated, analysis });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[passage analyze] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
