'use client';

import * as React from 'react';
import { formatKickoffDate, formatKickoffTime } from '@/lib/match-time';

/**
 * A match's kick-off, rendered in the viewer's own timezone.
 *
 * The instant we store is absolute UTC, so this is display only: a visitor in the
 * US should read their own local time rather than convert from IST by hand.
 *
 * The browser's timezone is unknowable while the page is rendered on the server,
 * and these routes are served from a shared ISR cache — one cached document answers
 * every visitor. So the admin-entered label is what gets rendered first (and is what
 * a client with no JS keeps), and the local rendering replaces it once the browser
 * reports itself, which is the first moment the zone is known. `useSyncExternalStore`
 * is what makes that swap hydration-safe: React reads the server snapshot for the
 * hydrating pass, so the first client render still matches the cached HTML.
 */

/** Module-level, so the (empty) subscription is never re-created. */
function subscribeToNothing(): () => void {
  return () => {};
}

/** False on the server and for the hydration pass; true once the browser reports in. */
function useHydrated(): boolean {
  return React.useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
}

function toInstant(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

/** The kick-off time in the viewer's timezone, or `fallback` before that is knowable. */
export function KickoffTime({
  scheduledAt,
  fallback,
  className,
}: {
  scheduledAt: Date | string | null | undefined;
  fallback: React.ReactNode;
  className?: string;
}) {
  const hydrated = useHydrated();
  const instant = toInstant(scheduledAt);
  if (!hydrated || !instant) return <>{fallback}</>;
  return <span className={className}>{formatKickoffTime(instant)}</span>;
}

/** The kick-off day in the viewer's timezone, or `fallback` before that is knowable. */
export function KickoffDate({
  scheduledAt,
  fallback,
  className,
  withYear = false,
}: {
  scheduledAt: Date | string | null | undefined;
  fallback: React.ReactNode;
  className?: string;
  /** Include the year, where the surrounding copy names a full date. */
  withYear?: boolean;
}) {
  const hydrated = useHydrated();
  const instant = toInstant(scheduledAt);
  if (!hydrated || !instant) return <>{fallback}</>;
  return <span className={className}>{formatKickoffDate(instant, { withYear })}</span>;
}
