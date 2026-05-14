import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { passagesDb } from '@/lib/passages/db';
import { hashContent } from '@/lib/passages/hash';
import { analyzeGrammar } from '@/lib/passages/ai/grammar';
import type { GrammarAnalysis } from '@/lib/types';

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
    if (n === null) {
      return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
    }

    const passage = await passagesDb.getById(userId, n);
    if (!passage) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Cache hit on this row.
    if (passage.grammar_analysis) {
      return NextResponse.json({ analysis: passage.grammar_analysis, cached: true });
    }

    // Compute (or reuse) the content hash. Pre-M5 rows have NULL — backfill
    // lazily so we never block on a one-shot migration of historical data.
    const hash = passage.content_hash ?? (await hashContent(passage.content));
    if (!passage.content_hash) {
      await passagesDb.setContentHash(userId, n, hash);
    }

    // Cross-user cache lookup: someone else may have analyzed identical
    // text. Returns the raw JSON string so we can copy it verbatim.
    const cachedJson = await passagesDb.findGrammarByContentHash(hash);
    if (cachedJson) {
      const parsed = safeParseAnalysis(cachedJson);
      if (parsed) {
        await passagesDb.setGrammarAnalysis(userId, n, cachedJson);
        return NextResponse.json({ analysis: parsed, cached: true });
      }
      // Stored JSON was malformed — fall through to re-analyze rather than
      // serve a broken payload.
    }

    // Cache miss → AI.
    console.log('[passage grammar] AI invoke', { passage_id: n, user_id: userId });
    const analysis = await analyzeGrammar(passage.content);
    if (!analysis) {
      return NextResponse.json(
        { error: 'ai_error', message: 'AI lỗi, thử lại sau nha.' },
        { status: 502 },
      );
    }

    const analysisJson = JSON.stringify(analysis);
    await passagesDb.setGrammarAnalysis(userId, n, analysisJson);
    return NextResponse.json({ analysis, cached: false });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[passage grammar] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

function safeParseAnalysis(raw: string): GrammarAnalysis | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as { patterns?: unknown }).patterns)
    ) {
      return parsed as GrammarAnalysis;
    }
    return null;
  } catch {
    return null;
  }
}
