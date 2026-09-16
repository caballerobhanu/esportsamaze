import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

import { getCurrencyUsdRate } from '@/lib/tournament-math';

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  SAR: '﷼',
  AED: 'د.إ',
  IDR: 'Rp',
  THB: '฿',
  MYR: 'RM',
  SGD: 'S$',
  BRL: 'R$',
  JPY: '¥',
  KRW: '₩',
  CNY: '¥',
  TRY: '₺',
  CAD: 'CA$',
  AUD: 'A$',
  PHP: '₱',
  PKR: 'Rs',
  BDT: '৳',
  RUB: '₽',
  MXN: 'Mex$',
  ZAR: 'R',
};

/**
 * Formats a prize pool as "local currency first, universal dollar second".
 * If currency is USD, shows only USD.
 * e.g. formatPrizePool(40000000, 'INR') → "₹4,00,00,000 (≈ $460,000 USD)"
 * e.g. formatPrizePool(1000000, 'USD') → "$1,000,000"
 */
export function formatPrizePool(
  amount: number,
  currency: string = 'USD',
  usdRate?: number | null,
  includeSecondary: boolean = true
): string {
  if (!amount || amount <= 0) return 'TBA';
  const currCode = (currency || 'USD').toUpperCase();
  const rate = usdRate && usdRate > 0 ? usdRate : getCurrencyUsdRate(currCode);

  const symbol = CURRENCY_SYMBOLS[currCode] ?? `${currCode} `;
  const localFormatted = `${symbol}${amount.toLocaleString(currCode === 'INR' ? 'en-IN' : 'en-US')}`;

  if (currCode === 'USD' || !includeSecondary) {
    return localFormatted;
  }

  const usdAmount = Math.round(amount * rate);
  return `${localFormatted} (≈ $${usdAmount.toLocaleString('en-US')} USD)`;
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    // Pinned so server and browser render identical strings (no hydration mismatch);
    // date-only values are stored as UTC midnight, so UTC shows the intended calendar day.
    timeZone: 'UTC',
  }).format(new Date(date));
}

/**
 * Resolves a concise short name for tournament badges, cards, and compact mobile views.
 * Prioritizes the explicit custom shortName, falling back to series + season or known acronyms.
 */
export function getTournamentShortName(tournament: {
  name: string;
  shortName?: string | null;
  series?: string | null;
  season?: string | null;
}): string {
  if (tournament.shortName && tournament.shortName.trim()) {
    return tournament.shortName.trim();
  }

  if (tournament.series && tournament.season) {
    const s = tournament.season.replace(/Edition|Season\s*/i, '').trim();
    if (s.toLowerCase().startsWith(tournament.series.toLowerCase())) {
      return s;
    }
    return `${tournament.series} ${s}`.trim();
  }
  if (tournament.series) {
    return tournament.series;
  }

  const n = tournament.name;
  const yearMatch = n.match(/\b(20\d\d)\b/);
  const year = yearMatch ? yearMatch[1] : '';

  if (/Battlegrounds\s+Mobile\s+India\s+Master\s+Series/i.test(n)) {
    return `BGMS ${year}`.trim();
  }
  if (/Battlegrounds\s+Mobile\s+India\s+Series/i.test(n)) {
    return `BGIS ${year}`.trim();
  }
  if (/Battlegrounds\s+Mobile\s+India\s+Pro\s+Series/i.test(n)) {
    return `BMPS ${year}`.trim();
  }
  if (/PUBG\s+Mobile\s+Global\s+Championship/i.test(n)) {
    return `PMGC ${year}`.trim();
  }
  if (/PUBG\s+Mobile\s+World\s+Cup/i.test(n)) {
    return `PMWC ${year}`.trim();
  }
  if (/PUBG\s+Mobile\s+Super\s+League/i.test(n)) {
    return `PMSL ${year}`.trim();
  }
  if (/PUBG\s+Mobile\s+Club\s+Open/i.test(n)) {
    return `PMCO ${year}`.trim();
  }

  if (n.length <= 16) return n;

  const words = n.split(/\s+/).filter(Boolean);
  if (words.length <= 2) return n;

  const acronym = words
    .filter((w) => !/^(of|the|and|in|for|de|la)$/i.test(w))
    // A year is already appended below, and its leading digit would otherwise
    // be treated as an initial ("…ShowDown 2025" → "BMIS2 2025").
    .filter((w) => !/^\d+$/.test(w))
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return year ? `${acronym} ${year}` : acronym;
}
