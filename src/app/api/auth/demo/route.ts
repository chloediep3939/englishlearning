// POST /api/auth/demo — spin up a demo account.
//
// Public route (registered in src/middleware.ts) — the caller is anonymous by
// definition. Side effects:
//   1. Insert users row with is_demo=1, demo_expires_at = now+24h.
//   2. Seed decks/cards/cloze-pool/passages/settings via seedDemoUser().
//   3. Set the auth cookie so the redirect lands on /dashboard authenticated.
//
// Rolls back the half-created user if seeding throws.

import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { usersDb, getDb } from '@/lib/db';
import { createAuthToken, AUTH_CONFIG } from '@/lib/auth';
import { seedDemoUser } from '@/lib/demo/seed-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEMO_TTL_SEC = 24 * 60 * 60;

export async function POST() {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.AUTH_SECRET) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  // nanoid is not installed; randomUUID() gives ~22 hex chars after stripping
  // dashes, more than enough entropy for a synthetic placeholder email.
  const slug = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  const email = `demo-${slug}@bun.local`;
  const expiresAtSec = Math.floor(Date.now() / 1000) + DEMO_TTL_SEC;

  let userId: number;
  try {
    userId = await usersDb.createDemo(email, expiresAtSec);
  } catch (err) {
    console.error('[demo] createDemo failed:', err);
    return NextResponse.json({ error: 'create_user_failed' }, { status: 500 });
  }

  try {
    await seedDemoUser(userId);
  } catch (err) {
    console.error('[demo] seedDemoUser failed, rolling back user:', err);
    // Decks/cards/reviews cascade-delete via the FKs added in 0004. Passages
    // declare an FK without ON DELETE CASCADE, so we clear them by hand
    // before the user row goes.
    try {
      const db = await getDb();
      await db.prepare('DELETE FROM passages WHERE user_id = ?').bind(userId).run();
      await usersDb.deleteById(userId);
    } catch (rollbackErr) {
      console.error('[demo] rollback also failed:', rollbackErr);
    }
    return NextResponse.json({ error: 'seed_failed' }, { status: 500 });
  }

  const token = await createAuthToken(userId, env.AUTH_SECRET);
  const secure = process.env.NODE_ENV === 'production';
  const res = NextResponse.json({ ok: true, redirect: '/dashboard' });
  res.cookies.set(AUTH_CONFIG.cookieName, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: AUTH_CONFIG.maxAgeSec,
    path: '/',
  });
  return res;
}
