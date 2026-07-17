import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { pteTemplatesDb, pteTemplateFillsDb } from '@/lib/templates/db';
import { fillTemplate } from '@/lib/templates/slots';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_TOPIC = 200;
const MAX_SLOT_VALUE = 500;
const MIN_FILLED = 20;
const MAX_FILLED = 10_000;

interface CreateBody {
  topic?: unknown;
  slot_values?: unknown;
  filled_text?: unknown;
}

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const n = parseId(id);
    if (n === null) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
    const template = await pteTemplatesDb.getById(userId, n);
    if (!template) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    const fills = await pteTemplateFillsDb.listByTemplate(userId, n);
    return NextResponse.json({ fills });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[template fills GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const n = parseId(id);
    if (n === null) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });

    const template = await pteTemplatesDb.getById(userId, n);
    if (!template) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as CreateBody;

    const topic = typeof body.topic === 'string' ? body.topic.trim().slice(0, MAX_TOPIC) : '';
    if (!topic) {
      return NextResponse.json({ error: 'Thiếu chủ đề (topic) cho bài mẫu.' }, { status: 400 });
    }

    // Shape 1: slot form — assemble filled_text server-side so the stored
    // text can never drift from frame + values.
    if (body.slot_values !== undefined) {
      if (
        !body.slot_values ||
        typeof body.slot_values !== 'object' ||
        Array.isArray(body.slot_values)
      ) {
        return NextResponse.json({ error: 'slot_values không hợp lệ.' }, { status: 400 });
      }
      const values: Record<string, string> = {};
      for (const [k, v] of Object.entries(body.slot_values as Record<string, unknown>)) {
        if (typeof v !== 'string') continue;
        const trimmed = v.trim();
        if (trimmed.length > MAX_SLOT_VALUE) {
          return NextResponse.json(
            { error: `Nội dung ô [${k}] quá dài (tối đa ${MAX_SLOT_VALUE} ký tự).` },
            { status: 400 },
          );
        }
        if (trimmed) values[k] = trimmed;
      }
      const { text, missing } = fillTemplate(template.frame_text, values);
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Thiếu nội dung cho: ${missing.map((m) => `[${m}]`).join(', ')}` },
          { status: 400 },
        );
      }
      const fill = await pteTemplateFillsDb.create(userId, n, {
        topic,
        slot_values: values,
        filled_text: text,
      });
      return NextResponse.json({ fill }, { status: 201 });
    }

    // Shape 2: pasted whole text — slot boundaries unknown (quiz will skip it).
    if (typeof body.filled_text === 'string') {
      const filled = body.filled_text.trim();
      if (filled.length < MIN_FILLED) {
        return NextResponse.json(
          { error: `Bài quá ngắn (tối thiểu ${MIN_FILLED} ký tự).` },
          { status: 400 },
        );
      }
      if (filled.length > MAX_FILLED) {
        return NextResponse.json(
          { error: `Bài quá dài (tối đa ${MAX_FILLED.toLocaleString('vi-VN')} ký tự).` },
          { status: 400 },
        );
      }
      const fill = await pteTemplateFillsDb.create(userId, n, {
        topic,
        slot_values: null,
        filled_text: filled,
      });
      return NextResponse.json({ fill }, { status: 201 });
    }

    return NextResponse.json(
      { error: 'Cần slot_values (điền theo ô) hoặc filled_text (dán bài hoàn chỉnh).' },
      { status: 400 },
    );
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[template fills POST] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
