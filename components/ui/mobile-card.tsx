'use client';

import type { ReactNode } from 'react';

export interface MobileCardMetric {
  label: string;
  value: ReactNode;
}

/**
 * One table row as a card. The metric grid keeps the desktop table's column
 * order so a value never moves or means something different here than it does in
 * the table it replaces.
 */
export function MobileDataCard({
  title,
  subtitle,
  metrics,
  columns = 2,
  telemetry,
  footer,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  metrics: MobileCardMetric[];
  columns?: 2 | 3;
  /** Shown as their own row beneath the metrics, two equal columns. */
  telemetry?: MobileCardMetric[];
  footer?: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
      <header className="min-w-0">
        <h3 className="text-sm font-black leading-snug tracking-tight text-slate-950 dark:text-white">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        ) : null}
      </header>

      <dl
        className={`mt-3 grid gap-x-4 gap-y-3 border-t border-slate-200 pt-3 dark:border-white/10 ${
          columns === 3 ? 'grid-cols-3' : 'grid-cols-2'
        }`}
      >
        {metrics.map((metric) => (
          <div key={metric.label}>
            <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {metric.label}
            </dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums text-slate-900 dark:text-white">
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>

      {telemetry && telemetry.length > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 border-t border-slate-200 pt-3 dark:border-white/10">
          {telemetry.map((metric) => (
            <div key={metric.label}>
              <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {metric.label}
              </dt>
              <dd className="mt-0.5 text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {footer ? (
        <p className="mt-3 border-t border-slate-200 pt-3 text-[11px] font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
          {footer}
        </p>
      ) : null}
    </article>
  );
}

/** The site's chip toggle, for a card list's own switch. */
export function MobileChipToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-colors ${
        active
          ? 'border-[#0A5FC4] bg-[#0A5FC4] text-white shadow-sm shadow-blue-500/25'
          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
      }`}
    >
      {label}
    </button>
  );
}
