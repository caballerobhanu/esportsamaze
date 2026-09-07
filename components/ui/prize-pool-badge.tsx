'use client';

import * as React from 'react';
import { getVisitorLocalCurrency, formatAmountInCurrency } from '@/lib/geo-currency';
import { CURRENCY_SYMBOLS } from '@/lib/utils';
import { getCurrencyUsdRate } from '@/lib/tournament-math';
import { Globe, DollarSign } from 'lucide-react';

interface PrizePoolBadgeProps {
  amount?: number | null;
  currency?: string | null;
  usdRate?: number | null;
  className?: string;
  secondaryClassName?: string;
  showIcon?: boolean;
  inline?: boolean;
}

export function PrizePoolBadge({
  amount = 0,
  currency = 'USD',
  usdRate,
  className = '',
  secondaryClassName = '',
  showIcon = false,
  inline = false,
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
  const symbol = CURRENCY_SYMBOLS[baseCurrency] ?? `${baseCurrency} `;
  const primaryFormatted = `${symbol}${amount.toLocaleString(baseCurrency === 'INR' ? 'en-IN' : 'en-US')}`;

  const usdAmount = Math.round(amount * rate);
  const hasSecondary = baseCurrency !== 'USD' && usdAmount > 0;
  const secondaryFormatted = hasSecondary ? `≈ $${usdAmount.toLocaleString('en-US')} USD` : null;

  // If visitor is in a country with a different currency from both base and USD
  const isDifferentFromBaseAndUsd =
    mounted &&
    visitorCurrency &&
    visitorCurrency !== 'USD' &&
    visitorCurrency !== baseCurrency;

  const visitorFormatted = isDifferentFromBaseAndUsd
    ? formatAmountInCurrency(usdAmount, visitorCurrency)
    : null;

  if (inline) {
    return (
      <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`} suppressHydrationWarning>
        {showIcon && <DollarSign className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
        <span>{primaryFormatted}</span>
        {secondaryFormatted && (
          <span className={`text-xs font-normal ${secondaryClassName || 'text-slate-500 dark:text-slate-400'}`}>
            ({secondaryFormatted})
          </span>
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
          className={`text-xs font-semibold tracking-normal block mt-0.5 ${
            secondaryClassName || 'text-slate-500 dark:text-slate-400'
          }`}
          suppressHydrationWarning
        >
          {secondaryFormatted}
        </span>
      )}

      {visitorFormatted && (
        <span
          suppressHydrationWarning
          className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5"
        >
          <Globe className="w-3 h-3 shrink-0" />
          <span>Local: ≈ {visitorFormatted}</span>
        </span>
      )}
    </div>
  );
}
