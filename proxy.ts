import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Auth gate for the admin panel. Runs BEFORE routes render, so unauthenticated
 * requests get a real 307 instead of a streamed page with a client-side
 * redirect (layout-level redirects alone leak the page's RSC payload).
 *
 * Keep the token derivation in sync with lib/admin-auth.ts `tokenFor`.
 */
const COOKIE_NAME = 'ea_admin';

async function expectedToken(): Promise<string> {
  const secret = process.env.ADMIN_PASSWORD || 'changeme';
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${secret}::esportsamaze-admin`)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (token && token === (await expectedToken())) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/admin/login', request.url));
}

export const config = {
  matcher: '/admin/:path*',
};
