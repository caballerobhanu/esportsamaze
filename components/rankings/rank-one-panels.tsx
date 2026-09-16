'use client';

import * as React from 'react';
import Link from 'next/link';
import { CalendarDays, Crown } from 'lucide-react';
import type { RankOneReign } from '@/lib/krafton-standings';
import type { EntityLogoMeta } from '@/components/rankings/rankings-board-client';

interface PanelProps {
  reigns: RankOneReign[];
  logosMap: Record<string, EntityLogoMeta>;
  detailBase: string;
}

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const fmtDays = (days: number) => `${days.toLocaleString('en-IN')} day${days === 1 ? '' : 's'}`;

/** Crest/avatar plus the profile link for a reign's entity. */
function entityMeta(
  reign: RankOneReign,
  logosMap: Record<string, EntityLogoMeta>,
  detailBase: string,
) {
  const meta = reign.entityId ? logosMap[reign.entityId] : null;
  const readableSlug =
    meta?.slug ||
    reign.entityName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') ||
    reign.entityKey;
  return { meta, href: `${detailBase}/${encodeURIComponent(readableSlug)}` };
}

function Crest({ meta, name }: { meta: EntityLogoMeta | null; name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1 dark:border-white/10">
      {meta?.logoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={meta.logoUrl} alt={name} className="h-full w-full object-contain" />
      ) : (
        <span className="text-[11px] font-black text-slate-500">{name.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400 dark:border-white/10">
      {children}
    </div>
  );
}

/** Chronological run of who held #1, one row per unbroken spell. */
export function RankOneTimeline({ reigns, logosMap, detailBase }: PanelProps) {
  if (reigns.length === 0) {
    return <EmptyState>No #1 history yet — the board builds as KRAFTON events are entered.</EmptyState>;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#0b1220] sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Crown className="h-4 w-4 text-[#0A5FC4] dark:text-blue-300" />
        <div>
          <h2 className="text-sm font-black uppercase tracking-tight text-slate-950 dark:text-white">
            Time at #1
          </h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Every spell at the top of the board, newest first.
          </p>
        </div>
      </div>

      {/* Newest first: the live spell sits at the top and scrolling down walks
          back through history. `reigns` stays chronological (oldest first). */}
      <ol className="relative space-y-3 border-l border-slate-200 pl-5 dark:border-white/10">
        {[...reigns].reverse().map((reign) => {
          const { meta, href } = entityMeta(reign, logosMap, detailBase);
          return (
            <li key={`${reign.entityKey}-${reign.startDate}`} className="relative">
              <span
                className={`absolute -left-[26px] top-4 h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-[#0b1220] ${
                  reign.isCurrent ? 'bg-emerald-500' : 'bg-[#0A5FC4]'
                }`}
              />
              <Link
                href={href}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 transition-colors hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5"
              >
                <Crest meta={meta} name={reign.entityName} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold text-slate-950 dark:text-white">
                    {reign.entityName}
                  </span>
                  <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {fmtDate(reign.startDate)} — {reign.isCurrent ? 'present' : fmtDate(reign.endDate)}
                  </span>
                </span>
                <span className="shrink-0 rounded-md bg-[#0A5FC4]/10 px-2 py-1 text-[11px] font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
                  {fmtDays(reign.days)}
                </span>
                {reign.isCurrent && (
                  <span className="shrink-0 rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Current #1
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The same spells, aggregated per entity and ranked by total days at #1. */
export function RankOneLeaderboard({ reigns, logosMap, detailBase }: PanelProps) {
  const rows = React.useMemo(() => {
    const totals = new Map<
      string,
      { key: string; id: string | null; name: string; days: number; spells: number }
    >();

    for (const reign of reigns) {
      const existing = totals.get(reign.entityKey);
      if (existing) {
        existing.days += reign.days;
        existing.spells += 1;
      } else {
        totals.set(reign.entityKey, {
          key: reign.entityKey,
          id: reign.entityId,
          name: reign.entityName,
          days: reign.days,
          spells: 1,
        });
      }
    }

    return [...totals.values()].sort((a, b) => b.days - a.days || a.name.localeCompare(b.name));
  }, [reigns]);

  if (rows.length === 0) {
    return <EmptyState>No #1 history yet — the board builds as KRAFTON events are entered.</EmptyState>;
  }

  const longest = rows[0].days || 1;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#0b1220] sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-[#0A5FC4] dark:text-blue-300" />
        <div>
          <h2 className="text-sm font-black uppercase tracking-tight text-slate-950 dark:text-white">
            Days at #1
          </h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total days spent holding rank #1, longest first.
          </p>
        </div>
      </div>

      <ol className="space-y-2">
        {rows.map((row, index) => {
          const meta = row.id ? logosMap[row.id] : null;
          const readableSlug =
            meta?.slug ||
            row.name
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '') ||
            row.key;

          return (
            <li key={row.key}>
              <Link
                href={`${detailBase}/${encodeURIComponent(readableSlug)}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 transition-colors hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5"
              >
                <span className="w-5 shrink-0 text-center font-mono text-xs font-black text-slate-400">
                  {index + 1}
                </span>
                <Crest meta={meta} name={row.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold text-slate-950 dark:text-white">
                    {row.name}
                  </span>
                  <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <span
                      className="block h-full rounded-full bg-[#0A5FC4] dark:bg-blue-500"
                      style={{ width: `${Math.max(4, Math.round((row.days / longest) * 100))}%` }}
                    />
                  </span>
                </span>
                {row.spells > 1 && (
                  <span className="shrink-0 rounded-md bg-slate-200/70 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    {row.spells} spells
                  </span>
                )}
                <span className="shrink-0 font-mono text-sm font-black text-[#0A5FC4] dark:text-blue-300">
                  {fmtDays(row.days)}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
