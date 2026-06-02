import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { passagesDb } from '@/lib/passages/db';
import { passageTranslationsDb } from '@/lib/reading/db';
import { splitPassage } from '@/lib/reading/tokenizer';
import { translateSentences, getMsCredentials } from '@/lib/reading/ai/ms-translator';
import type { TranslatedSentence } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/passages/[id]/translations
 *
 * Returns one VI line per flat sentence. Cache-through: cached rows whose
 * en_text still matches the current passage text are reused (BR1 — an edit
 * invalidates them); missing/stale sentences are translated via MS Translator
 * and written back. Degrades to EN-only (vn: null + translationAvailable:false)
 * when no MS credentials are configured (E1.3) or MS fails (E1.4/E1.5).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const passageId = Number(id);
    if (!Number.isInteger(passageId) || passageId <= 0) {
      return NextResponse.json({ error: 'Invalid passage id.' }, { status: 400 });
    }

    const passage = await passagesDb.getById(userId, passageId);
    if (!passage) {
      return NextResponse.json({ error: 'Passage not found' }, { status: 404 });
    }

    const { flat } = splitPassage(passage.content);
    const cached = await passageTranslationsDb.getByPassage(passageId);

    // Build the response from cache; collect cache misses (or stale rows).
    const sentences: TranslatedSentence[] = flat.map((s) => {
      const row = cached.get(s.gi);
      const vn = row && row.en_text === s.text ? row.vn_text : null;
      return { index: s.gi, en: s.text, vn };
    });

    const missingIdx = sentences
      .map((s, i) => (s.vn === null ? i : -1))
      .filter((i) => i >= 0);

    if (missingIdx.length === 0) {
      return NextResponse.json({ sentences, translationAvailable: true });
    }

    const creds = await getMsCredentials();
    if (!creds) {
      // No MS key configured — serve EN-only (plus any cached VI we did have).
      console.warn(
        '[passages/translations] MS_TRANSLATOR_KEY / MS_TRANSLATOR_REGION not found in env — serving EN-only. (Did you restart `npm run dev` after editing .dev.vars?)',
      );
      return NextResponse.json({ sentences, translationAvailable: false });
    }

    try {
      const toTranslate = missingIdx.map((i) => sentences[i].en);
      const translated = await translateSentences(toTranslate, creds);
      const writeRows: { index: number; en: string; vn: string }[] = [];
      missingIdx.forEach((i, k) => {
        const vn = translated[k] ?? '';
        if (vn) {
          sentences[i].vn = vn;
          writeRows.push({ index: sentences[i].index, en: sentences[i].en, vn });
        }
      });
      await passageTranslationsDb.upsertMany(passageId, writeRows);
      return NextResponse.json({ sentences, translationAvailable: true });
    } catch (err) {
      console.error('[passages/translations] MS Translator failed:', err);
      // Serve whatever cached VI exists; client shows a non-blocking notice.
      return NextResponse.json({ sentences, translationAvailable: false });
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[passages/translations GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
