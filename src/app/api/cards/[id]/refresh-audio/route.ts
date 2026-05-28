import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardsDb } from '@/lib/db';
import { fetchAndStoreOxfordAudio } from '@/lib/oxford/persist';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Re-fetch the Oxford US pronunciation for one card and overwrite the stored
 * mp3 + IPA (always overwrites — that's the point of the "Cập nhật phát âm"
 * button). Drives the per-deck 5-parallel client orchestration.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id: raw } = await params;
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
    }

    const existing = await flashcardsDb.getById(userId, id);
    if (!existing) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }

    const result = await fetchAndStoreOxfordAudio(userId, id, existing.english);
    // Return the refreshed card so the client can swap it into state — the new
    // `updated_at` doubles as the audio cache-bust version.
    const card = await flashcardsDb.getById(userId, id);

    return NextResponse.json({
      ok: result.ok,
      ipa: result.ipa,
      failed: result.failed,
      word: existing.english,
      card,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[refresh-audio] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
