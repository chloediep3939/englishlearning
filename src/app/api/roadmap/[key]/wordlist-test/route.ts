import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { roadmapDb, roadmapTestRunsDb } from '@/lib/roadmap/db';
import { wordListsDb } from '@/lib/roadmap/wordlist-db';
import { lookupEnVi } from '@/lib/reading/envi-dict';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SubmitBody {
  known?: unknown;
  unknown?: unknown;
  /** true = user đóng popup giữa chừng và chọn lưu phần đã làm. */
  partial?: unknown;
}

function stringArray(v: unknown, cap: number): string[] | null {
  if (!Array.isArray(v)) return null;
  if (v.length > cap) return null;
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== 'string') return null;
    const t = x.trim();
    if (t.length > 0 && t.length <= 100) out.push(t);
  }
  return out;
}

// GET — bốc đề: N từ ngẫu nhiên trong phạm vi, bỏ từ user đã tick "biết rồi".
export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  try {
    const userId = await requireUserId();
    const { key } = await ctx.params;

    const test = await wordListsDb.getTest(key);
    if (!test) {
      return NextResponse.json({ error: 'Mục này chưa có bài kiểm tra bộ từ.' }, { status: 404 });
    }

    const [words, counts] = await Promise.all([
      wordListsDb.sample(userId, test.list_code, test.config),
      wordListsDb.countRemaining(userId, test.list_code, test.config),
    ]);

    // Kèm nghĩa tiếng Việt từ từ điển offline có sẵn (public/envi-dict.json):
    // chế độ Biết/Chưa biết cho bấm "xem nghĩa" để tự đối chiếu, thay vì bấm
    // Biết theo cảm giác. Tra lỗi thì để null, không chặn bài.
    const withVi = await Promise.all(
      words.map(async (w) => {
        const vi = await lookupEnVi(w.word).catch(() => null);
        return { ...w, vi: vi?.vn ?? null, pos: vi?.pos ?? null };
      }),
    );

    return NextResponse.json({
      list_code: test.list_code,
      list_label: test.list_label,
      mode: test.config.mode,
      sample: test.config.sample,
      words: withVi,
      remaining: counts.remaining,
      total: counts.total,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[wordlist-test GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

// POST — nộp bài: ghi điểm, tự đánh dấu ✓/✗, và tick những từ đã biết.
export async function POST(req: Request, ctx: { params: Promise<{ key: string }> }) {
  try {
    const userId = await requireUserId();
    const { key } = await ctx.params;

    const test = await wordListsDb.getTest(key);
    if (!test) {
      return NextResponse.json({ error: 'Mục này chưa có bài kiểm tra bộ từ.' }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as SubmitBody;
    const known = stringArray(body.known, 500);
    const unknown = stringArray(body.unknown, 500);
    if (known === null || unknown === null) {
      return NextResponse.json({ error: 'Dữ liệu bài làm không hợp lệ.' }, { status: 400 });
    }
    if (known.length + unknown.length === 0) {
      return NextResponse.json({ error: 'Bài làm rỗng.' }, { status: 400 });
    }

    const partial = body.partial === true;
    const answered = known.length + unknown.length;

    const threshold = await roadmapDb.getThreshold(key);
    // Mục "càng ít càng tốt" (vd "0 lỗi chính tả") phải nộp SỐ LỖI, mục còn lại
    // nộp SỐ ĐÚNG. Nộp nhầm chiều là chấm ngược.
    const score = threshold?.pass_dir === 'lte' ? unknown.length : known.length;

    // Chỉ chế độ "Biết / Không biết" mới tick biết-rồi để loại từ khỏi vòng
    // sau. Chế độ nghe-gõ (chính tả) KHÔNG tick: gõ đúng một lần không có
    // nghĩa là thuộc mặt chữ vĩnh viễn, và tick sẽ làm cạn dần bộ từ.
    if (test.config.mode === 'know') {
      await wordListsDb.markKnown(userId, test.list_code, known);
    }

    // Bài dở: ghi lịch sử với tổng = số từ thật đã làm, KHÔNG chấm (so 18/20
    // với ngưỡng 47/50 là đánh trượt oan). Bài đủ: chấm như thường.
    const outcome = await roadmapTestRunsDb.record(userId, key, {
      source: 'T1',
      score,
      note: partial ? `Làm dở ${answered} từ` : null,
      completed: !partial,
      totalOverride: partial ? answered : undefined,
    });

    return NextResponse.json(
      {
        ...outcome,
        correct: known.length,
        wrong: unknown.length,
        answered,
        partial,
        unknown_words: unknown,
        list_code: test.list_code,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[wordlist-test POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
