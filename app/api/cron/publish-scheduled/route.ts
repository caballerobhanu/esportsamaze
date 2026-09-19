import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { syncScheduledArticles } from '@/lib/news-queries';

export const dynamic = 'force-dynamic';

/** Constant-time compare over fixed-length digests, so the secret's length never leaks. */
function secretMatches(provided: string, expected: string): boolean {
  if (!provided) return false;
  const digest = (value: string) => crypto.createHash('sha256').update(value).digest();
  return crypto.timingSafeEqual(digest(provided), digest(expected));
}

/**
 * Publishes SCHEDULED articles whose publish time has passed.
 *
 * Called by cron (see /etc/cron.d/esportsamaze) rather than by a page render, so a
 * scheduled article goes live on time whether or not an admin happens to be looking at
 * the dashboard. The existing admin-panel calls to `syncScheduledArticles` stay as a
 * fallback — this route is additive, and if it never runs the behaviour is exactly what
 * it was before.
 *
 * The work itself is idempotent: it only flips rows whose time has already passed, so a
 * repeated call is a no-op returning 0.
 *
 * Fail-closed: with no CRON_SECRET configured it refuses rather than running
 * unauthenticated. Cron reaches the app on 127.0.0.1, so nginx and its micro-cache are
 * not in the path — and this route must never be cached.
 */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET is not configured.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (!secretMatches(request.headers.get('x-cron-secret') ?? '', expected)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const published = await syncScheduledArticles();
    return NextResponse.json(
      { ok: true, published, timestamp: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[cron] publish-scheduled failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Publish failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
