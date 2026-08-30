'use client';

import * as React from 'react';
import { getVisitorLocalCurrency, formatAmountInCurrency } from '@/lib/geo-currency';
import { formatPrizePool } from '@/lib/utils';
import { getCurrencyUsdRate } from '@/lib/tournament-math';
import { Globe, DollarSign } from 'lucide-react';

interface PrizePoolBadgeProps {
  amount?: number | null;
  currency?: string | null;
  usdRate?: number | null;
  className?: string;
  showIcon?: boolean;
}

export function PrizePoolBadge({
  amount = 0,
  currency = 'USD',
  usdRate,
  className = '',
  showIcon = false,
}: PrizePoolBadgeProps) {
  const [mounted, setMounted] = React.useState(false);
  const [visitorCurrency, setVisitorCurrency] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
    const localCurr = getVisitorLocalCurrency();
    setVisitorCurrency(localCurr);
  }, []);

  if (!amount || amount <= 0) {
    return <span className={className} suppressHydrationWarning>TBA</span>;
  }

  const baseCurrency = (currency || 'USD').toUpperCase();
  const rate = usdRate && usdRate > 0 ? usdRate : getCurrencyUsdRate(baseCurrency);
  const usdVal = Math.round(amount * rate);

  const baseFormatted = formatPrizePool(amount, baseCurrency, rate);

  // If visitor is in a country with a different currency from both base and USD
  const isDifferentFromBaseAndUsd =
    mounted &&
    visitorCurrency &&
    visitorCurrency !== 'USD' &&
    visitorCurrency !== baseCurrency;

  const visitorFormatted = isDifferentFromBaseAndUsd
    ? formatAmountInCurrency(usdVal, visitorCurrency)
    : null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}
      title={visitorFormatted ? `Local Estimate: ${visitorFormatted}` : undefined}
      suppressHydrationWarning
    >
      {showIcon && <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />}
      <span suppressHydrationWarning>{baseFormatted}</span>

      {visitorFormatted && (
        <span
          suppressHydrationWarning
          className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
        >
          <Globe className="w-3 h-3 shrink-0" />
          <span>≈ {visitorFormatted}</span>
        </span>
      )}
    </span>
  );
}
