'use client';

import * as React from 'react';
import Link from 'next/link';
import { Crosshair } from 'lucide-react';

import { TournamentNameFit } from '@/components/ui/tournament-name-fit';
import { isGrandFinalsStage } from '@/lib/match-stage';
import { cn } from '@/lib/utils';

/**
 * One player's line for a single game — the raw material for the match-wise
 * performance table. Elims and game counts are the two metrics every scored
 * event records, which is why this table can promise complete totals where the
 * detail telemetry (damage, survival) cannot.
 */
export interface PlayerEventStatLine {
  tournamentId: string;
  tournamentName: string;
  tournamentShortName: string | null;
  tournamentSeries: string | null;
  tournamentSeason: string | null;
  tournamentSlug: string;
  tournamentStartMs: number | null;
  tier: string | null;
  teamName: string | null;
  teamSlug: string | null;
  mapName: string | null;
  matchType: string | null;
  stageName: string | null;
  stageType: string | null;
  elims: number;
  startedAtMs: number | null;
}

type GroupBy = 'event' | 'map';

interface StatGroup {
  key: string;
  matches: number;
  elims: number;
  maxElims: number;
  zeroElims: number;
  fivePlusElims: number;
  latestMs: number;
  label: string | null;
  tournament: {
    name: string;
    shortName: string | null;
    series: string | null;
    season: string | null;
    slug: string;
  } | null;
  startMs: number | null;
  teamName: string | null;
  teamSlug: string | null;
}

const MONTH_YEAR = { month: 'short' as const, year: 'numeric' as const };

const chipBase =
  'inline-flex cursor-pointer items-center whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-colors';
const chipOn = 'border-[#0A5FC4] bg-[#0A5FC4] text-white';
const chipOff =
  'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300';

/** Groups the filtered lines and derives the per-row figures. */
function groupLines(lines: PlayerEventStatLine[], groupBy: GroupBy): StatGroup[] {
  const isEvent = groupBy === 'event';
  const groups = new Map<
    string,
    StatGroup & { teamCounts: Map<string, { count: number; slug: string | null }> }
  >();

  for (const line of lines) {
    const key = isEvent ? line.tournamentId : line.mapName ?? 'Unknown map';
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        matches: 0,
        elims: 0,
        maxElims: 0,
        zeroElims: 0,
        fivePlusElims: 0,
        latestMs: 0,
        label: isEvent ? null : key,
        tournament: isEvent
          ? {
              name: line.tournamentName,
              shortName: line.tournamentShortName,
              series: line.tournamentSeries,
              season: line.tournamentSeason,
              slug: line.tournamentSlug,
            }
          : null,
        startMs: isEvent ? line.tournamentStartMs : null,
        teamName: null,
        teamSlug: null,
        teamCounts: new Map(),
      };
      groups.set(key, group);
    }

    group.matches += 1;
    group.elims += line.elims;
    group.maxElims = Math.max(group.maxElims, line.elims);
    if (line.elims === 0) group.zeroElims += 1;
    if (line.elims >= 5) group.fivePlusElims += 1;
    if (line.startedAtMs && line.startedAtMs > group.latestMs) group.latestMs = line.startedAtMs;

    if (isEvent && line.teamName) {
      const existing = group.teamCounts.get(line.teamName);
      group.teamCounts.set(line.teamName, {
        count: (existing?.count ?? 0) + 1,
        slug: existing?.slug ?? line.teamSlug,
      });
    }
  }

  const rows: StatGroup[] = [];
  for (const group of groups.values()) {
    // The team a player lined up for most often in this event — a mid-event
    // move would otherwise show whichever row happened to come first.
    const bestTeam = [...group.teamCounts.entries()].sort((a, b) => b[1].count - a[1].count)[0];
    rows.push({
      key: group.key,
      matches: group.matches,
      elims: group.elims,
      maxElims: group.maxElims,
      zeroElims: group.zeroElims,
      fivePlusElims: group.fivePlusElims,
      latestMs: group.latestMs,
      label: group.label,
      tournament: group.tournament,
      startMs: group.startMs,
      teamName: bestTeam ? bestTeam[0] : null,
      teamSlug: bestTeam ? bestTeam[1].slug : null,
    });
  }

  rows.sort((a, b) =>
    groupBy === 'event'
      ? b.latestMs - a.latestMs
      : b.matches - a.matches || (a.label ?? '').localeCompare(b.label ?? ''),
  );
  return rows;
}

