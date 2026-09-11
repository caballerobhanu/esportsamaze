'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Clock,
  Crown,
  ChevronLeft,
  ChevronRight,
  Layers,
  MapPin,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { StageGroup } from './panel-types';
import { ThemeLogo } from './theme-logo';

interface EstaticMatchesPanelProps {
  stageGroups: StageGroup[];
}

/** Syncs a query param without triggering a server roundtrip. */
function replaceQueryParam(key: string, value: string | null) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (value == null || value === '') url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  window.history.replaceState(null, '', url.toString());
}

export function EstaticMatchesPanel({
  stageGroups,
}: EstaticMatchesPanelProps) {
  // Deep links (?stage=, ?matchId=) are read client-side so the route stays ISR-cacheable.
  const searchParams = useSearchParams();

  // Find index of the requested active stage, defaulting to the most recent stage.
  const initialStageIdx = useMemo(() => {
    if (!stageGroups.length) return 0;
    const stageParam = searchParams.get('stage');
    if (stageParam) {
      const idx = stageGroups.findIndex(
        (g) => g.stageName.toLowerCase() === stageParam.toLowerCase()
      );
      if (idx >= 0) return idx;
    }
    // Default: stage with the most recently scheduled match
    let bestIdx = 0;
    let bestTime = -1;
    stageGroups.forEach((g, idx) => {
      const maxT = Math.max(0, ...g.matches.map((m) => new Date(m.scheduledAt).getTime() || 0));
      if (maxT > bestTime) {
        bestTime = maxT;
        bestIdx = idx;
      }
    });
    return bestIdx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageGroups]);

  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(initialStageIdx);
  const [lastStageIdx, setLastStageIdx] = useState<number>(initialStageIdx);
  if (lastStageIdx !== initialStageIdx) {
    // URL-driven stage change (fresh navigation) — adjust during render
    // instead of syncing through an effect.
    setLastStageIdx(initialStageIdx);
    setSelectedStageIdx(initialStageIdx);
  }

  const currentStage = stageGroups[selectedStageIdx] || stageGroups[0];

  // Current selected match in stage
  const matchIdParam = searchParams.get('matchId');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(matchIdParam);
  const [lastMatchIdParam, setLastMatchIdParam] = useState<string | null>(matchIdParam);
  if (lastMatchIdParam !== matchIdParam) {
    setLastMatchIdParam(matchIdParam);
    setSelectedMatchId(matchIdParam);
  }

  const activeMatch = useMemo(() => {
    if (!currentStage || !currentStage.matches.length) return null;
    if (selectedMatchId) {
      const found = currentStage.matches.find((m) => m.id === selectedMatchId);
      if (found) return found;
    }
    return currentStage.matches[currentStage.matches.length - 1] || currentStage.matches[0];
  }, [currentStage, selectedMatchId]);

  const currentMatchIndex = useMemo(() => {
    if (!currentStage || !activeMatch) return -1;
    return currentStage.matches.findIndex((m) => m.id === activeMatch.id);
  }, [currentStage, activeMatch]);

  const prevMatch = currentMatchIndex > 0 ? currentStage.matches[currentMatchIndex - 1] : null;
  const nextMatch =
    currentMatchIndex >= 0 && currentMatchIndex < currentStage.matches.length - 1
      ? currentStage.matches[currentMatchIndex + 1]
      : null;

  const selectStage = (idx: number, stageName: string) => {
    setSelectedStageIdx(idx);
    setSelectedMatchId(null);
    replaceQueryParam('matchId', null);
    replaceQueryParam('stage', stageName);
  };

  const selectMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
    replaceQueryParam('matchId', matchId);
  };

  const sortedResults = useMemo(() => {
    if (!activeMatch?.teamResults) return [];
    return [...activeMatch.teamResults].sort((a, b) => {
      // 1. Sort by Total Points descending
      const diffTotal = (b.totalPoints || 0) - (a.totalPoints || 0);
      if (diffTotal !== 0) return diffTotal;

      // 2. WWCD descending (winner first on tie)
      const aWwcd = (a.wwcd || a.rank === 1) ? 1 : 0;
      const bWwcd = (b.wwcd || b.rank === 1) ? 1 : 0;
      if (bWwcd !== aWwcd) return bWwcd - aWwcd;

      // 3. Place Points descending
      const diffPlace = (b.placePoints || 0) - (a.placePoints || 0);
      if (diffPlace !== 0) return diffPlace;

      // 4. Elims Points descending
      const diffElims = (b.elimsPoints || 0) - (a.elimsPoints || 0);
      if (diffElims !== 0) return diffElims;

      // 5. Original finish rank ascending
      return (a.rank || 99) - (b.rank || 99);
    });
  }, [activeMatch]);

  const winner = activeMatch?.teamResults?.find((r) => r.wwcd || r.rank === 1);

  if (!stageGroups || stageGroups.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
        <p className="text-sm font-bold text-slate-400">No match records available yet for this tournament.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stage Selector Pills & Match Pills */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs dark:border-white/10 dark:bg-[#0b1220] space-y-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300 mr-1 shrink-0">
            Stages:
          </span>
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/70 p-1.5 dark:border-white/10 dark:bg-white/5">
            {stageGroups.map((g, idx) => {
              const active = selectedStageIdx === idx;
              return (
                <button
                  key={g.stageName}
                  onClick={() => selectStage(idx, g.stageName)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    active
                      ? 'bg-[#0A5FC4] text-white shadow-md shadow-blue-500/25 scale-[1.01]'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10'
                  }`}
                >
                  <Layers className={`h-3.5 w-3.5 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{g.stageName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Match Pills in Active Stage */}
        {currentStage && currentStage.matches.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
            <span className="text-[10px] font-black uppercase tracking-[.2em] text-slate-400 dark:text-slate-500 mr-1 shrink-0">
              Select Match:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {currentStage.matches.map((m) => {
                const active = activeMatch?.id === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => selectMatch(m.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? 'bg-[#0A5FC4] text-white shadow-sm shadow-blue-500/25 scale-[1.02]'
                        : 'border border-slate-200/80 bg-slate-50/80 text-slate-600 hover:border-[#0A5FC4] hover:text-[#0A5FC4] hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                    }`}
                  >
                    <span>M{m.overallMatchNumber ?? m.matchNumber}</span>
                    {m.mapName && (
                      <span className={`text-[10px] ${active ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
                        ({m.mapName})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Active Match Hero Card */}
      {activeMatch && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 dark:border-white/10">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-full bg-[#0A5FC4] px-3 py-0.5 text-xs font-black uppercase tracking-wider text-white">
                  Match #{activeMatch.overallMatchNumber ?? activeMatch.matchNumber}
                </span>
                <span className="rounded-full bg-emerald-500/10 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {activeMatch.status}
                </span>

                {(prevMatch || nextMatch) && (
                  <div className="flex items-center gap-1.5 ml-1">
                    <button
                      type="button"
                      disabled={!prevMatch}
                      onClick={() => prevMatch && selectMatch(prevMatch.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-700 disabled:opacity-30 hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 cursor-pointer transition-all"
                      title={prevMatch ? `M${prevMatch.overallMatchNumber ?? prevMatch.matchNumber}` : 'No previous match'}
                    >
                      <ChevronLeft className="h-3 w-3" />
                      <span>Prev</span>
                    </button>
                    <button
                      type="button"
                      disabled={!nextMatch}
                      onClick={() => nextMatch && selectMatch(nextMatch.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-700 disabled:opacity-30 hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 cursor-pointer transition-all"
                      title={nextMatch ? `M${nextMatch.overallMatchNumber ?? nextMatch.matchNumber}` : 'No next match'}
                    >
                      <span>Next</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
              <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
                {activeMatch.format || `Match ${activeMatch.matchNumber} — ${activeMatch.mapName || 'Erangel'}`}
              </h3>
              <p className="mt-1 text-xs font-semibold text-slate-400 flex items-center gap-3">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[#0A5FC4]" /> {activeMatch.mapName || 'Erangel'}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-[#0A5FC4]" /> {activeMatch.matchTime || formatDate(activeMatch.scheduledAt)}</span>
              </p>
            </div>

            {winner && (
              <div className="flex items-center gap-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-slate-950 shadow-md">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Match Winner
                  </span>
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    {winner.team?.name || 'Winner Squad'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lobby Results Scorecard */}
          <div className="mt-6 overflow-x-auto">
            {sortedResults.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-xs font-bold text-slate-400">
                  No scorecard results recorded yet for this match.
                </p>
              </div>
            ) : (
              <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
                  <th className="pb-3 w-14 text-center">Rank</th>
                  <th className="pb-3 pl-2">Squad</th>
                  <th className="pb-3 text-center">WWCD</th>
                  <th className="pb-3 text-center">Place Pts</th>
                  <th className="pb-3 text-center">Elims Pts</th>
                  <th className="pb-3 pr-4 text-right">Total Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {sortedResults.map((tr, idx) => {
                  const standingRank = idx + 1;
                  const isWwcd = Boolean(tr.wwcd || tr.rank === 1);

                  return (
                    <tr
                      key={tr.id}
                      className="text-sm hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3.5 text-center font-black">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black ${
                            standingRank === 1
                              ? 'bg-amber-400 text-slate-950 shadow-sm'
                              : standingRank === 2
                              ? 'bg-slate-300 text-slate-900'
                              : standingRank === 3
                              ? 'bg-amber-600/20 text-amber-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {standingRank}
                        </span>
                      </td>
                      <td className="py-3.5 pl-2">
                        <div className="flex items-center gap-3 font-extrabold">
                          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/30">
                            {tr.team?.logoUrl || tr.team?.imageDarkUrl ? (
                              <ThemeLogo
                                lightSrc={tr.team?.logoUrl}
                                darkSrc={tr.team?.imageDarkUrl}
                                alt={tr.team?.name || 'Team'}
                                className="object-contain p-1"
                              />
                            ) : (
                              <span className="text-xs font-black text-slate-400">
                                {tr.team?.name?.slice(0, 2).toUpperCase() || 'TM'}
                              </span>
                            )}
                          </div>
                          <span className="text-slate-900 dark:text-white truncate">{tr.team?.name || 'Unknown Squad'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-center font-black text-sm">
                        {isWwcd ? (
                          <span className="text-amber-500 font-black">1</span>
                        ) : (
                          <span className="text-slate-400 font-medium">0</span>
                        )}
                      </td>
                      <td className="py-3.5 text-center font-bold text-slate-500">{tr.placePoints || 0}</td>
                      <td className="py-3.5 text-center font-bold text-slate-500">{tr.elimsPoints || 0}</td>
                      <td className="py-3.5 pr-4 text-right font-black text-base text-[#0A5FC4] dark:text-blue-300">
                        {tr.totalPoints || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
