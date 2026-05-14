import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'oauth_state';
const NEXT_COOKIE = 'oauth_next';

export async function GET(req: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID not configured.' },
      { status: 500 }
    );
  }

  const reqUrl = new URL(req.url);
  const redirectUri = `${reqUrl.origin}/api/auth/callback/google`;
  const next = reqUrl.searchParams.get('next') || '/';

  // CSRF: random state, store in short-lived cookie, echo via Google, verify on callback
  const state = crypto.randomUUID();

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('access_type', 'online');
  authUrl.searchParams.set('prompt', 'select_account');

  const res = NextResponse.redirect(authUrl.toString());
  const secure = process.env.NODE_ENV === 'production';
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 600, // 10 min
    path: '/api/auth/',
  });
  res.cookies.set(NEXT_COOKIE, next, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 600,
    path: '/api/auth/',
  });
  return res;
}
