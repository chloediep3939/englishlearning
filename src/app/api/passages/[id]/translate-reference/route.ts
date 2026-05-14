import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { passagesDb } from '@/lib/passages/db';
import { getTranslationReference } from '@/lib/passages/ai/translate-reference';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Cache-first reference translation. Pre-fetch fires this in the background
 * from Step 3; Step 7's feedback view reads it again — second call returns
 * the cached value immediately. AI failure → 502 (caller retries silently
 * during pre-fetch, or shows nothing in feedback).
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

    // Cache hit
    if (passage.translate_reference) {
      return NextResponse.json({ reference: passage.translate_reference, cached: true });
    }

    const ref = await getTranslationReference(passage.content);
    if (!ref) {
      return NextResponse.json({ error: 'AI tạm thời không phản hồi.' }, { status: 502 });
    }

    await passagesDb.update(userId, passage.id, { translate_reference: ref });
    return NextResponse.json({ reference: ref, cached: false });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[passage translate-reference] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
