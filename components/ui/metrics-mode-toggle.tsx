'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

type MetricsMode = 'total' | 'average';

/**
 * Total / per-game switch for the Detailed metrics table.
 *
 * The table is server-rendered and carries BOTH figures per cell; this only
 * flips the `data-mode` its cells key off, so no figure is recomputed in the
 * browser and the event links stay server-rendered. Opens on the per-game
 * average, with the event total one click away.
 */
export function MetricsModeToggle({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = React.useState<MetricsMode>('average');

  return (
    <div className="group" data-mode={mode}>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          Figures
        </span>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs dark:border-white/10 dark:bg-white/5">
          {(
            [
              ['total', 'Total'],
              ['average', 'Average / game'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={cn(
                'rounded-lg px-3 py-1.5 font-bold transition-all',
                mode === value
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
