'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Swords,
  Map as MapIcon,
  Clock,
  Tv,
  Calendar,
  Filter,
  Trophy,
  Sparkles,
  Users,
  X,
  Search,
  Check,
  Layers,
  Table as TableIcon,
  ChevronsDownUp,
  ChevronsUpDown,
  Scale,
} from 'lucide-react';
import {
  MATCH_COLUMN_DEFS,
  DEFAULT_MATCH_COLUMNS,
  type MatchColumnKey,
} from '@/lib/standings-config';

export interface TournamentTeamInfo {
  id: string;
  name: string;
  tag?: string | null;
  logoUrl?: string | null;
  imageDarkUrl?: string | null;
  matchCount?: number;
}

export interface TeamResultLite {
  id: string;
  rank: number;
  wwcd: boolean;
  placePoints: number;
  elimsPoints: number;
  bonusPoints?: number;
  totalPoints: number;
  damage: number;
  damageReceived?: number;
  healing?: number;
  headshots?: number;
  assists?: number;
  knockouts?: number;
  longestElim?: number;
  vehicleElims?: number;
  grenadeElims?: number;
  smokesUsed?: number;
  grenadesUsed?: number;
  molotovsUsed?: number;
  flashUsed?: number;
  airdrops?: number;
  rescues?: number;
  distDrove?: number;
  distWalk?: number;
  team: TournamentTeamInfo;
}

export interface PlayerStatLite {
  id: string;
  playerElims: number;
  damage: number;
  isMvp: boolean;
  player: { ign: string };
  team?: { id?: string; name?: string; tag?: string | null } | null;
}

export interface MatchLite {
  id: string;
  format: string;
  matchNumber?: number | null;
  overallMatchNumber?: number | null;
  mapName?: string | null;
  status: string;
  scheduledAt: Date | string;
  matchTime?: string | null;
  streamUrl?: string | null;
  teamResults: TeamResultLite[];
  playerStats: PlayerStatLite[];
}

export interface StageGroup {
  stageName: string;
  matches: MatchLite[];
}

/**
 * Formats match timestamp to a 12-hour time (e.g. "2:30 PM" or "Sep 1, 2:30 PM").
 * Pass a timeZone while server-rendering (see useIsClient) so SSR and the first
 * client render agree; omit it after mount for the user's local zone.
 */
function formatLocalMatchTime(scheduledAt: Date | string, timeZone?: string): { time: string; date: string } {
  const d = new Date(scheduledAt);
  if (isNaN(d.getTime())) return { time: '', date: '' };

  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(timeZone ? { timeZone } : {}),
  });

  const date = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  });

  return { time, date };
}

/**
 * True after hydration. Render timezone-dependent values with a pinned zone
 * until this flips, so the server HTML and the first client render match.
 */
