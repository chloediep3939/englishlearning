import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { getDb } from '@/lib/db';
import { generateDistractorPool } from '@/lib/flashcards/distractors';
import { generateMisspellings } from '@/lib/flashcards/spelling';
import type {
  SpeedQuizQuestion,
  SpeedQuizResponse,
  SpeedQuizMode,
  SpeedQuizQuestionMode,
} from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_CARDS_REQUIRED = 1;
const DEFAULT_COUNT = 20;
const MAX_COUNT = 50;
const AI_POOL_SIZE = 40;

interface PoolCard {
  id: number;
  english: string;
  vietnamese: string;
  ipa: string | null;
  audio_url: string | null;
}

interface ShortCard {
  id: number;
  english: string;
  vietnamese: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValidMode(m: string): m is SpeedQuizMode {
  return m === 'en_to_vi' || m === 'vi_to_en' || m === 'spelling' || m === 'mix';
}

function buildSpellingQuestion(card: PoolCard): SpeedQuizQuestion | null {
  const misspellings = generateMisspellings(card.english, 3);
  if (misspellings.length < 3) return null;
  const options = shuffle([card.english, ...misspellings]);
  return {
    card_id: card.id,
    question_mode: 'spelling',
    prompt: card.vietnamese,
    prompt_audio: card.audio_url,
    prompt_ipa: null,
    show_audio: true,
    show_ipa: false,
    options,
    correct_index: options.indexOf(card.english),
  };
}

function buildTranslationQuestion(
  card: PoolCard,
  isEnToVi: boolean,
  allCards: ShortCard[],
  aiPool: string[]
): SpeedQuizQuestion {
  const correct = isEnToVi ? card.vietnamese : card.english;
  const correctLower = correct.toLowerCase();
  const seen = new Set<string>([correctLower]);
  const realDistractors: string[] = [];

  const candidates = shuffle(
    allCards.filter((m) => {
      if (m.id === card.id) return false;
      const c = (isEnToVi ? m.vietnamese : m.english).toLowerCase();
      return c !== correctLower;
    })
  );
  for (const m of candidates) {
    const candidate = isEnToVi ? m.vietnamese : m.english;
    const lk = candidate.toLowerCase();
    if (seen.has(lk)) continue;
    seen.add(lk);
    realDistractors.push(candidate);
    if (realDistractors.length === 3) break;
  }

  const aiDistractors: string[] = [];
  if (realDistractors.length < 3 && aiPool.length > 0) {
    const needed = 3 - realDistractors.length;
    for (const w of shuffle(aiPool)) {
      const lk = w.toLowerCase();
      if (seen.has(lk)) continue;
      seen.add(lk);
      aiDistractors.push(w);
      if (aiDistractors.length === needed) break;
    }
  }

  const allDistractors = [...realDistractors, ...aiDistractors];
  while (allDistractors.length < 3) {
    allDistractors.push(`(lựa chọn ${allDistractors.length + 1})`);
  }

  const options = shuffle([correct, ...allDistractors.slice(0, 3)]);
  return {
    card_id: card.id,
    question_mode: isEnToVi ? 'en_to_vi' : 'vi_to_en',
    prompt: isEnToVi ? card.english : card.vietnamese,
    prompt_audio: isEnToVi ? card.audio_url : null,
    prompt_ipa: isEnToVi ? card.ipa : null,
    show_audio: isEnToVi,
    show_ipa: isEnToVi,
    options,
    correct_index: options.indexOf(correct),
  };
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);

    const modeParam = url.searchParams.get('mode') ?? 'en_to_vi';
    const mode: SpeedQuizMode = isValidMode(modeParam) ? modeParam : 'en_to_vi';

    const countParam = Number(url.searchParams.get('count'));
    const requestedCount =
      Number.isFinite(countParam) && countParam > 0
        ? Math.min(MAX_COUNT, Math.max(MIN_CARDS_REQUIRED, Math.floor(countParam)))
        : DEFAULT_COUNT;
    const deckIdParam = url.searchParams.get('deck_id');
    const deckId = deckIdParam ? Number(deckIdParam) : null;

