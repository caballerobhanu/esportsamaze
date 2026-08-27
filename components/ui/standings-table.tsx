'use client';

import * as React from 'react';
import Link from 'next/link';
import { Trophy, Crown, ChevronUp, ChevronDown, ChevronsUpDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StandingRow {
  teamId: string;
  teamName: string;
  tag: string | null;
  logoUrl: string | null;
  slug?: string | null;
  rank: number;
  /** Previous rank for trend indicator (optional) */
  prevRank?: number | null;
  matchesPlayed: number;
  /** WWCD – wins / chicken dinners */
  wwcd: number;
  placementPoints: number;
  eliminationPoints: number;
  totalPoints: number;
}

interface StandingsTableProps {
  rows: StandingRow[];
  title?: string;
  subtitle?: string;
  /** Highlight zones e.g. top-N qualify */
  qualifyZone?: number;
  /** Danger / relegation zone starting rank */
  dangerZone?: number;
  className?: string;
}

type SortKey = 'rank' | 'matchesPlayed' | 'wwcd' | 'placementPoints' | 'eliminationPoints' | 'totalPoints';
type SortDir = 'asc' | 'desc';

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const WWCD_CHICKEN = '🍗';

function TrendBadge({ rank, prevRank }: { rank: number; prevRank?: number | null }) {
  if (prevRank == null) return null;
  const diff = prevRank - rank; // positive = moved up
  if (diff === 0) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-400" title="No change">
        <Minus className="w-2.5 h-2.5" />
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-500" title={`+${diff}`}>
        <ChevronUp className="w-3 h-3" />
        <span>{diff}</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-500" title={`${diff}`}>
      <ChevronDown className="w-3 h-3" />
      <span>{Math.abs(diff)}</span>
    </span>
  );
}

function SortIcon({
  col,
  active,
  dir,
}: {
  col: SortKey;
  active: SortKey;
  dir: SortDir;
}) {
  if (col !== active) return <ChevronsUpDown className="w-3 h-3 opacity-40 ml-0.5" />;
  return dir === 'asc' ? (
    <ChevronUp className="w-3 h-3 text-[#0A5FC4] ml-0.5" />
  ) : (
    <ChevronDown className="w-3 h-3 text-[#0A5FC4] ml-0.5" />
  );
}

