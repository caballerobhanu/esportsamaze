import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Auth gate for the admin panel. Runs BEFORE routes render, so unauthenticated
 * requests get a real 307 instead of a streamed page with a client-side
 * redirect (layout-level redirects alone leak the page's RSC payload).
 *
 * Session tokens are `iat.signature` HMAC-SHA256 pairs minted by
 * lib/admin-auth.ts `grantAdminSession` — keep the verification here in sync
 * (this file runs on the edge runtime, so it uses Web Crypto).
 */
const COOKIE_NAME = 'ea_admin';
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours

async function hmacHex(data: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const keyObj = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', keyObj, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Constant-time string compare (both digests are fixed 64-char hex).
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function isValidSessionToken(token: string, secret: string): Promise<boolean> {
  const dot = token.indexOf('.');
  const iatPart = token.slice(0, dot);
  const iat = parseInt(iatPart, 36);
  if (!Number.isFinite(iat) || iat <= 0) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - iat > SESSION_TTL_SECONDS || iat > nowSec + 60) return false;
  const expected = await hmacHex(`admin-session:${iatPart}`, secret);
  const given = token.slice(dot + 1);
  return safeEqual(given, expected);
}

async function getEdgeAdminSecret(): Promise<string | null> {
  const customSecret = process.env.ADMIN_SESSION_SECRET;
  if (customSecret) return customSecret;

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_AUTH === '1'
      ? 'changeme'
      : null;
  }

  // Derive matching SHA-256 hex digest using Web Crypto
  const msgUint8 = new TextEncoder().encode(`ea_admin_salt:${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hasValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = await getEdgeAdminSecret();
  if (!secret) return false;
  return isValidSessionToken(token, secret);
}

// Tabs that exist as route segments under /tournaments/<slug>/<tab>
const KNOWN_TAB_SEGMENTS = new Set([
  'standings',
  'matches',
  'progression',
  'format',
  'teams',
  'prizepool',
  'statistics',
]);

/**
 * Legacy URLs: /tournaments/<slug>?tab=standings&matchId=… served every tab
 * from one dynamic page. Tabs are route segments now — 308-redirect old
 * `?tab=` URLs to their route (preserving the remaining params) so indexed
 * links and shared deep links keep working.
 */
function tournamentTabRedirect(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl;

  // Legacy draft-preview shim: /tournaments/<slug>/preview?tab=x&matchId=y
  const previewMatch = pathname.match(/^\/tournaments\/([^/]+)\/preview$/);
  if (previewMatch) {
    const rawTab = searchParams.get('tab');
    if (rawTab) {
      const tab = rawTab === 'fraggers' ? 'statistics' : rawTab;
      if (tab === 'overview') return NextResponse.redirect(new URL(`/tournaments/${previewMatch[1]}`, request.url), 308);
      if (KNOWN_TAB_SEGMENTS.has(tab)) {
        searchParams.delete('tab');
        const rest = searchParams.toString();
        return NextResponse.redirect(
          new URL(`/tournaments/${previewMatch[1]}/${tab}${rest ? `?${rest}` : ''}`, request.url),
          308
        );
      }
    }
    return NextResponse.redirect(new URL(`/tournaments/${previewMatch[1]}`, request.url), 308);
  }

  if (!/^\/tournaments\/[^/]+$/.test(pathname)) return null;
  const rawTab = searchParams.get('tab');
  if (!rawTab) return null;
  const tab = rawTab === 'fraggers' ? 'statistics' : rawTab;
  if (!KNOWN_TAB_SEGMENTS.has(tab)) return null;
  searchParams.delete('tab');
  const rest = searchParams.toString();
  return NextResponse.redirect(
    new URL(`/tournaments/${pathname.split('/')[2]}/${tab}${rest ? `?${rest}` : ''}`, request.url),
    308
  );
}

const ADMIN_SLUG = process.env.ADMIN_PATH || 'poorvith';

export async function proxy(request: NextRequest) {
  const tabRedirect = tournamentTabRedirect(request);
  if (tabRedirect) return tabRedirect;

  const { pathname } = request.nextUrl;
  const isAuthed = await hasValidSession(request.cookies.get(COOKIE_NAME)?.value);

  // 1. Secret admin login route: /poorvith/login
  if (pathname === `/${ADMIN_SLUG}/login` || pathname === `/${ADMIN_SLUG}/login/`) {
    if (isAuthed) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.rewrite(new URL('/admin/login', request.url));
  }

  // 2. Secret admin panel routes: /poorvith or /poorvith/*
  if (pathname === `/${ADMIN_SLUG}` || pathname.startsWith(`/${ADMIN_SLUG}/`)) {
    if (!isAuthed) {
      return NextResponse.redirect(new URL(`/${ADMIN_SLUG}/login`, request.url));
    }
    const adminPath = pathname.replace(new RegExp(`^\\/${ADMIN_SLUG}`), '/admin');
    return NextResponse.rewrite(new URL(`${adminPath}${request.nextUrl.search}`, request.url));
  }

  // 3. Traditional /admin paths
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    // If not authenticated, return 404 disguise (hide admin completely from public & bots)
    if (!isAuthed) {
      return NextResponse.rewrite(new URL('/not-found', request.url), { status: 404 });
    }
    // If authenticated, let the admin through
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/poorvith/:path*', '/tournaments/:path*'],
};
