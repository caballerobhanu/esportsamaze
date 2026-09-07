import { cookies, headers } from 'next/headers';
import crypto from 'crypto';

const COOKIE_NAME = 'ea_admin';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getAdminSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_AUTH === '1') {
      return 'changeme';
    }
    throw new Error('FATAL: ADMIN_PASSWORD or ADMIN_SESSION_SECRET must be configured. Set ALLOW_DEV_AUTH=1 only for local offline dev.');
  }
  return secret;
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
    if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_AUTH === '1') {
      return input === 'changeme';
    }
    return false;
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
  try {
    const h = await headers();
    // Prefer the proxy-owned x-real-ip; otherwise take the LAST x-forwarded-for
    // entry (the hop added by the nearest trusted proxy). The leftmost entry is
    // client-controlled and trivially spoofable when the app is directly
    // reachable, so it must never be used as the limiting key.
    const realIp = h.get('x-real-ip')?.trim();
    if (realIp) return realIp;
    const xff = h.get('x-forwarded-for');
    if (xff) {
      const hops = xff.split(',').map((s) => s.trim()).filter(Boolean);
      if (hops.length > 0) return hops[hops.length - 1];
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
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
    maxAge: 60 * 60 * 24 * 7, // 7 days
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function revokeAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
