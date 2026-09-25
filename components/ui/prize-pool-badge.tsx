'use client';

import * as React from 'react';
import { formatAmountInCurrency, getVisitorLocalCurrency, secondaryCurrencyFor } from '@/lib/geo-currency';
import { formatMoney } from '@/lib/utils';
import { getCurrencyUsdRate } from '@/lib/tournament-math';
import { DollarSign } from 'lucide-react';

interface PrizePoolBadgeProps {
  amount?: number | null;
  currency?: string | null;
  usdRate?: number | null;
  className?: string;
  secondaryClassName?: string;
  showIcon?: boolean;
  inline?: boolean;
  /** Render one half on its own, for cards that style the two lines separately. */
  part?: 'both' | 'primary' | 'secondary';
}

const emptySubscribe = () => () => {};
/** Server snapshot is a US visitor; the client re-renders with the real locale. */
const getServerCurrency = () => 'USD';

function useVisitorCurrency(): string {
  return React.useSyncExternalStore(emptySubscribe, getVisitorLocalCurrency, getServerCurrency);
}

/**
 * An event's prize pool, with the one figure worth comparing it against.
 *
 * The primary is the event's own currency. The secondary is the visitor's —
 * unless that is the event's own, where USD stands in; a USD event read by an
 * American has no secondary at all. See `secondaryCurrencyFor` for the table.
 */
export function PrizePoolBadge({
  amount = 0,
  currency = 'USD',
  usdRate,
  className = '',
  secondaryClassName = '',
  showIcon = false,
  inline = false,
  part = 'both',
}: PrizePoolBadgeProps) {
  const visitorCurrency = useVisitorCurrency();

  const baseCurrency = (currency || 'USD').toUpperCase();

  if (amount == null || amount <= 0) {
    return part === 'secondary' ? null : <span className={className} suppressHydrationWarning>TBA</span>;
  }

  const rate = usdRate && usdRate > 0 ? usdRate : getCurrencyUsdRate(baseCurrency);
  const primaryFormatted = formatMoney(amount, baseCurrency);

  const usdAmount = Math.round(amount * rate);
  const secondaryCode = secondaryCurrencyFor(baseCurrency, visitorCurrency);
  const secondaryFormatted =
    secondaryCode && usdAmount > 0 ? `≈ ${formatAmountInCurrency(usdAmount, secondaryCode)}` : null;

  if (part === 'primary') {
    return <span className={className} suppressHydrationWarning>{primaryFormatted}</span>;
  }
  if (part === 'secondary') {
    return secondaryFormatted ? (
      <span className={className} suppressHydrationWarning>{secondaryFormatted}</span>
    ) : null;
  }

  const secondaryCls = secondaryClassName || 'text-slate-500 dark:text-slate-400';

  if (inline) {
    return (
      <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`} suppressHydrationWarning>
        {showIcon && <DollarSign className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
        <span>{primaryFormatted}</span>
        {secondaryFormatted && (
          <span className={`text-xs font-normal ${secondaryCls}`}>({secondaryFormatted})</span>
        )}
      </span>
    );
  }

  return (
    <div className={`inline-flex flex-col ${className}`} suppressHydrationWarning>
      <div className="flex items-center gap-1.5 leading-tight">
        {showIcon && <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />}
        <span>{primaryFormatted}</span>
      </div>

      {secondaryFormatted && (
        <span
          className={`text-xs font-semibold tracking-normal block mt-0.5 ${secondaryCls}`}
          suppressHydrationWarning
        >
          {secondaryFormatted}
        </span>
      )}
    </div>
  );
}
