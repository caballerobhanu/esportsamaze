'use client';

import React from 'react';
import Link from 'next/link';
import {
  Trophy,
  Layers,
  Swords,
  Search,
  Pencil,
  Trash2,
  Copy,
  Plus,
  Tv,
  Globe,
  MapPin,
  ChevronDown,
  ChevronRight,
  Shield,
  Clock,
  Filter,
  CheckCircle2,
  Calendar,
  Check,
  Flame,
} from 'lucide-react';

export interface MatchItem {
  id: string;
  tournamentId: string;
  gameId: string;
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
  tournament: {
    id: string;
    name: string;
    slug?: string;
  };
  game: {
    id: string;
    name: string;
    slug?: string;
  };
  stage?: {
    id: string;
    name: string;
  } | null;
  games?: Array<{
    id: string;
    sequence: number;
    teamResults?: any[];
    playerStats?: any[];
    _count?: {
      teamResults: number;
      playerStats: number;
    };
  }>;
}

export interface TournamentOption {
  id: string;
  name: string;
  slug: string;
  gameId?: string;
}

interface MatchGroupedListProps {
  matches: MatchItem[];
  allTournaments: TournamentOption[];
  deleteMatchAction: (formData: FormData) => Promise<void>;
  duplicateMatchAction: (formData: FormData) => Promise<void>;
  updateMatchStatusAction?: (formData: FormData) => Promise<void>;
}

const STATUS_BADGES: Record<string, string> = {
  SCHEDULED: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
  LIVE: 'bg-rose-500 text-white font-black animate-pulse shadow-xs shadow-rose-500/30',
  COMPLETED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  POSTPONED: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20',
};

