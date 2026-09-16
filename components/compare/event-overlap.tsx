import Link from 'next/link';

import { TournamentNameFit } from '@/components/ui/tournament-name-fit';

/**
 * The events both sides actually appeared in, with each one's finishing rank —
 * so a gap in the lifetime numbers can be traced to the events behind it rather
 * than inferred from a total.
 */

export interface CompareEventRow {
  tournamentId: string;
  name: string;
  shortName: string | null;
  series: string | null;
  season: string | null;
  slug: string;
  startDateMs: number | null;
  rankA: number | null;
  rankB: number | null;
}

export function EventOverlap({
  labelA,
  labelB,
  rows,
}: {
  labelA: string;
  labelB: string;
  rows: CompareEventRow[];
}) {
  if (rows.length === 0) return null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-6 py-4 dark:border-white/5">
        <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
          Events they both played
        </h3>
        <span className="text-xs font-bold text-slate-400">{rows.length} shared events</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
            <tr>
              <th className="min-w-[160px] px-6 py-3 text-center">{labelA}</th>
              <th className="px-4 py-3 text-center">Event</th>
              <th className="min-w-[160px] px-6 py-3 text-center">{labelB}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {rows.map((row) => {
              const aWins = row.rankA !== null && (row.rankB === null || row.rankA < row.rankB);
              const bWins = row.rankB !== null && (row.rankA === null || row.rankB < row.rankA);
              return (
                <tr key={row.tournamentId} className="text-sm">
                  <td className={`px-6 py-4 text-center text-sm ${aWins ? 'font-black text-[#0A5FC4] dark:text-blue-300' : 'font-medium text-slate-400'}`}>
                    {row.rankA === null ? '—' : `#${row.rankA}`}
                    {aWins && ' ★'}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Link
                      href={`/tournaments/${row.slug}`}
                      className="mx-auto block max-w-[320px] font-bold transition-colors hover:text-[#0A5FC4]"
                    >
                      <TournamentNameFit
                        name={row.name}
                        shortName={row.shortName}
                        series={row.series}
                        season={row.season}
                      />
                    </Link>
                    {row.startDateMs ? (
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {new Date(row.startDateMs).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </p>
                    ) : null}
                  </td>
                  <td className={`px-6 py-4 text-center text-sm ${bWins ? 'font-black text-[#0A5FC4] dark:text-blue-300' : 'font-medium text-slate-400'}`}>
                    {row.rankB === null ? '—' : `#${row.rankB}`}
                    {bWins && ' ★'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="border-t border-slate-100 px-6 py-4 text-[10px] font-bold leading-5 text-slate-400 dark:border-white/5">
        Only events with a recorded finish appear. An event with no final rank shows an em dash, not
        a zero.
      </p>
    </section>
  );
}
