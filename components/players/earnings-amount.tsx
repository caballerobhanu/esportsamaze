'use client';

import * as React from 'react';
import { getVisitorLocalCurrency, formatAmountInCurrency } from '@/lib/geo-currency';
import { CURRENCY_SYMBOLS } from '@/lib/utils';

// Client-only value; server snapshot is USD so hydration matches and the
// visitor-specific rendering kicks in right after hydration.
const emptySubscribe = () => () => {};
const getServerSnapshot = () => 'USD';

/**
 * Prize-money display with the tournaments-page currency logic:
 * - `native` mode (event rows): event-currency amount first, "≈ $X USD" secondary,
 *   plus a visitor-local line for users outside the event's region.
 * - USD mode (totals): visitor-local currency first for non-US visitors
 *   (Indian users see INR + USD, Pakistani users PKR + USD, US users plain USD).
 */
export function EarningsAmount({
  amountUsd,
  native,
  className = '',
}: {
  amountUsd: number;
  /** Original award amount in the event's own currency. */
  native?: { amount: number; currency: string } | null;
  className?: string;
}) {
  const visitorCurrency = React.useSyncExternalStore(emptySubscribe, getVisitorLocalCurrency, getServerSnapshot);

  const usdText = `$${Math.round(amountUsd).toLocaleString('en-US')}`;

  // Totals (USD sums): visitor currency first, USD secondary
  if (!native) {
    if (visitorCurrency === 'USD') {
      return <span className={className} suppressHydrationWarning>{usdText}</span>;
    }
    return (
      <span className={`inline-flex flex-col leading-tight ${className}`} suppressHydrationWarning>
        <span>{formatAmountInCurrency(amountUsd, visitorCurrency)}</span>
        <span className="text-[11px] font-medium text-slate-400">(≈ {usdText} USD)</span>
      </span>
    );
  }

  // Event rows: event-currency first (same as PrizePoolBadge on the tournaments page)
  const base = (native.currency || 'USD').toUpperCase();
  const symbol = CURRENCY_SYMBOLS[base] ?? `${base} `;
  const primary = `${symbol}${native.amount.toLocaleString(base === 'INR' ? 'en-IN' : 'en-US')}`;
  const hasUsdSecondary = base !== 'USD' && amountUsd > 0;
  const showVisitorLine = visitorCurrency !== 'USD' && visitorCurrency !== base;

  return (
    <span className={`inline-flex flex-col leading-tight ${className}`} suppressHydrationWarning>
      <span>{primary}</span>
      {hasUsdSecondary && (
        <span className="text-[11px] font-medium text-slate-400">(≈ {usdText} USD)</span>
      )}
      {showVisitorLine && (
        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          Local: ≈ {formatAmountInCurrency(amountUsd, visitorCurrency)}
        </span>
      )}
    </span>
  );
}
