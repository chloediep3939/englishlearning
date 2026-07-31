import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { generateCardData } from '@/lib/flashcards/generate';
import { ensureClozePool } from '@/lib/flashcards/cloze';
import { getPexelsImage } from '@/lib/flashcards/pexels';
import { fetchAndStoreOxfordAudio } from '@/lib/oxford/persist';
import { flashcardsDb, flashcardDecksDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();

    const body = (await req.json().catch(() => ({}))) as {
      english?: unknown;
      image_skip?: unknown;
      skip_image?: unknown;
      deck_id?: unknown;
      vn_meaning?: unknown;
    };
    const english = typeof body.english === 'string' ? body.english.trim() : '';
    if (english.length === 0 || english.length > 100) {
      return NextResponse.json({ error: 'Từ tiếng Anh không hợp lệ.' }, { status: 400 });
    }
    const imageSkip = Number(body.image_skip) || 0;
    const skipImage = body.skip_image === true;
    // Optional user-supplied Vietnamese gloss (bulk import `word: meaning`
    // lines). When present, we skip auto-translate and stamp this verbatim
    // — capped at 500 chars to match the DB column constraint in /api/cards.
    const vnMeaning =
      typeof body.vn_meaning === 'string' ? body.vn_meaning.trim().slice(0, 500) : '';

    // Generate + save in one shot (bulk import is the only caller — the
    // single-word UI uses /api/cards/preview + POST /api/cards). Missing
    // deck_id resolves to the user's default deck, so a save always happens.
    let deckId: number;
    if (body.deck_id !== undefined && body.deck_id !== null && body.deck_id !== '') {
      const n = Number(body.deck_id);
      if (!Number.isInteger(n) || n <= 0) {
        return NextResponse.json({ error: 'Invalid deck_id.' }, { status: 400 });
      }
      const deck = await flashcardDecksDb.getById(userId, n);
      if (!deck) {
        return NextResponse.json({ error: 'Deck not found.' }, { status: 404 });
      }
      deckId = n;
    } else {
      deckId = await flashcardDecksDb.ensureDefault(userId);
    }

    const data = await generateCardData(english, imageSkip, skipImage);
    // User-supplied VN beats the auto-translation. Mirrored from
    // /api/cards/preview so the contract is consistent across both add paths.
    if (vnMeaning) data.vietnamese = vnMeaning;

    // Vietnamese meaning is optional: auto-translate is best-effort (free
    // MyMemory tier), so a failed translation saves as '' and the deck UI
    // flags the card as "thiếu nghĩa" for a later regen.
    const vi = (data.vietnamese ?? '').trim();
    // Save the lemmatized headword (data.english) — single words like
    // "boxes" / "ran" are persisted as "box" / "run" so audio, IPA, and
    // dictionary fields all align with the saved key.
    // `examples` is intentionally omitted: example sentences come from the
    // shared cloze pool (Part 3 of the cloze-pool feature) on read. The
    // `flashcards.examples` column is kept for legacy rows but no longer
    // populated from this route.
    const id = await flashcardsDb.create(userId, {
      deck_id: deckId,
      english: data.english,
      vietnamese: vi,
      ipa: data.ipa,
      part_of_speech: data.part_of_speech,
      audio_url: data.audio_url,
      collocations: data.collocations,
      image_url: data.image_url,
      image_attribution: data.image_attribution,
      notes: null,
    });
    // Best-effort Oxford US pronunciation (mp3 → R2, US IPA → card). Awaited
    // inline per spec: bulk-added cards get audio for free at ~1–3s/card.
    // Never throws — a miss leaves status 'failed' and the UI uses TTS.
    await fetchAndStoreOxfordAudio(userId, id, data.english);
    const card = await flashcardsDb.getById(userId, id);

    // Fire-and-forget cloze pool gen for the lemmatized headword. waitUntil
    // keeps the worker alive past the response so AI can finish in the
    // background; if ctx isn't available (some local-dev edge cases), fall
    // back to a detached promise so the request still returns fast.
    const headword = data.english;
    const backgroundTasks: Promise<unknown>[] = [ensureClozePool(headword)];

    // When the caller asked to skip image (bulk import default), schedule a
    // background Pexels fetch and update the saved row. Pexels is the
    // slowest leg of generateCardData; doing it post-response keeps bulk
    // insert fast but still ends up with images. Capped at one attempt per
    // card — if Pexels returns null we leave image_url null.
    if (skipImage) {
      backgroundTasks.push(
        (async () => {
          try {
            const pexels = await getPexelsImage(data.english, 0);
            if (pexels) {
              await flashcardsDb.update(userId, id, {
                image_url: pexels.image_url,
                image_attribution: pexels.image_attribution,
              });
            }
          } catch (err) {
            console.error('[card generate bg image] error:', err);
          }
        })()
      );
    }

    try {
      const cf = await getCloudflareContext({ async: true });
      for (const task of backgroundTasks) cf.ctx.waitUntil(task);
    } catch {
      for (const task of backgroundTasks) task.catch(() => {});
    }

    return NextResponse.json({ saved: true, card }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[card generate] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
