import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { passagesDb } from '@/lib/passages/db';
import { getParaphraseTips } from '@/lib/passages/ai/paraphrase-tips';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Cache-first paraphrase tips (3 short Vietnamese hints). Stored as a JSON
 * array in `passages.paraphrase_tips_json`, surfaced as `string[]` on
 * `Passage.paraphrase_tips` via hydratePassage.
 */
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

    if (passage.paraphrase_tips && passage.paraphrase_tips.length > 0) {
      return NextResponse.json({ tips: passage.paraphrase_tips, cached: true });
    }

    const tips = await getParaphraseTips(passage.content);
    if (!tips) {
      return NextResponse.json({ error: 'AI tạm thời không phản hồi.' }, { status: 502 });
    }

    await passagesDb.update(userId, passage.id, { paraphrase_tips: tips });
    return NextResponse.json({ tips, cached: false });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[passage paraphrase-tips] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
