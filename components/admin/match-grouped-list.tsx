'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  ChevronDown,
  ChevronRight,
  Shield,
  Clock,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Flame,
  Check,
  RefreshCw,
} from 'lucide-react';
import { purgeTournamentMatchesAction } from '@/app/admin/(panel)/matches/actions';

export interface MatchItem {
  id: string;
  tournamentId: string;
  stageId?: string | null;
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
  _count?: {
    matches: number;
  };
  stages?: Array<{
    id: string;
    name: string;
    _count?: {
      matches: number;
    };
  }>;
}

interface MatchGroupedListProps {
  matches: MatchItem[];
  allTournaments: TournamentOption[];
  currentTournamentId?: string;
  currentStageId?: string;
  deleteMatchAction: (formData: FormData) => Promise<void>;
  bulkDeleteMatchesAction?: (formData: FormData) => Promise<void>;
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
  currentTournamentId,
  currentStageId,
  deleteMatchAction,
  bulkDeleteMatchesAction,
  duplicateMatchAction,
  updateMatchStatusAction,
}: MatchGroupedListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Selection state for bulk operations
  const [selectedMatchIds, setSelectedMatchIds] = React.useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
  const [isPurging, setIsPurging] = React.useState(false);

  // Local selection state for controls before submission
  const [selectedTourneyId, setSelectedTourneyId] = React.useState<string>(currentTournamentId || '');
  const [selectedStageId, setSelectedStageId] = React.useState<string>(currentStageId || 'ALL');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [collapsedStages, setCollapsedStages] = React.useState<Record<string, boolean>>({});
  const [duplicatingId, setDuplicatingId] = React.useState<string | null>(null);
  const [showStageWarning, setShowStageWarning] = React.useState<boolean>(false);

  // Sync state if props change (e.g. through back/forward navigation)
  React.useEffect(() => {
    if (currentTournamentId !== undefined) {
      setSelectedTourneyId(currentTournamentId);
    }
  }, [currentTournamentId]);

  React.useEffect(() => {
    if (currentStageId !== undefined) {
      setSelectedStageId(currentStageId || 'ALL');
    } else {
      setSelectedStageId('ALL');
    }
  }, [currentStageId]);

  // Active tournament object from list
  const activeTournament = React.useMemo(
    () => allTournaments.find((t) => t.id === selectedTourneyId),
    [allTournaments, selectedTourneyId]
  );

  const activeMatchesCount = activeTournament?._count?.matches ?? 0;
  const isLargeTournament = activeMatchesCount > 100;
  const availableStages = activeTournament?.stages || [];

  // When tournament selection changes:
  const handleTournamentSelect = (tId: string) => {
    setSelectedTourneyId(tId);
    setShowStageWarning(false);
    const tourney = allTournaments.find((t) => t.id === tId);
    const count = tourney?._count?.matches ?? 0;
    const stages = tourney?.stages || [];

    if (count > 100 && stages.length > 0) {
      // Large tournament: auto-suggest first stage
      setSelectedStageId(stages[0]?.id || 'ALL');
      setShowStageWarning(true);
    } else {
      setSelectedStageId('ALL');
    }
  };

  // Trigger search params navigation (On Click or Enter)
  const triggerLoadMatches = (tourneyId = selectedTourneyId, stageId = selectedStageId) => {
    if (!tourneyId) return;

    const tourney = allTournaments.find((t) => t.id === tourneyId);
    const count = tourney?._count?.matches ?? 0;
    const stages = tourney?.stages || [];

    // If large tournament with defined stages and 'ALL' or empty selected, encourage picking a stage
    if (count > 100 && stages.length > 0 && (!stageId || stageId === 'ALL')) {
      setShowStageWarning(true);
      stageId = stages[0]?.id || 'ALL';
    }

    startTransition(() => {
      const params = new URLSearchParams();
      params.set('tournamentId', tourneyId);
      if (stageId && stageId !== 'ALL') {
        params.set('stageId', stageId);
      }
      router.push(`/admin/matches?${params.toString()}`);
    });
  };

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

  // Filter matches currently loaded in memory
  const filteredMatches = React.useMemo(() => {
    return matches.filter((m) => {
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;

      let stg = m.stage?.name || m.stageType;
      if (!stg && m.format?.includes(' · ')) {
        stg = m.format.split(' · ')[1]?.split(' (')[0];
      }
      if (!stg) stg = 'Grand Finals';

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
  }, [matches, statusFilter, searchQuery]);

  // Summary statistics for loaded matches
  const stats = React.useMemo(() => {
    const total = filteredMatches.length;
    const completed = filteredMatches.filter((m) => m.status === 'COMPLETED').length;
    const live = filteredMatches.filter((m) => m.status === 'LIVE').length;
    const scheduled = filteredMatches.filter((m) => m.status === 'SCHEDULED').length;
    return { total, completed, live, scheduled };
  }, [filteredMatches]);

  // Group loaded matches by Tournament -> Stage
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

  const isLoaded = Boolean(currentTournamentId);
  const loadedTournament = allTournaments.find((t) => t.id === currentTournamentId);

  return (
    <div className="space-y-4">
      {/* ═══ MASTER CONTROL BAR: SELECT TOURNAMENT + STAGE & HIT ENTER / LOAD ═══ */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-3 shadow-xs space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            triggerLoadMatches();
          }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-2.5"
        >
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0 font-black text-xs uppercase tracking-tight text-slate-800 dark:text-slate-200">
              <Trophy className="w-4 h-4 text-(--ed-blue)" />
              <span>Event:</span>
            </div>

            {/* Tournament Selector Dropdown */}
            <select
              value={selectedTourneyId}
              onChange={(e) => handleTournamentSelect(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-(--ed-blue) cursor-pointer max-w-[280px] sm:max-w-[360px] truncate"
            >
              <option value="">-- Select a Tournament --</option>
              {allTournaments.map((t) => {
                const count = t._count?.matches ?? 0;
                return (
                  <option key={t.id} value={t.id}>
                    🏆 {t.name} ({count} {count === 1 ? 'match' : 'matches'})
                  </option>
                );
              })}
            </select>

            {/* Stage Selector Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">
                Stage:
              </span>
              <select
                value={selectedStageId}
                disabled={!selectedTourneyId || availableStages.length === 0}
                onChange={(e) => {
                  setSelectedStageId(e.target.value);
                  setShowStageWarning(false);
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-(--ed-blue) cursor-pointer max-w-[220px] truncate transition-colors ${
                  showStageWarning
                    ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 disabled:opacity-50'
                }`}
              >
                {!isLargeTournament && <option value="ALL">All Stages ({activeMatchesCount})</option>}
                {isLargeTournament && (
                  <option value="ALL" disabled>
                    Select a Stage ({activeMatchesCount} matches)
                  </option>
                )}
                {availableStages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s._count?.matches !== undefined ? `(${s._count.matches})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Load Button (or press Enter) */}
            <button
              type="submit"
              disabled={!selectedTourneyId || isPending}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-(--ed-blue) hover:brightness-110 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer"
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Loading…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  <span>Load Matches</span>
                  <span className="text-[9px] opacity-75 font-mono ml-0.5">(↵)</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Filter & Add Match for loaded tournament */}
          {isLoaded && (
            <div className="flex items-center gap-2 shrink-0">
              {/* Search Filter */}
              <div className="relative w-36 sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter matches…"
                  className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-(--ed-blue)"
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

              {/* Add Match Button */}
              <Link
                href={`/admin/matches?tournamentId=${currentTournamentId}${
                  currentStageId && currentStageId !== 'ALL' ? `&stageId=${currentStageId}` : ''
                }&openNew=1#match-editor`}
                className="px-3 py-1 text-xs rounded-lg bg-(--ed-blue) hover:brightness-110 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Match</span>
              </Link>

              {/* Wipe All Matches Button */}
              <button
                type="button"
                disabled={isPurging || matches.length === 0}
                onClick={async () => {
                  if (
                    !confirm(
                      `🚨 DANGER ZONE: Are you sure you want to WIPE ALL MATCHES for "${loadedTournament?.name || 'this tournament'}"?\n\nThis will permanently delete all matches, games, team results, and player performance stats. This cannot be undone.`
                    )
                  ) {
                    return;
                  }
                  setIsPurging(true);
                  const res = await purgeTournamentMatchesAction(currentTournamentId!);
                  setIsPurging(false);
                  if (res.success) {
                    router.refresh();
                  } else {
                    alert(res.message || 'Failed to wipe tournament matches');
                  }
                }}
                className="px-2.5 py-1 text-xs rounded-lg border border-rose-500/30 hover:border-rose-500 bg-rose-500/10 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                title="Wipe all matches in this tournament"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isPurging ? 'Wiping...' : 'Wipe All'}</span>
              </button>
            </div>
          )}
        </form>

        {/* Large Tournament Notice when needed */}
        {showStageWarning && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              This tournament contains <strong>{activeMatchesCount} matches</strong>. Please select a specific stage
              above or hit <strong>Load Matches</strong> to view that stage.
            </span>
          </div>
        )}

        {/* Loaded View Header Controls: Stage Pills + Micro Stats */}
        {isLoaded && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Stage Quick Switch Tabs */}
            {loadedTournament?.stages && loadedTournament.stages.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0">
                  Stages:
                </span>
                {/* All Stages Tab (Allowed if tournament <= 100 matches) */}
                {(loadedTournament._count?.matches ?? 0) <= 100 && (
                  <button
                    type="button"
                    onClick={() => triggerLoadMatches(currentTournamentId, 'ALL')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                      !currentStageId || currentStageId === 'ALL'
                        ? 'bg-(--ed-blue) text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    All ({loadedTournament._count?.matches ?? 0})
                  </button>
                )}
                {loadedTournament.stages.map((stg) => {
                  const isActive = currentStageId === stg.id;
                  return (
                    <button
                      key={stg.id}
                      type="button"
                      onClick={() => triggerLoadMatches(currentTournamentId, stg.id)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                        isActive
                          ? 'bg-(--ed-blue) text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{stg.name}</span>
                      {stg._count?.matches !== undefined && (
                        <span className="opacity-75 text-[10px] font-mono">({stg._count.matches})</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Status Filter & Stats */}
            <div className="flex items-center gap-3 text-[11px] shrink-0 justify-between sm:justify-end">
              {/* Status Toggles */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-[11px] font-bold">
                {['ALL', 'SCHEDULED', 'LIVE', 'COMPLETED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-white dark:bg-slate-800 text-(--ed-blue) dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st === 'SCHEDULED' ? 'Upcoming' : st === 'LIVE' ? '🔴 Live' : 'Done'}
                  </button>
                ))}
              </div>

              {/* Expand / Collapse */}
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                <button
                  type="button"
                  onClick={expandAll}
                  className="hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  Expand All
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  Collapse All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ EMPTY STATE: WHEN NO TOURNAMENT IS LOADED YET ═══ */}
      {!isLoaded && (
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-8 text-center space-y-6">
          <div className="max-w-md mx-auto space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <Swords className="w-6 h-6" />
            </div>
            <h2 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Select a Tournament to Load Matches
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              To keep your match administration lightning-fast, matches and player scorecards are loaded on demand. Select a tournament above or choose from recent tournaments below.
            </p>
          </div>

          {/* Quick-Pick Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto text-left">
            {allTournaments.slice(0, 6).map((t) => {
              const count = t._count?.matches ?? 0;
              const stageCount = t.stages?.length ?? 0;
              const isLarge = count > 100;

              return (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-(--ed-blue)/50 dark:hover:border-blue-500/50 transition-all flex flex-col justify-between gap-3 group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider font-mono ${
                          count > 0
                            ? isLarge
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {count} {count === 1 ? 'Match' : 'Matches'}
                      </span>
                      {stageCount > 0 && (
                        <span className="text-[10px] font-mono text-slate-400">{stageCount} Stages</span>
                      )}
                    </div>
                    <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-(--ed-blue) transition-colors line-clamp-2">
                      {t.name}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTourneyId(t.id);
                      if (isLarge && stageCount > 0) {
                        triggerLoadMatches(t.id, t.stages?.[0]?.id);
                      } else {
                        triggerLoadMatches(t.id, 'ALL');
                      }
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 hover:bg-(--ed-blue) hover:text-white border border-slate-200 dark:border-slate-700 hover:border-transparent text-xs font-bold text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>Load {isLarge ? `${t.stages?.[0]?.name || 'Stage 1'}` : 'Matches'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ HIGH-VOLUME TOURNAMENT STAGE SELECTOR PROMPT (When loaded without specific stage) ═══ */}
      {isLoaded && isLargeTournament && (!currentStageId || currentStageId === 'ALL') && matches.length === 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-center space-y-4">
          <div className="max-w-md mx-auto space-y-1.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Select a Stage to Load Matches
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <strong>{loadedTournament?.name}</strong> has <strong>{activeMatchesCount} matches</strong> across{' '}
              <strong>{availableStages.length} stages</strong>. Please choose a stage below:
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-3xl mx-auto text-left">
            {availableStages.map((stg) => (
              <button
                key={stg.id}
                type="button"
                onClick={() => triggerLoadMatches(currentTournamentId, stg.id)}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] hover:border-(--ed-blue) dark:hover:border-blue-500 transition-all text-left group cursor-pointer shadow-2xs"
              >
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-(--ed-blue) truncate">
                  {stg.name}
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">
                  {stg._count?.matches !== undefined ? `${stg._count.matches} matches` : 'View matches'} →
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ HIGH-DENSITY MATCH TABLES GROUPED BY STAGES ═══ */}
      {isLoaded && groupedData.length === 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-8 text-center">
          <Layers className="w-6 h-6 text-slate-300 dark:text-slate-700 mx-auto mb-1.5" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            No matches found for this stage or filter.
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Try choosing a different stage or add a new match using the button above.
          </p>
        </div>
      )}

      {isLoaded && groupedData.length > 0 && (
        <div className="space-y-3">
          {groupedData.map((tourney) => (
            <div key={tourney.tournamentId} className="space-y-2">
              {tourney.stageList.map(({ stageName, matches: stageMatches }) => {
                const stageKey = `${tourney.tournamentId}-${stageName}`;
                const isCollapsed = Boolean(collapsedStages[stageKey]);
                const maps = Array.from(new Set(stageMatches.map((m) => m.mapName)));

                return (
                  <div
                    key={stageKey}
                    className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0b101c] overflow-hidden shadow-2xs"
                  >
                    {/* Stage Sub-header */}
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
                          href={`/admin/matches?tournamentId=${tourney.tournamentId}${
                            currentStageId && currentStageId !== 'ALL' ? `&stageId=${currentStageId}` : ''
                          }&stage=${encodeURIComponent(stageName)}&openNew=1#match-editor`}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
                          title="Add next match in this stage"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Match</span>
                        </Link>
                        <button
                          type="button"
                          disabled={isPurging}
                          onClick={async () => {
                            if (
                              !confirm(
                                `⚠️ Are you sure you want to WIPE ALL ${stageMatches.length} MATCHES in stage "${stageName}"?\n\nThis will permanently delete all matches, match games, team scorecards, and player stats in this stage. This cannot be undone.`
                              )
                            ) {
                              return;
                            }
                            setIsPurging(true);
                            const res = await purgeTournamentMatchesAction(
                              tourney.tournamentId,
                              stageMatches[0]?.stageId || stageName
                            );
                            setIsPurging(false);
                            if (res.success) {
                              router.refresh();
                            } else {
                              alert(res.message || 'Failed to wipe stage matches');
                            }
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500 hover:text-white dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title={`Wipe all matches in stage ${stageName}`}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span className="hidden sm:inline">Wipe Stage</span>
                        </button>
                      </div>
                    </div>

                    {/* High Density Match Table */}
                    {!isCollapsed && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs min-w-[660px]">
                          <thead>
                            <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-white dark:bg-[#0b101c] border-b border-slate-100 dark:border-slate-800/80">
                              <th className="py-1.5 px-2 text-center w-8">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300 dark:border-slate-700 text-(--ed-blue) focus:ring-(--ed-blue) cursor-pointer"
                                  checked={stageMatches.length > 0 && stageMatches.every((m) => selectedMatchIds.has(m.id))}
                                  onChange={(e) => {
                                    const next = new Set(selectedMatchIds);
                                    if (e.target.checked) {
                                      stageMatches.forEach((m) => next.add(m.id));
                                    } else {
                                      stageMatches.forEach((m) => next.delete(m.id));
                                    }
                                    setSelectedMatchIds(next);
                                  }}
                                  title="Select all in this stage"
                                />
                              </th>
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
                              const isDuplicating = duplicatingId === m.id;
                              const isSelected = selectedMatchIds.has(m.id);

                              return (
                                <tr
                                  key={m.id}
                                  className={`transition-colors ${
                                    isSelected
                                      ? 'bg-blue-50/60 dark:bg-blue-950/20'
                                      : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
                                  }`}
                                >
                                  {/* Selection Checkbox */}
                                  <td className="py-1.5 px-2 text-center">
                                    <input
                                      type="checkbox"
                                      className="rounded border-slate-300 dark:border-slate-700 text-(--ed-blue) focus:ring-(--ed-blue) cursor-pointer"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const next = new Set(selectedMatchIds);
                                        if (e.target.checked) {
                                          next.add(m.id);
                                        } else {
                                          next.delete(m.id);
                                        }
                                        setSelectedMatchIds(next);
                                      }}
                                    />
                                  </td>

                                  {/* Match Number */}
                                  <td className="py-1.5 px-3">
                                    <span className="font-mono font-black text-(--ed-blue) dark:text-blue-400 text-xs">
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
                                        <input type="hidden" name="tournamentId" value={m.tournamentId} />
                                        <input type="hidden" name="stageId" value={currentStageId || ''} />
                                        <select
                                          name="status"
                                          defaultValue={m.status}
                                          onChange={(e) => e.target.form?.requestSubmit()}
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase cursor-pointer focus:outline-none bg-transparent ${
                                            STATUS_BADGES[m.status] ?? ''
                                          }`}
                                          title="Change match status"
                                        >
                                          <option
                                            value="SCHEDULED"
                                            className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                                          >
                                            SCHEDULED
                                          </option>
                                          <option value="LIVE" className="bg-white dark:bg-slate-900 text-rose-600">
                                            🔴 LIVE
                                          </option>
                                          <option
                                            value="COMPLETED"
                                            className="bg-white dark:bg-slate-900 text-emerald-600"
                                          >
                                            COMPLETED
                                          </option>
                                          <option
                                            value="POSTPONED"
                                            className="bg-white dark:bg-slate-900 text-slate-500"
                                          >
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
                                        href={`/admin/matches?edit=${m.id}&tournamentId=${m.tournamentId}${
                                          currentStageId && currentStageId !== 'ALL' ? `&stageId=${currentStageId}` : ''
                                        }#match-editor`}
                                        className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-(--ed-blue) transition-colors"
                                        title="Edit Match & Scorecard"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Link>

                                      {/* Duplicate Match */}
                                      <form
                                        action={async (formData) => {
                                          setDuplicatingId(m.id);
                                          await duplicateMatchAction(formData);
                                          setDuplicatingId(null);
                                        }}
                                      >
                                        <input type="hidden" name="id" value={m.id} />
                                        <input type="hidden" name="tournamentId" value={m.tournamentId} />
                                        <input type="hidden" name="stageId" value={currentStageId || ''} />
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
                                        <input type="hidden" name="tournamentId" value={m.tournamentId} />
                                        <input type="hidden" name="stageId" value={currentStageId || ''} />
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

      {/* Floating Bulk Action Bar */}
      {selectedMatchIds.size > 0 && bulkDeleteMatchesAction && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white shadow-2xl backdrop-blur-md border border-slate-700 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-bold font-mono">
              {selectedMatchIds.size} match{selectedMatchIds.size > 1 ? 'es' : ''} selected
            </span>
          </div>
          <div className="h-4 w-[1px] bg-slate-700" />
          <button
            type="button"
            onClick={() => setSelectedMatchIds(new Set())}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Deselect all
          </button>
          <form
            action={async (formData) => {
              if (
                !confirm(
                  `Are you sure you want to permanently delete these ${selectedMatchIds.size} matches along with all linked team scorecards and individual player stats? This action cannot be undone.`
                )
              ) {
                return;
              }
              setIsBulkDeleting(true);
              formData.set('matchIds', JSON.stringify(Array.from(selectedMatchIds)));
              formData.set('tournamentId', currentTournamentId || '');
              formData.set('stageId', currentStageId || '');
              await bulkDeleteMatchesAction(formData);
              setSelectedMatchIds(new Set());
              setIsBulkDeleting(false);
            }}
          >
            <button
              type="submit"
              disabled={isBulkDeleting}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedMatchIds.size})`}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
