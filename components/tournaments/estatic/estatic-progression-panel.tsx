'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Crown,
  Route,
  Layers,
  Swords,
  Users,
  ShieldCheck,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Star,
  Zap,
  ArrowRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { ThemeLogo } from './theme-logo';
import {
  type StandingsConfig,
  type ZoneRule,
  resolveZoneTargetStage,
} from '@/lib/standings-config';
import { calculateTournamentStandings } from '@/lib/tournament-math';
import type { TeamPerformanceRow } from '../tournament-statistics-panel';

export interface StagePerformanceSummary {
  stageId?: string;
  stageName: string;
  sequence: number;
  matchesPlayed: number;
  totalPoints: number;
  wwcdCount: number;
  elimsCount: number;
  placePoints: number;
  stageRank: number | null;
  isQualifyingStage: boolean;
}

export interface GrandFinalistEntry {
  teamId: string;
  teamName: string;
  teamTag: string | null;
  teamSlug: string | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  country: string | null;
  slotNumber: number;
  routeLabel: string;
  sourceStageName: string;
  sourceType: 'ZONE' | 'SEED' | 'MATCH' | 'STANDINGS';
  zoneColor: string;
  isConfirmed: boolean;
  totalMatchesPlayed: number;
  totalPoints: number;
  wwcdCount: number;
  elimsCount: number;
  avgPoints: number;
  stagesJourney: StagePerformanceSummary[];
  qualifyingStageName: string | null;
  roster: Array<{ ign: string; role?: string | null; captain?: boolean }>;
}

interface EstaticProgressionPanelProps {
  tournament: {
    id: string;
    name: string;
    slug: string;
    formatDetails?: any;
    qualifications?: any;
  };
  stages: Array<{ id: string; name: string; sequence: number }>;
  teams: Array<{
    id: string;
    teamId: string;
    seed?: number | null;
    seedLabel?: string | null;
    displayName?: string | null;
    shortName?: string | null;
    country?: string | null;
    logoUrl?: string | null;
    logoDarkUrl?: string | null;
    rosterJson?: any;
    team: {
      id: string;
      name: string;
      tag?: string | null;
      slug?: string | null;
      logoUrl?: string | null;
      imageDarkUrl?: string | null;
      region?: string | null;
    };
  }>;
  matches: Array<{
    id: string;
    stageId?: string | null;
    stage?: { name: string } | null;
    groupName?: string | null;
    status: string;
    scheduledAt: any;
    games: Array<{
      teamResults: Array<{
        teamId: string;
        rank: number;
        wwcd: boolean;
        placePoints: number;
        elimsPoints: number;
        totalPoints: number;
      }>;
    }>;
  }>;
  teamPerformanceRows: TeamPerformanceRow[];
  standingsConfig: StandingsConfig;
}

// Stage name short abbreviations
function getStageAbbreviation(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('playoff')) return 'Playoffs';
  if (lower.includes('super weekend 1')) return 'SW1';
  if (lower.includes('super weekend 2')) return 'SW2';
  if (lower.includes('super weekend 3')) return 'SW3';
  if (lower.includes('bounty weekend')) return 'Bounty';
  if (lower.includes('league week 1') || lower === 'week 1') return 'LW1';
  if (lower.includes('league week 2') || lower === 'week 2') return 'LW2';
  if (lower.includes('league week 3') || lower === 'week 3') return 'LW3';
  if (lower.includes('launch week')) return 'Launch';
  if (lower.includes('group stage')) return 'Groups';
  if (lower.includes('semifinal')) return 'Semis';
  if (lower.includes('grand final') || lower === 'finals') return 'Finals';
  return name.length > 8 ? `${name.slice(0, 7)}…` : name;
}

