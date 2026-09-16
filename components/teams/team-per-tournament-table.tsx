'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { TournamentShortName } from '@/components/ui/tournament-name';

import { formatAverage, formatRate } from '@/lib/team-stats';
import type { TeamTournamentRow } from '@/lib/team-data';

const th = 'px-4 py-3 text-[10px] font-black uppercase tracking-[.16em] text-slate-400';
const td = 'px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400';

/**
 * Per-tournament record with a "Grand finals only" toggle.
 *
 * `tournamentsGF` holds the same event recount restricted to Grand-Finals
 * stage matches (matched on stage name/type). Toggling swaps the dataset in
 * place, so the table never needs a refetch.
 */
export function TeamPerTournamentTable({
  tournaments,
  tournamentsGF,
}: {
  tournaments: TeamTournamentRow[];
  tournamentsGF: TeamTournamentRow[];
}) {
  const [grandFinalsOnly, setGrandFinalsOnly] = React.useState(false);

  const rows = grandFinalsOnly ? tournamentsGF : tournaments;
  const activeSlugs = new Set(rows.map((row) => row.slug));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold text-slate-400">
          {grandFinalsOnly
            ? 'Only Grand-Finals matches, per event.'
            : 'All recorded matches, per event.'}
        </p>
        <button
          onClick={() => setGrandFinalsOnly((value) => !value)}
          aria-pressed={grandFinalsOnly}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer',
            grandFinalsOnly
              ? 'border-[#0A5FC4] bg-[#0A5FC4] text-white shadow-sm shadow-blue-500/25'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
          )}
        >
          Grand finals only
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10">
              {[
                'Tournament',
                'Matches',
                'Wins',
                'Top-5 %',
                'Avg total pts',
                'Avg elim pts',
                'Final rank',
              ].map((heading) => (
                <th key={heading} className={`${th} text-left`}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.tournamentId}
                className="border-b border-slate-100 last:border-0 dark:border-white/5"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/tournaments/${row.slug}`}
                    className="line-clamp-1 max-w-[240px] font-bold transition-colors hover:text-[#0A5FC4]"
                  >
                    <TournamentShortName name={row.name} shortName={row.shortName} />
                  </Link>
                </td>
                <td className={`${td} font-black`}>{row.matches}</td>
                <td className={`${td} text-emerald-600 dark:text-emerald-400`}>{row.wins}</td>
                <td className={td}>{formatRate(row.topFiveRate, row.matches)}</td>
                <td className={`${td} font-black text-[#0A5FC4] dark:text-blue-300`}>
                  {formatAverage(row.avgTotalPoints, row.matches, 1)}
                </td>
                <td className={`${td} font-bold`}>
                  {formatAverage(row.avgElimsPoints, row.matches, 1)}
                </td>
                <td className={td}>{row.finalRank ? `#${row.finalRank}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!grandFinalsOnly &&
        tournamentsGF.length > 0 &&
        tournaments.some((row) => !activeSlugs.has(row.slug)) && (
          <p className="mt-3 text-[10px] font-bold leading-5 text-slate-400">
            Some events do not appear in the Grand-Finals-only view because they have no recorded
            Grand-Finals matches.
          </p>
        )}
    </div>
  );
}