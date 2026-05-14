import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { passagesDb } from '@/lib/passages/db';
import { defineWordInContext } from '@/lib/passages/ai/define-word';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_WORD_LEN = 60;
const MAX_CONTEXT_LEN = 1000;

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

    const body = (await req.json().catch(() => ({}))) as {
      word?: unknown;
      sentence_context?: unknown;
    };
    const word = typeof body.word === 'string' ? body.word.trim() : '';
    const sentenceContext =
      typeof body.sentence_context === 'string' ? body.sentence_context.trim() : '';
    if (!word || word.length > MAX_WORD_LEN) {
      return NextResponse.json({ error: 'Missing or invalid word.' }, { status: 400 });
    }
    if (!sentenceContext || sentenceContext.length > MAX_CONTEXT_LEN) {
      return NextResponse.json(
        { error: 'Missing or invalid sentence_context.' },
        { status: 400 },
      );
    }

    // Ownership check — also blocks probing other users' passage IDs.
    const passage = await passagesDb.getById(userId, n);
    if (!passage) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const definition = await defineWordInContext(word, sentenceContext);
    if (!definition) {
      return NextResponse.json({ error: 'AI lỗi, thử lại nhé.' }, { status: 502 });
    }
    return NextResponse.json({ definition });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[passage define-word] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
