import Link from 'next/link';
import { Swords, Trophy } from 'lucide-react';

import { DirectoryPagination } from '@/components/directory-pagination';
import { TournamentShortName } from '@/components/ui/tournament-name';
import { TeamMatchFilters, type TeamMatchFilterState } from './team-match-filters';
import { groupRowsByEvent } from '@/lib/team-stats';
import {
  TEAM_MATCH_PAGE_SIZE,
  type TeamContext,
  type TeamMatchFilterOptions,
  type TeamMatchPage,
  type TeamMatchRow,
} from '@/lib/team-data';

/**
 * Finish badge for the Rank cell. An ordinal rank alone hides the difference
 * between a podium and a mid-table game, so the top ten carry a marker:
 * trophy for a win, `T5` / `T10` pills below it, and nothing further down.
 */
const TH =
  'px-1.5 py-3 text-[10px] font-black uppercase tracking-[.16em] text-slate-400 lg:px-4';

function FinishBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return <Trophy className="h-3.5 w-3.5 text-amber-500" aria-label="Won the game" />;
  }

  if (rank >= 2 && rank <= 5) {
    return (
      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
        T5
      </span>
    );
  }

  if (rank >= 6 && rank <= 10) {
    return (
      <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
        T10
      </span>
    );
  }

  return null;
}

function MatchRow({ row }: { row: TeamMatchRow }) {
  return (
    <tr className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70 dark:border-white/5 dark:hover:bg-white/5">
      <td className="whitespace-nowrap px-1.5 py-3 lg:px-4 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span className="lg:hidden">
          {new Date(row.scheduledAtMs).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
          })}
        </span>
        <span className="hidden lg:inline">
          {new Date(row.scheduledAtMs).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: '2-digit',
          })}
        </span>
      </td>
      <td className="px-1.5 py-3 lg:px-4">
        {row.tournamentSlug ? (
          <Link
            href={`/tournaments/${row.tournamentSlug}`}
            className="line-clamp-1 max-w-[220px] font-bold transition-colors hover:text-[#0A5FC4]"
          >
            <TournamentShortName name={row.tournamentName} shortName={row.tournamentShortName} />
          </Link>
        ) : (
          <span className="font-bold">
            <TournamentShortName name={row.tournamentName} shortName={row.tournamentShortName} />
          </span>
        )}
      </td>
      <td className="hidden px-1.5 py-3 lg:px-4 lg:table-cell">
        {row.stageLabel ? (
          <span className="rounded bg-[#0A5FC4]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-300">
            {row.stageLabel}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
      <td className="whitespace-nowrap px-1.5 py-3 lg:px-4 text-xs font-bold text-slate-500 dark:text-slate-400">
        {row.mapName || '—'}
      </td>
      <td className="px-1.5 py-3 lg:px-4">
        <span className="inline-flex items-center gap-1.5">
          <span className="text-sm font-black">#{row.rank}</span>
          <FinishBadge rank={row.rank} />
          {row.wwcd ? (
            <span className="text-[10px] lg:hidden" title="Won the game (WWCD)">
              🍗
            </span>
          ) : null}
        </span>
      </td>
      <td className="hidden px-1.5 py-3 lg:px-4 lg:table-cell">
        {row.wwcd ? (
          <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-300">
            WWCD
          </span>
        ) : (
          <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
        )}
      </td>
      <td className="hidden px-1.5 py-3 lg:px-4 text-xs font-bold text-slate-500 lg:table-cell dark:text-slate-400">
        {row.placePoints}
      </td>
      <td className="px-1.5 py-3 lg:px-4 text-xs font-bold text-slate-500 dark:text-slate-400">
        {row.elimsPoints}
      </td>
      <td className="px-1.5 py-3 lg:px-4 text-sm font-black text-[#0A5FC4] dark:text-blue-300">
        {row.totalPoints}
      </td>
    </tr>
  );
}

