import { NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_CONFIG.cookieName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return res;
}

// Also support GET → redirect to /login (convenience)
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const res = NextResponse.redirect(new URL('/login', origin));
  res.cookies.set(AUTH_CONFIG.cookieName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return res;
}
