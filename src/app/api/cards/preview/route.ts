import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { generateCardData } from '@/lib/flashcards/generate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * AI generation only — does NOT persist. Used by the single-import
 * preview-then-save flow on /add (the "Một từ" tab). Separated from
 * /api/cards/generate so the contract is unambiguous: this endpoint never
 * writes to the DB, regardless of body shape.
 *
 * Body: { english: string, vn_meaning?: string, skip_image?: boolean }
 * - `vn_meaning` lets the user override the AI translation. The dictionary
 *   /examples/collocations/image legs still run; we just stamp the user's
 *   string into the response so the preview UI reflects what the user typed.
 * - `skip_image` skips the Pexels call entirely (same flag bulk import uses).
 */
export async function POST(req: Request) {
  try {
    await requireUserId();

    const body = (await req.json().catch(() => ({}))) as {
      english?: unknown;
      vn_meaning?: unknown;
      skip_image?: unknown;
    };
    const english = typeof body.english === 'string' ? body.english.trim() : '';
    if (english.length === 0 || english.length > 100) {
      return NextResponse.json({ error: 'Từ tiếng Anh không hợp lệ.' }, { status: 400 });
    }
    const vnMeaning = typeof body.vn_meaning === 'string' ? body.vn_meaning.trim() : '';
    const skipImage = body.skip_image === true;

    const data = await generateCardData(english, 0, skipImage);
    if (vnMeaning) data.vietnamese = vnMeaning;

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[card preview] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
