import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { flashcardDecksDb, flashcardsDb } from '@/lib/db';
import { presetDecksDb } from '@/lib/preset-decks/db';
import { isAllowedOxfordUrl } from '@/lib/oxford/pronunciation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_WORDS = 1000;
const MIN_PER_DECK = 5;
const MAX_PER_DECK = 200;

/**
 * Chép các từ đã chọn của một level có sẵn thành flashcards của user.
 * Bộ gốc (preset_*) không bị sửa.
 *
 * Body:
 *   { words: string[], target: { mode: 'new', per_deck: number } }
 *     → chia `words` (theo thứ tự gửi lên) thành các bộ mới, mỗi bộ per_deck từ,
 *       tên "<level> · Bộ N" nối tiếp các bộ cùng tên user đã có.
 *   { words: string[], target: { mode: 'existing', deck_id: number } }
 *     → thêm hết vào một bộ của user (dùng cho "nhặt từ sang bộ khác").
 *
 * - Mọi word phải thuộc level này; từ lạ → 400.
 * - Trùng từ (không phân biệt hoa thường) với thẻ đang có trong bộ đích → bỏ qua.
 * - Thẻ mới ở trạng thái 'new'. Thông tin đã bổ sung của bộ gốc (IPA, hình,
 *   hình câu ví dụ) đi theo; mp3 Oxford lưu ở audio_url và được chép vào R2
 *   lần đầu phát (xem /api/audio/[cardId]).
 */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const userId = await requireUserId();
    const { code } = await params;

    const body = (await req.json().catch(() => null)) as {
      words?: unknown;
      target?: { mode?: unknown; deck_id?: unknown; per_deck?: unknown };
    } | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
    }

    const words = Array.isArray(body.words)
      ? [...new Set(body.words.filter((w): w is string => typeof w === 'string'))]
      : [];
    if (words.length === 0) {
      return NextResponse.json({ error: 'Chưa chọn từ nào.' }, { status: 400 });
    }
    if (words.length > MAX_WORDS) {
      return NextResponse.json({ error: `Tối đa ${MAX_WORDS} từ một lần.` }, { status: 400 });
    }

    const mode = body.target?.mode;
    if (mode !== 'new' && mode !== 'existing') {
      return NextResponse.json({ error: 'target.mode must be "new" or "existing".' }, { status: 400 });
    }

    const level = await presetDecksDb.getLevel(userId, code);
    if (!level || level.cards.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy level.' }, { status: 404 });
    }
    const byWord = new Map(level.cards.map((c) => [c.english, c]));
    const unknown = words.filter((w) => !byWord.has(w));
    if (unknown.length > 0) {
      return NextResponse.json({ error: `Từ không thuộc level này: ${unknown.slice(0, 10).join(', ')}` }, { status: 400 });
    }

    // Gom từ theo bộ đích.
    const groups: { deckId: number; deckName: string; words: string[]; fresh: boolean }[] = [];
    if (mode === 'existing') {
      const deckId = Number(body.target?.deck_id);
      if (!Number.isInteger(deckId) || deckId <= 0) {
        return NextResponse.json({ error: 'deck_id không hợp lệ.' }, { status: 400 });
      }
      const deck = await flashcardDecksDb.getById(userId, deckId);
      if (!deck) {
        return NextResponse.json({ error: 'Bộ đích không tồn tại.' }, { status: 404 });
      }
      groups.push({ deckId, deckName: deck.name, words, fresh: false });
    } else {
      const perDeck = Number(body.target?.per_deck);
      if (!Number.isInteger(perDeck) || perDeck < MIN_PER_DECK || perDeck > MAX_PER_DECK) {
        return NextResponse.json(
          { error: `Số từ mỗi bộ phải từ ${MIN_PER_DECK} đến ${MAX_PER_DECK}.` },
          { status: 400 },
        );
      }
      // Đánh số tiếp theo các bộ "<level> · Bộ N" user đã tạo trước đó.
      const prefix = `${level.label} · Bộ `;
      const existing = await flashcardDecksDb.getAll(userId);
      let seq = existing.reduce((max, d) => {
        if (!d.name.startsWith(prefix)) return max;
        const n = Number(d.name.slice(prefix.length));
        return Number.isInteger(n) && n > max ? n : max;
      }, 0);
      for (let i = 0; i < words.length; i += perDeck) {
        seq++;
        const name = `${prefix}${seq}`;
        const deckId = await flashcardDecksDb.create(userId, {
          name,
          description: level.description,
          color: level.color ?? undefined,
          icon: level.icon,
          subtitle: level.label,
        });
        groups.push({ deckId, deckName: name, words: words.slice(i, i + perDeck), fresh: true });
      }
    }

    const results: { deck_id: number; deck_name: string; inserted: number; skipped_dupe: number }[] = [];
    for (const g of groups) {
      const seen = g.fresh
        ? new Set<string>()
        : new Set(
            (await flashcardsDb.listByDeck(userId, g.deckId, { limit: 5000 })).map((c) => c.english.trim().toLowerCase()),
          );
      let inserted = 0;
      let skippedDupe = 0;
      for (const word of g.words) {
        const key = word.trim().toLowerCase();
        if (seen.has(key)) {
          skippedDupe++;
          continue;
        }
        const c = byWord.get(word)!;
        const oxfordMp3 = c.audio_src && isAllowedOxfordUrl(c.audio_src) ? c.audio_src : null;
        await flashcardsDb.create(userId, {
          deck_id: g.deckId,
          english: c.english,
          vietnamese: c.vietnamese,
          ipa: c.ipa,
          part_of_speech: c.part_of_speech,
          // mp3 Oxford US: /api/audio/[cardId] chép vào R2 lần đầu phát.
          audio_url: oxfordMp3,
          audio_us_status: oxfordMp3 ? 'ok' : null,
          image_url: c.image_url,
          image_attribution: c.image_attribution,
          examples: c.examples,
          collocations: c.collocations,
          notes: c.notes,
        });
        seen.add(key);
        inserted++;
      }
      results.push({ deck_id: g.deckId, deck_name: g.deckName, inserted, skipped_dupe: skippedDupe });
    }

    return NextResponse.json({
      results,
      total_inserted: results.reduce((a, r) => a + r.inserted, 0),
      total_skipped_dupe: results.reduce((a, r) => a + r.skipped_dupe, 0),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[preset-levels copy] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
