/* Simple in-memory sliding-window rate limiter for public write endpoints
   (single-server deployments — same model as the login limiter in admin-auth). */

const buckets = new Map<string, number[]>();

/**
 * Returns true when the caller is OVER the limit. Otherwise records the hit.
 * Call once per request; the hit is recorded only when allowed.
 */
export function hitRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 5000) {
    // Opportunistic cleanup so the map can't grow unbounded.
    for (const [k, times] of buckets) {
      if (times.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return false;
}
