import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { pteTemplatesDb } from '@/lib/templates/db';
import { extractSlots } from '@/lib/templates/slots';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_CHARS = 20;
const MAX_CHARS = 10_000;
const MAX_TITLE = 200;
const MAX_SLOTS = 40;

interface CreateBody {
  title?: unknown;
  frame_text?: unknown;
}

export async function GET() {
  try {
    const userId = await requireUserId();
    const templates = await pteTemplatesDb.listByUser(userId);
    return NextResponse.json({ templates });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[templates GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as CreateBody;

    if (typeof body.frame_text !== 'string') {
      return NextResponse.json({ error: 'Thiếu nội dung khung.' }, { status: 400 });
    }
    const frame = body.frame_text.trim();
    if (frame.length < MIN_CHARS) {
      return NextResponse.json(
        { error: `Khung quá ngắn (tối thiểu ${MIN_CHARS} ký tự).` },
        { status: 400 },
      );
    }
    if (frame.length > MAX_CHARS) {
      return NextResponse.json(
        { error: `Khung quá dài (tối đa ${MAX_CHARS.toLocaleString('vi-VN')} ký tự).` },
        { status: 400 },
      );
    }
    const slots = extractSlots(frame);
    if (slots.length === 0) {
      return NextResponse.json(
        { error: 'Khung cần ít nhất một chỗ trống dạng [tên], ví dụ [topic] hoặc [N1].' },
        { status: 400 },
      );
    }
    if (slots.length > MAX_SLOTS) {
      return NextResponse.json(
        { error: `Khung có quá nhiều chỗ trống (tối đa ${MAX_SLOTS}).` },
        { status: 400 },
      );
    }

    const title = typeof body.title === 'string' ? body.title.trim().slice(0, MAX_TITLE) : '';
    if (!title) {
      return NextResponse.json({ error: 'Thiếu tên template.' }, { status: 400 });
    }

    const template = await pteTemplatesDb.create(userId, { title, frame_text: frame });
    return NextResponse.json({ template }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[templates POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
