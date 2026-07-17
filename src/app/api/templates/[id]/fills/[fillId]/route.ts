import { NextResponse } from 'next/server';
import { requireUserId, UnauthorizedError } from '@/lib/current-user';
import { pteTemplateFillsDb } from '@/lib/templates/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
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
