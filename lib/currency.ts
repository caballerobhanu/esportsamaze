import { getCurrencyUsdRate as getFallbackUsdRate } from '@/lib/tournament-math';

// In-memory / daily revalidated exchange rates
let cachedRates: Record<string, number> | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetches real-time exchange rates against USD from an open free Forex API.
 * Automatically cached for 24 hours with immediate fallback if offline.
 */
export async function getLiveExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedRates;
  }

  try {
    // Open Exchange Rate API (Free, no API key required, reliable)
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 86400 }, // 24h Next.js cache
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        // data.rates gives 1 USD in foreign currency (e.g. INR: 86.8).
        // We convert to 1 foreign currency in USD (e.g. 1/86.8 ≈ 0.0115).
        const usdRates: Record<string, number> = { USD: 1.0 };
        for (const [code, rateAgainstUsd] of Object.entries(data.rates as Record<string, number>)) {
          if (rateAgainstUsd > 0) {
            usdRates[code.toUpperCase()] = 1 / rateAgainstUsd;
          }
        }
        cachedRates = usdRates;
        lastFetchTime = now;
        return usdRates;
      }
    }
  } catch (err) {
    console.warn('Could not fetch live currency rates, using fallback rates:', err);
  }

  return cachedRates || {};
}

/**
 * Gets the USD exchange rate for a given currency code.
 * Checks live cached rates first, with graceful static fallback.
 */
export function resolveCurrencyUsdRate(code: string, liveRates?: Record<string, number>): number {
  const upper = (code || 'USD').toUpperCase();
  if (upper === 'USD') return 1.0;

  if (liveRates && liveRates[upper]) {
    return liveRates[upper];
  }
  if (cachedRates && cachedRates[upper]) {
    return cachedRates[upper];
  }
  return getFallbackUsdRate(upper);
}
