import { cookies, headers } from 'next/headers';
import crypto from 'crypto';

const COOKIE_NAME = 'ea_admin';

// Session tokens derive from a dedicated secret so rotating ADMIN_PASSWORD
// doesn't invalidate sessions and rotating this secret invalidates all of them.
const SECRET_SOURCE =
  process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || 'changeme';

function tokenFor(password: string): string {
  return crypto
    .createHash('sha256')
    .update(`${password}::esportsamaze-admin`)
    .digest('hex');
}

// Hash both sides to fixed-length digests before comparing so the response
// timing leaks nothing about the password (including its length).
export function verifyPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || 'changeme';
  if (!input) return false;
  const given = crypto.createHash('sha256').update(input).digest();
  const wanted = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(given, wanted);
}

// ---------------------------------------------------------------- login rate limit
// In-memory sliding window of failed attempts per IP (single-server deployments).
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const failedLogins = new Map<string, number[]>();

export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    return (
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      h.get('x-real-ip') ||
      'unknown'
    );
  } catch {
    return 'unknown';
  }
}

export function isLoginBlocked(ip: string): boolean {
  const now = Date.now();
  const recent = (failedLogins.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length === 0) failedLogins.delete(ip);
  else failedLogins.set(ip, recent);
  return recent.length >= MAX_ATTEMPTS;
}

export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const recent = (failedLogins.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  failedLogins.set(ip, recent);
}

export function clearFailedLogins(ip: string): void {
  failedLogins.delete(ip);
}

// ---------------------------------------------------------------- session

export async function isAdmin(): Promise<boolean> {
  try {
    const store = await cookies();
    return store.get(COOKIE_NAME)?.value === tokenFor(SECRET_SOURCE);
  } catch {
    return false;
  }
}

export async function grantAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, tokenFor(SECRET_SOURCE), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function revokeAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
