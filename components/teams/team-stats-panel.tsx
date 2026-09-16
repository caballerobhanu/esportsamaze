import { Map as MapIcon, Trophy } from 'lucide-react';

import { HeadToHeadBoard } from './head-to-head-board';
import { PlacementDistribution } from './placement-distribution';
import { RelatedTeamsBand } from './related-teams-band';
import { TeamPerTournamentTable } from './team-per-tournament-table';
import { EventMetrics } from '@/components/ui/event-metrics';
import { TEAM_METRIC_COLUMNS, type EventMetricRow } from '@/lib/event-metrics';
import { formatAverage, formatDuration, formatRate, scorecardLabel } from '@/lib/team-stats';
import {
  type HeadToHeadRow,
  type RelatedTeamRow,
  type TeamContext,
  type TeamMapRow,
  type TeamMatchSummaryPayload,
  type TeamTournamentRow,
} from '@/lib/team-data';

const th = 'px-4 py-3 text-[10px] font-black uppercase tracking-[.16em] text-slate-400';
const td = 'px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400';

function SectionCard({
  kicker,
  title,
  icon,
  children,
}: {
  kicker: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
            {kicker}
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">{title}</h2>
        </div>
        {icon}
      </div>
      {children}
    </section>
  );
}

/**
 * Stats tab: placement distribution, per-tournament and per-map breakdowns, the
 * head-to-head board and the related-teams band.
 *
 * Every computed average goes through `formatAverage` / `formatDuration`, which
 * return "—" below five underlying games rather than a number nobody should
 * trust.
 */
export function TeamStatsPanel({
  team,
  matchSummary,
  tournaments,
  tournamentsGF,
  maps,
  headToHead,
  related,
  eventMetrics,
}: {
  team: TeamContext;
  matchSummary: TeamMatchSummaryPayload;
  tournaments: TeamTournamentRow[];
  tournamentsGF: TeamTournamentRow[];
  maps: TeamMapRow[];
  headToHead: HeadToHeadRow[];
  related: RelatedTeamRow[];
  eventMetrics: EventMetricRow[];
}) {
  const teamSlug = team.slug || team.id;
  const hasMatchData = matchSummary.hasMatchData;

  return (
    <div className="space-y-8">
      {!hasMatchData ? (
        <section className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-6 dark:border-white/10 dark:bg-white/[0.02] sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
            Match statistics
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            No match data yet. {team.name} has no scorecards on record, so placement distribution,
            per-tournament and per-map breakdowns and the head-to-head board can&rsquo;t be built.
            Related teams and any detailed metrics are still shown below.
          </p>
        </section>
      ) : (
        <>
          {/* Placement distribution */}
          <SectionCard
            kicker="Where the games land"
            title="Placement distribution"
            icon={<Trophy className="h-6 w-6 text-amber-400" />}
          >
            <PlacementDistribution bins={matchSummary.bins} total={matchSummary.summary.matches} />
            <p className="mt-4 text-[10px] font-bold text-slate-400">
              Across {matchSummary.summary.matches} games with a recorded placement.
            </p>
          </SectionCard>

          {/* Per-tournament */}
          <SectionCard
            kicker="Event by event"
            title="Per-tournament record"
            icon={<Trophy className="h-6 w-6 text-slate-300 dark:text-slate-700" />}
          >
            <TeamPerTournamentTable tournaments={tournaments} tournamentsGF={tournamentsGF} />
            <p className="mt-4 max-w-3xl text-[10px] font-bold leading-5 text-slate-400">
              Averages are per game. There is no average-placement column: a mean rank over a
              battle-royale spread averages an ordinal, so the placement histogram above is the
              honest view of that distribution.
            </p>
          </SectionCard>

          {/* Per-map */}
          <SectionCard
            kicker="Map by map"
            title="Per-map record"
            icon={<MapIcon className="h-6 w-6 text-slate-300 dark:text-slate-700" />}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    {[
                      'Map',
                      'Matches',
                      'Wins',
                      'Top-5 %',
                      'Avg place pts',
                      'Total points',
                      'Avg damage',
                      'Avg survival',
                    ].map((heading) => (
                      <th key={heading} className={`${th} text-left`}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {maps.map((row) => (
                    <tr
                      key={row.mapName}
                      className="border-b border-slate-100 last:border-0 dark:border-white/5"
                    >
                      <td className="px-4 py-3 font-extrabold">{row.mapName}</td>
                      <td className={`${td} font-black`}>{row.matches}</td>
                      <td className={`${td} text-emerald-600 dark:text-emerald-400`}>{row.wins}</td>
                      <td className={td}>{formatRate(row.topFiveRate, row.matches)}</td>
                      <td className={`${td} font-bold`}>
                        {formatAverage(row.avgPlacePoints, row.matches, 1)}
                      </td>
                      <td className={`${td} font-black text-[#0A5FC4] dark:text-blue-300`}>
                        {row.points}
                      </td>
                      <td className={td}>
                        <span className="font-black">
                          {formatAverage(row.avgDamage, row.damageSamples, 0)}
                        </span>
                        {row.damageSamples > 0 && (
                          <span className="ml-1.5 text-[10px] font-bold text-slate-400">
                            {scorecardLabel(row.damageSamples)}
                          </span>
                        )}
                      </td>
                      <td className={td}>
                        <span className="font-black">
                          {formatDuration(row.avgSurvival, row.survivalSamples)}
                        </span>
                        {row.survivalSamples > 0 && (
                          <span className="ml-1.5 text-[10px] font-bold text-slate-400">
                            {scorecardLabel(row.survivalSamples)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 max-w-3xl text-[10px] font-bold leading-5 text-slate-400">
              Each metric is averaged only over the scorecards that recorded it: damage over the
              rows with a damage figure, survival over the rows with a survival time. A recorded
              zero counts as a real sample and stays in the denominator; a blank (never recorded)
              value is left out rather than counted as a zero.
            </p>
          </SectionCard>
        </>
      )}

      {/* Detailed metrics sit above the head-to-head board: they are the event
          record, where the board is an opponent breakdown. Rendered outside the
          match-data gate so an event with only reported totals still shows. */}
      <EventMetrics rows={eventMetrics} columns={TEAM_METRIC_COLUMNS} />

      {hasMatchData && (
        <HeadToHeadBoard rows={headToHead} teamSlug={teamSlug} teamName={team.name} />
      )}

      <RelatedTeamsBand rows={related} teamName={team.name} />
    </div>
  );
}