const avgOf = (elims: number, matches: number) => (matches > 0 ? (elims / matches).toFixed(2) : '—');

/**
 * Match-wise performance: one row per event (or per map) carrying matches,
 * elims, average, best single game, and the zero-elim / five-plus-elim counts.
 *
 * Filters (Grand finals only, Online/Offline, tier) are applied in the browser —
 * the player's whole match history is already on the page, so a toggle never
 * needs a round trip. Every figure comes from the same per-game rows, so the
 * filters can only narrow the set, never change what a figure means.
 */
export function PlayerEventStats({ lines }: { lines: PlayerEventStatLine[] }) {
  const [groupBy, setGroupBy] = React.useState<GroupBy>('event');
  const [grandFinalsOnly, setGrandFinalsOnly] = React.useState(false);
  const [matchType, setMatchType] = React.useState('ALL');
  const [tier, setTier] = React.useState('ALL');

  const matchTypes = React.useMemo(
    () => [...new Set(lines.map((line) => line.matchType).filter((value): value is string => Boolean(value)))].sort(),
    [lines],
  );
  const tiers = React.useMemo(
    () => [...new Set(lines.map((line) => line.tier).filter((value): value is string => Boolean(value)))].sort(),
    [lines],
  );

  const filtered = React.useMemo(
    () =>
      lines.filter((line) => {
        if (grandFinalsOnly && !isGrandFinalsStage(line.stageName, line.stageType)) return false;
        if (matchType !== 'ALL' && line.matchType !== matchType) return false;
        if (tier !== 'ALL' && line.tier !== tier) return false;
        return true;
      }),
    [lines, grandFinalsOnly, matchType, tier],
  );

  const groups = React.useMemo(() => groupLines(filtered, groupBy), [filtered, groupBy]);

  const totals = React.useMemo(() => {
    let elims = 0;
    let maxElims = 0;
    let zeroElims = 0;
    let fivePlusElims = 0;
    for (const line of filtered) {
      elims += line.elims;
      maxElims = Math.max(maxElims, line.elims);
      if (line.elims === 0) zeroElims += 1;
      if (line.elims >= 5) fivePlusElims += 1;
    }
    return { matches: filtered.length, elims, maxElims, zeroElims, fivePlusElims };
  }, [filtered]);

  if (lines.length === 0) return null;

  const showTeamColumn = groupBy === 'event';
  const columnCount = showTeamColumn ? 8 : 7;

  const activeFilter = grandFinalsOnly || matchType !== 'ALL' || tier !== 'ALL';

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
            Match-wise
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            {showTeamColumn ? 'Events performance' : 'Per-map performance'}
          </h2>
        </div>
        <Crosshair className="h-6 w-6 shrink-0 text-slate-300 dark:text-slate-700" />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Group</span>
        <button
          type="button"
          onClick={() => setGroupBy('event')}
          aria-pressed={groupBy === 'event'}
          className={cn(chipBase, groupBy === 'event' ? chipOn : chipOff)}
        >
          By event
        </button>
        <button
          type="button"
          onClick={() => setGroupBy('map')}
          aria-pressed={groupBy === 'map'}
          className={cn(chipBase, groupBy === 'map' ? chipOn : chipOff)}
        >
          By map
        </button>

        <span className="mx-1 hidden h-5 w-px bg-slate-200 dark:bg-white/10 sm:block" />

        <button
          type="button"
          onClick={() => setGrandFinalsOnly((value) => !value)}
          aria-pressed={grandFinalsOnly}
          className={cn(chipBase, grandFinalsOnly ? chipOn : chipOff)}
        >
          Grand finals only
        </button>
      </div>

      {(matchTypes.length > 1 || tiers.length > 1) && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {matchTypes.length > 1 && (
            <>
              <span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Played</span>
              <button
                type="button"
                onClick={() => setMatchType('ALL')}
                aria-pressed={matchType === 'ALL'}
                className={cn(chipBase, matchType === 'ALL' ? chipOn : chipOff)}
              >
                All
              </button>
              {matchTypes.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMatchType(value)}
                  aria-pressed={matchType === value}
                  className={cn(chipBase, matchType === value ? chipOn : chipOff)}
                >
                  {value}
                </button>
              ))}
            </>
          )}

          {tiers.length > 1 && (
            <>
              <span className="mx-1 hidden h-5 w-px bg-slate-200 dark:bg-white/10 sm:block" />
              <span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Tier</span>
              <button
                type="button"
                onClick={() => setTier('ALL')}
                aria-pressed={tier === 'ALL'}
                className={cn(chipBase, tier === 'ALL' ? chipOn : chipOff)}
              >
                All
              </button>
              {tiers.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTier(value)}
                  aria-pressed={tier === value}
                  className={cn(chipBase, tier === value ? chipOn : chipOff)}
                >
                  {value}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[680px] text-left">
          <thead className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
            <tr>
              <th className="w-[38%] pb-3">{showTeamColumn ? 'Event' : 'Map'}</th>
              {showTeamColumn && <th className="w-[16%] pb-3">Team</th>}
              <th className="pb-3 text-center">{showTeamColumn ? 'Matches' : 'MP'}</th>
              <th className="pb-3 text-center">Elims</th>
              <th className="pb-3 text-center">Avg</th>
              <th className="pb-3 text-center">Max</th>
              <th className="pb-3 text-center">0 Elim</th>
              <th className="pb-3 text-center">5+ Elim</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {groups.length > 0 ? (
              groups.map((group) => (
                <tr key={group.key} className="text-sm">
                  <td className="py-4 pr-3">
                    {group.tournament ? (
                      <>
                        <Link
                          href={`/tournaments/${group.tournament.slug}`}
                          className="block w-full font-bold transition-colors hover:text-[#0A5FC4]"
                        >
                          <TournamentNameFit
                            name={group.tournament.name}
                            shortName={group.tournament.shortName}
                            series={group.tournament.series}
                            season={group.tournament.season}
                          />
                        </Link>
                        {group.startMs ? (
                          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {new Date(group.startMs).toLocaleDateString('en-IN', MONTH_YEAR)}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <span className="font-bold">{group.label}</span>
                    )}
                  </td>
                  {showTeamColumn && (
                    <td className="py-4 pr-3 text-slate-500">
                      {group.teamName ? (
                        group.teamSlug ? (
                          <Link href={`/teams/${group.teamSlug}`} className="font-bold hover:text-[#0A5FC4]">
                            {group.teamName}
                          </Link>
                        ) : (
                          <span className="font-bold">{group.teamName}</span>
                        )
                      ) : (
                        '—'
                      )}
                    </td>
                  )}
                  <td className="py-4 text-center font-mono font-bold text-slate-500">{group.matches}</td>
                  <td className="py-4 text-center font-mono font-bold text-[#0A5FC4] dark:text-blue-300">
                    {group.elims}
                  </td>
                  <td className="py-4 text-center font-mono font-bold text-slate-500">
                    {avgOf(group.elims, group.matches)}
                  </td>
                  <td className="py-4 text-center font-mono font-bold text-slate-700 dark:text-slate-200">
                    {group.maxElims}
                  </td>
                  <td className="py-4 text-center font-mono font-bold text-slate-400">{group.zeroElims}</td>
                  <td className="py-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {group.fivePlusElims}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columnCount} className="py-10 text-center text-xs text-slate-400">
                  No games match these filters.
                </td>
              </tr>
            )}
          </tbody>
          {groups.length > 0 && (
            <tfoot className="border-t-2 border-slate-100 text-sm dark:border-white/10">
              <tr>
                <td className="pt-3 font-black">
                  {activeFilter ? 'Filtered total' : 'Career total'}
                </td>
                {showTeamColumn && <td />}
                <td className="pt-3 text-center font-mono font-black">{totals.matches}</td>
                <td className="pt-3 text-center font-mono font-black text-[#0A5FC4] dark:text-blue-300">
                  {totals.elims}
                </td>
                <td className="pt-3 text-center font-mono font-black text-slate-500">
                  {avgOf(totals.elims, totals.matches)}
                </td>
                <td className="pt-3 text-center font-mono font-black text-slate-700 dark:text-slate-200">
                  {totals.maxElims}
                </td>
                <td className="pt-3 text-center font-mono font-black text-slate-400">{totals.zeroElims}</td>
                <td className="pt-3 text-center font-mono font-black text-emerald-600 dark:text-emerald-400">
                  {totals.fivePlusElims}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="mt-4 max-w-3xl text-[10px] font-bold leading-5 text-slate-400">
        Elims and match counts are recorded for every event holding scorecards, so these totals are
        complete for the games shown. Max is the best single game in that row; 0-elim and 5+ elim
        count games, not kills. Career total covers every game the player has a scorecard for.
      </p>
    </section>
  );
}
