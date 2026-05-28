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

interface PoolCard {
  id: number;
  deck_id: number;
  english: string;
  vietnamese: string;
  ipa: string | null;
  audio_url: string | null;
  part_of_speech: string | null;
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

async function buildTranslationQuestion(
  card: PoolCard,
  isEnToVi: boolean,
  userId: number
): Promise<SpeedQuizQuestion> {
  const correct = isEnToVi ? card.vietnamese : card.english;
  const distractors = await generateDistractorPool(correct, {
    userId,
    lang: isEnToVi ? 'vi' : 'en',
    count: 3,
    pos: card.part_of_speech,
    deckId: card.deck_id,
    excludeWords: [correct],
  });

  const padded = [...distractors];
  while (padded.length < 3) {
    padded.push(`(lựa chọn ${padded.length + 1})`);
  }

  const options = shuffle([correct, ...padded.slice(0, 3)]);
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
    // Any card qualifies regardless of SRS status — the user just picks a deck
    // + count and practices. (No "learning/review only" gate.)
    const poolSql = deckId
      ? `SELECT id, deck_id, english, vietnamese, ipa, audio_url, part_of_speech FROM flashcards
         WHERE user_id = ? AND deck_id = ?
         ORDER BY RANDOM() LIMIT ?`
      : `SELECT id, deck_id, english, vietnamese, ipa, audio_url, part_of_speech FROM flashcards
         WHERE user_id = ?
         ORDER BY RANDOM() LIMIT ?`;
    const poolStmt = db.prepare(poolSql);
    const poolResult = deckId
      ? await poolStmt.bind(userId, deckId, requestedCount).all<PoolCard>()
      : await poolStmt.bind(userId, requestedCount).all<PoolCard>();
    const pool = poolResult.results;

    if (pool.length < 1) {
      return NextResponse.json(
        {
          error: deckId
            ? 'Bộ từ này chưa có từ nào. Hãy thêm từ trước nhé.'
            : 'Bạn chưa có từ nào. Hãy thêm từ vào một bộ trước nhé.',
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

    // ===== Translation / mix modes =====
    // For mix, randomly assign each card one of the three concrete modes.
    const perCardMode: SpeedQuizQuestionMode[] =
      mode === 'mix'
        ? pool.map(() => {
            const r = Math.random();
            if (r < 1 / 3) return 'en_to_vi';
            if (r < 2 / 3) return 'vi_to_en';
            return 'spelling';
          })
        : pool.map(() => (mode === 'en_to_vi' ? 'en_to_vi' : 'vi_to_en'));

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
        questions.push(await buildTranslationQuestion(card, true, userId));
      } else {
        questions.push(await buildTranslationQuestion(card, qm === 'en_to_vi', userId));
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
