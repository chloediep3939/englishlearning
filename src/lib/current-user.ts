import { cookies } from 'next/headers';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { verifyAuthToken, AUTH_CONFIG } from './auth';
import { getDb } from './db';
import type { User } from './types';

/**
 * Get the current user ID from the auth cookie.
 * Returns null if no valid session.
 * Use in server components, route handlers, server actions.
 */
export async function getCurrentUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_CONFIG.cookieName)?.value;
  const { env } = await getCloudflareContext({ async: true });
  return await verifyAuthToken(token, env.AUTH_SECRET);
}

/**
 * Throws UnauthorizedError if not authenticated. Use when auth is required.
 */
export async function requireUserId(): Promise<number> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new UnauthorizedError();
  }
  return userId;
}

/**
 * Fetch full user record from DB.
 */
export async function getCurrentUser(): Promise<User | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const db = await getDb();
  const row = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<Record<string, unknown>>();
  if (!row) return null;
  return {
    ...(row as unknown as User),
    is_admin: Number(row.is_admin) === 1,
  };
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}
