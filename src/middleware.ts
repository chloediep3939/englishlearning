import { NextResponse, type NextRequest } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { verifyAuthToken, AUTH_CONFIG } from '@/lib/auth';

const PUBLIC_PATHS = new Set<string>([
  '/',
  '/login',
  '/api/auth/google',
  '/api/auth/callback/google',
  '/api/auth/logout',
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/api/auth/callback/')) return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/mascot/')) return true;
  if (pathname === '/favicon.ico') return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(AUTH_CONFIG.cookieName)?.value;
  const { env } = await getCloudflareContext({ async: true });
  const userId = await verifyAuthToken(token, env.AUTH_SECRET);
  if (userId) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL('/login', req.url);
  if (pathname !== '/') url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|mascot|favicon.ico).*)'],
};
