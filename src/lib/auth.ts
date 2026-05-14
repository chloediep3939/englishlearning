// Web Crypto HMAC-based session cookie. No DB access here — verifying is pure crypto.
// Cookie format: <user_id>.<timestamp_ms>.<hex_sig>
//
// Secret + allowlist are read by callers from `getCloudflareContext().env`
// and passed in. We don't read `process.env` here because OpenNext only exposes
// `.dev.vars` / Worker secrets through the Cloudflare context, NOT process.env.

import type { D1Database } from '@cloudflare/workers-types';

declare global {
  interface CloudflareEnv {
    AUTH_SECRET?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    ALLOWED_EMAILS?: string;
    GEMINI_API_KEY?: string;
    APP_NAME?: string;
    DB?: D1Database;
  }
}

const COOKIE_NAME = 'auth';
const MAX_AGE_SEC = 30 * 24 * 60 * 60; // 30 days

function assertSecret(secret: string | undefined): string {
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET missing or too short. Set in .dev.vars / Cloudflare secrets.');
  }
  return secret;
}

async function hmacHex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function createAuthToken(userId: number, secret: string | undefined): Promise<string> {
  const s = assertSecret(secret);
  const ts = Date.now().toString();
  const payload = `${userId}.${ts}`;
  const sig = await hmacHex(payload, s);
  return `${payload}.${sig}`;
}

/**
 * Verify a cookie token. Returns the userId if valid, null otherwise.
 */
export async function verifyAuthToken(
  token: string | undefined,
  secret: string | undefined,
): Promise<number | null> {
  if (!token) return null;
  if (!secret || secret.length < 16) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [uidStr, ts, sig] = parts;
  const userId = parseInt(uidStr, 10);
  const tsNum = parseInt(ts, 10);
  if (!Number.isFinite(userId) || userId <= 0) return null;
  if (!Number.isFinite(tsNum)) return null;
  // Expiry
  if (Date.now() - tsNum > MAX_AGE_SEC * 1000) return null;
  // HMAC verify
  let expected: string;
  try {
    expected = await hmacHex(`${userId}.${ts}`, secret);
  } catch {
    return null;
  }
  if (!constantTimeEq(expected, sig)) return null;
  return userId;
}

export const AUTH_CONFIG = {
  cookieName: COOKIE_NAME,
  maxAgeSec: MAX_AGE_SEC,
};

// ── Email allowlist ─────────────────────────────────────────────────────────
/**
 * Check if an email is allowed to sign in.
 * Empty `allowedRaw` = allow all (open mode).
 * Comma-separated values restrict the list.
 */
export function isEmailAllowed(email: string, allowedRaw: string | undefined): boolean {
  const raw = allowedRaw?.trim();
  if (!raw) return true; // open mode
  const allowList = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
  if (allowList.length === 0) return true;
  return allowList.includes(email.toLowerCase());
}
