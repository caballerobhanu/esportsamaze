import { NextRequest, NextResponse } from 'next/server';

/**
 * Checks whether an incoming request originates from the same site.
 *
 * NOTE: This is browser-enforced (via `sec-fetch-site` and `origin`/`referer` headers).
 * It stops rival websites from live-fetching our internal APIs from their users' browsers.
 * Non-browser clients (curl, python scripts) do not send browser security headers and will
 * not be stopped by this check alone — server-level rate limits (e.g. Nginx limit_req)
 * and deleting raw data dump endpoints are the actual defense for script-based scraping.
 */
export function isSameOrigin(req: NextRequest): boolean {
  // 1. Check sec-fetch-site header (supported by Chrome, Edge, Safari, Firefox)
  const secFetchSite = req.headers.get('sec-fetch-site');
  if (secFetchSite === 'cross-site') {
    return false;
  }

  // 2. Validate Origin if present
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');

  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return false;
      }
    } catch {
      return false;
    }
  }

  // 3. Validate Referer if present and no Origin
  const referer = req.headers.get('referer');
  if (!origin && referer && host) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost !== host) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Detects cross-site media hotlinking.
 * Allows:
 *  - Empty / missing referer (direct address bar visits, curl, privacy-focused clients)
 *  - Same-origin referer (matches request Host header or NEXT_PUBLIC_SITE_URL)
 *  - Localhost during non-production development
 *
 * Rejects:
 *  - `sec-fetch-site: cross-site` (modern browsers embedding <img> on external websites)
 *  - Foreign `referer` host
 */
export function isForeignReferer(req: Request): boolean {
  const secFetchSite = req.headers.get('sec-fetch-site');
  if (secFetchSite === 'cross-site') {
    return true;
  }

  const referer = req.headers.get('referer');
  if (!referer) {
    return false;
  }

  try {
    const refererHost = new URL(referer).host.toLowerCase();
    const host = (req.headers.get('host') || '').toLowerCase();
    const siteUrlHost = process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host.toLowerCase()
      : null;

    if (refererHost === host) return false;
    if (siteUrlHost && refererHost === siteUrlHost) return false;

    if (
      process.env.NODE_ENV !== 'production' &&
      (refererHost.startsWith('localhost') || refererHost.startsWith('127.0.0.1'))
    ) {
      return false;
    }

    return true;
  } catch {
    return true;
  }
}

export function crossSiteForbiddenResponse() {
  return NextResponse.json(
    { error: 'Cross-origin requests are forbidden' },
    { status: 403 }
  );
}
