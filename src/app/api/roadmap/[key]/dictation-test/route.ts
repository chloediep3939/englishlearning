import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import {
  gradeFabrication,
  gradeLinks,
  gradeTargets,
  gradeWords,
} from '@/components/roadmap/test/dictation-grade';
import { roadmapTestRunsDb } from '@/lib/roadmap/db';
import { dictationDb } from '@/lib/roadmap/dictation-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_TYPED = 400;
const US_VOICE = 'en-US-AriaNeural';
const OTHER_VOICES = ['en-GB-SoniaNeural', 'en-AU-NatashaNeural'];

// GET — bốc N câu. Bài accent: nửa đầu giọng Mỹ, nửa sau xen kẽ Anh/Úc (thứ tự
// câu đã ngẫu nhiên nên việc gán giọng theo vị trí cũng ngẫu nhiên).
export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  try {
    await requireUserId();
    const { key } = await ctx.params;
    const test = await dictationDb.getTest(key);
    if (!test) return NextResponse.json({ error: 'Mục này chưa có bài chép chính tả.' }, { status: 404 });
    const rows = await dictationDb.sample(test.pool, test.sample);
    const half = Math.ceil(rows.length / 2);
    const sentences = rows.map((s, i) => ({
      ...s,
      voice: test.mode === 'accent' ? (i < half ? US_VOICE : OTHER_VOICES[(i - half) % OTHER_VOICES.length]) : undefined,
    }));
    return NextResponse.json({ mode: test.mode, sample: test.sample, sentences });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[dictation-test GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

/**
 * POST — nộp bài: { answers: [{ id, typed?, tapped?, voice?, reconstructed? }], partial }.
 * Server TỰ CHẤM lại bằng đúng hàm chấm của client (dictation-grade.ts, đã
 * chạy thử) — không tin điểm client gửi. Riêng "reconstructed" (nghe-17) là tự
 * khai, server chỉ chặn trường hợp vô lý: câu gõ đúng hết mà khai là dựng lại.
 */
export async function POST(req: Request, ctx: { params: Promise<{ key: string }> }) {
  try {
    const userId = await requireUserId();
    const { key } = await ctx.params;
    const test = await dictationDb.getTest(key);
    if (!test) return NextResponse.json({ error: 'Mục này chưa có bài chép chính tả.' }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as { answers?: unknown; partial?: unknown };
    if (!Array.isArray(body.answers) || body.answers.length === 0 || body.answers.length > test.sample) {
      return NextResponse.json({ error: 'Dữ liệu bài làm không hợp lệ.' }, { status: 400 });
    }

    const answers: Array<{ id: string; typed: string; tapped: number[]; voice: string | null; reconstructed: boolean }> = [];
    for (const raw of body.answers) {
      const a = raw as { id?: unknown; typed?: unknown; tapped?: unknown; voice?: unknown; reconstructed?: unknown };
      if (typeof a.id !== 'string') return NextResponse.json({ error: 'Dữ liệu bài làm không hợp lệ.' }, { status: 400 });
      const voice = typeof a.voice === 'string' ? a.voice : null;
      if (test.mode === 'accent' && (voice === null || (voice !== US_VOICE && !OTHER_VOICES.includes(voice)))) {
        return NextResponse.json({ error: 'Thiếu hoặc sai giọng đọc của câu.' }, { status: 400 });
      }
      answers.push({
        id: a.id,
        typed: typeof a.typed === 'string' ? a.typed.slice(0, MAX_TYPED) : '',
        tapped: Array.isArray(a.tapped) ? a.tapped.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 40) : [],
        voice,
        reconstructed: a.reconstructed === true,
      });
    }
    if (new Set(answers.map((a) => a.id)).size !== answers.length) {
      return NextResponse.json({ error: 'Một câu bị nộp hai lần.' }, { status: 400 });
    }

    const sentences = await dictationDb.getByIds(test.pool, answers.map((a) => a.id));
    if (sentences.size !== answers.length) {
      return NextResponse.json({ error: 'Có câu không thuộc bài này.' }, { status: 400 });
    }

    let hits = 0;
    let wordTotal = 0;
    let correctSentences = 0;
    let fabricatedCount = 0;
    let reconstructedCount = 0;
    const accent = { us: { hits: 0, total: 0 }, other: { hits: 0, total: 0 } };
    const detail: Array<Record<string, unknown>> = [];

    for (const a of answers) {
      const s = sentences.get(a.id)!;
      switch (test.mode) {
        case 'targets': {
          const g = gradeTargets(s.text, a.typed, s.key as number[]);
          hits += g.hits;
          wordTotal += g.total;
          if (g.hits === g.total) correctSentences += 1;
          detail.push({ id: a.id, hits: g.hits, total: g.total });
          break;
        }
        case 'links': {
          const g = gradeLinks(s.text, a.typed, s.key as [number, number][]);
          if (g.correct) correctSentences += 1;
          detail.push({ id: a.id, ok: g.correct });
          break;
        }
        case 'stress': {
          const want = [...(s.key as number[])].sort((x, y) => x - y).join(',');
          const got = [...new Set(a.tapped)].sort((x, y) => x - y).join(',');
          if (want === got) correctSentences += 1;
          detail.push({ id: a.id, ok: want === got });
          break;
        }
        case 'fabrication': {
          const g = gradeFabrication(s.text, a.typed);
          fabricatedCount += g.fabricated.length;
          detail.push({ id: a.id, fabricated: g.fabricated });
          break;
        }
        case 'accent': {
          const g = gradeWords(s.text, a.typed);
          const bucket = a.voice === US_VOICE ? accent.us : accent.other;
          bucket.hits += g.hits;
          bucket.total += g.total;
          detail.push({ id: a.id, voice: a.voice, hits: g.hits, total: g.total });
          break;
        }
        case 'words':
        case 'reconstruct': {
          const g = gradeWords(s.text, a.typed);
          hits += g.hits;
          wordTotal += g.total;
          const perfect = g.hits === g.total;
          if (perfect) correctSentences += 1;
          // Câu gõ đúng hết thì không thể là "dựng lại theo nghĩa".
          const reconstructed = !perfect && a.reconstructed;
          if (reconstructed) reconstructedCount += 1;
          detail.push({ id: a.id, hits: g.hits, total: g.total, reconstructed });
          break;
        }
      }
    }

    const answered = answers.length;
    let complete = body.partial !== true && answered === test.sample;
    let score: number;
    let totalOverride: number | undefined;

    switch (test.mode) {
      case 'targets':
      case 'words':
        // Ngưỡng dạng %. Bài dở: ghi số từ đúng / tổng.
        score = complete && wordTotal > 0 ? Math.floor((hits / wordTotal) * 100) : hits;
        totalOverride = complete ? undefined : wordTotal;
        break;
      case 'fabrication':
        // "0 từ bịa": điểm là SỐ TỪ BỊA, càng ít càng tốt.
        score = fabricatedCount;
        break;
      case 'accent': {
        // "Chênh ≤ 15%": điểm là % giọng Mỹ trừ % giọng Anh/Úc. Thiếu một nhóm
        // thì không so được → coi như bài dở.
        if (accent.us.total === 0 || accent.other.total === 0) complete = false;
        const pctUs = accent.us.total ? (accent.us.hits / accent.us.total) * 100 : 0;
        const pctOther = accent.other.total ? (accent.other.hits / accent.other.total) * 100 : 0;
        score = Math.max(0, Math.floor(pctUs - pctOther));
        break;
      }
      case 'reconstruct':
        // "≤ 1/10 câu bị dựng lại": điểm là số câu tự khai dựng lại.
        score = reconstructedCount;
        totalOverride = complete ? undefined : answered;
        break;
      default:
        score = correctSentences;
        totalOverride = complete ? undefined : answered;
    }

    const outcome = await roadmapTestRunsDb.record(userId, key, {
      source: test.mode === 'stress' ? 'T3S' : 'T3',
      score,
      note: complete ? null : `Làm dở ${answered} câu`,
      completed: complete,
      totalOverride,
      detail: { mode: test.mode, sentences: detail, accent: test.mode === 'accent' ? accent : undefined },
    });

    return NextResponse.json(
      {
        ...outcome,
        answered,
        score,
        correct_sentences: correctSentences,
        hits,
        word_total: wordTotal,
        fabricated: fabricatedCount,
        reconstructed: reconstructedCount,
        accent,
        partial: !complete,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[dictation-test POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
