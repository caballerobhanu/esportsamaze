'use client';

import React from 'react';
import Link from 'next/link';
import {
  Trophy,
  Shield,
  Crosshair,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Flame,
  Award,
  Sparkles,
} from 'lucide-react';
import { calculateTournamentStandings, calculateTournamentFraggers, AggregatedTeamStanding } from '@/lib/tournament-math';

export interface StageMatchData {
  stageName: string;
  matchesCount: number;
  completedMatchesCount: number;
  matches: any[];
  standings: AggregatedTeamStanding[];
  topFragger?: {
    playerId: string;
    ign: string;
    teamName: string;
    tag?: string | null;
    avatarUrl?: string | null;
    kills: number;
    damage: number;
  } | null;
}

interface TournamentStageStandingsProps {
  stagesData: StageMatchData[];
  overallStandings: AggregatedTeamStanding[];
  overallTopFragger?: any;
  tournamentName: string;
  pointsMatrix?: Record<string, number>;
  killMultiplier?: number;
  qualifyCount?: number;
  singleStageOnly?: boolean;
  initialStageName?: string;
}

type SortKey = 'rank' | 'matchesPlayed' | 'wwcd' | 'placementPoints' | 'eliminationPoints' | 'totalPoints';
type SortDir = 'asc' | 'desc';