    const db = await getDb();
    const poolSql = deckId
      ? `SELECT id, english, vietnamese, ipa, audio_url FROM flashcards
         WHERE user_id = ? AND status IN ('learning', 'review') AND deck_id = ?
         ORDER BY RANDOM() LIMIT ?`
      : `SELECT id, english, vietnamese, ipa, audio_url FROM flashcards
         WHERE user_id = ? AND status IN ('learning', 'review')
         ORDER BY RANDOM() LIMIT ?`;
    const poolStmt = db.prepare(poolSql);
    const poolResult = deckId
      ? await poolStmt.bind(userId, deckId, requestedCount).all<PoolCard>()
      : await poolStmt.bind(userId, requestedCount).all<PoolCard>();
    const pool = poolResult.results;

    if (pool.length < 1) {
      return NextResponse.json(
        {
          error:
            'Chưa có từ nào ở trạng thái "đang học" hoặc "ôn tập". Vào "Học hôm nay" để học từ mới trước.',
        },
        { status: 400 }
      );
    }

    // ===== Mode: SPELLING =====
    if (mode === 'spelling') {
      const questions = pool
        .map(buildSpellingQuestion)
        .filter((q): q is SpeedQuizQuestion => q !== null);

      if (questions.length === 0) {
        return NextResponse.json(
          { error: 'Tất cả từ trong pool quá ngắn để tạo chính tả. Cần ít nhất 4 ký tự.' },
          { status: 400 }
        );
      }
      const response: SpeedQuizResponse = { questions, mode };
      return NextResponse.json(response);
    }

    // ===== Modes that need a wider word pool for distractors =====
    const allResult = await db
      .prepare('SELECT id, english, vietnamese FROM flashcards WHERE user_id = ?')
      .bind(userId)
      .all<ShortCard>();
    const allCards = allResult.results;

    // For mix mode every card gets a randomly-assigned mode below; we pre-pick
    // them so we know whether any en_to_vi card will need AI distractors.
    const perCardMode: SpeedQuizQuestionMode[] =
      mode === 'mix'
        ? pool.map(() => {
            const r = Math.random();
            if (r < 1 / 3) return 'en_to_vi';
            if (r < 2 / 3) return 'vi_to_en';
            return 'spelling';
          })
        : pool.map(() => (mode === 'en_to_vi' ? 'en_to_vi' : 'vi_to_en'));

    // Pre-compute how many real distractors each translation card can use so
    // we know if we need to hit the AI for a Vietnamese distractor pool.
    let needsAI = false;
    for (let i = 0; i < pool.length; i++) {
      const qm = perCardMode[i];
      if (qm !== 'en_to_vi') continue;
      const card = pool[i];
      const correctLower = card.vietnamese.toLowerCase();
      const seen = new Set<string>([correctLower]);
      let count = 0;
      for (const m of allCards) {
        if (m.id === card.id) continue;
        const candidate = m.vietnamese.toLowerCase();
        if (seen.has(candidate)) continue;
        seen.add(candidate);
        count++;
        if (count >= 3) break;
      }
      if (count < 3) {
        needsAI = true;
        break;
      }
    }

    const aiPool = needsAI ? await generateDistractorPool(AI_POOL_SIZE) : [];

    const questions: SpeedQuizQuestion[] = [];
    for (let i = 0; i < pool.length; i++) {
      const card = pool[i];
      const qm = perCardMode[i];
      if (qm === 'spelling') {
        const q = buildSpellingQuestion(card);
        if (q) {
          questions.push(q);
          continue;
        }
        // Word too short for spelling — fall back to en_to_vi so the user
        // still gets a card here instead of dropping it.
        questions.push(buildTranslationQuestion(card, true, allCards, aiPool));
      } else {
        questions.push(buildTranslationQuestion(card, qm === 'en_to_vi', allCards, aiPool));
      }
    }

    const response: SpeedQuizResponse = { questions, mode };
    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[speed-quiz] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
