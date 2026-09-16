'use client';

import * as React from 'react';

import { BenchmarkTable, type BenchmarkRow } from '@/components/compare/benchmark-table';
import { cn } from '@/lib/utils';

/**
 * Steadiness: how often a side is blanked, and how often it pops off.
 *
 * Rates are the default because the two sides rarely play the same number of
 * games — a raw count hands the "better" figure to whoever simply played more.
 * The count is one tap away for when the absolute number is what matters.
 */

const chipBase =
  'inline-flex cursor-pointer items-center whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-colors';
const chipOn = 'border-[#0A5FC4] bg-[#0A5FC4] text-white';
const chipOff =
  'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300';

export function ConsistencyCompare({
  labelA,
  labelB,
  zeroA,
  zeroB,
  fiveA,
  fiveB,
  gamesA,
  gamesB,
  unit,
}: {
  labelA: string;
  labelB: string;
  zeroA: number;
  zeroB: number;
  fiveA: number;
  fiveB: number;
  gamesA: number;
  gamesB: number;
  /** What a "0" or "5+" game counts — eliminations, or elimination points. */
  unit: string;
}) {
  const [asRate, setAsRate] = React.useState(true);

  if (gamesA === 0 && gamesB === 0) return null;

  const settle = (count: number, games: number) => {
    if (games === 0) return null;
    return asRate ? (count / games) * 100 : count;
  };

  const format = (value: number | null) => {
    if (value === null) return '—';
    return asRate ? `${value.toFixed(1)}%` : `${Math.round(value)}`;
  };

  const rows: BenchmarkRow[] = [
    {
      // Fewer blank games is the good outcome, so this row ranks in reverse.
      label: `0 ${unit} Games`,
      valA: settle(zeroA, gamesA),
      valB: settle(zeroB, gamesB),
      format,
      higherIsBetter: false,
    },
    {
      label: `5+ ${unit} Games`,
      valA: settle(fiveA, gamesA),
      valB: settle(fiveB, gamesB),
      format,
    },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
        <div>
          <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Steadiness
          </h3>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Blanked games against big games — a rate, since the two sides rarely play the same number.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAsRate(true)}
            aria-pressed={asRate}
            className={cn(chipBase, asRate ? chipOn : chipOff)}
          >
            Percent
          </button>
          <button
            type="button"
            onClick={() => setAsRate(false)}
            aria-pressed={!asRate}
            className={cn(chipBase, !asRate ? chipOn : chipOff)}
          >
            Count
          </button>
        </div>
      </div>

      <BenchmarkTable labelA={labelA} labelB={labelB} rows={rows} />

      <p className="border-t border-slate-100 px-6 py-4 text-[10px] font-bold leading-5 text-slate-400 dark:border-white/5">
        {asRate
          ? `Share of the ${gamesA.toLocaleString('en-IN')} / ${gamesB.toLocaleString('en-IN')} games on record.`
          : `Raw games out of ${gamesA.toLocaleString('en-IN')} / ${gamesB.toLocaleString('en-IN')}.`}
      </p>
    </section>
  );
}
