import { Clock3, Crosshair, Swords, Target, TrendingUp } from 'lucide-react';

import { formatAverage, formatRate, gameLabel, type TeamMatchSummary } from '@/lib/team-stats';

/**
 * Career snapshot band. Every tile carries its own sample size, and a team with
 * no scorecards gets one honest line instead of six zeroed tiles — 152 of the
 * 222 teams have no match data, so that is the common case, not the edge case.
 *
 * Six tiles: games, win rate, top-5 rate, avg total pts, avg elim pts, and the
 * last-20 average. Placement shares and title counts were removed to declutter;
 * placement is an ordinal and its mean says nothing, so the band reports what
 * the scoring actually rewards.
 */
export function TeamStatBand({
  summary,
  last20Avg,
  hasMatchData,
}: {
  summary: TeamMatchSummary;
  /** Average total points over the last up-to-20 games, or `null`. */
  last20Avg: number | null;
  hasMatchData: boolean;
}) {
  if (!hasMatchData) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-6 dark:border-white/10 dark:bg-white/[0.02] sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
          Match record
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          No match data yet. This team has no scorecards on record, so games, win rate,
          top-5 rate and per-game point averages can&rsquo;t be computed. The roster, event
          history and trophy cabinet below are unaffected.
        </p>
      </section>
    );
  }

  const tiles = [
    {
      label: 'Matches played',
      value: summary.matches.toLocaleString('en-IN'),
      sample: `${gameLabel(summary.matches)} tracked`,
      icon: Swords,
    },
    {
      label: 'Win rate',
      value: formatRate(summary.winRate, summary.matches),
      sample: gameLabel(summary.matches),
      icon: Crosshair,
    },
    {
      label: 'Top-5 rate',
      value: formatRate(summary.topFiveRate, summary.matches),
      sample: gameLabel(summary.matches),
      icon: Target,
    },
    {
      label: 'Avg total pts',
      value: formatAverage(summary.avgTotalPoints, summary.matches, 1),
      sample: `per game · ${gameLabel(summary.matches)}`,
      icon: TrendingUp,
    },
    {
      label: 'Avg elim pts',
      value: formatAverage(summary.avgElimsPoints, summary.matches, 1),
      sample: `per game · ${gameLabel(summary.matches)}`,
      icon: Crosshair,
    },
    {
      label: 'Last 20 avg',
      value: formatAverage(last20Avg, summary.matches, 1),
      sample: `of last ${gameLabel(Math.min(summary.matches, 20))}`,
      icon: Clock3,
    },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
          Match record
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight">Career snapshot</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map(({ label, value, sample, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5"
          >
            <Icon className="h-4 w-4 text-[#0A5FC4] dark:text-blue-300" />
            <p className="mt-3 text-2xl font-black tracking-tight">{value}</p>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400">
              {label}
            </p>
            <p className="mt-1.5 text-[10px] font-bold text-slate-400">{sample}</p>
          </div>
        ))}
      </div>
    </section>
  );
}