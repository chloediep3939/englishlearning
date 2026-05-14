import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { passagesDb } from '@/lib/passages/db';
import type { CefrLevel, LevelVerdict } from '@/lib/types';
import { M4_SETTINGS } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_CHARS = 100;
const MAX_CHARS = 10_000;
const MAX_TITLE = 200;

const CEFR_VALUES = M4_SETTINGS.user_cefr_level.values;
const VERDICTS: readonly LevelVerdict[] = ['too_easy', 'just_right', 'too_hard'];

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
    const passage = await passagesDb.getById(userId, n);
    if (!passage) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json({ passage });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[passage GET] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const n = parseId(id);
    if (n === null) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const updates: Parameters<typeof passagesDb.update>[2] = {};

    if (typeof body.title === 'string') {
      const t = body.title.trim();
      if (t.length === 0) {
        return NextResponse.json({ error: 'Tiêu đề rỗng.' }, { status: 400 });
      }
      updates.title = t.slice(0, MAX_TITLE);
    }
    if (typeof body.content === 'string') {
      const c = body.content.trim();
      if (c.length < MIN_CHARS || c.length > MAX_CHARS) {
        return NextResponse.json(
          { error: `Nội dung phải dài từ ${MIN_CHARS} đến ${MAX_CHARS.toLocaleString('vi-VN')} ký tự.` },
          { status: 400 },
        );
      }
      updates.content = c;
    }
    if ('source_label' in body) {
      if (body.source_label === null) updates.source_label = null;
      else if (typeof body.source_label === 'string') {
        const v = body.source_label.trim();
        updates.source_label = v ? v.slice(0, 200) : null;
      }
    }
    if ('source_url' in body) {
      if (body.source_url === null) updates.source_url = null;
      else if (typeof body.source_url === 'string') {
        const raw = body.source_url.trim();
        if (!raw) updates.source_url = null;
        else updates.source_url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      }
    }
    if ('level_estimate' in body) {
      if (body.level_estimate === null) updates.level_estimate = null;
      else if (typeof body.level_estimate === 'string' && (CEFR_VALUES as readonly string[]).includes(body.level_estimate)) {
        updates.level_estimate = body.level_estimate as CefrLevel;
      }
    }
    if ('level_verdict' in body) {
      if (body.level_verdict === null) updates.level_verdict = null;
      else if (typeof body.level_verdict === 'string' && (VERDICTS as readonly string[]).includes(body.level_verdict)) {
        updates.level_verdict = body.level_verdict as LevelVerdict;
      }
    }
    if ('level_suggestion' in body) {
      if (body.level_suggestion === null) updates.level_suggestion = null;
      else if (typeof body.level_suggestion === 'string') {
        updates.level_suggestion = body.level_suggestion.slice(0, 1000);
      }
    }
    if (typeof body.last_step_viewed === 'number' && Number.isInteger(body.last_step_viewed) && body.last_step_viewed >= 1 && body.last_step_viewed <= 10) {
      updates.last_step_viewed = body.last_step_viewed;
    }
    if ('completed_at' in body) {
      if (body.completed_at === null) updates.completed_at = null;
      else if (typeof body.completed_at === 'string' && !Number.isNaN(Date.parse(body.completed_at))) {
        updates.completed_at = body.completed_at;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Không có trường hợp lệ để cập nhật.' }, { status: 400 });
    }

    const updated = await passagesDb.update(userId, n, updates);
    if (!updated) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json({ passage: updated });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[passage PUT] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const n = parseId(id);
    if (n === null) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
    const ok = await passagesDb.deleteById(userId, n);
    if (!ok) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[passage DELETE] error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
