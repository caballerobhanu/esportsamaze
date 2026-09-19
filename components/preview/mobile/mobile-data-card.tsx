'use client';

import * as React from 'react';

export interface MobileCardMetric {
  label: string;
  value: React.ReactNode;
}

/**
 * Preview-only: one table row as a mobile card. Uniform metric grid in the same
 * order as the desktop table's columns — no invented emphasis, so a value never
 * moves or means something different here than it does in the table.
 */
export function MobileDataCard({
  title,
  subtitle,
  metrics,
  columns = 2,
  telemetry,
  footer,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  metrics: MobileCardMetric[];
  columns?: 2 | 3;
  /** Shown as their own row beneath the metrics, two equal columns. */
  telemetry?: MobileCardMetric[];
  footer?: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
      <header className="min-w-0">
        <h3 className="text-sm font-black leading-snug tracking-tight text-slate-950 dark:text-white">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{subtitle}</p>
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

/** A labelled toggle, styled like the site's chip toggles. */
export function MobileToggle({
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-colors ${
        active
          ? 'border-[#0A5FC4] bg-[#0A5FC4] text-white'
          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
      }`}
    >
      {label}
    </button>
  );
}

/**
 * A titled group of cards. Pass `initialCount` where the live table truncates
 * behind a disclosure, so the card view behaves the same way.
 */
export function MobileCardSection({
  title,
  note,
  initialCount,
  header,
  children,
}: {
  title: string;
  note?: string;
  initialCount?: number;
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  const all = React.Children.toArray(children);
  const [expanded, setExpanded] = React.useState(false);
  const truncatable = initialCount !== undefined && all.length > initialCount;
  const shown = truncatable && !expanded ? all.slice(0, initialCount) : all;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-950 dark:text-white">
          {title}
        </h2>
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          {truncatable && !expanded ? `${shown.length} of ${all.length}` : `${all.length}`}{' '}
          {all.length === 1 ? 'row' : 'rows'}
        </span>
      </div>
      {note ? (
        <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{note}</p>
      ) : null}
      {header ? <div className="mt-3 flex flex-wrap items-center gap-2">{header}</div> : null}

      <div className="mt-3 space-y-3">{shown}</div>

      {truncatable ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-[#0A5FC4] shadow-sm transition-colors hover:border-[#0A5FC4] dark:border-white/10 dark:bg-[#0b1220] dark:text-blue-300"
        >
          {expanded ? `Show top ${initialCount}` : `Show all ${all.length}`}
        </button>
      ) : null}
    </section>
  );
}