const noopSubscribe = () => () => {};
function useIsClient(): boolean {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

function MapChip({ map }: { map?: string | null }) {
  return (
    <span className="num flex items-center gap-1 rounded-lg border border-(--ed-hair) px-2 py-0.5 text-[11px] uppercase text-(--ed-stone)">
      <MapIcon className="h-3 w-3" />
      {map || 'TBA'}
    </span>
  );
}

function TeamLogo({ team, size = 20 }: { team: TournamentTeamInfo; size?: number }) {
  const style = { width: size, height: size };
  // Both variants: light logo on light background, dark logo in dark mode
  if (team.logoUrl && team.imageDarkUrl) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.logoUrl} alt="" className="shrink-0 object-contain dark:hidden" style={style} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.imageDarkUrl} alt="" className="shrink-0 object-contain hidden dark:block" style={style} />
      </>
    );
  }
  const src = team.imageDarkUrl || team.logoUrl;
  if (!src) {
    return (
      <span
        className="num flex items-center justify-center rounded-lg border border-(--ed-hair) bg-(--ed-canvas) text-[9px] font-medium text-(--ed-stone)"
        style={style}
      >
        {team.tag?.slice(0, 2) || '??'}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="shrink-0 object-contain" style={style} />;
}

function MatchScorecard({
  match,
  selectedTeamIds = [],
  visibleColumns = DEFAULT_MATCH_COLUMNS,
  isCollapsible = false,
  forceOpen,
  onToggleOpen,
  isAllStages = false,
}: {
  match: MatchLite & { stageName?: string };
  selectedTeamIds?: string[];
  visibleColumns?: MatchColumnKey[];
  isCollapsible?: boolean;
  forceOpen?: boolean;
  onToggleOpen?: () => void;
  isAllStages?: boolean;
}) {
  const [internalOpen, setInternalOpen] = React.useState(!isCollapsible);

  const isOpen = isCollapsible ? (forceOpen !== undefined ? forceOpen : internalOpen) : true;

  const toggle = () => {
    if (onToggleOpen) {
      onToggleOpen();
    } else {
      setInternalOpen((prev) => !prev);
    }
  };

  const completed = match.status === 'COMPLETED';

  // ── Sort table by Total Points (descending), then Rank (ascending) ──
  const results = [...match.teamResults].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return a.rank - b.rank;
  });

  const winner = results.find((r) => r.wwcd || r.rank === 1) ?? results[0];
  const fraggers = [...match.playerStats]
    .sort((a, b) => b.playerElims - a.playerElims || b.damage - a.damage)
    .slice(0, 4);

  const isClient = useIsClient();
  const localTime = formatLocalMatchTime(match.scheduledAt, isClient ? undefined : 'UTC');

  // Filter columns according to canonical MATCH_COLUMN_DEFS order (Bonus precedes Total)
  const activeCols = MATCH_COLUMN_DEFS.filter((d) => visibleColumns.includes(d.key));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-(--ed-surface) shadow-xs transition-all">
      {/* Match Header Bar (Clickable accordion trigger when collapsible) */}
      <div
        onClick={isCollapsible ? toggle : undefined}
        role={isCollapsible ? 'button' : undefined}
        tabIndex={isCollapsible ? 0 : undefined}
        aria-expanded={isCollapsible ? isOpen : undefined}
        onKeyDown={
          isCollapsible
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle();
                }
              }
            : undefined
        }
        className={`p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/60 border-b border-(--ed-hair) flex flex-wrap items-center justify-between gap-3 ${
          isCollapsible ? 'cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-900 transition-colors' : ''
        }`}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="num flex h-8 min-w-[2.5rem] px-2.5 items-center justify-center rounded-xl bg-(--ed-blue) text-white text-xs font-black shadow-xs">
            {isAllStages
              ? match.overallMatchNumber
                ? `Match ${match.overallMatchNumber}`
                : match.matchNumber
                ? `Match ${match.matchNumber}`
                : 'Match'
              : match.matchNumber
              ? `Match ${match.matchNumber}`
              : match.overallMatchNumber
              ? `#${match.overallMatchNumber}`
              : 'Match'}
          </span>

          {isAllStages && match.stageName && (
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              {match.stageName}
            </span>
          )}

          {!isAllStages && match.overallMatchNumber && match.matchNumber && match.overallMatchNumber !== match.matchNumber && (
            <span className="num text-xs font-bold text-slate-400">
              (Overall #{match.overallMatchNumber})
            </span>
          )}

          <MapChip map={match.mapName} />
        </div>

        {/* Collapsed Preview in List Mode: Winner Info */}
        {!isOpen && completed && winner && (
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Winner:</span>
            <TeamLogo team={winner.team} size={18} />
            <span className="font-bold text-slate-900 dark:text-white">{winner.team.name}</span>
            <span className="num font-black text-amber-600 dark:text-amber-400">({winner.totalPoints} pts)</span>
            {winner.wwcd && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500/15 text-amber-700 dark:text-amber-400">
                WWCD
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* User's Local Time Display (12h format) */}
          {localTime.time && (
            <span className="num text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>{localTime.date}, {localTime.time}</span>
            </span>
          )}

          {completed ? (
            <span className="num text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              Completed
            </span>
          ) : (
            <span
              className={`num text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                match.status === 'LIVE'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
            >
              {match.status === 'LIVE' && <Clock className="h-3 w-3 text-rose-500" />}
              {match.status === 'LIVE' ? 'LIVE NOW' : match.status}
            </span>
          )}

          {match.streamUrl && /^https?:\/\//i.test(match.streamUrl) && (
            <a
              href={match.streamUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-lg bg-rose-600 text-white px-3 py-1 text-xs font-bold uppercase hover:bg-rose-700 transition-colors shadow-xs"
            >
              <Tv className="h-3.5 w-3.5" /> Watch
            </a>
          )}

          {isCollapsible && (
            <span
              aria-hidden="true"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-(--ed-blue)' : ''
                }`}
              />
            </span>
          )}
        </div>
      </div>

      {/* Expanded Match Content */}
      {isOpen && (
        <>
          {/* Full Scorecard Table (Sorted by Total Points, then Rank; Admin Configured Columns) */}
          {results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-(--ed-hair) bg-(--ed-canvas) text-[11px] font-bold text-slate-500">
                    <th className="py-2 pl-4 pr-2 w-14 text-center">Rank</th>
                    <th className="py-3 px-3">Team</th>
                    {activeCols.map((def) => {
                      const isTotal = def.key === 'total';
                      return (
                        <th
                          key={def.key}
                          className={`num py-3 px-3 ${
                            isTotal
                              ? 'pl-3 pr-5 text-right font-black text-(--ed-blue)'
                              : 'text-center'
                          }`}
                        >
                          {def.short}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--ed-hair)">
                  {results.map((r) => {
                    const isWinner = r.wwcd || r.rank === 1;
                    const isSelectedTeam = selectedTeamIds.includes(r.team.id);

                    return (
                      <tr
                        key={r.id || r.team.id}
                        className={`transition-colors ${
                          isSelectedTeam
                            ? 'bg-(--ed-blue)/15 font-bold border-l-4 border-l-(--ed-blue)'
                            : isWinner
                            ? 'bg-amber-500/5 dark:bg-amber-500/10 font-medium'
                            : 'hover:bg-(--ed-canvas)'
                        }`}
                      >
                        <td className="num py-2 pl-4 pr-2 text-center">
                          <span
                            className={`num inline-flex h-6 w-6 items-center justify-center rounded-lg font-black text-xs ${
                              r.rank === 1
                                ? 'bg-amber-500 text-white shadow-xs'
                                : r.rank <= 3
                                ? 'bg-(--ed-blue)/15 text-(--ed-blue)'
                                : 'text-slate-500 bg-slate-100 dark:bg-slate-800'
                            }`}
                          >
                            {r.rank}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="flex items-center gap-2.5">
                            <TeamLogo team={r.team} size={20} />
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {r.team.name}
                            </span>
                            {isWinner && (
                              <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-700 dark:text-amber-400">
                                WWCD
                              </span>
                            )}
                          </span>
                        </td>

                        {/* Metric Columns in Canonical Order (Place -> Elims -> Bonus -> Stats -> Total) */}
                        {activeCols.map((def) => {
                          const colKey = def.key;
                          let val: React.ReactNode = 0;
                          if (colKey === 'place') val = r.placePoints;
                          else if (colKey === 'elims') val = r.elimsPoints;
                          else if (colKey === 'bonus') val = r.bonusPoints || 0;
                          else if (colKey === 'damage') val = Math.round(r.damage).toLocaleString('en-US');
                          else if (colKey === 'damageReceived') val = Math.round(r.damageReceived || 0).toLocaleString('en-US');
                          else if (colKey === 'healing') val = Math.round(r.healing || 0).toLocaleString('en-US');
                          else if (colKey === 'headshots') val = r.headshots || 0;
                          else if (colKey === 'assists') val = r.assists || 0;
                          else if (colKey === 'knockouts') val = r.knockouts || 0;
                          else if (colKey === 'longestElim') val = `${Math.round(r.longestElim || 0)}m`;
                          else if (colKey === 'vehicleElims') val = r.vehicleElims || 0;
                          else if (colKey === 'grenadeElims') val = r.grenadeElims || 0;
                          else if (colKey === 'smokesUsed') val = r.smokesUsed || 0;
                          else if (colKey === 'grenadesUsed') val = r.grenadesUsed || 0;
                          else if (colKey === 'molotovsUsed') val = r.molotovsUsed || 0;
                          else if (colKey === 'flashUsed') val = r.flashUsed || 0;
                          else if (colKey === 'airdrops') val = r.airdrops || 0;
                          else if (colKey === 'rescues') val = r.rescues || 0;
                          else if (colKey === 'total') val = r.totalPoints;

                          const isTotal = colKey === 'total';

                          return (
                            <td
                              key={colKey}
                              className={`num py-3 ${
                                isTotal
                                  ? 'pl-3 pr-5 text-right text-sm font-black text-(--ed-blue)'
                                  : 'px-3 text-center text-slate-600 dark:text-slate-300 font-semibold'
                              }`}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-12 text-center text-sm text-(--ed-stone)">
              Scorecard entry is pending for this match.
            </p>
          )}

          {/* Top Performers */}
          {fraggers.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-(--ed-hair) bg-slate-50 dark:bg-slate-900/40 px-5 py-3.5">
              <span className="ed-label mr-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Top Fraggers:
              </span>
              {fraggers.map((f) => (
                <span
                  key={f.id}
                  className="ed-chip text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-200">{f.player.ign}</span>
                  <span className="num font-black text-rose-600 dark:text-rose-400">
                    {f.playerElims} Kills
                  </span>
                  {f.damage > 0 && (
                    <span className="num text-(--ed-stone) font-medium">
                      ({Math.round(f.damage)} dmg)
                    </span>
                  )}
                  {f.isMvp && (
                    <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-1 text-[9px] font-black uppercase text-amber-700 dark:text-amber-400">
                      MVP
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Dedicated Match History for a Single Selected Team
 */
function SingleTeamMatchHistoryTable({
  team,
  matches,
  visibleColumns = DEFAULT_MATCH_COLUMNS,
  onSelectMatch,
}: {
  team: TournamentTeamInfo;
  matches: (MatchLite & { stageName: string })[];
  visibleColumns?: MatchColumnKey[];
  onSelectMatch: (matchId: string) => void;
}) {
  const isClient = useIsClient();
  const teamMatches: {
    match: MatchLite & { stageName: string };
    result: TeamResultLite;
    topFragger: PlayerStatLite | undefined;
  }[] = [];

  for (const m of matches) {
    const result = m.teamResults.find((r) => r.team.id === team.id);
    if (!result) continue;
    const topFragger = m.playerStats
      .filter((p) => p.team?.id === team.id || p.team?.tag === team.tag)
      .sort((a, b) => b.playerElims - a.playerElims || b.damage - a.damage)[0];
    teamMatches.push({ match: m, result, topFragger });
  }

  const totalPts = teamMatches.reduce((sum, item) => sum + item.result.totalPoints, 0);
  const totalKills = teamMatches.reduce((sum, item) => sum + item.result.elimsPoints, 0);
  const wwcdCount = teamMatches.filter((item) => item.result.wwcd || item.result.rank === 1).length;
  const avgPts = teamMatches.length > 0 ? (totalPts / teamMatches.length).toFixed(1) : '0';

  const activeCols = MATCH_COLUMN_DEFS.filter((d) => visibleColumns.includes(d.key));

  return (
    <div className="space-y-4">
      {/* Team Aggregated Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Matches</span>
          <span className="num text-xl font-black text-slate-900 dark:text-white">{teamMatches.length}</span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 block">WWCDs</span>
          <span className="num text-xl font-black text-amber-700 dark:text-amber-400">{wwcdCount}</span>
        </div>

        <div className="p-4 rounded-2xl bg-(--ed-blue)/10 border border-blue-500/20 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-(--ed-blue) block">Total Points</span>
          <span className="num text-xl font-black text-(--ed-blue)">{totalPts}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Avg Points/M</span>
          <span className="num text-xl font-black text-slate-900 dark:text-white">{avgPts}</span>
        </div>

        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 block">Total Kills</span>
          <span className="num text-xl font-black text-rose-700 dark:text-rose-400">{totalKills}</span>
        </div>
      </div>

      {/* Match by Match Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <TeamLogo team={team} size={24} />
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">{team.name} — Match Results</h3>
              <p className="text-[11px] text-slate-500">Every match played by {team.name} (Latest match first)</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-(--ed-hair) bg-(--ed-canvas) text-[11px] font-bold text-slate-500">
                <th className="py-2 pl-4 pr-2">Match</th>
                <th className="py-3 px-3">Stage</th>
                <th className="py-3 px-3">Time (Local)</th>
                <th className="py-3 px-3 text-center">Rank</th>
                {activeCols.map((def) => {
                  const isTotal = def.key === 'total';
                  return (
                    <th
                      key={def.key}
                      className={`num py-3 px-3 ${
                        isTotal
                          ? 'text-right font-black text-(--ed-blue) pr-5'
                          : 'text-center'
                      }`}
                    >
                      {def.short}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--ed-hair)">
              {teamMatches.map(({ match: m, result: r }) => {
                const isWinner = r.wwcd || r.rank === 1;
                const local = formatLocalMatchTime(m.scheduledAt, isClient ? undefined : 'UTC');

                return (
                  <tr
                    key={m.id}
                    onClick={() => onSelectMatch(m.id)}
                    className={`transition-colors cursor-pointer hover:bg-(--ed-blue)/5 ${
                      isWinner ? 'bg-amber-500/5 dark:bg-amber-500/10 font-medium' : ''
                    }`}
                  >
                    <td className="py-2 pl-4 pr-2 font-black text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <span className="num px-2 py-0.5 rounded-md bg-(--ed-blue)/10 text-(--ed-blue) font-black">
                          {m.matchNumber ? `M${m.matchNumber}` : `#${m.overallMatchNumber || ''}`}
                        </span>
                        {m.mapName && <span className="text-[10px] text-slate-400 font-normal">({m.mapName})</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-bold">{m.stageName}</td>
                    <td className="py-3 px-3 text-slate-500 font-medium whitespace-nowrap">
                      {local.time ? `${local.date}, ${local.time}` : m.matchTime || '—'}
                    </td>
                    <td className="num py-3 px-3 text-center">
                      <span
                        className={`num inline-flex h-5 w-5 items-center justify-center rounded font-black text-xs ${
                          r.rank === 1
                            ? 'bg-amber-500 text-white shadow-xs'
                            : r.rank <= 3
                            ? 'bg-(--ed-blue)/15 text-(--ed-blue)'
                            : 'text-slate-500'
                        }`}
                      >
                        {r.rank}
                      </span>
                    </td>

                    {/* Admin Configured Metric Columns */}
                    {activeCols.map((def) => {
                      const colKey = def.key;
                      let val: React.ReactNode = 0;
                      if (colKey === 'place') val = r.placePoints;
                      else if (colKey === 'elims') val = r.elimsPoints;
                      else if (colKey === 'bonus') val = r.bonusPoints || 0;
                      else if (colKey === 'damage') val = Math.round(r.damage).toLocaleString('en-US');
                      else if (colKey === 'damageReceived') val = Math.round(r.damageReceived || 0).toLocaleString('en-US');
                      else if (colKey === 'healing') val = Math.round(r.healing || 0).toLocaleString('en-US');
                      else if (colKey === 'headshots') val = r.headshots || 0;
                      else if (colKey === 'assists') val = r.assists || 0;
                      else if (colKey === 'knockouts') val = r.knockouts || 0;
                      else if (colKey === 'longestElim') val = `${Math.round(r.longestElim || 0)}m`;
                      else if (colKey === 'vehicleElims') val = r.vehicleElims || 0;
                      else if (colKey === 'grenadeElims') val = r.grenadeElims || 0;
                      else if (colKey === 'smokesUsed') val = r.smokesUsed || 0;
                      else if (colKey === 'grenadesUsed') val = r.grenadesUsed || 0;
                      else if (colKey === 'molotovsUsed') val = r.molotovsUsed || 0;
                      else if (colKey === 'flashUsed') val = r.flashUsed || 0;
                      else if (colKey === 'airdrops') val = r.airdrops || 0;
                      else if (colKey === 'rescues') val = r.rescues || 0;
                      else if (colKey === 'total') val = r.totalPoints;

                      const isTotal = colKey === 'total';

                      return (
                        <td
                          key={colKey}
                          className={`num py-3 px-3 ${
                            isTotal
                              ? 'text-right text-sm font-black text-(--ed-blue) pr-5'
                              : 'text-center text-slate-600 dark:text-slate-300 font-semibold'
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Compare Mode Table for 2–4 Selected Teams
 */
function MultiTeamCompareTable({
  teams,
  matches,
  visibleColumns = DEFAULT_MATCH_COLUMNS,
  onSelectMatch,
}: {
  teams: TournamentTeamInfo[];
  matches: (MatchLite & { stageName: string })[];
  visibleColumns?: MatchColumnKey[];
  onSelectMatch: (matchId: string) => void;
}) {
  const isClient = useIsClient();
  const teamIds = new Set(teams.map((t) => t.id));

  // Compute aggregated stats for each team across the matches
  const teamAggregates = teams.map((team) => {
    let matchCount = 0;
    let wwcdCount = 0;
    let totalPts = 0;
    let totalKills = 0;
    let totalDamage = 0;

    for (const m of matches) {
      const res = m.teamResults.find((r) => r.team.id === team.id);
      if (res) {
        matchCount++;
        if (res.wwcd || res.rank === 1) wwcdCount++;
        totalPts += res.totalPoints;
        totalKills += res.elimsPoints;
        totalDamage += res.damage;
      }
    }

    const avgPts = matchCount > 0 ? (totalPts / matchCount).toFixed(1) : '0';

    return {
      team,
      matchCount,
      wwcdCount,
      totalPts,
      totalKills,
      totalDamage,
      avgPts,
    };
  }).sort((a, b) => b.totalPts - a.totalPts);

  const activeCols = MATCH_COLUMN_DEFS.filter((d) => visibleColumns.includes(d.key));

  // Group matches where at least one of the compared teams played
  const matchComparisonRows: {
    match: MatchLite & { stageName: string };
    teamResults: {
      team: TournamentTeamInfo;
      result: TeamResultLite;
      topFragger?: PlayerStatLite;
    }[];
    winnerTeamId?: string;
  }[] = [];

  for (const m of matches) {
    const resultsForTeams: {
      team: TournamentTeamInfo;
      result: TeamResultLite;
      topFragger?: PlayerStatLite;
    }[] = [];

    for (const r of m.teamResults) {
      if (teamIds.has(r.team.id)) {
        const topFragger = m.playerStats
          .filter((p) => p.team?.id === r.team.id || p.team?.tag === r.team.tag)
          .sort((a, b) => b.playerElims - a.playerElims || b.damage - a.damage)[0];
        resultsForTeams.push({ team: r.team, result: r, topFragger });
      }
    }

    if (resultsForTeams.length > 0) {
      // Sort results by totalPoints desc within this match
      resultsForTeams.sort((a, b) => b.result.totalPoints - a.result.totalPoints || a.result.rank - b.result.rank);
      const winner = resultsForTeams[0]?.result?.wwcd || resultsForTeams[0]?.result?.rank === 1 ? resultsForTeams[0]?.team?.id : resultsForTeams[0]?.team?.id;

      matchComparisonRows.push({
        match: m,
        teamResults: resultsForTeams,
        winnerTeamId: winner,
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Head-to-Head Comparison Cards (2 to 4 Teams) ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-(--ed-blue)" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Head-to-Head Overview ({teams.length} Teams Compared)
          </h3>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-${Math.min(teams.length, 4)} gap-4`}>
          {teamAggregates.map((agg, idx) => (
            <div
              key={agg.team.id}
              className={`p-4 rounded-2xl border transition-all ${
                idx === 0
                  ? 'bg-amber-500/10 border-amber-500/30 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <TeamLogo team={agg.team} size={26} />
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white">{agg.team.name}</h4>
                    <span className="text-[10px] text-slate-400">{agg.matchCount} Matches</span>
                  </div>
                </div>
                <span
                  className={`num px-2 py-0.5 rounded-lg text-xs font-black ${
                    idx === 0
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  #{idx + 1}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Pts</span>
                  <span className="num font-black text-lg text-(--ed-blue)">
                    {agg.totalPts}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">WWCDs</span>
                  <span className="num font-black text-lg text-amber-600 dark:text-amber-400">
                    {agg.wwcdCount}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Kills</span>
                  <span className="num font-bold text-sm text-rose-600 dark:text-rose-400">
                    {agg.totalKills}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Avg Pts/M</span>
                  <span className="num font-bold text-sm text-slate-700 dark:text-slate-200">
                    {agg.avgPts}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Head-to-Head Match Comparison Table ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-0">
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-(--ed-blue)" />
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Match-by-Match Comparison</h3>
              <p className="text-[11px] text-slate-500">Compare scores and rankings per match (Latest match first)</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-(--ed-hair) bg-(--ed-canvas) text-[11px] font-bold text-slate-500">
                <th className="py-2 pl-4 pr-2 w-28">Match</th>
                <th className="py-3 px-3">Team</th>
                <th className="py-3 px-3 text-center">Match Rank</th>
                {activeCols.map((def) => {
                  const isTotal = def.key === 'total';
                  return (
                    <th
                      key={def.key}
                      className={`num py-3 px-3 ${
                        isTotal
                          ? 'text-right font-black text-(--ed-blue) pr-5'
                          : 'text-center'
                      }`}
                    >
                      {def.short}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--ed-hair)">
              {matchComparisonRows.map(({ match: m, teamResults }) => {
                const local = formatLocalMatchTime(m.scheduledAt, isClient ? undefined : 'UTC');

                return teamResults.map(({ team: t, result: r }, idx) => {
                  const isMatchWinner = r.wwcd || r.rank === 1;
                  const isTopInComparison = idx === 0 && teamResults.length > 1;
                  const isFirstRowOfMatch = idx === 0;

                  return (
                    <tr
                      key={`${m.id}-${t.id}`}
                      onClick={() => onSelectMatch(m.id)}
                      className={`transition-colors cursor-pointer hover:bg-(--ed-blue)/5 ${
                        isTopInComparison
                          ? 'bg-blue-500/5 dark:bg-(--ed-blue)/10'
                          : isMatchWinner
                          ? 'bg-amber-500/5 dark:bg-amber-500/10'
                          : ''
                      } ${isFirstRowOfMatch ? 'border-t-2 border-slate-200 dark:border-slate-800' : ''}`}
                    >
                      {/* Match Name only on first row of each match */}
                      <td className="py-2 pl-4 pr-2 font-black text-slate-900 dark:text-white align-middle">
                        {isFirstRowOfMatch ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="num px-2 py-0.5 rounded-md bg-(--ed-blue) text-white font-black text-xs shadow-2xs">
                                {m.matchNumber ? `M${m.matchNumber}` : `#${m.overallMatchNumber || ''}`}
                              </span>
                              {m.mapName && <span className="text-[10px] text-slate-400 font-bold">({m.mapName})</span>}
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              {local.time ? `${local.date}, ${local.time}` : m.stageName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 dark:text-slate-700 pl-3">↳</span>
                        )}
                      </td>

                      {/* Team Name */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <TeamLogo team={t} size={20} />
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{t.name}</span>
                          {isMatchWinner && (
                            <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-700 dark:text-amber-400">
                              WWCD
                            </span>
                          )}
                          {isTopInComparison && !isMatchWinner && (
                            <span className="rounded-md bg-(--ed-blue)/15 text-(--ed-blue) px-1.5 py-0.5 text-[9px] font-black uppercase">
                              Leader
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rank in Match */}
                      <td className="num py-3 px-3 text-center">
                        <span
                          className={`num inline-flex h-5 w-5 items-center justify-center rounded font-black text-xs ${
                            r.rank === 1
                              ? 'bg-amber-500 text-white shadow-xs'
                              : r.rank <= 3
                              ? 'bg-(--ed-blue)/15 text-(--ed-blue)'
                              : 'text-slate-500'
                          }`}
                        >
                          {r.rank}
                        </span>
                      </td>

                      {/* Admin Configured Metric Columns */}
                      {activeCols.map((def) => {
                        const colKey = def.key;
                        let val: React.ReactNode = 0;
                        if (colKey === 'place') val = r.placePoints;
                        else if (colKey === 'elims') val = r.elimsPoints;
                        else if (colKey === 'bonus') val = r.bonusPoints || 0;
                        else if (colKey === 'damage') val = Math.round(r.damage).toLocaleString('en-US');
                        else if (colKey === 'damageReceived') val = Math.round(r.damageReceived || 0).toLocaleString('en-US');
                        else if (colKey === 'healing') val = Math.round(r.healing || 0).toLocaleString('en-US');
                        else if (colKey === 'headshots') val = r.headshots || 0;
                        else if (colKey === 'assists') val = r.assists || 0;
                        else if (colKey === 'knockouts') val = r.knockouts || 0;
                        else if (colKey === 'longestElim') val = `${Math.round(r.longestElim || 0)}m`;
                        else if (colKey === 'vehicleElims') val = r.vehicleElims || 0;
                        else if (colKey === 'grenadeElims') val = r.grenadeElims || 0;
                        else if (colKey === 'smokesUsed') val = r.smokesUsed || 0;
                        else if (colKey === 'grenadesUsed') val = r.grenadesUsed || 0;
                        else if (colKey === 'molotovsUsed') val = r.molotovsUsed || 0;
                        else if (colKey === 'flashUsed') val = r.flashUsed || 0;
                        else if (colKey === 'airdrops') val = r.airdrops || 0;
                        else if (colKey === 'rescues') val = r.rescues || 0;
                        else if (colKey === 'total') val = r.totalPoints;

                        const isTotal = colKey === 'total';

                        return (
                          <td
                            key={colKey}
                            className={`num py-3 px-3 ${
                              isTotal
                                ? 'text-right text-sm font-black text-(--ed-blue) pr-5'
                                : 'text-center text-slate-600 dark:text-slate-300 font-semibold'
                            }`}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TournamentMatchesPanelInner({
  stageGroups,
  matchColumns = DEFAULT_MATCH_COLUMNS,
}: {
  stageGroups: StageGroup[];
  matchColumns?: MatchColumnKey[];
}) {
  const params = useSearchParams();
  const queryMatchId = params.get('matchId');

  // ── 1. Sort Stages Chronologically Descending (Latest Stage First) ──
  const sortedStageGroups = React.useMemo(() => {
    return [...stageGroups].sort((a, b) => {
      const latestA = Math.max(
        0,
        ...a.matches.map((m) => new Date(m.scheduledAt).getTime() || 0)
      );
      const latestB = Math.max(
        0,
        ...b.matches.map((m) => new Date(m.scheduledAt).getTime() || 0)
      );
      return latestB - latestA;
    });
  }, [stageGroups]);

  // Default to the latest stage
  const defaultStageName = sortedStageGroups[0]?.stageName || 'ALL';

  const [activeStage, setActiveStage] = React.useState<string>(defaultStageName);
  const [selectedMap, setSelectedMap] = React.useState<string>('ALL');

  // Multi-select Team Filter IDs (Maximum 4 teams)
  const [selectedTeamIds, setSelectedTeamIds] = React.useState<string[]>([]);

  // View Mode for Team Filter: 'team_summary' vs 'full_cards'
  const [teamViewMode, setTeamViewMode] = React.useState<'team_summary' | 'full_cards'>('team_summary');

  // Multi-match Collapse / Expand All state for long list view
  const [expandedMatchIds, setExpandedMatchIds] = React.useState<Record<string, boolean>>({});
  const [isAllCollapsed, setIsAllCollapsed] = React.useState(false);

  // Pagination for View Mode C (Show All Matches long list)
  const MATCHES_PER_PAGE = 10;
  const [matchesPage, setMatchesPage] = React.useState(1);

  React.useEffect(() => {
    setMatchesPage(1);
  }, [activeStage, selectedMap, selectedTeamIds]);

  // Floating Popover state (attached directly to button)
  const [showTeamPopover, setShowTeamPopover] = React.useState(false);
  const [teamSearch, setTeamSearch] = React.useState('');
  const popoverRef = React.useRef<HTMLDivElement>(null);

  // Close floating popover when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowTeamPopover(false);
      }
    }
    if (showTeamPopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTeamPopover]);

  // Active Stage Matches sorted Chronologically (M1, M2, M3... MN) for Quick-Select Toolbar
  const stageMatchesChronological = React.useMemo(() => {
    let list: (MatchLite & { stageName: string })[] = [];

    if (activeStage === 'ALL') {
      // In All Stages: Flatten and sort by overall chronology (earliest first)
      list = stageGroups.flatMap((g) =>
        g.matches.map((m) => ({ ...m, stageName: g.stageName }))
      );
    } else {
      const grp = stageGroups.find((g) => g.stageName === activeStage);
      if (grp) {
        list = grp.matches.map((m) => ({ ...m, stageName: grp.stageName }));
      }
    }

    if (selectedMap !== 'ALL') {
      list = list.filter((m) => m.mapName?.toLowerCase() === selectedMap.toLowerCase());
    }

    if (selectedTeamIds.length > 0) {
      list = list.filter((m) => m.teamResults.some((r) => selectedTeamIds.includes(r.team.id)));
    }

    // Sort: Earliest First (M1 -> MN)
    return list.sort((a, b) => {
      const timeA = new Date(a.scheduledAt).getTime() || 0;
      const timeB = new Date(b.scheduledAt).getTime() || 0;
      if (timeA !== timeB) return timeA - timeB;

      const numA = Number(activeStage === 'ALL' ? a.overallMatchNumber || a.matchNumber : a.matchNumber || a.overallMatchNumber || 0);
      const numB = Number(activeStage === 'ALL' ? b.overallMatchNumber || b.matchNumber : b.matchNumber || b.overallMatchNumber || 0);
      return numA - numB;
    });
  }, [stageGroups, activeStage, selectedMap, selectedTeamIds]);

  // Active Stage Matches sorted Latest Match First (for default pick and list view)
  const stageMatchesLatestFirst = React.useMemo(() => {
    return [...stageMatchesChronological].reverse();
  }, [stageMatchesChronological]);

  // Selected Match ID inside the active stage (defaults to latest match)
  const [selectedMatchId, setSelectedMatchId] = React.useState<string | 'ALL'>(() => {
    if (queryMatchId) return queryMatchId;
    return stageMatchesLatestFirst[0]?.id || 'ALL';
  });

  // Whenever active stage or filters change, default to the latest match
  React.useEffect(() => {
    if (stageMatchesLatestFirst.length > 0 && selectedMatchId !== 'ALL') {
      if (!stageMatchesLatestFirst.some((m) => m.id === selectedMatchId)) {
        setSelectedMatchId(stageMatchesLatestFirst[0].id);
      }
    }
  }, [stageMatchesLatestFirst, selectedMatchId]);

  // Available Maps
  const availableMaps = React.useMemo(() => {
    const rawList =
      activeStage === 'ALL'
        ? sortedStageGroups.flatMap((g) => g.matches)
        : sortedStageGroups.find((g) => g.stageName === activeStage)?.matches || [];
    return [...new Set(rawList.map((m) => m.mapName).filter(Boolean) as string[])].sort();
  }, [sortedStageGroups, activeStage]);

  // All Unique Teams in Tournament
  const allTeams = React.useMemo(() => {
    const map = new Map<string, TournamentTeamInfo>();
    for (const g of sortedStageGroups) {
      for (const m of g.matches) {
        for (const r of m.teamResults) {
          const t = r.team;
          const existing = map.get(t.id) || { ...t, matchCount: 0 };
          existing.matchCount = (existing.matchCount || 0) + 1;
          map.set(t.id, existing);
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [sortedStageGroups]);

  const selectedTeams = React.useMemo(() => {
    if (selectedTeamIds.length === 0) return [];
    return allTeams.filter((t) => selectedTeamIds.includes(t.id));
  }, [allTeams, selectedTeamIds]);

  // Selected Match Object
  const currentMatch = React.useMemo(() => {
    if (selectedMatchId === 'ALL') return null;
    return stageMatchesLatestFirst.find((m) => m.id === selectedMatchId) || stageMatchesLatestFirst[0] || null;
  }, [selectedMatchId, stageMatchesLatestFirst]);

  const currentMatchIndex = React.useMemo(() => {
    if (!currentMatch) return -1;
    return stageMatchesLatestFirst.findIndex((m) => m.id === currentMatch.id);
  }, [currentMatch, stageMatchesLatestFirst]);

  // Exact Previous and Next Matches for Navigation (using actual match labels!)
  const prevMatch = currentMatchIndex < stageMatchesLatestFirst.length - 1 ? stageMatchesLatestFirst[currentMatchIndex + 1] : null;
  const nextMatch = currentMatchIndex > 0 ? stageMatchesLatestFirst[currentMatchIndex - 1] : null;

  const isAllStages = activeStage === 'ALL';

  const prevMatchLabel = prevMatch
    ? `${
        isAllStages
          ? prevMatch.overallMatchNumber
            ? `Match ${prevMatch.overallMatchNumber}`
            : `#${stageMatchesChronological.findIndex((x) => x.id === prevMatch.id) + 1}`
          : prevMatch.matchNumber
          ? `Match ${prevMatch.matchNumber}`
          : `Match ${stageMatchesChronological.findIndex((x) => x.id === prevMatch.id) + 1}`
      }${prevMatch.mapName ? ` (${prevMatch.mapName})` : ''}`
    : '';

  const nextMatchLabel = nextMatch
    ? `${
        isAllStages
          ? nextMatch.overallMatchNumber
            ? `Match ${nextMatch.overallMatchNumber}`
            : `#${stageMatchesChronological.findIndex((x) => x.id === nextMatch.id) + 1}`
          : nextMatch.matchNumber
          ? `Match ${nextMatch.matchNumber}`
          : `Match ${stageMatchesChronological.findIndex((x) => x.id === nextMatch.id) + 1}`
      }${nextMatch.mapName ? ` (${nextMatch.mapName})` : ''}`
    : '';

  // Master Collapse / Expand All toggle
  const toggleCollapseAll = () => {
    if (isAllCollapsed) {
      // Expand all
      const map: Record<string, boolean> = {};
      for (const m of stageMatchesLatestFirst) {
        map[m.id] = true;
      }
      setExpandedMatchIds(map);
      setIsAllCollapsed(false);
    } else {
      // Collapse all
      const map: Record<string, boolean> = {};
      for (const m of stageMatchesLatestFirst) {
        map[m.id] = false;
      }
      setExpandedMatchIds(map);
      setIsAllCollapsed(true);
    }
  };

  const toggleSingleMatchAccordion = (matchId: string) => {
    setExpandedMatchIds((prev) => {
      const current = prev[matchId] !== undefined ? prev[matchId] : true;
      return { ...prev, [matchId]: !current };
    });
  };

  // Enforce Max 4 Teams Selection
  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeamIds((prev) => {
      if (prev.includes(teamId)) {
        return prev.filter((id) => id !== teamId);
      }
      if (prev.length >= 4) {
        return prev; // Maximum 4 teams limit
      }
      return [...prev, teamId];
    });
  };

  return (
    <div className="space-y-6 pb-28">
      {/* ── 1. Clean Stage Switcher (Wrapped Tabs on Desktop, Dropdown on Mobile) ── */}
      {sortedStageGroups.length > 0 && (
        <div className="space-y-2">
          {/* Desktop Wrapped Pill Tabs */}
          <div className="hidden sm:flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
            {sortedStageGroups.map((g) => {
              const isStageActive = activeStage === g.stageName;
              return (
                <button
                  key={g.stageName}
                  type="button"
                  onClick={() => {
                    setActiveStage(g.stageName);
                    setSelectedMap('ALL');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                    isStageActive
                      ? 'bg-white dark:bg-slate-800 text-(--ed-blue) shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span>{g.stageName}</span>
                </button>
              );
            })}

            {sortedStageGroups.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setActiveStage('ALL');
                  setSelectedMap('ALL');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeStage === 'ALL'
                    ? 'bg-white dark:bg-slate-800 text-(--ed-blue) shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>All Stages</span>
              </button>
            )}
          </div>

          {/* Mobile Clean Select Dropdown */}
          <div className="sm:hidden">
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Select Stage:</label>
            <select
              value={activeStage}
              onChange={(e) => {
                setActiveStage(e.target.value);
                setSelectedMap('ALL');
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-xs text-slate-900 dark:text-white"
            >
              {sortedStageGroups.map((g) => (
                <option key={g.stageName} value={g.stageName}>
                  {g.stageName}
                </option>
              ))}
              <option value="ALL">All Stages Combined</option>
            </select>
          </div>
        </div>
      )}

      {/* ── 2. Match Quick-Select Buttons (Clean Header, No Green Dots, Show All Button) ── */}
      {stageMatchesLatestFirst.length > 0 && (
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-(--ed-blue)" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Select Matches
              </span>
            </div>

            {/* Show All / Single Match Toggle */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setSelectedMatchId(
                    selectedMatchId === 'ALL' ? stageMatchesLatestFirst[0]?.id : 'ALL'
                  )
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border cursor-pointer flex items-center gap-1.5 ${
                  selectedMatchId === 'ALL'
                    ? 'bg-(--ed-blue) border-(--ed-blue) text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{selectedMatchId === 'ALL' ? 'Showing All Matches' : 'Show All Matches'}</span>
              </button>
            </div>
          </div>

          {/* Quick-Click Match Buttons (Chronological Order M1 -> MN) */}
          <div className="flex flex-wrap gap-1.5 overflow-x-auto max-h-36 py-1">
            {stageMatchesChronological.map((m, idx) => {
              const isSelected = selectedMatchId === m.id;
              const winner = m.teamResults.find((r) => r.wwcd || r.rank === 1);
              const label = isAllStages
                ? m.overallMatchNumber
                  ? `M${m.overallMatchNumber}`
                  : `M${idx + 1}`
                : m.matchNumber
                ? `M${m.matchNumber}`
                : `M${idx + 1}`;

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMatchId(m.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-(--ed-blue) border-(--ed-blue) text-white shadow-md scale-105 z-10'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-(--ed-blue)'
                  }`}
                >
                  <span>{label}</span>
                  {m.mapName && (
                    <span className={`text-[10px] font-normal ${isSelected ? 'opacity-80' : 'text-slate-400'}`}>
                      ({m.mapName})
                    </span>
                  )}
                  {winner?.wwcd && isSelected && (
                    <Trophy className="w-3 h-3 text-amber-300" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. Sub-Filters & List View Controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Map Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Map:
          </span>
          <button
            type="button"
            onClick={() => setSelectedMap('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${
              selectedMap === 'ALL'
                ? 'bg-(--ed-blue) border-(--ed-blue) text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
            }`}
          >
            All Maps
          </button>
          {availableMaps.map((mName) => (
            <button
              key={mName}
              type="button"
              onClick={() => setSelectedMap(selectedMap === mName ? 'ALL' : mName)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${
                selectedMap === mName
                  ? 'bg-(--ed-blue) border-(--ed-blue) text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
              }`}
            >
              {mName}
            </button>
          ))}
        </div>

        {/* In "Show All List" Mode: Collapse All / Expand All Toggle */}
        {selectedMatchId === 'ALL' && stageMatchesLatestFirst.length > 1 && (
          <button
            type="button"
            onClick={toggleCollapseAll}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            {isAllCollapsed ? (
              <>
                <ChevronsUpDown className="w-3.5 h-3.5 text-(--ed-blue)" />
                <span>Expand All Scorecards</span>
              </>
            ) : (
              <>
                <ChevronsDownUp className="w-3.5 h-3.5 text-(--ed-blue)" />
                <span>Collapse All Scorecards</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* ── 4. Active Team Filter Banner with View Mode Selector ── */}
      {selectedTeams.length > 0 && (
        <div className="p-4 rounded-2xl bg-(--ed-blue)/10 border border-(--ed-blue)/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {selectedTeams.length === 1 ? (
              <TeamLogo team={selectedTeams[0]} size={28} />
            ) : (
              <div className="p-2 rounded-xl bg-(--ed-blue) text-white shadow-xs">
                <Scale className="w-4 h-4" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  {selectedTeams.length === 1
                    ? selectedTeams[0].name
                    : `Comparing ${selectedTeams.length} Teams`}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-(--ed-blue) text-white text-[10px] font-black uppercase">
                  {selectedTeams.length === 1 ? 'Team Filter' : 'Compare Mode'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {selectedTeams.length === 1
                  ? `Showing results for ${selectedTeams[0].name}`
                  : `Comparing: ${selectedTeams.map((t) => t.name).join(' vs ')}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Single Consolidated Table vs Full 16-Team Cards */}
            <div className="p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center gap-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setTeamViewMode('team_summary')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  teamViewMode === 'team_summary'
                    ? 'bg-(--ed-blue) text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                {selectedTeams.length === 1 ? <TableIcon className="w-3.5 h-3.5" /> : <Scale className="w-3.5 h-3.5" />}
                <span>{selectedTeams.length === 1 ? 'Team Match Table' : 'Compare Table'}</span>
              </button>

              <button
                type="button"
                onClick={() => setTeamViewMode('full_cards')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  teamViewMode === 'full_cards'
                    ? 'bg-(--ed-blue) text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Full Match Cards</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTeamIds([])}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-rose-600 cursor-pointer shadow-2xs"
              title="Clear Team Filter"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── 5. Main Content Area ── */}
      {selectedTeams.length === 1 && teamViewMode === 'team_summary' ? (
        /* View Mode A1: Single Selected Team Match Table */
        <SingleTeamMatchHistoryTable
          team={selectedTeams[0]}
          matches={stageMatchesLatestFirst}
          visibleColumns={matchColumns}
          onSelectMatch={(mId) => {
            setSelectedMatchId(mId);
            setTeamViewMode('full_cards');
          }}
        />
      ) : selectedTeams.length > 1 && teamViewMode === 'team_summary' ? (
        /* View Mode A2: Multi-Team Compare Table (2 to 4 Teams) */
        <MultiTeamCompareTable
          teams={selectedTeams}
          matches={stageMatchesLatestFirst}
          visibleColumns={matchColumns}
          onSelectMatch={(mId) => {
            setSelectedMatchId(mId);
            setTeamViewMode('full_cards');
          }}
        />
      ) : selectedMatchId !== 'ALL' && currentMatch ? (
        /* View Mode B: Focused Single Match Card with Exact Match Number Navigation */
        <div className="space-y-4">
          {/* Navigation Bar with Actual Match Numbers */}
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-(--ed-hair)">
            <button
              type="button"
              disabled={!prevMatch}
              onClick={() => {
                if (prevMatch) {
                  setSelectedMatchId(prevMatch.id);
                }
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-30 flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 shadow-2xs transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-(--ed-blue)" />
              <span>{prevMatch ? prevMatchLabel : 'Start'}</span>
            </button>

            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {isAllStages
                ? currentMatch.overallMatchNumber
                  ? `Overall Match ${currentMatch.overallMatchNumber}`
                  : `Match ${currentMatch.matchNumber || ''}`
                : currentMatch.matchNumber
                ? `Match ${currentMatch.matchNumber}`
                : `#${currentMatch.overallMatchNumber || ''}`}
              {currentMatch.mapName ? ` (${currentMatch.mapName})` : ''}
            </span>

            <button
              type="button"
              disabled={!nextMatch}
              onClick={() => {
                if (nextMatch) {
                  setSelectedMatchId(nextMatch.id);
                }
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-30 flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 shadow-2xs transition-colors"
            >
              <span>{nextMatch ? nextMatchLabel : 'End'}</span>
              <ChevronRight className="w-4 h-4 text-(--ed-blue)" />
            </button>
          </div>

          <MatchScorecard
            match={currentMatch}
            selectedTeamIds={selectedTeamIds}
            visibleColumns={matchColumns}
            isCollapsible={false}
            isAllStages={isAllStages}
          />
        </div>
      ) : stageMatchesLatestFirst.length > 0 ? (
        /* View Mode C: Full Match List with Pagination & Expand / Collapse Support */
        <div className="space-y-4">
          {(() => {
            const totalMatchesPages = Math.max(1, Math.ceil(stageMatchesLatestFirst.length / MATCHES_PER_PAGE));
            const start = (matchesPage - 1) * MATCHES_PER_PAGE;
            const paginatedMatches = stageMatchesLatestFirst.slice(start, start + MATCHES_PER_PAGE);

            return (
              <>
                {paginatedMatches.map((m, idx) => {
                  const isOpen =
                    expandedMatchIds[m.id] !== undefined
                      ? expandedMatchIds[m.id]
                      : isAllCollapsed
                      ? false
                      : idx === 0;

                  return (
                    <MatchScorecard
                      key={m.id}
                      match={m}
                      selectedTeamIds={selectedTeamIds}
                      visibleColumns={matchColumns}
                      isCollapsible={true}
                      forceOpen={isOpen}
                      onToggleOpen={() => toggleSingleMatchAccordion(m.id)}
                      isAllStages={isAllStages}
                    />
                  );
                })}

                {totalMatchesPages > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <button
                      type="button"
                      disabled={matchesPage <= 1}
                      onClick={() => setMatchesPage((p) => Math.max(1, p - 1))}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-30 flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <ChevronLeft className="w-4 h-4 text-(--ed-blue)" />
                      <span>Previous</span>
                    </button>

                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Page <strong className="text-slate-900 dark:text-white">{matchesPage}</strong> of{' '}
                      <strong className="text-slate-900 dark:text-white">{totalMatchesPages}</strong>{' '}
                      ({stageMatchesLatestFirst.length} total matches)
                    </span>

                    <button
                      type="button"
                      disabled={matchesPage >= totalMatchesPages}
                      onClick={() => setMatchesPage((p) => Math.min(totalMatchesPages, p + 1))}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-30 flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4 text-(--ed-blue)" />
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      ) : (
        <div className="ed-card flex flex-col items-center gap-3 py-20 text-center">
          <Swords className="h-8 w-8 text-(--ed-stone) opacity-40" />
          <p className="font-display text-lg font-medium">No matches found</p>
          <p className="max-w-sm text-sm text-(--ed-stone)">
            No matches match the selected stage and filters.
          </p>
        </div>
      )}

      {/* ── 6. Floating Bottom Inline Popover for Team Selection (Max 4 Teams) ── */}
      <div ref={popoverRef} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        {/* Inline Popover Dropdown (Positioned directly above the floating button) */}
        {showTeamPopover && (
          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-80 sm:w-96 bg-slate-900 border border-slate-800 text-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in fade-in slide-in-from-bottom-3 duration-150">
            {/* Popover Header */}
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <div>
                  <h3 className="font-black text-xs">Filter &amp; Compare Teams</h3>
                  <span className="text-[10px] text-slate-400">
                    {selectedTeamIds.length}/4 teams selected
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedTeamIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTeamIds([])}
                    className="text-[11px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowTeamPopover(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Search */}
            <div className="p-2.5 border-b border-slate-800 bg-slate-950/30">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search teams..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-800 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Multi-Select Teams List (Max 4 selection limit) */}
            <div className="overflow-y-auto p-1.5 divide-y divide-slate-800/50 max-h-72">
              <button
                type="button"
                onClick={() => setSelectedTeamIds([])}
                className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left hover:bg-slate-800/80 transition-colors cursor-pointer ${
                  selectedTeamIds.length === 0 ? 'bg-(--ed-blue)/20 text-blue-400 font-bold' : 'text-slate-300'
                }`}
              >
                <span className="text-xs">Show All Teams (No Filter)</span>
                {selectedTeamIds.length === 0 && <Check className="w-4 h-4 text-blue-400" />}
              </button>

              {allTeams
                .filter((t) => t.name.toLowerCase().includes(teamSearch.toLowerCase()))
                .map((t) => {
                  const isChecked = selectedTeamIds.includes(t.id);
                  const isMaxReached = selectedTeamIds.length >= 4 && !isChecked;

                  return (
                    <label
                      key={t.id}
                      className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-colors select-none ${
                        isMaxReached
                          ? 'opacity-40 cursor-not-allowed text-slate-500'
                          : isChecked
                          ? 'bg-(--ed-blue)/20 text-blue-400 font-bold cursor-pointer'
                          : 'text-slate-200 hover:bg-slate-800/80 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isMaxReached}
                          onChange={() => toggleTeamSelection(t.id)}
                          className="rounded text-(--ed-blue) focus:ring-blue-500 disabled:opacity-50"
                        />
                        <TeamLogo team={t} size={20} />
                        <div>
                          <span className="font-bold text-xs block">{t.name}</span>
                          <span className="text-[10px] text-slate-400">{t.matchCount} matches</span>
                        </div>
                      </div>
                      {isChecked && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      {isMaxReached && <span className="text-[9px] text-slate-500 font-semibold">(Max 4)</span>}
                    </label>
                  );
                })}
            </div>
          </div>
        )}

        {/* Floating Trigger Pill */}
        <div className="bg-slate-950/95 text-white rounded-full shadow-2xl backdrop-blur-lg px-3 py-1.5 border border-slate-800 flex items-center text-xs font-bold">
          <button
            type="button"
            onClick={() => setShowTeamPopover((prev) => !prev)}
            className={`px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer ${
              selectedTeamIds.length > 0 ? 'text-blue-400 font-black' : 'text-slate-200'
            }`}
          >
            {selectedTeamIds.length > 1 ? (
              <Scale className="w-4 h-4 text-blue-400" />
            ) : (
              <Users className="w-4 h-4 text-blue-400" />
            )}
            <span className="max-w-[170px] truncate">
              {selectedTeamIds.length === 0
                ? 'Teams'
                : selectedTeamIds.length === 1
                ? selectedTeams[0]?.name || '1 Team'
                : `Compare (${selectedTeamIds.length}/4)`}
            </span>
            <ChevronUp
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                showTeamPopover ? 'rotate-180 text-blue-400' : ''
              }`}
            />
          </button>

          {selectedTeamIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedTeamIds([])}
              className="p-1 rounded-full hover:bg-white/20 text-slate-400 hover:text-white cursor-pointer ml-1"
              title="Clear Selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function TournamentMatchesPanel(props: {
  stageGroups: StageGroup[];
  matchColumns?: MatchColumnKey[];
}) {
  return (
    <React.Suspense
      fallback={
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <p className="text-xs font-bold text-slate-400 animate-pulse">Loading matches...</p>
        </div>
      }
    >
      <TournamentMatchesPanelInner {...props} />
    </React.Suspense>
  );
}
