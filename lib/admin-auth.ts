import { cookies, headers } from 'next/headers';
import crypto from 'crypto';

const COOKIE_NAME = 'ea_admin';
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours

/** The dev-only auth secret must be a real secret, not a flag: 16 chars minimum. */
const MIN_DEV_SECRET_LENGTH = 16;
let devSecretWarned = false;

function warnDevSecretOnce(message: string): void {
  if (devSecretWarned) return;
  devSecretWarned = true;
  console.warn(message);
}

/**
 * Dev-only auth secret, taken from the VALUE of ALLOW_DEV_AUTH.
 *
 * Deliberately NOT a hardcoded constant — see the twin in proxy.ts, which this
 * must stay in step with. The edge gate and the server actions each derive the
 * secret independently, so hardening one without the other leaves the two
 * agreeing on different keys (the gate would let you in and every action would
 * then reject you).
 *
 * The same value doubles as the dev login password, so a local setup needs one
 * variable instead of a second literal baked into the source.
 */
export function resolveDevSecret(): string | null {
  const raw = process.env.ALLOW_DEV_AUTH;
  if (!raw) return null;

  if (process.env.NODE_ENV === 'production') {
    warnDevSecretOnce(
      '[admin-auth] ALLOW_DEV_AUTH is set in a production build and is IGNORED. Configure ADMIN_PASSWORD or ADMIN_SESSION_SECRET instead.'
    );
    return null;
  }

  const value = raw.trim();
  if (value.length < MIN_DEV_SECRET_LENGTH) {
    warnDevSecretOnce(
      `[admin-auth] ALLOW_DEV_AUTH is shorter than ${MIN_DEV_SECRET_LENGTH} characters and is IGNORED. ` +
        'It IS the development session secret and login password, so set a long random value rather than a flag like "1".'
    );
    return null;
  }

  warnDevSecretOnce(
    '[admin-auth] ALLOW_DEV_AUTH is active — the admin gate is using a DEVELOPMENT secret. Never set this on a deployed environment.'
  );
  return value;
}

function getAdminSecret(): string {
  const customSecret = process.env.ADMIN_SESSION_SECRET;
  if (customSecret) return customSecret;

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    const devSecret = resolveDevSecret();
    if (devSecret) return devSecret;
    throw new Error(
      'FATAL: ADMIN_PASSWORD or ADMIN_SESSION_SECRET must be configured. Set ALLOW_DEV_AUTH to a long random dev secret (not "1") only for local offline dev.'
    );
  }

  // Derive high-entropy 256-bit secret so raw password is never exposed as HMAC key
  return crypto.createHash('sha256').update(`ea_admin_salt:${password}`).digest('hex');
}

// ---------------------------------------------------------------- session token
// HMAC-signed `iat.signature` pair instead of a deterministic hash of the
// secret: every login issues a fresh token (rotation), tokens expire with the
// session (revocation window), and the cookie no longer doubles as a
// password-equivalent verifiable offline.
//
// The same HMAC scheme is re-implemented with Web Crypto in proxy.ts (edge
// runtime) — keep the two in sync.
function hmacHex(data: string, key: string): string {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

export function createSessionToken(secret: string, issuedAtSec: number): string {
  const iatPart = issuedAtSec.toString(36);
  return `${iatPart}.${hmacHex(`admin-session:${iatPart}`, secret)}`;
}

export function verifySessionToken(token: string, secret: string, nowSec: number): boolean {
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return false;
  const iatPart = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const iat = parseInt(iatPart, 36);
  if (!Number.isFinite(iat) || iat <= 0) return false;
  if (nowSec - iat > SESSION_TTL_SECONDS || iat > nowSec + 60) return false;
  const expected = hmacHex(`admin-session:${iatPart}`, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Hash both sides to fixed-length digests before comparing so the response
// timing leaks nothing about the password (including its length).
export function verifyPassword(input: string): boolean {
  if (!input) return false;
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    // Dev-only fallback: the password is the ALLOW_DEV_AUTH value itself, so no
    // literal is baked into the source. A short placeholder is refused.
    const devSecret = resolveDevSecret();
    return devSecret !== null && input === devSecret;
  }
  if (process.env.NODE_ENV === 'production' && input === 'changeme') {
    return false;
  }
  const given = crypto.createHash('sha256').update(input).digest();
  const wanted = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(given, wanted);
}

// ---------------------------------------------------------------- login rate limit
// In-memory sliding windows of failed attempts (single-server deployments):
// one per client IP and one global cap, so rotating a spoofed X-Forwarded-For
// header cannot keep brute-forcing past the per-IP limit.
const MAX_ATTEMPTS = 10;
const GLOBAL_MAX_ATTEMPTS = 50;
const WINDOW_MS = 15 * 60 * 1000;
const failedLogins = new Map<string, number[]>();
let globalFailures: number[] = [];

function pruneRecent(times: number[], now: number): number[] {
  return times.filter((t) => now - t < WINDOW_MS);
}

export async function clientIp(): Promise<string> {
  const { getClientIp } = await import('@/lib/rate-limiter');
  return getClientIp();
}

export function isLoginBlocked(ip: string): boolean {
  const now = Date.now();
  globalFailures = pruneRecent(globalFailures, now);
  if (globalFailures.length >= GLOBAL_MAX_ATTEMPTS) return true;
  const recent = pruneRecent(failedLogins.get(ip) ?? [], now);
  if (recent.length === 0) failedLogins.delete(ip);
  else failedLogins.set(ip, recent);
  return recent.length >= MAX_ATTEMPTS;
}

export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  globalFailures = pruneRecent(globalFailures, now);
  globalFailures.push(now);
  const recent = pruneRecent(failedLogins.get(ip) ?? [], now);
  recent.push(now);
  failedLogins.set(ip, recent);
}

export function clearFailedLogins(ip: string): void {
  failedLogins.delete(ip);
  globalFailures = [];
}

// ---------------------------------------------------------------- session

export async function isAdmin(): Promise<boolean> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (!token) return false;
    return verifySessionToken(token, getAdminSecret(), Math.floor(Date.now() / 1000));
  } catch {
    return false;
  }
}

export async function grantAdminSession(): Promise<void> {
  const store = await cookies();
  const token = createSessionToken(getAdminSecret(), Math.floor(Date.now() / 1000));
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function revokeAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