export function EstaticProgressionPanel({
  tournament,
  stages,
  teams,
  matches,
  teamPerformanceRows,
  standingsConfig,
}: EstaticProgressionPanelProps) {
  // Target Finals Stage Name
  const targetFinalsStage = useMemo(() => {
    const finals = stages.find(
      (s) => s.name.toLowerCase().includes('grand final') || s.name.toLowerCase() === 'finals'
    );
    return finals?.name || stages[stages.length - 1]?.name || 'Grand Finals';
  }, [stages]);

  const stageNames = useMemo(() => stages.map((s) => s.name), [stages]);

  // Pre-calculate per-stage team ranks & standings
  const stageStandingsMap = useMemo(() => {
    const map = new Map<
      string,
      Map<string, { rank: number; totalPoints: number; wwcd: number; matchesPlayed: number; elims: number; placePoints: number }>
    >();

    for (const stage of stages) {
      const stageMatches = matches.filter(
        (m) => m.stage?.name?.toLowerCase() === stage.name.toLowerCase()
      );
      if (stageMatches.length === 0) continue;

      const teamResults = stageMatches.flatMap((m) => m.games.flatMap((g) => g.teamResults));
      if (teamResults.length === 0) continue;

      const computed = calculateTournamentStandings(teamResults);
      const teamMap = new Map<
        string,
        { rank: number; totalPoints: number; wwcd: number; matchesPlayed: number; elims: number; placePoints: number }
      >();

      for (const st of computed) {
        teamMap.set(st.teamId, {
          rank: st.rank,
          totalPoints: st.totalPoints,
          wwcd: st.wwcd,
          matchesPlayed: st.matchesPlayed,
          elims: st.eliminationPoints,
          placePoints: st.placementPoints,
        });
      }
      map.set(stage.name.toLowerCase(), teamMap);
    }
    return map;
  }, [stages, matches]);

  // Performance map lookup by teamId
  const perfMap = useMemo(() => {
    const map = new Map<string, TeamPerformanceRow>();
    for (const row of teamPerformanceRows) {
      map.set(row.teamId, row);
    }
    return map;
  }, [teamPerformanceRows]);

  // Team meta lookup
  const teamMetaMap = useMemo(() => {
    const map = new Map<string, (typeof teams)[0]>();
    for (const tt of teams) {
      map.set(tt.teamId, tt);
    }
    return map;
  }, [teams]);

  // Discover all qualified teams for Grand Finals
  const finalists = useMemo(() => {
    const results: GrandFinalistEntry[] = [];
    const seenTeamIds = new Set<string>();

    // 1. Gather all linked qualification zones targeting Grand Finals
    const linkedZoneSources: Array<{
      sourceStageName: string;
      zone: ZoneRule;
      itemType: 'STAGE' | 'CUSTOM_TAB';
      includeStages?: string[];
    }> = [];

    // Check Tab Groups (Hierarchical Sub-Divisions)
    if (standingsConfig.tabGroups) {
      for (const grp of standingsConfig.tabGroups) {
        for (const item of grp.items) {
          for (const z of item.zones || []) {
            const zTarget = resolveZoneTargetStage(z, stageNames);
            if (zTarget && zTarget.toLowerCase() === targetFinalsStage.toLowerCase()) {
              linkedZoneSources.push({
                sourceStageName: item.label || item.stageName || grp.name,
                zone: z,
                itemType: item.type === 'STAGE' ? 'STAGE' : 'CUSTOM_TAB',
                includeStages: item.includeStages || (item.stageName ? [item.stageName] : undefined),
              });
            }
          }
        }
      }
    }

    // Check Custom Tabs
    if (standingsConfig.customTabs) {
      for (const tab of standingsConfig.customTabs) {
        for (const z of tab.zones || []) {
          const zTarget = resolveZoneTargetStage(z, stageNames);
          if (zTarget && zTarget.toLowerCase() === targetFinalsStage.toLowerCase()) {
            linkedZoneSources.push({
              sourceStageName: tab.label,
              zone: z,
              itemType: 'CUSTOM_TAB',
              includeStages: tab.includeStages,
            });
          }
        }
      }
    }

    // Process each qualifying zone source
    for (const source of linkedZoneSources) {
      let sourceMatches = matches;
      if (source.includeStages && source.includeStages.length > 0) {
        sourceMatches = matches.filter((m) => {
          const stName = m.stage?.name || '';
          return source.includeStages!.some((s) => s.toLowerCase() === stName.toLowerCase());
        });
      }

      const teamResults = sourceMatches.flatMap((m) => m.games.flatMap((g) => g.teamResults));
      if (teamResults.length === 0) continue;

      const stageStandings = calculateTournamentStandings(teamResults);
      const qualifyingRankStandings = stageStandings.filter(
        (t) => t.rank >= source.zone.from && t.rank <= source.zone.to
      );

      for (const st of qualifyingRankStandings) {
        if (seenTeamIds.has(st.teamId)) continue;
        seenTeamIds.add(st.teamId);

        const tt = teamMetaMap.get(st.teamId);
        const perf = perfMap.get(st.teamId);
        const roster = Array.isArray(tt?.rosterJson) ? tt!.rosterJson : [];

        // Build route label
        const isTargetName =
          !source.zone.label || source.zone.label.toLowerCase() === targetFinalsStage.toLowerCase();
        const routeDesc = isTargetName
          ? `Top ${source.zone.to} in ${source.sourceStageName} (Rank #${st.rank})`
          : `${source.zone.label} via ${source.sourceStageName} (Rank #${st.rank})`;

        // Build chronological stage journey for this team
        const stagesJourney: StagePerformanceSummary[] = [];
        const qualifyingStageNormalized = source.sourceStageName.toLowerCase();

        // All tournament stages excluding Grand Finals itself
        const precedingStages = stages
          .filter((s) => s.name.toLowerCase() !== targetFinalsStage.toLowerCase())
          .sort((a, b) => a.sequence - b.sequence);

        for (const s of precedingStages) {
          const stageStandingData = stageStandingsMap.get(s.name.toLowerCase())?.get(st.teamId);
          const stagePerf = perf?.stageStats?.[s.name];

          const mp = stageStandingData?.matchesPlayed || stagePerf?.matchesPlayed || 0;
          if (mp > 0) {
            const isQualStage =
              s.name.toLowerCase() === qualifyingStageNormalized ||
              qualifyingStageNormalized.includes(s.name.toLowerCase()) ||
              s.name.toLowerCase().includes(qualifyingStageNormalized);

            stagesJourney.push({
              stageId: s.id,
              stageName: s.name,
              sequence: s.sequence,
              matchesPlayed: mp,
              totalPoints: stageStandingData?.totalPoints ?? stagePerf?.totalPoints ?? 0,
              wwcdCount: stageStandingData?.wwcd ?? stagePerf?.wwcdCount ?? 0,
              elimsCount: stageStandingData?.elims ?? stagePerf?.elims ?? 0,
              placePoints: stageStandingData?.placePoints ?? stagePerf?.placePoints ?? 0,
              stageRank: stageStandingData?.rank ?? null,
              isQualifyingStage: isQualStage,
            });
          }
        }

        results.push({
          teamId: st.teamId,
          teamName: tt?.displayName || tt?.team?.name || st.teamName,
          teamTag: tt?.shortName || tt?.team?.tag || st.tag || null,
          teamSlug: tt?.team?.slug || null,
          logoUrl: tt?.logoUrl || tt?.team?.logoUrl || null,
          logoDarkUrl: tt?.logoDarkUrl || tt?.team?.imageDarkUrl || null,
          country: tt?.country || tt?.team?.region || null,
          slotNumber: results.length + 1,
          routeLabel: routeDesc,
          sourceStageName: source.sourceStageName,
          sourceType: 'ZONE',
          zoneColor: (source.zone.color as string) || 'emerald',
          isConfirmed: true,
          totalMatchesPlayed: perf?.matchesPlayed || st.matchesPlayed || 0,
          totalPoints: perf?.totalPoints || st.totalPoints || 0,
          wwcdCount: perf?.wwcdCount || st.wwcd || 0,
          elimsCount: perf?.totalElimsPoints || st.eliminationPoints || 0,
          avgPoints: perf?.avgTotalPoints || Number((st.totalPoints / (st.matchesPlayed || 1)).toFixed(2)),
          stagesJourney,
          qualifyingStageName: source.sourceStageName,
          roster,
        });
      }
    }

    // 2. Fallback if no zones configured: top overall teams
    if (results.length === 0) {
      const topTeams = teamPerformanceRows.slice(0, 16);
      topTeams.forEach((tRow, idx) => {
        const tt = teamMetaMap.get(tRow.teamId);
        const precedingStages = stages
          .filter((s) => s.name.toLowerCase() !== targetFinalsStage.toLowerCase())
          .sort((a, b) => a.sequence - b.sequence);

        const stagesJourney: StagePerformanceSummary[] = [];
        for (const s of precedingStages) {
          const stagePerf = tRow.stageStats?.[s.name];
          const mp = stagePerf?.matchesPlayed || 0;
          if (mp > 0) {
            stagesJourney.push({
              stageId: s.id,
              stageName: s.name,
              sequence: s.sequence,
              matchesPlayed: mp,
              totalPoints: stagePerf?.totalPoints || 0,
              wwcdCount: stagePerf?.wwcdCount || 0,
              elimsCount: stagePerf?.elims || 0,
              placePoints: stagePerf?.placePoints || 0,
              stageRank: null,
              isQualifyingStage: idx < 16,
            });
          }
        }

        results.push({
          teamId: tRow.teamId,
          teamName: tRow.teamName,
          teamTag: tRow.teamTag,
          teamSlug: tRow.teamSlug,
          logoUrl: tRow.teamLogo,
          logoDarkUrl: tRow.teamLogoDark,
          country: tt?.country || tt?.team?.region || null,
          slotNumber: idx + 1,
          routeLabel: `Overall Standings (Rank #${idx + 1})`,
          sourceStageName: 'Overall Standings',
          sourceType: 'STANDINGS',
          zoneColor: 'emerald',
          isConfirmed: true,
          totalMatchesPlayed: tRow.matchesPlayed,
          totalPoints: tRow.totalPoints,
          wwcdCount: tRow.wwcdCount,
          elimsCount: tRow.totalElimsPoints,
          avgPoints: tRow.avgTotalPoints,
          stagesJourney,
          qualifyingStageName: 'Overall Standings',
          roster: Array.isArray(tt?.rosterJson) ? tt!.rosterJson : [],
        });
      });
    }

    return results;
  }, [
    stages,
    matches,
    standingsConfig,
    stageNames,
    targetFinalsStage,
    teamMetaMap,
    perfMap,
    stageStandingsMap,
    teamPerformanceRows,
  ]);

  // Unique qualification routes
  const uniqueRoutes = useMemo(() => {
    const map = new Map<string, number>();
    finalists.forEach((t) => {
      map.set(t.sourceStageName, (map.get(t.sourceStageName) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [finalists]);

  // Controls state
  const [routeFilter, setRouteFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<'slot' | 'matches' | 'points'>('slot');
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [activeTooltipStage, setActiveTooltipStage] = useState<{
    teamId: string;
    stageName: string;
  } | null>(null);

  // Filter & Sort
  const displayedFinalists = useMemo(() => {
    let list = [...finalists];

    // Filter by route
    if (routeFilter !== 'ALL') {
      list = list.filter((t) => t.sourceStageName.toLowerCase() === routeFilter.toLowerCase());
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.teamName.toLowerCase().includes(q) ||
          (t.teamTag && t.teamTag.toLowerCase().includes(q)) ||
          t.routeLabel.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortOption === 'matches') {
      list.sort((a, b) => b.totalMatchesPlayed - a.totalMatchesPlayed);
    } else if (sortOption === 'points') {
      list.sort((a, b) => b.totalPoints - a.totalPoints);
    } else {
      list.sort((a, b) => a.slotNumber - b.slotNumber);
    }

    return list;
  }, [finalists, routeFilter, searchQuery, sortOption]);

  // Max matches played across finalists for intensity calculation
  const maxMatchesPlayed = useMemo(() => {
    return Math.max(...finalists.map((f) => f.totalMatchesPlayed), 1);
  }, [finalists]);

  // Average matches played to reach finals
  const avgMatchesToReach = useMemo(() => {
    if (finalists.length === 0) return 0;
    const total = finalists.reduce((acc, f) => acc + f.totalMatchesPlayed, 0);
    return (total / finalists.length).toFixed(1);
  }, [finalists]);

  const toggleExpand = (teamId: string) => {
    setExpandedTeamId((prev) => (prev === teamId ? null : teamId));
  };

  return (
    <div className="space-y-8">
      {/* ================= 1. PROGRESSION MASTHEAD ================= */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
        {/* Ambient Glow */}
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-gradient-to-br from-amber-400/10 via-blue-500/10 to-transparent blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#0A5FC4] dark:text-blue-300">
              <Sparkles className="h-4 w-4" />
              <span>Championship Journey</span>
            </div>
            <h2 className="mt-1.5 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Road to {targetFinalsStage}
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 max-w-xl">
              Stage-by-stage battle progression showing every tournament stage played by the 16 qualified squads to earn their championship finals ticket.
            </p>
          </div>

          {/* Quick Stats Band */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-center dark:border-white/5 dark:bg-white/5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Finals Slots</span>
              <span className="text-xl font-black text-amber-500">16 / 16</span>
              <span className="text-[10px] font-bold text-slate-400 block">Confirmed</span>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-center dark:border-white/5 dark:bg-white/5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Routes</span>
              <span className="text-xl font-black text-[#0A5FC4] dark:text-blue-300">{uniqueRoutes.length} Paths</span>
              <span className="text-[10px] font-bold text-slate-400 block">Playoffs & SW</span>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-center dark:border-white/5 dark:bg-white/5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Avg Battle MP</span>
              <span className="text-xl font-black text-emerald-500">{avgMatchesToReach}</span>
              <span className="text-[10px] font-bold text-slate-400 block">Matches to Finals</span>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-center dark:border-white/5 dark:bg-white/5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Max Journey</span>
              <span className="text-xl font-black text-slate-900 dark:text-white">{maxMatchesPlayed}m</span>
              <span className="text-[10px] font-bold text-slate-400 block">Most Matches</span>
            </div>
          </div>
        </div>

        {/* ================= 2. FILTER & SORT TOOLBAR ================= */}
        <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-6 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          {/* Pathway Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setRouteFilter('ALL')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                routeFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10'
              }`}
            >
              <span>All Finalists</span>
              <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] dark:bg-white/20">
                {finalists.length}
              </span>
            </button>

            {uniqueRoutes.map((r) => {
              const active = routeFilter.toLowerCase() === r.name.toLowerCase();
              return (
                <button
                  key={r.name}
                  onClick={() => setRouteFilter(r.name)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    active
                      ? 'bg-[#0A5FC4] text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10'
                  }`}
                >
                  <span>{r.name}</span>
                  <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] dark:bg-white/10">
                    {r.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-3">
            {/* Search input */}
            <div className="relative min-w-[180px] sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search finalist squad..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#0A5FC4] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            {/* Sort Selector */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:border-[#0A5FC4] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300 cursor-pointer"
            >
              <option value="slot">Sort: Finalist Slot #</option>
              <option value="matches">Sort: Matches to Qualify</option>
              <option value="points">Sort: Total Points</option>
            </select>
          </div>
        </div>
      </section>

      {/* ================= 3. PROGRESSION TIMELINE MATRIX ================= */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
        {/* Table Header */}
        <div className="hidden lg:grid grid-cols-[260px_1fr_160px] xl:grid-cols-[280px_1fr_180px] items-center border-b border-slate-200 bg-slate-50/90 px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-white/5">
          <div>Qualified Squad & Pathway</div>
          <div className="text-center">Tournament Stages Battled Through ➔ {targetFinalsStage}</div>
          <div className="text-right">Total Matches Played</div>
        </div>

        {/* Squad Rows */}
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {displayedFinalists.map((team) => {
            const isExpanded = expandedTeamId === team.teamId;
            const matchPercentage = Math.round((team.totalMatchesPlayed / maxMatchesPlayed) * 100);

            return (
              <div
                key={team.teamId}
                className={`transition-colors duration-150 ${
                  isExpanded ? 'bg-blue-50/40 dark:bg-blue-950/20' : 'hover:bg-slate-50/60 dark:hover:bg-white/[0.02]'
                }`}
              >
                {/* Main Interactive Row */}
                <div
                  onClick={() => toggleExpand(team.teamId)}
                  className="grid grid-cols-1 lg:grid-cols-[260px_1fr_160px] xl:grid-cols-[280px_1fr_180px] items-center gap-4 p-5 sm:p-6 cursor-pointer select-none"
                >
                  {/* --- LEFT COLUMN: Team Identity --- */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-900 shadow-2xs dark:bg-white/10 dark:text-white">
                      #{team.slotNumber}
                    </span>

                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/30">
                      {team.logoUrl || team.logoDarkUrl ? (
                        <ThemeLogo
                          lightSrc={team.logoUrl}
                          darkSrc={team.logoDarkUrl}
                          alt={team.teamName}
                          className="object-contain p-1"
                        />
                      ) : (
                        <span className="text-xs font-black text-slate-400">
                          {team.teamName.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <h4 className="truncate text-sm font-black text-slate-900 dark:text-white">
                          {team.teamName}
                        </h4>
                        {team.teamTag && (
                          <span className="text-[10px] font-extrabold uppercase text-slate-400 shrink-0">
                            [{team.teamTag}]
                          </span>
                        )}
                      </div>

                      {/* How They Qualified Ticket Pill */}
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                        <span className="truncate">{team.routeLabel}</span>
                      </div>
                    </div>
                  </div>

                  {/* --- MIDDLE COLUMN: Interactive Stage Journey Track --- */}
                  <div className="flex items-center justify-start lg:justify-center overflow-x-auto no-scrollbar py-2 px-1">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      {team.stagesJourney.map((stageItem) => {
                        const isQualifying = stageItem.isQualifyingStage;
                        const isTooltipActive =
                          activeTooltipStage?.teamId === team.teamId &&
                          activeTooltipStage?.stageName === stageItem.stageName;

                        return (
                          <React.Fragment key={stageItem.stageName}>
                            {/* Connected Step Node */}
                            <div className="relative group">
                              <button
                                type="button"
                                onMouseEnter={() =>
                                  setActiveTooltipStage({
                                    teamId: team.teamId,
                                    stageName: stageItem.stageName,
                                  })
                                }
                                onMouseLeave={() => setActiveTooltipStage(null)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTooltipStage(
                                    isTooltipActive
                                      ? null
                                      : { teamId: team.teamId, stageName: stageItem.stageName }
                                  );
                                }}
                                className={`group/btn relative inline-flex flex-col items-center justify-center rounded-2xl px-3 py-2 text-center transition-all duration-200 cursor-pointer ${
                                  isQualifying
                                    ? 'border-2 border-emerald-500 bg-emerald-500/10 shadow-sm shadow-emerald-500/20 scale-105'
                                    : 'border border-slate-200 bg-slate-50/90 hover:border-[#0A5FC4] hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-400'
                                }`}
                              >
                                {isQualifying && (
                                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 flex h-4 items-center gap-0.5 rounded-full bg-emerald-500 px-1.5 text-[8px] font-black uppercase tracking-wider text-white shadow-xs">
                                    <Star className="h-2 w-2 fill-white" /> Ticket
                                  </span>
                                )}

                                <span className={`text-[11px] font-black uppercase tracking-wider ${
                                  isQualifying ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'
                                }`}>
                                  {getStageAbbreviation(stageItem.stageName)}
                                </span>

                                <div className="mt-0.5 flex items-center gap-1 text-[10px] font-extrabold text-slate-400">
                                  <span>{stageItem.matchesPlayed}m</span>
                                  {stageItem.stageRank && (
                                    <span className="rounded bg-slate-200/80 px-1 py-0.2 text-[9px] font-black text-slate-700 dark:bg-white/10 dark:text-slate-300">
                                      #{stageItem.stageRank}
                                    </span>
                                  )}
                                </div>
                              </button>

                              {/* Interactive Stage Popover Tooltip */}
                              {isTooltipActive && (
                                <div className="absolute bottom-full left-1/2 z-50 mb-2.5 -translate-x-1/2 w-48 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-[#0f172a] text-left animate-in fade-in zoom-in-95 duration-150">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 dark:border-white/10">
                                    <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                                      {stageItem.stageName}
                                    </span>
                                    {stageItem.stageRank && (
                                      <span className="rounded-md bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                                        Rank #{stageItem.stageRank}
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-2 space-y-1 text-[11px]">
                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                      <span>Matches:</span>
                                      <span className="font-black text-slate-900 dark:text-white">
                                        {stageItem.matchesPlayed}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                      <span>Stage Points:</span>
                                      <span className="font-black text-[#0A5FC4] dark:text-blue-400">
                                        {stageItem.totalPoints} pts
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                      <span>WWCD (Wins):</span>
                                      <span className="font-black text-amber-500">
                                        {stageItem.wwcdCount} 🍗
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                      <span>Elims / Place:</span>
                                      <span className="font-semibold text-slate-500">
                                        {stageItem.elimsCount} / {stageItem.placePoints}
                                      </span>
                                    </div>
                                  </div>

                                  {isQualifying && (
                                    <div className="mt-2.5 rounded-xl bg-emerald-500/10 p-1.5 text-center text-[10px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                                      Qualified for Finals Here
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Connected Arrow Indicator */}
                            <ArrowRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          </React.Fragment>
                        );
                      })}

                      {/* Destination: GRAND FINALS Milestone Node */}
                      <div className="relative inline-flex items-center gap-2 rounded-2xl border-2 border-amber-400 bg-amber-400/15 px-3.5 py-2 text-center shadow-md shadow-amber-400/20">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400 text-slate-950 shadow-xs">
                          <Trophy className="h-3.5 w-3.5 fill-slate-950" />
                        </div>
                        <div className="text-left">
                          <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                            {targetFinalsStage}
                          </span>
                          <span className="text-[9px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
                            Slot #{team.slotNumber}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* --- RIGHT COLUMN: Total Matches Played --- */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 text-right">
                    <div className="text-left lg:text-right">
                      <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        {team.totalMatchesPlayed} <span className="text-xs font-semibold text-slate-400">Matches</span>
                      </span>

                      {/* Match Intensity Bar */}
                      <div className="mt-1 flex items-center justify-end gap-1.5">
                        <div className="h-1.5 w-20 sm:w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                            style={{ width: `${matchPercentage}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">
                          {team.totalPoints} pts
                        </span>
                      </div>
                    </div>

                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 dark:bg-white/10">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-[#0A5FC4]' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* ================= 4. EXPANDABLE TEAM BATTLE DOSSIER ================= */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-6 dark:border-white/5 dark:bg-black/20 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                      {/* 1. Stage Performance Bar Breakdown */}
                      <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#0b1220]">
                        <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-4">
                          <Layers className="h-3.5 w-3.5 text-[#0A5FC4]" />
                          Stage-by-Stage Scoring Breakdown
                        </h5>

                        <div className="space-y-3">
                          {team.stagesJourney.map((st) => {
                            const maxStagePts = Math.max(
                              ...team.stagesJourney.map((s) => s.totalPoints),
                              1
                            );
                            const widthPct = Math.round((st.totalPoints / maxStagePts) * 100);

                            return (
                              <div key={st.stageName} className="flex items-center gap-3 text-xs">
                                <div className="w-28 font-bold text-slate-700 dark:text-slate-300 truncate">
                                  {st.stageName}
                                </div>
                                <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden relative">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      st.isQualifyingStage
                                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                                        : 'bg-gradient-to-r from-blue-400 to-blue-600'
                                    }`}
                                    style={{ width: `${Math.max(widthPct, 4)}%` }}
                                  />
                                </div>
                                <div className="w-24 text-right font-black text-slate-900 dark:text-white">
                                  {st.totalPoints} pts
                                  <span className="text-[10px] font-semibold text-slate-400 ml-1">
                                    ({st.matchesPlayed}m)
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. Squad Roster & Quick Highlights */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#0b1220] flex flex-col justify-between">
                        <div>
                          <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-3">
                            <Users className="h-3.5 w-3.5 text-[#0A5FC4]" />
                            Championship Roster
                          </h5>

                          {team.roster && team.roster.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {team.roster.map((player) => (
                                <span
                                  key={player.ign}
                                  className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 dark:bg-white/10 dark:text-slate-200"
                                >
                                  {player.captain && (
                                    <Crown className="h-2.5 w-2.5 text-amber-500" />
                                  )}
                                  {player.ign}
                                  {player.role && (
                                    <span className="text-[9px] font-semibold text-slate-400">
                                      ({player.role})
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs font-semibold text-slate-400">
                              Active tournament lineup
                            </p>
                          )}
                        </div>

                        <div className="mt-6 border-t border-slate-100 pt-4 dark:border-white/10 grid grid-cols-2 gap-2 text-center">
                          <div className="rounded-xl bg-slate-50 p-2 dark:bg-white/5">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Total WWCD</span>
                            <span className="text-sm font-black text-amber-500">{team.wwcdCount} 🍗</span>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-2 dark:bg-white/5">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Elims</span>
                            <span className="text-sm font-black text-rose-500">{team.elimsCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