export function StandingsTable({
  rows,
  title = 'Overall Standings',
  subtitle,
  qualifyZone,
  dangerZone,
  className,
}: StandingsTableProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>('rank');
  const [sortDir, setSortDir] = React.useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // totalPoints / wwcd / placements / elims should default descending
      setSortDir(key === 'rank' || key === 'matchesPlayed' ? 'asc' : 'desc');
    }
  };

  const sorted = React.useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [rows, sortKey, sortDir]);

  const maxTotal = Math.max(...rows.map((r) => r.totalPoints), 1);

  const thClass =
    'py-3 px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 cursor-pointer select-none whitespace-nowrap';

  const SortableTh = ({
    col,
    label,
    className: cls,
  }: {
    col: SortKey;
    label: string;
    className?: string;
  }) => (
    <th
      className={cn(thClass, 'hover:text-slate-700 dark:hover:text-slate-200 transition-colors', cls)}
      onClick={() => handleSort(col)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        <SortIcon col={col} active={sortKey} dir={sortDir} />
      </span>
    </th>
  );

  return (
    <div className={cn('rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden', className)}>
      {/* Header */}
      <div className="px-5 py-4 bg-slate-50/60 dark:bg-[#080d17] border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-slate-900 dark:text-white">
            <Trophy className="w-4 h-4 text-[#0A5FC4]" />
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400">
          <span>{rows.length} Teams</span>
          {qualifyZone && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Top {qualifyZone} Qualify
            </span>
          )}
          {dangerZone && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              Relegation Zone
            </span>
          )}
        </div>
      </div>

      {/* Legend strip */}
      <div className="flex items-center gap-4 px-5 py-2 bg-[#0A5FC4]/5 border-b border-[#0A5FC4]/10 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
        <span>Click column headers to sort</span>
        <span className="flex items-center gap-1"><span className="font-bold text-amber-600">{WWCD_CHICKEN}</span> = Win / Chicken Dinner</span>
        <span className="hidden sm:flex items-center gap-1">
          <ChevronUp className="w-3 h-3 text-emerald-500" />/<ChevronDown className="w-3 h-3 text-rose-500" /> Rank trend
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm" role="grid" aria-label="Tournament Standings">
          <thead>
            <tr className="border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-[#0a0f1d]">
              {/* Rank */}
              <th
                className={cn(thClass, 'text-center w-16 hover:text-slate-700 dark:hover:text-slate-200 transition-colors')}
                onClick={() => handleSort('rank')}
              >
                <span className="inline-flex items-center justify-center gap-0.5 w-full">
                  #<SortIcon col="rank" active={sortKey} dir={sortDir} />
                </span>
              </th>

              {/* Team */}
              <th className="py-3 px-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400 min-w-[180px]">
                Team
              </th>

              {/* Matches */}
              <SortableTh col="matchesPlayed" label="Matches" className="text-center" />

              {/* Wins */}
              <th
                className={cn(thClass, 'text-center hover:text-amber-600 transition-colors text-amber-500 dark:text-amber-400')}
                onClick={() => handleSort('wwcd')}
              >
                <span className="inline-flex items-center justify-center gap-0.5">
                  Wins <SortIcon col="wwcd" active={sortKey} dir={sortDir} />
                </span>
              </th>

              {/* Placements */}
              <SortableTh col="placementPoints" label="Placements" className="text-center" />

              {/* Eliminations */}
              <th
                className={cn(thClass, 'text-center hover:text-rose-600 transition-colors text-rose-500 dark:text-rose-400')}
                onClick={() => handleSort('eliminationPoints')}
              >
                <span className="inline-flex items-center justify-center gap-0.5">
                  Eliminations <SortIcon col="eliminationPoints" active={sortKey} dir={sortDir} />
                </span>
              </th>

              {/* Total */}
              <th
                className={cn(thClass, 'text-center hover:text-blue-600 transition-colors text-[#0A5FC4] dark:text-blue-400 pr-5')}
                onClick={() => handleSort('totalPoints')}
              >
                <span className="inline-flex items-center justify-center gap-0.5">
                  Total <SortIcon col="totalPoints" active={sortKey} dir={sortDir} />
                </span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-xs text-slate-400">
                  No standings data available yet. Results will appear after matches are scored.
                </td>
              </tr>
            )}

            {sorted.map((row, idx) => {
              const isChampion = row.rank === 1;
              const isTop3 = row.rank <= 3;
              const isQualify = qualifyZone != null && row.rank <= qualifyZone;
              const isDanger = dangerZone != null && row.rank >= dangerZone;
              const barPercent = maxTotal > 0 ? (row.totalPoints / maxTotal) * 100 : 0;

              const rowBg = isChampion
                ? 'bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10 dark:hover:bg-amber-500/15'
                : isTop3
                ? 'hover:bg-slate-50 dark:hover:bg-[#0f1625]'
                : isDanger
                ? 'hover:bg-rose-500/5 dark:hover:bg-rose-500/5'
                : 'hover:bg-slate-50 dark:hover:bg-[#0f1625]';

              const leftBorder = isChampion
                ? 'border-l-2 border-amber-500'
                : isQualify && !isChampion
                ? 'border-l-2 border-emerald-500/60'
                : isDanger
                ? 'border-l-2 border-rose-500/60'
                : 'border-l-2 border-transparent';

              return (
                <tr
                  key={row.teamId}
                  className={cn('transition-colors group', rowBg, leftBorder)}
                  aria-rowindex={idx + 1}
                >
                  {/* Rank */}
                  <td className="py-3.5 px-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className={cn(
                          'font-mono font-black leading-none',
                          isChampion
                            ? 'text-amber-500 text-base'
                            : row.rank === 2
                            ? 'text-slate-400 text-base'
                            : row.rank === 3
                            ? 'text-amber-700 dark:text-amber-600 text-base'
                            : 'text-slate-500 dark:text-slate-400 text-sm'
                        )}
                      >
                        {RANK_MEDAL[row.rank] ?? `#${row.rank}`}
                      </span>
                      <TrendBadge rank={row.rank} prevRank={row.prevRank} />
                    </div>
                  </td>

                  {/* Team */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Logo */}
                      <div
                        className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden',
                          isChampion
                            ? 'border-amber-500/40 bg-amber-500/10'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'
                        )}
                      >
                        {row.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.logoUrl}
                            alt={row.teamName}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <span className="text-[10px] font-black text-slate-400">
                            {(row.tag || row.teamName).slice(0, 3).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Name + tag */}
                      <div className="min-w-0">
                        {row.slug ? (
                          <Link
                            href={`/teams/${row.slug}`}
                            className={cn(
                              'font-bold text-sm truncate block transition-colors hover:text-[#0A5FC4] dark:hover:text-blue-400',
                              isChampion
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-slate-900 dark:text-white'
                            )}
                          >
                            {row.teamName}
                            {isChampion && (
                              <Crown className="w-3.5 h-3.5 text-amber-500 inline ml-1.5 -mt-0.5" />
                            )}
                          </Link>
                        ) : (
                          <span
                            className={cn(
                              'font-bold text-sm truncate block',
                              isChampion
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-slate-900 dark:text-white'
                            )}
                          >
                            {row.teamName}
                            {isChampion && (
                              <Crown className="w-3.5 h-3.5 text-amber-500 inline ml-1.5 -mt-0.5" />
                            )}
                          </span>
                        )}
                        {row.tag && (
                          <span className="text-[10px] text-slate-400 font-mono font-semibold">
                            [{row.tag}]
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Matches Played */}
                  <td className="py-3 px-2 text-center">
                    <span className="font-mono font-bold text-slate-500 dark:text-slate-400 text-xs tabular-nums">
                      {row.matchesPlayed}
                    </span>
                  </td>

                  {/* Wins (WWCD) */}
                  <td className="py-3 px-2 text-center">
                    {row.wwcd > 0 ? (
                      <span className="inline-flex items-center justify-center gap-1 font-mono font-black text-amber-600 dark:text-amber-400 tabular-nums">
                        {row.wwcd}
                        <span title="Chicken Dinner(s)" className="text-sm leading-none">{WWCD_CHICKEN}</span>
                      </span>
                    ) : (
                      <span className="font-mono text-slate-300 dark:text-slate-600 text-xs">—</span>
                    )}
                  </td>

                  {/* Placement Points */}
                  <td className="py-3 px-2 text-center">
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums text-xs">
                      {row.placementPoints}
                    </span>
                  </td>

                  {/* Elimination Points */}
                  <td className="py-3 px-2 text-center">
                    <span
                      className={cn(
                        'font-mono font-bold tabular-nums text-xs',
                        row.eliminationPoints > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-300 dark:text-slate-600'
                      )}
                    >
                      {row.eliminationPoints}
                    </span>
                  </td>

                  {/* Total Points */}
                  <td className="py-3.5 px-4 pr-5">
                    <div className="flex flex-col items-end gap-1.5 min-w-[72px]">
                      <span
                        className={cn(
                          'font-mono font-black tabular-nums leading-none',
                          isChampion
                            ? 'text-amber-600 dark:text-amber-400 text-base'
                            : 'text-[#0A5FC4] dark:text-blue-400 text-sm'
                        )}
                      >
                        {row.totalPoints}
                      </span>
                      {/* Mini progress bar */}
                      <div className="w-full h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            isChampion
                              ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                              : isTop3
                              ? 'bg-[#0A5FC4]'
                              : 'bg-slate-300 dark:bg-slate-600'
                          )}
                          style={{ width: `${barPercent}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer tiebreaker note */}
      <div className="px-5 py-2.5 bg-slate-50/60 dark:bg-[#080d17] border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-medium flex items-center gap-2">
        <Trophy className="w-3 h-3" />
        Tiebreaker order: Total Points → Wins (WWCD) → Placement Points → Elimination Points
      </div>
    </div>
  );
}
