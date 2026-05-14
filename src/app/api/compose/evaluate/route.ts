import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardsDb } from '@/lib/db';
import { compositionsDb } from '@/lib/compositions/db';
import { getAIProvider } from '@/lib/ai';
import type { CompositionSource } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface EvaluateBody {
  source?: unknown;
  source_deck_id?: unknown;
  pool_word_ids?: unknown;
  content?: unknown;
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as EvaluateBody;

    // ----- Validate source -----
    const source = body.source;
    if (source !== 'today' && source !== 'deck') {
      return NextResponse.json({ error: 'Invalid source.' }, { status: 400 });
    }

    // ----- Validate pool_word_ids -----
    if (!Array.isArray(body.pool_word_ids) || body.pool_word_ids.length === 0) {
      return NextResponse.json({ error: 'Pool rỗng.' }, { status: 400 });
    }
    const ids = (body.pool_word_ids as unknown[])
      .map((x) => Number(x))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Pool rỗng.' }, { status: 400 });
    }

    // ----- Validate content -----
    if (typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Thiếu nội dung.' }, { status: 400 });
    }
    const trimmed = body.content.trim();
    if (trimmed.length < 20) {
      return NextResponse.json(
        { error: 'Bài viết quá ngắn (tối thiểu 20 ký tự).' },
        { status: 400 },
      );
    }
    const content = trimmed.slice(0, 3000);

    // ----- Optional source_deck_id (deck mode only) -----
    let sourceDeckId: number | null = null;
    if (source === 'deck' && body.source_deck_id != null) {
      const n = Number(body.source_deck_id);
      if (Number.isInteger(n) && n > 0) sourceDeckId = n;
    }

    // ----- Load + ownership-filter cards -----
    const cards = await flashcardsDb.getByIds(userId, ids);
    if (cards.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy thẻ nào trong pool.' },
        { status: 400 },
      );
    }

    // ----- AI check -----
    const ai = await getAIProvider();
    if (!ai.available) {
      return NextResponse.json(
        { error: 'AI chưa được cấu hình. Liên hệ admin để bật tính năng này.' },
        { status: 503 },
      );
    }

    const pool = cards.map((c) => ({ english: c.english, vietnamese: c.vietnamese }));

    let feedback;
    try {
      feedback = await ai.evaluateComposition(pool, content);
    } catch (err) {
      console.error('[compose evaluate] AI failure:', err);
      return NextResponse.json(
        { error: 'AI tạm thời không phản hồi. Thử lại nhé.' },
        { status: 502 },
      );
    }

    const created = await compositionsDb.create(userId, {
      source: source as CompositionSource,
      source_deck_id: sourceDeckId,
      pool_word_ids: cards.map((c) => c.id),
      content,
      ai_feedback: feedback,
      word_usage: feedback.word_usage,
      coherence_score: feedback.coherence_score,
      passed: feedback.passed,
    });

    return NextResponse.json({ composition: created });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[compose evaluate] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
