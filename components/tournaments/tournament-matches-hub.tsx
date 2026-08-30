'use client';

import React from 'react';
import Link from 'next/link';
import {
  Swords,
  MapPin,
  Clock,
  Tv,
  Play,
  ChevronDown,
  ChevronUp,
  Shield,
  Crosshair,
  Search,
  CheckCircle2,
  Calendar,
  Filter,
  Flame,
  Award,
} from 'lucide-react';

export interface PublicMatchItem {
  id: string;
  matchNumber: number | null;
  overallMatchNumber: number | null;
  format: string;
  mapName: string;
  stageType: string | null;
  groupName: string | null;
  matchType: string | null;
  status: string;
  scheduledAt: string | Date;
  matchTime: string | null;
  streamUrl: string | null;
  vods: any;
  stage?: {
    name: string;
  } | null;
  games: Array<{
    id: string;
    sequence: number;
    teamResults: Array<{
      id: string;
      rank: number;
      wwcd: boolean;
      placePoints: number;
      elimsPoints: number;
      totalPoints: number;
      damage: number;
      survivalTime: number;
      healing: number;
      damageReceived: number;
      vehicleElims: number;
      grenadeElims: number;
      team: {
        id: string;
        name: string;
        tag?: string | null;
        logoUrl?: string | null;
        imageDarkUrl?: string | null;
      };
    }>;
    playerStats: Array<{
      id: string;
      playerElims: number;
      damage: number;
      headshots: number;
      assists: number;
      knockouts: number;
      survivalTime: number;
      isMvp: boolean;
      player: {
        id: string;
        ign: string;
        avatarUrl?: string | null;
      };
      team: {
        id: string;
        name: string;
        tag?: string | null;
      };
    }>;
  }>;
}

interface TournamentMatchesHubProps {
  matches: PublicMatchItem[];
  tournamentName: string;
}

const MAP_THEMES: Record<string, string> = {
  Erangel: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  Miramar: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  Sanhok: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20',
  Vikendi: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  Rondo: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
};

