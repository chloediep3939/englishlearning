import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { generateCardData } from '@/lib/flashcards/generate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await requireUserId(); // auth-gate only; this endpoint doesn't write DB

    const body = (await req.json().catch(() => ({}))) as {
      english?: unknown;
      image_skip?: unknown;
    };
    const english = typeof body.english === 'string' ? body.english.trim() : '';
    if (english.length === 0 || english.length > 100) {
      return NextResponse.json({ error: 'Từ tiếng Anh không hợp lệ.' }, { status: 400 });
    }
    const imageSkip = Number(body.image_skip) || 0;

    const data = await generateCardData(english, imageSkip);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[card generate] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