/**
 * Matches tab. Server-side, URL-driven pagination (30 rows) reusing the
 * directory pager so the two behave identically.
 *
 * Rows arrive newest-first and are then bucketed per event, so the page reads
 * as a series of event blocks (most recent event first) instead of one flat
 * list. Grouping happens inside the current page — pagination stays untouched.
 *
 * Per-row damage / survival / healing columns are deliberately absent — they
 * are blank for a whole event, so a per-row figure would be a lie.
 */
export function TeamMatchesPanel({
  team,
  data,
  filters,
  options,
}: {
  team: TeamContext;
  data: TeamMatchPage;
  filters: TeamMatchFilterState;
  options: TeamMatchFilterOptions;
}) {
  const basePath = `/teams/${team.slug || team.id}/matches`;
  const paginationParams: Record<string, string> = {};
  if (filters.tournament) paginationParams.tournament = filters.tournament;
  if (filters.map) paginationParams.map = filters.map;
  if (filters.wins) paginationParams.wins = filters.wins;
  if (filters.sort === 'points') paginationParams.sort = 'points';

  const hasActiveFilter = Boolean(filters.tournament || filters.map || filters.wins);
  const groups = groupRowsByEvent(data.rows);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
            Scorecard by scorecard
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">Match history</h2>
        </div>
        <Swords className="h-6 w-6 text-slate-300 dark:text-slate-700" />
      </div>

      <TeamMatchFilters
        basePath={basePath}
        filters={filters}
        tournaments={options.tournaments}
        maps={options.maps}
      />

      {data.total === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 py-16 text-center dark:border-white/10 dark:bg-white/[0.02]">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            {hasActiveFilter
              ? 'No games match these filters.'
              : `No match data yet — ${team.name} has no scorecards on record.`}
          </p>
          {hasActiveFilter && (
            <Link
              href={basePath}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-black uppercase tracking-wider transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10"
            >
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1220]">
            <table className="w-full border-collapse text-sm lg:min-w-[860px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left dark:border-white/10 dark:bg-white/5">
                  <th className={TH}>Date</th>
                  <th className={TH}>
                    <span className="lg:hidden">Event</span>
                    <span className="hidden lg:inline">Tournament</span>
                  </th>
                  <th className={`${TH} hidden lg:table-cell`}>Stage</th>
                  <th className={TH}>Map</th>
                  <th className={TH}>Rank</th>
                  <th className={`${TH} hidden lg:table-cell`}>WWCD</th>
                  <th className={`${TH} hidden lg:table-cell`}>Place</th>
                  <th className={TH}>Elim</th>
                  <th className={TH}>Total</th>
                </tr>
              </thead>
              {groups.map((group) => {
                const head = group.rows[0];
                return (
                  <tbody key={group.tournamentId} className="border-t border-slate-200 dark:border-white/10">
                    <tr className="bg-slate-100/70 dark:bg-white/[0.04]">
                      <td colSpan={9} className="px-4 py-2">
                        <span className="flex flex-wrap items-center gap-2">
                          {head.tournamentSlug ? (
                            <Link
                              href={`/tournaments/${head.tournamentSlug}`}
                              className="text-[10px] font-black uppercase tracking-[.16em] text-[#0A5FC4] transition-colors hover:underline dark:text-blue-300"
                            >
                              <TournamentShortName name={head.tournamentName} shortName={head.tournamentShortName} />
                            </Link>
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500 dark:text-slate-300">
                              <TournamentShortName name={head.tournamentName} shortName={head.tournamentShortName} />
                            </span>
                          )}
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {group.rows.length} game{group.rows.length === 1 ? '' : 's'} on this page
                          </span>
                        </span>
                      </td>
                    </tr>
                    {group.rows.map((row) => (
                      <MatchRow key={row.id} row={row} />
                    ))}
                  </tbody>
                );
              })}
            </table>
          </div>

          <DirectoryPagination
            basePath={basePath}
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={TEAM_MATCH_PAGE_SIZE}
            entityPlural="matches"
            params={paginationParams}
          />
        </>
      )}
    </div>
  );
}