export function TournamentMatchesHub({ matches, tournamentName }: TournamentMatchesHubProps) {
  // Extract distinct stages
  const distinctStages = React.useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      let stg = m.stage?.name || m.stageType;
      if (!stg && m.format?.includes(' · ')) {
        stg = m.format.split(' · ')[1]?.split(' (')[0];
      }
      if (stg) set.add(stg);
      else set.add('Grand Finals');
    });
    return Array.from(set);
  }, [matches]);

  const [selectedStage, setSelectedStage] = React.useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedMatches, setExpandedMatches] = React.useState<Record<string, boolean>>({});

  const toggleExpand = (matchId: string) => {
    setExpandedMatches((prev) => ({ ...prev, [matchId]: !prev[matchId] }));
  };

  const filteredMatches = React.useMemo(() => {
    return matches.filter((m) => {
      let stg = m.stage?.name || m.stageType;
      if (!stg && m.format?.includes(' · ')) {
        stg = m.format.split(' · ')[1]?.split(' (')[0];
      }
      if (!stg) stg = 'Grand Finals';

      if (selectedStage !== 'ALL' && stg !== selectedStage) return false;
      if (selectedStatus !== 'ALL' && m.status !== selectedStatus) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (m.format || '').toLowerCase().includes(q) ||
        (m.mapName || '').toLowerCase().includes(q) ||
        stg.toLowerCase().includes(q) ||
        (m.groupName || '').toLowerCase().includes(q)
      );
    });
  }, [matches, selectedStage, selectedStatus, searchQuery]);

  // Group filtered matches by Stage
  const groupedByStage = React.useMemo(() => {
    const map = new Map<string, PublicMatchItem[]>();
    filteredMatches.forEach((m) => {
      let stg = m.stage?.name || m.stageType;
      if (!stg && m.format?.includes(' · ')) {
        stg = m.format.split(' · ')[1]?.split(' (')[0];
      }
      if (!stg) stg = 'Grand Finals';

      if (!map.has(stg)) map.set(stg, []);
      map.get(stg)!.push(m);
    });

    return Array.from(map.entries()).map(([stageName, stageMatches]) => ({
      stageName,
      matches: stageMatches.sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0)),
    }));
  }, [filteredMatches]);

  return (
    <div className="space-y-4">
      {/* ═══ MASTER FILTER & SEARCH BAR ═══ */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] p-3 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Stage Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedStage('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                selectedStage === 'ALL'
                  ? 'bg-[#0A5FC4] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Stages ({matches.length})
            </button>
            {distinctStages.map((stg) => {
              const count = matches.filter((m) => {
                const s = m.stage?.name || m.stageType || m.format?.split(' · ')[1]?.split(' (')[0] || 'Grand Finals';
                return s === stg;
              }).length;
              return (
                <button
                  key={stg}
                  onClick={() => setSelectedStage(stg)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedStage === stg
                      ? 'bg-[#0A5FC4] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {stg} ({count})
                </button>
              );
            })}
          </div>

          {/* Status & Search */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Status Pills */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
              {['ALL', 'COMPLETED', 'LIVE', 'SCHEDULED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    selectedStatus === st
                      ? 'bg-white dark:bg-[#0c101d] text-[#0A5FC4] dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'COMPLETED' ? 'Done' : st === 'LIVE' ? '🔴 Live' : 'Upcoming'}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search map / match…"
                className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0A5FC4]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MATCH GROUPS & DETAILED SCHEDULE CARDS ═══ */}
      {groupedByStage.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] p-12 text-center">
          <Swords className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No matches found.</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Try resetting search filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByStage.map(({ stageName, matches: stageMatches }) => (
            <div key={stageName} className="space-y-2">
              {/* Stage Header */}
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#0A5FC4]" />
                  <span>{stageName}</span>
                  <span className="text-[10px] font-mono text-slate-400 font-normal">
                    ({stageMatches.length} Matches)
                  </span>
                </h3>
              </div>

              {/* Match Rows */}
              <div className="space-y-2">
                {stageMatches.map((m) => {
                  const isExpanded = Boolean(expandedMatches[m.id]);
                  const mg = m.games?.[0];
                  const winner = mg?.teamResults?.find((tr) => tr.rank === 1 || tr.wwcd);
                  const isCompleted = m.status === 'COMPLETED';
                  const isLive = m.status === 'LIVE';
                  const mapTheme = MAP_THEMES[m.mapName] || 'bg-slate-500/10 text-slate-700 border-slate-500/20';

                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] overflow-hidden shadow-2xs transition-all"
                    >
                      {/* Main Match Bar */}
                      <div className="p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        {/* Left: Schedule & Map Tag */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-14 text-center shrink-0 border-r border-slate-100 dark:border-slate-800 pr-2">
                            <span className="font-mono font-black text-sm text-[#0A5FC4] dark:text-blue-400 block">
                              #{m.matchNumber ?? 1}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 block -mt-0.5">
                              {m.overallMatchNumber ? `Ovl #${m.overallMatchNumber}` : 'Match'}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${mapTheme}`}
                              >
                                {m.mapName}
                              </span>
                              {m.groupName && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  {m.groupName}
                                </span>
                              )}
                              <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {m.matchTime ||
                                  (typeof m.scheduledAt === 'string'
                                    ? m.scheduledAt.slice(0, 16)
                                    : m.scheduledAt.toISOString().slice(0, 16))}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                · {m.matchType === 'Online' ? 'Online' : 'LAN'}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-1 truncate">
                              {m.format}
                            </h4>
                          </div>
                        </div>

                        {/* Middle / Right: Winner Display & Action Controls */}
                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                          {/* Winner Summary Pill if completed */}
                          {isCompleted && winner ? (
                            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                WWCD
                              </span>
                              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                                {winner.team?.logoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={winner.team.logoUrl}
                                    alt={winner.team.name}
                                    className="w-4 h-4 object-contain rounded"
                                  />
                                ) : null}
                                <span>{winner.team.name}</span>
                              </div>
                              <span className="font-mono text-xs text-amber-600 dark:text-amber-400 font-bold">
                                {winner.totalPoints} pts
                              </span>
                            </div>
                          ) : isLive ? (
                            <span className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-black text-xs uppercase animate-pulse shadow-xs">
                              🔴 LIVE NOW
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
                              Upcoming
                            </span>
                          )}

                          {/* Stream link if present */}
                          {m.streamUrl && (
                            <a
                              href={m.streamUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center gap-1"
                              title="Watch Stream / VOD"
                            >
                              <Tv className="w-3 h-3 text-indigo-500" />
                              <span className="hidden sm:inline">Stream</span>
                            </a>
                          )}

                          {/* Expand Scorecard Toggle */}
                          {mg && (mg.teamResults?.length ?? 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(m.id)}
                              className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-[#0A5FC4] text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#0A5FC4] transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide' : 'Scorecard'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ═══ EXPANDABLE MATCH SCORECARD ═══ */}
                      {isExpanded && mg && (
                        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#080d17]/80 p-3 sm:p-4 space-y-4">
                          {/* Scorecard Table Header */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-[#0A5FC4]" />
                              <span>Match #{m.matchNumber} Team Results</span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              Duration: {Math.floor((mg.teamResults[0]?.survivalTime || 1680) / 60)} mins
                            </span>
                          </div>

                          {/* 16-Team Placement Table */}
                          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d]">
                            <table className="w-full text-xs min-w-[560px]">
                              <thead>
                                <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                  <th className="py-2 px-3 text-left w-12">Rank</th>
                                  <th className="py-2 px-3 text-left">Team</th>
                                  <th className="py-2 px-2 text-center">Place Pts</th>
                                  <th className="py-2 px-2 text-center">Elims Pts</th>
                                  <th className="py-2 px-3 text-right font-bold text-[#0A5FC4]">Total Pts</th>
                                  <th className="py-2 px-2 text-center">Damage</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {mg.teamResults.map((tr) => (
                                  <tr
                                    key={tr.id}
                                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 ${
                                      tr.rank === 1 ? 'bg-amber-500/[0.04]' : ''
                                    }`}
                                  >
                                    <td className="py-1.5 px-3 font-mono font-bold">
                                      #{tr.rank} {tr.wwcd && <span className="text-amber-500">🏆</span>}
                                    </td>
                                    <td className="py-1.5 px-3">
                                      <div className="flex items-center gap-2">
                                        {tr.team?.logoUrl ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img
                                            src={tr.team.logoUrl}
                                            alt={tr.team.name}
                                            className="w-4 h-4 object-contain rounded"
                                          />
                                        ) : null}
                                        <span className="font-bold text-slate-800 dark:text-slate-200">
                                          {tr.team.name}
                                        </span>
                                        {tr.team.tag && (
                                          <span className="text-[10px] font-mono text-slate-400">
                                            [{tr.team.tag}]
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-mono text-slate-600 dark:text-slate-400">
                                      {tr.placePoints}
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                                      {tr.elimsPoints}
                                    </td>
                                    <td className="py-1.5 px-3 text-right font-mono font-black text-[#0A5FC4] dark:text-blue-400">
                                      {tr.totalPoints}
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-mono text-slate-500">
                                      {tr.damage}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Top Player Fraggers Matrix for this match if present */}
                          {mg.playerStats && mg.playerStats.length > 0 && (
                            <div className="space-y-2 pt-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                <Flame className="w-3 h-3 text-rose-500" />
                                <span>Match MVP &amp; Top Fraggers</span>
                              </span>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {mg.playerStats.slice(0, 4).map((ps, idx) => (
                                  <div
                                    key={ps.id || idx}
                                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] flex items-center justify-between gap-2"
                                  >
                                    <div className="min-w-0">
                                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate flex items-center gap-1">
                                        <span>{ps.player?.ign || 'Player'}</span>
                                        {ps.isMvp && (
                                          <span className="text-[9px] px-1 rounded bg-amber-500 text-white font-bold">
                                            MVP
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-400 truncate">
                                        {ps.team?.name || '—'}
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                                        {ps.playerElims}
                                      </span>
                                      <span className="text-[8px] font-bold uppercase text-slate-400 block -mt-1">
                                        kills
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
