import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { splitPassage } from '@/lib/reading/tokenizer';
import { translateSentences, getMsCredentials } from '@/lib/reading/ai/ms-translator';
import type { TranslatedSentence } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/reading/translate
 *
 * Id-less sibling of /api/passages/[id]/translations for the "read once
 * without saving" mode. Takes raw `content`, splits it into flat sentences,
 * and returns one VI line per sentence. No caching (there is no passage row
 * to key against) — every call re-translates. Degrades to EN-only
 * (vn: null + translationAvailable:false) when MS credentials are missing or
 * MS Translator fails, exactly like the id-based route.
 */
export async function POST(req: Request) {
  try {
    await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { content?: unknown };
    const content = typeof body.content === 'string' ? body.content : '';
    if (content.trim().length === 0) {
      return NextResponse.json({ error: 'Empty content.' }, { status: 400 });
    }
    if (content.length > 10_000) {
      return NextResponse.json({ error: 'Content too long.' }, { status: 400 });
    }

    const { flat } = splitPassage(content);
    const sentences: TranslatedSentence[] = flat.map((s) => ({ index: s.gi, en: s.text, vn: null }));

    if (sentences.length === 0) {
      return NextResponse.json({ sentences, translationAvailable: true });
    }

    const creds = await getMsCredentials();
    if (!creds) {
      console.warn(
        '[reading/translate] MS_TRANSLATOR_KEY / MS_TRANSLATOR_REGION not found in env — serving EN-only.',
      );
      return NextResponse.json({ sentences, translationAvailable: false });
    }

    try {
      const translated = await translateSentences(sentences.map((s) => s.en), creds);
      sentences.forEach((s, i) => {
        s.vn = translated[i] || null;
      });
      return NextResponse.json({ sentences, translationAvailable: true });
    } catch (err) {
      console.error('[reading/translate] MS Translator failed:', err);
      return NextResponse.json({ sentences, translationAvailable: false });
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[reading/translate POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
