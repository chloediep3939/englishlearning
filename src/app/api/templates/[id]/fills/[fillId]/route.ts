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

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; fillId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id, fillId } = await ctx.params;
    const templateId = parseId(id);
    const fid = parseId(fillId);
    if (templateId === null || fid === null) {
      return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
    }
    const existing = await pteTemplateFillsDb.getById(userId, fid);
    if (!existing || existing.template_id !== templateId) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const updates: Parameters<typeof pteTemplateFillsDb.update>[2] = {};

    if (typeof body.topic === 'string') {
      const t = body.topic.trim();
      if (t.length === 0) {
        return NextResponse.json({ error: 'Chủ đề rỗng.' }, { status: 400 });
      }
      updates.topic = t.slice(0, MAX_TOPIC);
    }

    // Same two shapes as POST. slot_values re-assembles filled_text from the
    // CURRENT frame; filled_text switches the fill to pasted-whole mode.
    if (body.slot_values !== undefined) {
      if (
        !body.slot_values ||
        typeof body.slot_values !== 'object' ||
        Array.isArray(body.slot_values)
      ) {
        return NextResponse.json({ error: 'slot_values không hợp lệ.' }, { status: 400 });
      }
      const template = await pteTemplatesDb.getById(userId, templateId);
      if (!template) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
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
      updates.slot_values = values;
      updates.filled_text = text;
    } else if (typeof body.filled_text === 'string') {
      const filled = body.filled_text.trim();
      if (filled.length < MIN_FILLED || filled.length > MAX_FILLED) {
        return NextResponse.json(
          { error: `Bài phải dài từ ${MIN_FILLED} đến ${MAX_FILLED.toLocaleString('vi-VN')} ký tự.` },
          { status: 400 },
        );
      }
      updates.slot_values = null;
      updates.filled_text = filled;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Không có trường hợp lệ để cập nhật.' }, { status: 400 });
    }

    const updated = await pteTemplateFillsDb.update(userId, fid, updates);
    if (!updated) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json({ fill: updated });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[template fill PATCH] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; fillId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id, fillId } = await ctx.params;
    const templateId = parseId(id);
    const fid = parseId(fillId);
    if (templateId === null || fid === null) {
      return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
    }
    // Ownership is enforced by user_id in the wrapper; guard the template_id
    // linkage too so a fill can't be deleted through another template's URL.
    const fill = await pteTemplateFillsDb.getById(userId, fid);
    if (!fill || fill.template_id !== templateId) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    const ok = await pteTemplateFillsDb.deleteById(userId, fid);
    if (!ok) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[template fill DELETE] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
