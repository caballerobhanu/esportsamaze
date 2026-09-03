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
  usdRate?: number | null
): string {
  if (!amount || amount <= 0) return 'TBA';
  const currCode = (currency || 'USD').toUpperCase();
  const rate = usdRate && usdRate > 0 ? usdRate : getCurrencyUsdRate(currCode);

  const symbol = CURRENCY_SYMBOLS[currCode] ?? `${currCode} `;
  const localFormatted = `${symbol}${amount.toLocaleString(currCode === 'INR' ? 'en-IN' : 'en-US')}`;

  if (currCode === 'USD') {
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