export function MatchGroupedList({
  matches,
  allTournaments,
  deleteMatchAction,
  duplicateMatchAction,
  updateMatchStatusAction,
}: MatchGroupedListProps) {
  // Default to the first tournament that has matches, or ALL if none
  const defaultTourney = React.useMemo(() => {
    const firstWithMatches = allTournaments.find((t) => matches.some((m) => m.tournamentId === t.id));
    return firstWithMatches ? firstWithMatches.id : 'ALL';
  }, [allTournaments, matches]);

  const [selectedTourneyId, setSelectedTourneyId] = React.useState<string>(defaultTourney);
  const [selectedStageFilter, setSelectedStageFilter] = React.useState<string>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [collapsedStages, setCollapsedStages] = React.useState<Record<string, boolean>>({});
  const [duplicatingId, setDuplicatingId] = React.useState<string | null>(null);

  // Sync default tournament if changed
  React.useEffect(() => {
    if (selectedTourneyId !== 'ALL' && !allTournaments.some((t) => t.id === selectedTourneyId)) {
      setSelectedTourneyId('ALL');
    }
  }, [allTournaments, selectedTourneyId]);

  const toggleStageCollapse = (key: string) => {
    setCollapsedStages((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    groupedData.forEach((t) => {
      t.stageList.forEach((s) => {
        all[`${t.tournamentId}-${s.stageName}`] = true;
      });
    });
    setCollapsedStages(all);
  };

  const expandAll = () => {
    setCollapsedStages({});
  };

  // Get active tournament obj
  const activeTournament = allTournaments.find((t) => t.id === selectedTourneyId);

  // Extract all distinct stages for the selected tournament
  const tournamentStages = React.useMemo(() => {
    const set = new Set<string>();
    const pool = selectedTourneyId === 'ALL' ? matches : matches.filter((m) => m.tournamentId === selectedTourneyId);
    pool.forEach((m) => {
      let stg = m.stage?.name || m.stageType;
      if (!stg && m.format?.includes(' · ')) {
        stg = m.format.split(' · ')[1]?.split(' (')[0];
      }
      if (stg) set.add(stg);
      else set.add('Grand Finals');
    });
    return Array.from(set);
  }, [matches, selectedTourneyId]);

  // Filter matches
  const filteredMatches = React.useMemo(() => {
    return matches.filter((m) => {
      if (selectedTourneyId !== 'ALL' && m.tournamentId !== selectedTourneyId) return false;
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;

      let stg = m.stage?.name || m.stageType;
      if (!stg && m.format?.includes(' · ')) {
        stg = m.format.split(' · ')[1]?.split(' (')[0];
      }
      if (!stg) stg = 'Grand Finals';

      if (selectedStageFilter !== 'ALL' && stg !== selectedStageFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (m.format || '').toLowerCase().includes(q) ||
        (m.mapName || '').toLowerCase().includes(q) ||
        stg.toLowerCase().includes(q) ||
        (m.tournament.name || '').toLowerCase().includes(q) ||
        (m.game.name || '').toLowerCase().includes(q) ||
        (m.groupName || '').toLowerCase().includes(q)
      );
    });
  }, [matches, selectedTourneyId, statusFilter, selectedStageFilter, searchQuery]);

  // Overall stats
  const stats = React.useMemo(() => {
    const total = filteredMatches.length;
    const completed = filteredMatches.filter((m) => m.status === 'COMPLETED').length;
    const live = filteredMatches.filter((m) => m.status === 'LIVE').length;
    const scheduled = filteredMatches.filter((m) => m.status === 'SCHEDULED').length;
    return { total, completed, live, scheduled };
  }, [filteredMatches]);

  // Group filtered matches by Tournament -> Stage
  const groupedData = React.useMemo(() => {
    const tourneyMap = new Map<
      string,
      {
        tournamentId: string;
        tournamentName: string;
        stages: Map<string, MatchItem[]>;
        totalMatches: number;
      }
    >();

    for (const m of filteredMatches) {
      const tId = m.tournamentId;
      const tName = m.tournament.name || 'Tournament Matches';

      if (!tourneyMap.has(tId)) {
        tourneyMap.set(tId, {
          tournamentId: tId,
          tournamentName: tName,
          stages: new Map(),
          totalMatches: 0,
        });
      }

      const tourneyEntry = tourneyMap.get(tId)!;
      tourneyEntry.totalMatches++;

      let stageName = m.stage?.name || m.stageType;
      if (!stageName) {
        if (m.format && m.format.includes(' · ')) {
          const parts = m.format.split(' · ');
          stageName = parts[1]?.split(' (')[0] || 'Grand Finals';
        } else {
          stageName = 'Grand Finals';
        }
      }

      if (!tourneyEntry.stages.has(stageName)) {
        tourneyEntry.stages.set(stageName, []);
      }

      tourneyEntry.stages.get(stageName)!.push(m);
    }

    return Array.from(tourneyMap.values()).map((t) => ({
      ...t,
      stageList: Array.from(t.stages.entries()).map(([stageName, stageMatches]) => ({
        stageName,
        matches: stageMatches.sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0)),
      })),
    }));
  }, [filteredMatches]);

  return (
    <div className="space-y-4">
      {/* ═══ SLEEK COMPACT MASTER CONTROL BAR ═══ */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-3 shadow-xs space-y-3">
        {/* Row 1: Tournament Selector Dropdown + Quick Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0 font-black text-xs uppercase tracking-tight text-slate-800 dark:text-slate-200">
              <Trophy className="w-4 h-4 text-[#0A5FC4]" />
              <span>Event:</span>
            </div>

            {/* Tournament Selector Dropdown */}
            <select
              value={selectedTourneyId}
              onChange={(e) => {
                setSelectedTourneyId(e.target.value);
                setSelectedStageFilter('ALL');
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A5FC4] cursor-pointer max-w-[280px] sm:max-w-[360px] truncate"
            >
              <option value="ALL">🌐 All Tournaments ({matches.length} matches)</option>
              {allTournaments.map((t) => {
                const count = matches.filter((m) => m.tournamentId === t.id).length;
                return (
                  <option key={t.id} value={t.id}>
                    🏆 {t.name} ({count})
                  </option>
                );
              })}
            </select>

            {/* Stage Filter Dropdown (When tournament is chosen or has stages) */}
            {tournamentStages.length > 1 && (
              <select
                value={selectedStageFilter}
                onChange={(e) => setSelectedStageFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0A5FC4] cursor-pointer max-w-[200px] truncate"
              >
                <option value="ALL">All Stages ({tournamentStages.length})</option>
                {tournamentStages.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-[11px] font-bold">
              {['ALL', 'SCHEDULED', 'LIVE', 'COMPLETED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white dark:bg-slate-800 text-[#0A5FC4] dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'SCHEDULED' ? 'Upcoming' : st === 'LIVE' ? '🔴 Live' : 'Done'}
                </button>
              ))}
            </div>
          </div>

          {/* Search + Add Match button */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative w-44 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter matches…"
                className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0A5FC4]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* + Add Match Button with dynamic target tournament */}
            <Link
              href={
                selectedTourneyId !== 'ALL'
                  ? `/admin/matches?tournamentId=${selectedTourneyId}${
                      selectedStageFilter !== 'ALL' ? `&stage=${encodeURIComponent(selectedStageFilter)}` : ''
                    }&openNew=1#match-editor`
                  : `/admin/matches?openNew=1#match-editor`
              }
              className="px-3 py-1 text-xs rounded-lg bg-[#0A5FC4] hover:bg-[#0850a3] text-white font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Match</span>
            </Link>
          </div>
        </div>

        {/* Row 2: Micro Stats & Collapse Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-mono">
            <span>
              Matches: <strong className="text-slate-800 dark:text-slate-200">{stats.total}</strong>
            </span>
            <span>·</span>
            <span className="text-indigo-600 dark:text-indigo-400">
              Scheduled: <strong>{stats.scheduled}</strong>
            </span>
            <span>·</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              Completed: <strong>{stats.completed}</strong>
            </span>
            {stats.live > 0 && (
              <>
                <span>·</span>
                <span className="text-rose-500 font-bold animate-pulse">Live: {stats.live}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* ═══ SLEEK HIGH-DENSITY MATCH TABLES GROUPED BY STAGES ═══ */}
      {groupedData.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-8 text-center">
          <Layers className="w-6 h-6 text-slate-300 dark:text-slate-700 mx-auto mb-1.5" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No matches found for current filter.</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Try resetting search or filters, or add a match above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedData.map((tourney) => (
            <div key={tourney.tournamentId} className="space-y-2">
              {/* Subtle Tournament Divider (Only when showing "ALL" Tournaments) */}
              {selectedTourneyId === 'ALL' && (
                <div className="flex items-center justify-between gap-2 px-1 pt-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                      🏆 {tourney.tournamentName}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {tourney.totalMatches} matches
                    </span>
                  </div>
                  <Link
                    href={`/admin/matches?tournamentId=${tourney.tournamentId}&openNew=1#match-editor`}
                    className="text-[11px] font-bold text-[#0A5FC4] hover:underline flex items-center gap-0.5 shrink-0"
                  >
                    <Plus className="w-3 h-3" /> Add to Tournament
                  </Link>
                </div>
              )}

              {/* Stage Groups */}
              {tourney.stageList.map(({ stageName, matches: stageMatches }) => {
                const stageKey = `${tourney.tournamentId}-${stageName}`;
                const isCollapsed = Boolean(collapsedStages[stageKey]);
                const maps = Array.from(new Set(stageMatches.map((m) => m.mapName)));

                return (
                  <div
                    key={stageKey}
                    className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0b101c] overflow-hidden shadow-2xs"
                  >
                    {/* Sleek 34px Stage Sub-header */}
                    <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleStageCollapse(stageKey)}
                        className="flex items-center gap-2 min-w-0 text-left cursor-pointer group"
                      >
                        <span className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </span>
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
                          {stageName}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {stageMatches.length}
                        </span>
                      </button>

                      <div className="flex items-center gap-2 text-[10px] shrink-0 font-mono">
                        <span className="text-slate-400 hidden sm:inline">🗺️ {maps.join(', ')}</span>
                        <Link
                          href={`/admin/matches?tournamentId=${tourney.tournamentId}&stage=${encodeURIComponent(
                            stageName
                          )}&openNew=1#match-editor`}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
                          title="Add next match in this stage"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Match</span>
                        </Link>
                      </div>
                    </div>

                    {/* High Density Match Table */}
                    {!isCollapsed && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs min-w-[660px]">
                          <thead>
                            <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-white dark:bg-[#0b101c] border-b border-slate-100 dark:border-slate-800/80">
                              <th className="py-1.5 px-3 text-left w-14">#</th>
                              <th className="py-1.5 px-3 text-left">Map &amp; Format</th>
                              <th className="py-1.5 px-3 text-left">Schedule</th>
                              <th className="py-1.5 px-2 text-center">Scorecard</th>
                              <th className="py-1.5 px-2 text-center">Status</th>
                              <th className="py-1.5 px-3 text-right w-24">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {stageMatches.map((m) => {
                              const mg = m.games?.[0];
                              const teamCount = mg?.teamResults?.length ?? mg?._count?.teamResults ?? 0;
                              const playerCount = mg?.playerStats?.length ?? mg?._count?.playerStats ?? 0;
                              const isDuplicating = duplicatingId === m.id;

                              return (
                                <tr
                                  key={m.id}
                                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                                >
                                  {/* Match Number */}
                                  <td className="py-1.5 px-3">
                                    <span className="font-mono font-black text-[#0A5FC4] dark:text-blue-400 text-xs">
                                      #{m.matchNumber ?? 1}
                                    </span>
                                    {m.overallMatchNumber && (
                                      <span className="text-[9px] font-mono text-slate-400 block -mt-0.5">
                                        Ovl #{m.overallMatchNumber}
                                      </span>
                                    )}
                                  </td>

                                  {/* Map & Format Title */}
                                  <td className="py-1.5 px-3">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-800 dark:text-slate-200">
                                        🗺️ {m.mapName}
                                      </span>
                                      {m.groupName && (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                                          {m.groupName}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 block truncate max-w-[280px]">
                                      {m.format}
                                    </span>
                                  </td>

                                  {/* Schedule */}
                                  <td className="py-1.5 px-3">
                                    <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                      {(() => {
                                        if (m.matchTime) {
                                          const s = m.matchTime.trim();
                                          const match4 = s.match(/^(\d{2})(\d{2})(\s+.*)?$/);
                                          if (match4) {
                                            return `${match4[1]}:${match4[2]}${match4[3] || ''}`;
                                          }
                                          return s;
                                        }
                                        return typeof m.scheduledAt === 'string'
                                          ? m.scheduledAt.slice(0, 16)
                                          : m.scheduledAt.toISOString().slice(0, 16);
                                      })()}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                                      <span>{m.matchType === 'Online' ? '🌐 Online' : '🏟️ LAN'}</span>
                                      {m.streamUrl && (
                                        <span className="text-indigo-500 font-bold flex items-center gap-0.5">
                                          <Tv className="w-2.5 h-2.5" /> Stream
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Scorecard State */}
                                  <td className="py-1.5 px-2 text-center">
                                    <span
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                                        teamCount > 0
                                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                      }`}
                                    >
                                      <Shield className="w-3 h-3" />
                                      <span>{teamCount > 0 ? `${teamCount} Teams` : 'Unscored'}</span>
                                    </span>
                                  </td>

                                  {/* Status with Quick Toggle */}
                                  <td className="py-1.5 px-2 text-center">
                                    {updateMatchStatusAction ? (
                                      <form action={updateMatchStatusAction} className="inline-block">
                                        <input type="hidden" name="id" value={m.id} />
                                        <select
                                          name="status"
                                          defaultValue={m.status}
                                          onChange={(e) => e.target.form?.requestSubmit()}
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase cursor-pointer focus:outline-none bg-transparent ${
                                            STATUS_BADGES[m.status] ?? ''
                                          }`}
                                          title="Change match status"
                                        >
                                          <option value="SCHEDULED" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                                            SCHEDULED
                                          </option>
                                          <option value="LIVE" className="bg-white dark:bg-slate-900 text-rose-600">
                                            🔴 LIVE
                                          </option>
                                          <option value="COMPLETED" className="bg-white dark:bg-slate-900 text-emerald-600">
                                            COMPLETED
                                          </option>
                                          <option value="POSTPONED" className="bg-white dark:bg-slate-900 text-slate-500">
                                            POSTPONED
                                          </option>
                                        </select>
                                      </form>
                                    ) : (
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                          STATUS_BADGES[m.status] ?? ''
                                        }`}
                                      >
                                        {m.status}
                                      </span>
                                    )}
                                  </td>

                                  {/* Actions */}
                                  <td className="py-1.5 px-3 text-right">
                                    <div className="inline-flex items-center gap-1">
                                      {/* Edit */}
                                      <Link
                                        href={`/admin/matches?edit=${m.id}#match-editor`}
                                        className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#0A5FC4] transition-colors"
                                        title="Edit Match & Scorecard"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Link>

                                      {/* Duplicate Match (Empty clean next match) */}
                                      <form
                                        action={async (formData) => {
                                          setDuplicatingId(m.id);
                                          await duplicateMatchAction(formData);
                                          setDuplicatingId(null);
                                        }}
                                      >
                                        <input type="hidden" name="id" value={m.id} />
                                        <button
                                          type="submit"
                                          disabled={isDuplicating}
                                          className="p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-50 cursor-pointer"
                                          title="Create next match in sequence (empty clean draft)"
                                        >
                                          <Copy className="w-3.5 h-3.5" />
                                        </button>
                                      </form>

                                      {/* Delete */}
                                      <form action={deleteMatchAction}>
                                        <input type="hidden" name="id" value={m.id} />
                                        <button
                                          type="submit"
                                          className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                          title="Delete Match"
                                          onClick={(e) => {
                                            if (!confirm(`Delete "${m.format}"?`)) {
                                              e.preventDefault();
                                            }
                                          }}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </form>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
