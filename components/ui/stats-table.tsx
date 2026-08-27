import * as React from 'react';
import { cn } from '@/lib/utils';

interface StatsTableProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  action?: React.ReactNode;
}

export function StatsTable({ title, action, className, children, ...props }: StatsTableProps) {
  return (
    <div className={cn('w-full', className)} {...props}>
      {(title || action) && (
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200 dark:border-white/10">
          {title && (
            <h3 className="text-sm font-black tracking-widest text-slate-800 dark:text-slate-200 uppercase">
              {title}
            </h3>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {children}
      </div>
    </div>
  );
}

interface StatsRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
}

export function StatsRow({ label, value, className, ...props }: StatsRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3 bg-white dark:bg-white/5 border border-slate-100 dark:border-transparent',
        'text-sm transition-colors hover:bg-slate-50 dark:hover:bg-white/10',
        className
      )}
      {...props}
    >
      <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs w-1/3">
        {label}
      </span>
      <span className="font-bold text-slate-900 dark:text-white w-2/3 text-right sm:text-left">
        {value}
      </span>
    </div>
  );
}