export function TournamentStageStandings({
  stagesData,
  overallStandings,
  overallTopFragger,
  tournamentName,
  pointsMatrix,
  killMultiplier = 1,
  qualifyCount,
  singleStageOnly = false,
  initialStageName,
}: TournamentStageStandingsProps) {
  // Default to initialStageName, or Grand Finals or latest active stage
  const defaultStage = React.useMemo(() => {
    if (initialStageName && (stagesData.some((s) => s.stageName.toLowerCase() === initialStageName.toLowerCase()) || initialStageName === 'OVERALL')) {
      const match = stagesData.find((s) => s.stageName.toLowerCase() === initialStageName.toLowerCase());
      if (match) return match.stageName;
      if (initialStageName === 'OVERALL') return 'OVERALL';
    }
    if (stagesData.length === 0) return 'OVERALL';
    const grandFinals = stagesData.find((s) => s.stageName.toLowerCase().includes('final'));
    if (grandFinals) return grandFinals.stageName;
    return stagesData[0]?.stageName || 'OVERALL';
  }, [stagesData, initialStageName]);

  const [activeStageName, setActiveStageName] = React.useState<string>(defaultStage);
  const [sortKey, setSortKey] = React.useState<SortKey>('rank');
  const [sortDir, setSortDir] = React.useState<SortDir>('asc');

  const isOverall = activeStageName === 'OVERALL';
  const currentStageData = stagesData.find((s) => s.stageName === activeStageName);

  const rawRows = isOverall ? overallStandings : currentStageData?.standings || [];
  const currentTopFragger = isOverall ? overallTopFragger : currentStageData?.topFragger;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'rank' || key === 'matchesPlayed' ? 'asc' : 'desc');
    }
  };

  const sortedRows = React.useMemo(() => {
    return [...rawRows].sort((a, b) => {
      let av: number = (a as any)[sortKey] ?? 0;
      let bv: number = (b as any)[sortKey] ?? 0;
      if (sortKey === 'rank') {
        av = a.rank;
        bv = b.rank;
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [rawRows, sortKey, sortDir]);

  const maxTotal = Math.max(...rawRows.map((r) => r.totalPoints), 1);

  return (
    <div className="space-y-4">
      {/* ═══ STAGE SELECTOR TABS ═══ */}
      {!singleStageOnly && stagesData.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {stagesData.map((stage) => {
            const isActive = activeStageName === stage.stageName;
            return (
              <button
                key={stage.stageName}
                onClick={() => setActiveStageName(stage.stageName)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#0A5FC4] text-white shadow-xs'
                    : 'bg-white dark:bg-[#0c101d] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{stage.stageName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {stage.matchesCount} M
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setActiveStageName('OVERALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              isOverall
                ? 'bg-[#0A5FC4] text-white shadow-xs'
                : 'bg-white dark:bg-[#0c101d] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Cumulative Overall</span>
          </button>
        </div>
      )}

      {/* ═══ STAGE HIGHLIGHT BANNER & TOP FRAGGER ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Left: Active Stage Info */}
        <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] p-4 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400">
              <Shield className="w-3.5 h-3.5" />
              <span>Official Stage Scoreboard</span>
            </div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
              {isOverall ? 'Tournament Cumulative Standings' : `${activeStageName} Standings`}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isOverall
                ? 'Combined total points across all tournament phases and stages.'
                : `Official battle royale ranking for ${activeStageName} (${currentStageData?.completedMatchesCount || 0} of ${
                    currentStageData?.matchesCount || 0
                  } matches concluded).`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="font-bold text-slate-800 dark:text-slate-200">{rawRows.length}</span> Teams Contending
            </div>
            <span>·</span>
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {rawRows.reduce((acc, r) => acc + (r.wwcd || 0), 0)}
              </span>{' '}
              WWCDs Awarded
            </div>
            <span>·</span>
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {rawRows.reduce((acc, r) => acc + (r.eliminationPoints || 0), 0)}
              </span>{' '}
              Total Elim Points
            </div>
          </div>
        </div>

        {/* Right: Stage MVP Fragger Spotlight */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> Stage MVP Fragger
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
              TOP ELIMS
            </span>
          </div>

          {currentTopFragger ? (
            <div className="flex items-center gap-3 my-2">
              <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                {currentTopFragger.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentTopFragger.avatarUrl}
                    alt={currentTopFragger.ign}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Crosshair className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {currentTopFragger.ign}
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {currentTopFragger.teamName} {currentTopFragger.tag ? `[${currentTopFragger.tag}]` : ''}
                </div>
              </div>
              <div className="ml-auto text-right shrink-0">
                <div className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                  {currentTopFragger.kills}
                </div>
                <div className="text-[9px] font-bold uppercase text-slate-400">Elims</div>
              </div>
            </div>
          ) : (
            <div className="my-auto py-2 text-center text-xs text-slate-400">
              Scorecards pending for this stage.
            </div>
          )}

          <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            Performance matrix: 1 pt per elimination
          </div>
        </div>
      </div>

      {/* ═══ HIGH DENSITY STANDINGS TABLE ═══ */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] overflow-hidden shadow-2xs">
        {rawRows.length === 0 ? (
          <div className="py-12 text-center">
            <Shield className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              No standings recorded yet for this stage.
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Match scorecards will populate automatically once matches are played.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[680px]">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/80 dark:bg-[#080c16] border-b border-slate-200 dark:border-slate-800">
                  <th
                    onClick={() => handleSort('rank')}
                    className="py-2.5 px-3 text-left w-14 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <div className="flex items-center gap-1">
                      <span>#</span>
                      {sortKey === 'rank' && (
                        sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#0A5FC4]" /> : <ChevronDown className="w-3 h-3 text-[#0A5FC4]" />
                      )}
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-left">Team</th>
                  <th
                    onClick={() => handleSort('matchesPlayed')}
                    className="py-2.5 px-2 text-center w-14 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>MP</span>
                      {sortKey === 'matchesPlayed' && (
                        sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#0A5FC4]" /> : <ChevronDown className="w-3 h-3 text-[#0A5FC4]" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('wwcd')}
                    className="py-2.5 px-2 text-center w-16 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>WWCD</span>
                      {sortKey === 'wwcd' && (
                        sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#0A5FC4]" /> : <ChevronDown className="w-3 h-3 text-[#0A5FC4]" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('placementPoints')}
                    className="py-2.5 px-2 text-center w-20 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Place Pts</span>
                      {sortKey === 'placementPoints' && (
                        sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#0A5FC4]" /> : <ChevronDown className="w-3 h-3 text-[#0A5FC4]" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('eliminationPoints')}
                    className="py-2.5 px-2 text-center w-20 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Elim Pts</span>
                      {sortKey === 'eliminationPoints' && (
                        sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#0A5FC4]" /> : <ChevronDown className="w-3 h-3 text-[#0A5FC4]" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('totalPoints')}
                    className="py-2.5 px-3 text-right w-24 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <div className="flex items-center justify-end gap-1 font-black text-[#0A5FC4] dark:text-blue-400">
                      <span>Total Pts</span>
                      {sortKey === 'totalPoints' && (
                        sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {sortedRows.map((team, idx) => {
                  const isFirst = team.rank === 1;
                  const isSecond = team.rank === 2;
                  const isThird = team.rank === 3;
                  const isQualify = qualifyCount && team.rank <= qualifyCount;

                  return (
                    <tr
                      key={team.teamId || idx}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors ${
                        isFirst ? 'bg-amber-500/[0.03]' : ''
                      }`}
                    >
                      {/* Rank Badge */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-mono font-bold text-xs ${
                            isFirst
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                              : isSecond
                              ? 'bg-slate-300/30 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                              : isThird
                              ? 'bg-amber-700/15 text-amber-800 dark:text-amber-500 border border-amber-700/30'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {team.rank}
                        </span>
                      </td>

                      {/* Team Info */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {team.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={team.logoUrl}
                              alt={team.teamName}
                              className="w-5 h-5 object-contain rounded shrink-0"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[9px] text-slate-500 shrink-0">
                              {team.tag || team.teamName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="truncate">
                            <span className="font-bold text-slate-900 dark:text-white truncate block">
                              {team.teamName}
                            </span>
                          </div>
                          {team.tag && (
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              [{team.tag}]
                            </span>
                          )}
                          {isFirst && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                              Leader
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Matches Played */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-slate-400">
                        {team.matchesPlayed}
                      </td>

                      {/* WWCD */}
                      <td className="py-2.5 px-2 text-center font-mono font-bold">
                        {team.wwcd > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            {team.wwcd}W
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Placement Points */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-700 dark:text-slate-300">
                        {team.placementPoints}
                      </td>

                      {/* Elimination Points */}
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                        {team.eliminationPoints}
                      </td>

                      {/* Total Points */}
                      <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-[#0A5FC4] dark:text-blue-400">
                        {team.totalPoints}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
