import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getDb } from '@/lib/db';
import { createAuthToken, isEmailAllowed, AUTH_CONFIG } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'oauth_state';
const NEXT_COOKIE = 'oauth_next';

interface GoogleTokenInfo {
  iss?: string;
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  exp?: string;
}

function loginError(origin: string, code: string): NextResponse {
  const url = new URL('/login', origin);
  url.searchParams.set('error', code);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  const reqUrl = new URL(req.url);
  const origin = reqUrl.origin;

  // User cancelled or Google error
  const oauthError = reqUrl.searchParams.get('error');
  if (oauthError) {
    return loginError(origin, oauthError === 'access_denied' ? 'denied' : 'oauth_error');
  }

  const code = reqUrl.searchParams.get('code');
  const receivedState = reqUrl.searchParams.get('state');
  if (!code || !receivedState) {
    return loginError(origin, 'missing_params');
  }

  // CSRF: state cookie must match the state Google echoed back
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k, decodeURIComponent(v.join('='))];
    })
  );
  const expectedState = cookies[STATE_COOKIE];
  if (!expectedState || expectedState !== receivedState) {
    return loginError(origin, 'state_mismatch');
  }
  const nextPath = cookies[NEXT_COOKIE] || '/';

  // Step 1: exchange code for tokens
  const { env } = await getCloudflareContext({ async: true });
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return loginError(origin, 'oauth_misconfigured');
  }
  const redirectUri = `${origin}/api/auth/callback/google`;

  let tokenResponse: { id_token?: string; access_token?: string };
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => '');
      console.error('[oauth] token exchange failed:', tokenRes.status, errText.slice(0, 200));
      return loginError(origin, 'token_exchange_failed');
    }
    tokenResponse = await tokenRes.json();
  } catch (err) {
    console.error('[oauth] token fetch error:', err);
    return loginError(origin, 'token_exchange_failed');
  }

  if (!tokenResponse.id_token) {
    return loginError(origin, 'no_id_token');
  }

  // Step 2: verify id_token via tokeninfo (simpler than JWT signature verification)
  let info: GoogleTokenInfo;
  try {
    const infoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenResponse.id_token)}`
    );
    if (!infoRes.ok) {
      console.error('[oauth] tokeninfo failed:', infoRes.status);
      return loginError(origin, 'token_verify_failed');
    }
    info = await infoRes.json();
  } catch (err) {
    console.error('[oauth] tokeninfo fetch error:', err);
    return loginError(origin, 'token_verify_failed');
  }

  // Step 3: validate token claims
  if (info.aud !== clientId) {
    console.error('[oauth] aud mismatch:', info.aud, 'expected', clientId);
    return loginError(origin, 'aud_mismatch');
  }
  const validIss = info.iss === 'https://accounts.google.com' || info.iss === 'accounts.google.com';
  if (!validIss) {
    console.error('[oauth] iss invalid:', info.iss);
    return loginError(origin, 'iss_invalid');
  }
  const emailVerified = info.email_verified === 'true' || info.email_verified === true;
  if (!emailVerified) {
    return loginError(origin, 'email_unverified');
  }
  const email = info.email?.toLowerCase().trim();
  if (!email) {
    return loginError(origin, 'no_email');
  }
  if (!isEmailAllowed(email, env.ALLOWED_EMAILS)) {
    return loginError(origin, 'not_allowed');
  }

  // Step 4: lookup or create user
  const sub = info.sub ?? '';
  const name = info.name ?? null;
  const picture = info.picture ?? null;

  let userId: number;
  try {
    const db = await getDb();
    // Try lookup by google_sub first (stable across email changes)
    let row = sub
      ? await db.prepare('SELECT id FROM users WHERE google_sub = ?').bind(sub).first<{ id: number }>()
      : null;
    // Fall back to email lookup
    if (!row) {
      row = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: number }>();
    }
    if (row) {
      userId = row.id;
      // Update profile data on each login
      await db
        .prepare(
          `UPDATE users
           SET name = ?, picture_url = ?, google_sub = COALESCE(?, google_sub), last_login_at = datetime('now')
           WHERE id = ?`
        )
        .bind(name, picture, sub || null, userId)
        .run();
    } else {
      // First user → admin
      const countRow = await db.prepare('SELECT COUNT(*) as n FROM users').first<{ n: number }>();
      const isAdmin = countRow && Number(countRow.n) === 0 ? 1 : 0;
      const result = await db
        .prepare(
          `INSERT INTO users (email, name, picture_url, google_sub, is_admin, last_login_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`
        )
        .bind(email, name, picture, sub || null, isAdmin)
        .run();
      userId = Number(result.meta.last_row_id);

      // Seed default settings for new user
      await db.batch([
        db.prepare(`INSERT INTO user_settings (user_id, key, value) VALUES (?, 'flashcard_daily_goal_new', '10')`).bind(userId),
        db.prepare(`INSERT INTO user_settings (user_id, key, value) VALUES (?, 'flashcard_daily_goal_review', '50')`).bind(userId),
        db.prepare(`INSERT INTO user_settings (user_id, key, value) VALUES (?, 'flashcard_reminder_time', '20:00')`).bind(userId),
        db.prepare(`INSERT INTO user_settings (user_id, key, value) VALUES (?, 'flashcard_reminder_enabled', '0')`).bind(userId),
        db.prepare(`INSERT INTO user_settings (user_id, key, value) VALUES (?, 'flashcard_mastered_hide_from_review', '1')`).bind(userId),
        db.prepare(`INSERT INTO user_settings (user_id, key, value) VALUES (?, 'flashcard_daily_new_limit', '10')`).bind(userId),
      ]);
    }
  } catch (err) {
    console.error('[oauth] DB error:', err);
    return loginError(origin, 'db_error');
  }

  // Step 5: set auth cookie, clear state cookies, redirect
  const token = await createAuthToken(userId, env.AUTH_SECRET);
  const safeNext = nextPath.startsWith('/') ? nextPath : '/';
  const res = NextResponse.redirect(new URL(safeNext, origin));
  const secure = process.env.NODE_ENV === 'production';
  res.cookies.set(AUTH_CONFIG.cookieName, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: AUTH_CONFIG.maxAgeSec,
    path: '/',
  });
  // Clear OAuth state cookies
  res.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/api/auth/' });
  res.cookies.set(NEXT_COOKIE, '', { maxAge: 0, path: '/api/auth/' });
  return res;
}
