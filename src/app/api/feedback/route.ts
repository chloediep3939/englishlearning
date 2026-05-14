// POST /api/feedback — record a góp ý submission.
//
// Authenticated route — middleware redirects anonymous callers to /login. Demo
// users can submit too (we just stamp is_demo_user=1 so analytics can split
// the firehose). Body validation is permissive: only `content` is required.

import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/current-user';
import { usersDb, feedbackDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_CONTENT = 2000;
const MIN_CONTENT = 10;

export async function POST(req: Request) {
  const userId = await requireUserId();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const b = body as { rating?: unknown; content?: unknown; email?: unknown };

  const content = typeof b.content === 'string' ? b.content.trim() : '';
  if (content.length < MIN_CONTENT) {
    return NextResponse.json({ error: 'content_too_short' }, { status: 400 });
  }
  if (content.length > MAX_CONTENT) {
    return NextResponse.json({ error: 'content_too_long' }, { status: 400 });
  }

  let rating: number | null = null;
  if (b.rating != null) {
    const r = Number(b.rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      return NextResponse.json({ error: 'invalid_rating' }, { status: 400 });
    }
    rating = Math.round(r);
  }

  const user = await usersDb.getById(userId);
  const submittedEmail = typeof b.email === 'string' ? b.email.trim().slice(0, 254) : '';
  // Prefer the user-supplied email (demo users can override), else fall back
  // to the cookie identity's email. Synthetic demo emails (demo-*@bun.local)
  // are useless for replies, so blank them out unless the user typed one.
  const isSyntheticDemoEmail = user?.is_demo && user.email.endsWith('@bun.local');
  const email = submittedEmail || (isSyntheticDemoEmail ? null : user?.email ?? null);

  const referer = req.headers.get('referer');
  const userAgent = req.headers.get('user-agent');

  await feedbackDb.create({
    user_id: userId,
    email,
    rating,
    content,
    page_url: referer,
    user_agent: userAgent,
    is_demo_user: !!user?.is_demo,
  });

  return NextResponse.json({ ok: true });
}
