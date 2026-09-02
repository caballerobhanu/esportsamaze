import { getCurrencyUsdRate as getFallbackUsdRate } from '@/lib/tournament-math';

// In-memory cache for live rates (revalidated every 24 hours)
let cachedLiveRates: Record<string, number> | null = null;
let lastLiveFetchTime = 0;
const LIVE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache for historical dates (immutable, permanent in-memory cache)
const historicalRatesCache = new Map<string, Record<string, number>>();

/**
 * Fetches real-time exchange rates against USD from open Forex API.
 * Cached in memory and via Next.js cache.
 */
export async function getLiveExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedLiveRates && now - lastLiveFetchTime < LIVE_CACHE_TTL_MS) {
    return cachedLiveRates;
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        const usdRates: Record<string, number> = { USD: 1.0 };
        for (const [code, rateAgainstUsd] of Object.entries(data.rates as Record<string, number>)) {
          if (rateAgainstUsd > 0) {
            usdRates[code.toUpperCase()] = 1 / rateAgainstUsd;
          }
        }
        cachedLiveRates = usdRates;
        lastLiveFetchTime = now;
        return usdRates;
      }
    }
  } catch (err) {
    console.warn('Could not fetch live currency rates, using fallback rates:', err);
  }

  return cachedLiveRates || {};
}

/**
 * Fetches exchange rates as of a specific tournament start date (historical).
 * - If the date is in the future, returns live exchange rates (fluctuating until start date).
 * - If the date is in the past or today, fetches and locks historical exchange rate data for that exact date.
 */
export async function getExchangeRatesForDate(date?: Date | string | null): Promise<Record<string, number>> {
  if (!date) {
    return getLiveExchangeRates();
  }

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return getLiveExchangeRates();
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const dateStr = d.toISOString().slice(0, 10);

  // If the event is scheduled for the future, it can fluctuate until start date
  if (dateStr > todayStr) {
    return getLiveExchangeRates();
  }

  // Check cache for this historical date
  if (historicalRatesCache.has(dateStr)) {
    return historicalRatesCache.get(dateStr)!;
  }

  // 1. Primary Historical Provider: Frankfurter API
  try {
    const res = await fetch(`https://api.frankfurter.app/${dateStr}?from=USD`, {
      next: { revalidate: 86400 * 30 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        const usdRates: Record<string, number> = { USD: 1.0 };
        for (const [code, rateAgainstUsd] of Object.entries(data.rates as Record<string, number>)) {
          if (rateAgainstUsd > 0) {
            usdRates[code.toUpperCase()] = 1 / rateAgainstUsd;
          }
        }
        historicalRatesCache.set(dateStr, usdRates);
        return usdRates;
      }
    }
  } catch (err) {
    console.warn(`Frankfurter historical rate lookup failed for ${dateStr}:`, err);
  }

  // 2. Secondary Historical Provider: Fawaz Ahmed Currency API
  try {
    const res = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateStr}/v1/currencies/usd.json`, {
      next: { revalidate: 86400 * 30 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.usd) {
        const usdRates: Record<string, number> = { USD: 1.0 };
        for (const [code, rateAgainstUsd] of Object.entries(data.usd as Record<string, number>)) {
          if (rateAgainstUsd > 0) {
            usdRates[code.toUpperCase()] = 1 / rateAgainstUsd;
          }
        }
        historicalRatesCache.set(dateStr, usdRates);
        return usdRates;
      }
    }
  } catch (err) {
    console.warn(`Fawaz Ahmed historical rate lookup failed for ${dateStr}:`, err);
  }

  // 3. Fallback to live rates if historical APIs are unavailable
  return getLiveExchangeRates();
}

/**
 * Gets the USD exchange rate (i.e. value of 1 foreign currency in USD)
 * for a given currency code.
 */
export function resolveCurrencyUsdRate(
  code: string,
  rates?: Record<string, number>
): number {
  const upper = (code || 'USD').toUpperCase();
  if (upper === 'USD') return 1.0;

  if (rates && rates[upper]) {
    return rates[upper];
  }
  if (cachedLiveRates && cachedLiveRates[upper]) {
    return cachedLiveRates[upper];
  }
  return getFallbackUsdRate(upper);
}
