import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { passagesDb } from '@/lib/passages/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_CHARS = 100;
const MAX_CHARS = 10_000;
const MAX_TITLE = 200;

interface CreateBody {
  title?: unknown;
  content?: unknown;
  source_label?: unknown;
  source_url?: unknown;
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));
    const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
    const passages = await passagesDb.listByUser(userId, { limit, offset });
    return NextResponse.json({ passages });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[passages GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as CreateBody;

    if (typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Thiếu nội dung.' }, { status: 400 });
    }
    const content = body.content.trim();
    if (content.length < MIN_CHARS) {
      return NextResponse.json(
        { error: `Bài quá ngắn (tối thiểu ${MIN_CHARS} ký tự).` },
        { status: 400 },
      );
    }
    if (content.length > MAX_CHARS) {
      return NextResponse.json(
        { error: `Bài quá dài (tối đa ${MAX_CHARS.toLocaleString('vi-VN')} ký tự).` },
        { status: 400 },
      );
    }

    // Auto-derive title from first 60 chars at a word boundary if blank.
    let title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) {
      const head = content.slice(0, 60);
      title = head.replace(/\s+\S*$/, '') || head;
    }
    if (title.length > MAX_TITLE) title = title.slice(0, MAX_TITLE);

    const labelRaw = typeof body.source_label === 'string' ? body.source_label.trim() : '';
    const sourceLabel: string | null = labelRaw ? labelRaw.slice(0, 200) : null;

    // Best-effort URL normalisation: prepend https:// if user typed "example.com".
    // Don't reject on parse failure — the value still surfaces in the library
    // row as plain text and the user can edit it later.
    let sourceUrl: string | null = null;
    if (typeof body.source_url === 'string') {
      const raw = body.source_url.trim();
      if (raw) sourceUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    }

    const passage = await passagesDb.create(userId, {
      title,
      content,
      source_label: sourceLabel,
      source_url: sourceUrl,
    });
    // Slim shape: drop AI-derived columns (level_*, translate_reference,
    // paraphrase_tips) from the response. They're NULL for new rows anyway.
    // Frontend will adopt this shape in Part 2.
    return NextResponse.json(
      {
        id: passage.id,
        title: passage.title,
        content: passage.content,
        created_at: passage.created_at,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[passages POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
