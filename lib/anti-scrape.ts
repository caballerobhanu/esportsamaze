import { NextRequest, NextResponse } from 'next/server';

/**
 * Checks whether an incoming request originates from the same site.
 * Modern browsers automatically attach `sec-fetch-site` on cross-site fetch/xhr.
 * If another website tries to fetch our API from client-side JavaScript,
 * `sec-fetch-site` will be 'cross-site'.
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

export function crossSiteForbiddenResponse() {
  return NextResponse.json(
    { error: 'Cross-origin requests are forbidden' },
    { status: 403 }
  );
}
