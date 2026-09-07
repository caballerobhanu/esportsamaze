import { headers } from 'next/headers';

export interface RateLimiterOptions {
  windowMs: number; // e.g. 60_000 (1 min)
  maxRequests: number; // e.g. 60
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

const rateLimitStores = new Map<string, Map<string, number[]>>();

// Periodic cleanup every 5 minutes to prevent memory leaks
let lastPruned = Date.now();
function cleanupStores() {
  const now = Date.now();
  if (now - lastPruned < 300_000) return;
  lastPruned = now;
  for (const store of rateLimitStores.values()) {
    for (const [key, timestamps] of store.entries()) {
      const fresh = timestamps.filter((t) => now - t < 300_000);
      if (fresh.length === 0) store.delete(key);
      else store.set(key, fresh);
    }
  }
}

export function checkRateLimit(
  bucket: string,
  identifier: string,
  options: RateLimiterOptions
): RateLimitResult {
  cleanupStores();
  if (!rateLimitStores.has(bucket)) {
    rateLimitStores.set(bucket, new Map());
  }
  const store = rateLimitStores.get(bucket)!;
  const now = Date.now();
  const times = (store.get(identifier) ?? []).filter((t) => now - t < options.windowMs);

  if (times.length >= options.maxRequests) {
    const oldest = times[0];
    const resetMs = Math.max(0, options.windowMs - (now - oldest));
    return {
      allowed: false,
      remaining: 0,
      resetMs,
    };
  }

  times.push(now);
  store.set(identifier, times);

  return {
    allowed: true,
    remaining: options.maxRequests - times.length,
    resetMs: options.windowMs,
  };
}

const IPV4_REGEX = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX = /^[0-9a-fA-F:]+$/;

export function isValidIp(ip: string): boolean {
  return IPV4_REGEX.test(ip) || IPV6_REGEX.test(ip);
}

export async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    // 1. Cloudflare
    const cf = h.get('cf-connecting-ip')?.trim();
    if (cf && isValidIp(cf)) return cf;

    // 2. Nginx / reverse proxy
    const realIp = h.get('x-real-ip')?.trim();
    if (realIp && isValidIp(realIp)) return realIp;

    // 3. x-forwarded-for (take the rightmost proxy-added entry to avoid client spoofing)
    const xff = h.get('x-forwarded-for');
    if (xff) {
      const hops = xff.split(',').map((s) => s.trim()).filter(Boolean);
      for (let i = hops.length - 1; i >= 0; i--) {
        if (isValidIp(hops[i])) return hops[i];
      }
    }
  } catch {
    // headers() might throw outside request context
  }
  return '127.0.0.1';
}
