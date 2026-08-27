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

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
};

/**
 * Formats a prize pool as "local currency first, universal dollar second".
 * e.g. formatPrizePool(40000000, 'INR', 0.01104) → "₹4,00,00,000 ($441,600)"
 */
export function formatPrizePool(
  amount: number,
  currency: string = 'USD',
  usdRate?: number | null
): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const local = `${symbol}${amount.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')}`;
  if (currency !== 'USD' && usdRate && usdRate > 0) {
    return `${local} ($${Math.round(amount * usdRate).toLocaleString('en-US')})`;
  }
  return local;
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
  }).format(new Date(date));
}
