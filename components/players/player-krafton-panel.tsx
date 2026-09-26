import { Award, Crown, TrendingUp } from 'lucide-react';
import { RankTrendChart } from '@/components/rankings/rank-trend-chart';
import { TournamentName } from '@/components/ui/tournament-name';
import type { RankTrendPoint } from '@/lib/krafton-standings';

/**
 * KRAFTON ranking depth + honours for a player profile.
 *
 * Everything here is EVENT-level, so it is unaffected by the match-data gaps that
 * make per-game telemetry inconsistent — the ranking board and its award counters
 * are entered per event, not per game.
 */
export interface HonourContribution {
  entryId: string;
  eventName: string;
  /** Admin-entered short label, shown in place of the full name on mobile. */
  eventShortName?: string | null;
  tier: string | null;
  endDate: Date;
  rank: number;
  teamName?: string | null;
  finishes?: number | null;
  awards?: {
    mvp?: number;
    finalsMvp?: number;
    igl?: number;
    survivor?: number;
    emerging?: number;
  } | null;
}

const AWARD_KINDS = [
  { key: 'mvp', label: 'MVP' },
  { key: 'finalsMvp', label: 'Finals MVP' },
  { key: 'igl', label: 'IGL' },
  { key: 'survivor', label: 'Survivor' },
  { key: 'emerging', label: 'Emerging' },
] as const;

const fmtDate = (date: Date) =>
  new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function PlayerKraftonPanel({
  contributions,
  eventCount,
  peakRank,
  daysAtPeak,
  daysInTop5,
  trend,
  entityName,
}: {
  contributions: HonourContribution[];
  eventCount: number;
  peakRank: number | null;
  daysAtPeak: number;
  daysInTop5: number;
  trend: RankTrendPoint[];
  entityName: string;
}) {
  if (contributions.length === 0) return null;

  const totals = AWARD_KINDS.map((kind) => ({
    ...kind,
    count: contributions.reduce((sum, row) => sum + (row.awards?.[kind.key] || 0), 0),
  }));
  const totalAwards = totals.reduce((sum, kind) => sum + kind.count, 0);
  const stats = [
    {
      label: 'Peak Rank',
      value: peakRank !== null ? `#${peakRank}` : '—',
      // When the peak IS #1, days at peak is days at #1 — the same number
      // `computeRankOneReigns` reports, without a second board pass.
      sub: peakRank !== null ? `${daysAtPeak} day${daysAtPeak === 1 ? '' : 's'}${peakRank === 1 ? ' at #1' : ' at peak'}` : null,
    },
    {
      label: 'Days in Top 5',
      value: `${daysInTop5}`,
      sub: 'cumulative',
    },
    {
      label: 'Ranked Events',
      value: `${eventCount}`,
      sub: 'counting toward the board',
    },
    {
      label: 'Award Bonuses',
      value: `${totalAwards}`,
      sub: totalAwards > 0 ? 'KRAFTON honours' : 'none recorded',
    },
  ];

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
            Official rankings
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">KRAFTON career</h2>
        </div>
        <Crown className="h-6 w-6 text-amber-400" />
      </div>

      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5"
          >
            <p className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{stat.value}</p>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-400">
              {stat.label}
            </p>
            {stat.sub && <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">{stat.sub}</p>}
          </div>
        ))}
      </div>

      {trend.length > 1 && (
        <div className="mb-7">
          <p className="mb-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <TrendingUp className="h-3 w-3" />
            Rank over time
          </p>
          <RankTrendChart trend={trend} entityName={entityName} />
        </div>
      )}

      <div>
        <p className="mb-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <Award className="h-3 w-3 text-amber-500" />
          Honours
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {totals.map((kind) => (
            <span
              key={kind.key}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wider ${
                kind.count > 0
                  ? 'border-amber-300/60 bg-amber-400/10 text-amber-700 dark:border-amber-400/30 dark:text-amber-300'
                  : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500'
              }`}
            >
              {kind.label}
              <span className="font-mono text-sm">{kind.count}</span>
            </span>
          ))}
        </div>

        {contributions.length > 0 && (
          <div className="w-full overflow-x-auto">
            <p className="mb-3 text-[11px] font-semibold text-slate-400">
              Every ranked event, with honours shown where they were awarded.
            </p>
            <table className="w-full min-w-[520px] text-left">
              <thead className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
                <tr>
                  <th className="pb-3">Event</th>
                  <th className="pb-3">Team</th>
                  <th className="pb-3 text-center">Elims</th>
                  <th className="pb-3">Honours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {contributions.map((row) => {
                  const earned = AWARD_KINDS.filter((kind) => (row.awards?.[kind.key] || 0) > 0);
                  return (
                    <tr key={row.entryId} className="text-sm">
                      <td className="py-3 pr-3">
                        <span className="font-bold">
                          <TournamentName name={row.eventName} shortName={row.eventShortName} />
                        </span>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {row.tier ? `${row.tier} · ` : ''}
                          {fmtDate(row.endDate)}
                        </p>
                      </td>
                      <td className="py-3 pr-3 text-slate-500">{row.teamName ?? '—'}</td>
                      <td className="py-3 text-center font-mono text-slate-500">{row.finishes ?? '—'}</td>
                      <td className="py-3">
                        {earned.length > 0 ? (
                          <span className="flex flex-wrap gap-1">
                            {earned.map((kind) => (
                              <span
                                key={kind.key}
                                className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300"
                              >
                                {kind.label}
                                {(row.awards?.[kind.key] || 0) > 1 ? ` ×${row.awards?.[kind.key]}` : ''}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
