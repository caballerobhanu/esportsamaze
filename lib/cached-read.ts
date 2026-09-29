import { unstable_cache } from 'next/cache';

/**
 * Wrap a read so it is served from Next's data cache inside a request, and from
 * the uncached core everywhere else.
 *
 * The fallback is not belt-and-braces. `unstable_cache` throws outside a request
 * context — `Invariant: incrementalCache missing` — and that is exactly how
 * `npm test` runs, under plain tsx. Two consequences:
 *
 *   - `tests/site-settings.test.ts` reads a setting straight back after writing
 *     it, so a wrapper that could not fall through would serve the pre-write value
 *     and fail. That matters because `deploy/update.sh` runs the suite against
 *     production, where a failure aborts the deploy.
 *   - scripts that import these modules get uncached reads rather than an error,
 *     which keeps them working.
 *
 * Arguments are passed through, so callers keep the signature of the core and
 * `unstable_cache` folds them into the cache key as usual.
 */
export function cachedRead<Args extends unknown[], T>(
  core: (...args: Args) => Promise<T>,
  key: string,
  options: { tags: string[]; revalidate: number },
): (...args: Args) => Promise<T> {
  const cached = unstable_cache(core, [key], options);

  return async (...args: Args) => {
    try {
      return await cached(...args);
    } catch {
      return core(...args);
    }
  };
}
