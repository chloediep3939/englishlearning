import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardsDb } from '@/lib/db';
import { lookupWord } from '@/lib/flashcards/dictionary';
import { lemmatize } from '@/lib/flashcards/lemmatize';
import { translateEnToVi } from '@/lib/flashcards/translate';
import { getPexelsImage } from '@/lib/flashcards/pexels';
import type { Flashcard, FlashcardImageAttribution } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Fields that can be individually regenerated. `audio` and `ipa` both come
// from the dictionary, so when the caller asks for both we only hit the
// dictionary once.
const VALID_FIELDS = ['image', 'audio', 'ipa', 'vietnamese'] as const;
type Field = (typeof VALID_FIELDS)[number];

interface RegenResult {
  ok: Field[];
  failed: Field[];
}

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseFields(raw: unknown): Field[] {
  if (raw === 'all') return [...VALID_FIELDS];
  if (!Array.isArray(raw)) return [];
  const out: Field[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && (VALID_FIELDS as ReadonlyArray<string>).includes(item)) {
      out.push(item as Field);
    }
  }
  return out;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });

    const card = await flashcardsDb.getById(userId, id);
    if (!card) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as { fields?: unknown };
    const fields = parseFields(body.fields);
    if (fields.length === 0) {
      return NextResponse.json({ error: 'No valid fields requested.' }, { status: 400 });
    }

    // Lemmatize so legacy cards saved before the lemma pipeline still hit the
    // dictionary entry — e.g. "ran" → "run". Multi-word phrases pass through
    // unchanged. Single-word fallback: if lemmatize fails, use the original.
    const lemma = (await lemmatize(card.english).catch(() => null)) ?? card.english;
    const result: RegenResult = { ok: [], failed: [] };
    const update: Partial<Flashcard> = {};

    const wantsAudio = fields.includes('audio');
    const wantsIpa = fields.includes('ipa');
    const wantsImage = fields.includes('image');
    const wantsVietnamese = fields.includes('vietnamese');

    // Run fan-out in parallel. Each leg returns the patch fragment it wants
    // applied; failures are captured per-field so partial success is fine.
    // Critically, we only treat a field as "ok" when we actually have a new
    // non-null value to write — otherwise the existing column value is
    // preserved (we never destructively overwrite audio/ipa with null).
    const tasks: Promise<unknown>[] = [];

    if (wantsAudio || wantsIpa) {
      tasks.push(
        (async () => {
          try {
            // Try the lemma first (most likely to hit). If lemma differs from
            // the saved english and lemma misses, also try the original — some
            // dictionaries index irregular forms separately.
            let dict = await lookupWord(lemma);
            if (!dict && lemma !== card.english) {
              dict = await lookupWord(card.english);
            }
            if (!dict) {
              if (wantsAudio) result.failed.push('audio');
              if (wantsIpa) result.failed.push('ipa');
              return;
            }
            if (wantsAudio) {
              if (dict.audio_url) {
                update.audio_url = dict.audio_url;
                result.ok.push('audio');
              } else {
                // Dict entry exists but no mp3 attached. Leave existing audio
                // alone and report failure so the UI shows ⚠️ instead of OK.
                result.failed.push('audio');
              }
            }
            if (wantsIpa) {
              if (dict.ipa && dict.ipa.trim().length > 0) {
                update.ipa = dict.ipa;
                result.ok.push('ipa');
              } else {
                result.failed.push('ipa');
              }
            }
          } catch (err) {
            console.error('[card regen dict] error:', err);
            if (wantsAudio) result.failed.push('audio');
            if (wantsIpa) result.failed.push('ipa');
          }
        })(),
      );
    }

    if (wantsImage) {
      tasks.push(
        (async () => {
          try {
            // Random skip 0–9 so each regen click pulls a different photo
            // for the same query (Pexels page 1 is deterministic and would
            // otherwise return the exact same image, making "Gen lại Hình"
            // feel like a no-op). If a request rolls the same skip twice,
            // the user can simply click again — low-cost retry.
            const skip = Math.floor(Math.random() * 10);
            const pexels = await getPexelsImage(lemma, skip);
            if (pexels) {
              update.image_url = pexels.image_url;
              update.image_attribution = pexels.image_attribution as FlashcardImageAttribution;
              result.ok.push('image');
            } else {
              result.failed.push('image');
            }
          } catch (err) {
            console.error('[card regen image] error:', err);
            result.failed.push('image');
          }
        })(),
      );
    }

    if (wantsVietnamese) {
      tasks.push(
        (async () => {
          try {
            const vi = await translateEnToVi(lemma);
            if (vi && vi.trim().length > 0) {
              update.vietnamese = vi.trim().slice(0, 500);
              result.ok.push('vietnamese');
            } else {
              result.failed.push('vietnamese');
            }
          } catch (err) {
            console.error('[card regen vi] error:', err);
            result.failed.push('vietnamese');
          }
        })(),
      );
    }

    await Promise.all(tasks);

    // Apply patch only when at least one field succeeded. Avoids an empty
    // UPDATE that bumps updated_at for no reason.
    if (Object.keys(update).length > 0) {
      await flashcardsDb.update(userId, id, update);
    }

    const fresh = await flashcardsDb.getById(userId, id);
    return NextResponse.json({ card: fresh, ok: result.ok, failed: result.failed });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[card regenerate] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
