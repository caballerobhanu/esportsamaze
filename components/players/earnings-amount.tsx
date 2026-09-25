'use client';

import * as React from 'react';
import { getVisitorLocalCurrency, formatAmountInCurrency, secondaryCurrencyFor } from '@/lib/geo-currency';
import { CURRENCY_SYMBOLS, formatMoney } from '@/lib/utils';

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

  // Zero earnings — show a bare zero in the visitor's currency, no USD or
  // local secondary lines. (Previously a $0 + "Local: ≈ ₹0" stacked pair.)
  const nativeAmount = native?.amount ?? 0;
  if (amountUsd === 0 && nativeAmount === 0) {
    const code = visitorCurrency === 'USD' ? 'USD' : visitorCurrency;
    const symbol = CURRENCY_SYMBOLS[code] ?? `${code} `;
    return <span className={className} suppressHydrationWarning>{symbol}0</span>;
  }

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

  // Event rows: the event's own currency, beside the one this visitor compares
  // it against (see secondaryCurrencyFor) — not a fixed USD line.
  const base = (native.currency || 'USD').toUpperCase();
  const primary = formatMoney(native.amount, base);
  const secondaryCode = secondaryCurrencyFor(base, visitorCurrency);
  const secondary =
    secondaryCode && amountUsd > 0 ? `≈ ${formatAmountInCurrency(amountUsd, secondaryCode)}` : null;

  return (
    <span className={`inline-flex flex-col leading-tight ${className}`} suppressHydrationWarning>
      <span>{primary}</span>
      {secondary && <span className="text-[11px] font-medium text-slate-400">{secondary}</span>}
    </span>
  );
}
