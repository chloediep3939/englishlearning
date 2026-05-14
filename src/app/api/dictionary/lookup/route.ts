import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { lookupWord } from '@/lib/flashcards/dictionary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireUserId();
    const url = new URL(req.url);
    const word = url.searchParams.get('word')?.trim();
    if (!word || word.length === 0 || word.length > 100) {
      return NextResponse.json({ error: 'Tham số "word" không hợp lệ.' }, { status: 400 });
    }
    const result = await lookupWord(word);
    if (!result) {
      return NextResponse.json({ error: 'Không tìm thấy từ này.' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[dictionary lookup] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
