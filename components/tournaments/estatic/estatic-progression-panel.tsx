'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Trophy,
  Route as RouteIcon,
  Check,
  ChevronDown,
  Crown,
  Search,
  Star,
  Users,
  Layers,
} from 'lucide-react';
import { ThemeLogo } from './theme-logo';
import {
  type StandingsConfig,
  type ZoneRule,
  resolveZoneTargetStage,
} from '@/lib/standings-config';
import { calculateTournamentStandings } from '@/lib/tournament-math';
import type { TeamPerformanceRow } from './panel-types';

export interface StagePerformanceSummary {
  stageId?: string;
  stageName: string;
  groupName?: string | null;
  sequence: number;
  matchesPlayed: number;
  totalPoints: number;
  wwcdCount: number;
  elimsCount: number;
  placePoints: number;
  stageRank: number | null;
  isQualifyingStage: boolean;
  participated: boolean;
  status: 'QUALIFIED' | 'PLAYED' | 'BYPASSED' | 'MISSED';
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
  qualifyingStageSequence: number;
  qualifyingRank: number;
  qualifyingZone: { from: number; to: number } | null;
  routeIsCumulative: boolean;
  routeIncludeStages: string[];
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
    status?: string;
    scheduledAt?: any;
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

// Determine the concluding stage sequence for a qualification source
function getSourceConclusionSequence(
  source: {
    sourceStageName: string;
    itemType: 'STAGE' | 'CUSTOM_TAB';
    includeStages?: string[];
  },
  stagesList: Array<{ id: string; name: string; sequence: number }>
): number {
  if (source.includeStages && source.includeStages.length > 0) {
    const seqs = source.includeStages.map((name) => {
      const match = stagesList.find((s) => s.name.toLowerCase() === name.toLowerCase());
      return match ? match.sequence : 0;
    });
    const maxSeq = Math.max(...seqs, 0);
    if (maxSeq > 0) return maxSeq;
  }
  const match = stagesList.find((s) => s.name.toLowerCase() === source.sourceStageName.toLowerCase());
  return match ? match.sequence : 999;
}

// Map a configured zone color name to a small marker dot class
function routeDotClass(color: string | undefined): string {
  switch ((color || '').toLowerCase()) {
    case 'green':
    case 'emerald':
    case 'teal':
      return 'bg-emerald-500';
    case 'gold':
    case 'amber':
    case 'yellow':
    case 'orange':
      return 'bg-amber-500';
    case 'purple':
    case 'pink':
      return 'bg-violet-500';
    case 'cyan':
      return 'bg-cyan-500';
    case 'red':
    case 'rose':
      return 'bg-rose-500';
    case 'slate':
      return 'bg-slate-400';
    default:
      return 'bg-[var(--ed-blue)]';
  }
}

// Node tint for a participated stage, driven by the rank band
function rankNodeClass(rank: number | null): string {
  if (rank === 1)
    return 'border-amber-400/60 bg-amber-400/15 text-amber-700 dark:text-amber-300';
  if (rank !== null && rank <= 4)
    return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-300';
  if (rank !== null && rank <= 8)
    return 'border-[var(--ed-hair)] bg-[var(--ed-surface)] text-[var(--ed-ink)]';
  return 'border-[var(--ed-hair)] bg-[var(--ed-sand)] text-[var(--ed-stone)]';
}

const IDENTITY_W = 252;
const STAGE_W = 88;
const TOTALS_W = 96;

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

  // All tournament stages excluding Grand Finals itself, sorted by chronological sequence
  const precedingStages = useMemo(() => {
    return stages
      .filter((s) => s.name.toLowerCase() !== targetFinalsStage.toLowerCase())
      .sort((a, b) => a.sequence - b.sequence);
  }, [stages, targetFinalsStage]);

  const stageNames = useMemo(() => stages.map((s) => s.name), [stages]);

  // Pre-calculate per-stage team ranks & standings
  const stageStandingsMap = useMemo(() => {
    const map = new Map<
      string,
      Map<
        string,
        {
          rank: number;
          groupName?: string | null;
          totalPoints: number;
          wwcd: number;
          matchesPlayed: number;
          elims: number;
          placePoints: number;
        }
      >
    >();

    for (const stage of stages) {
      const stageMatches = matches.filter(
        (m) => m.stage?.name?.toLowerCase() === stage.name.toLowerCase()
      );
      if (stageMatches.length === 0) continue;

      const distinctGroups = Array.from(
        new Set(stageMatches.map((m) => m.groupName?.trim()).filter(Boolean))
      ) as string[];

      const teamMap = new Map<
        string,
        {
          rank: number;
          groupName?: string | null;
          totalPoints: number;
          wwcd: number;
          matchesPlayed: number;
          elims: number;
          placePoints: number;
        }
      >();

      if (distinctGroups.length > 1) {
        // Multi-group stages (e.g. Round 4 with Groups A, B, C, D):
        // Compute rankings within each group so teams are ranked within their group lobby (e.g. #13 in Grp A)
        for (const grpName of distinctGroups) {
          const grpMatches = stageMatches.filter(
            (m) => (m.groupName || '').trim().toLowerCase() === grpName.toLowerCase()
          );
          const grpResults = grpMatches.flatMap((m) => m.games.flatMap((g) => g.teamResults));
          if (grpResults.length === 0) continue;

          const grpStandings = calculateTournamentStandings(grpResults);
          for (const st of grpStandings) {
            teamMap.set(st.teamId, {
              rank: st.rank,
              groupName: grpName,
              totalPoints: st.totalPoints,
              wwcd: st.wwcd,
              matchesPlayed: st.matchesPlayed,
              elims: st.eliminationPoints,
              placePoints: st.placementPoints,
            });
          }
        }
      } else {
        // Single group or overall stage
        const teamResults = stageMatches.flatMap((m) => m.games.flatMap((g) => g.teamResults));
        if (teamResults.length > 0) {
          const computed = calculateTournamentStandings(teamResults);
          for (const st of computed) {
            teamMap.set(st.teamId, {
              rank: st.rank,
              groupName: distinctGroups[0] || null,
              totalPoints: st.totalPoints,
              wwcd: st.wwcd,
              matchesPlayed: st.matchesPlayed,
              elims: st.eliminationPoints,
              placePoints: st.placementPoints,
            });
          }
        }
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
      groupName?: string;
      zone: ZoneRule;
      itemType: 'STAGE' | 'CUSTOM_TAB';
      includeStages?: string[];
    }> = [];

    // Check Tab Groups (Hierarchical Sub-Divisions)
    if (standingsConfig.tabGroups) {
      for (const grp of standingsConfig.tabGroups) {
        for (const item of grp.items) {
          // Standard item-level zones
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
          // Tier-3 Group-level zones (e.g. Group A, Group B rules qualifying to Grand Finals)
          if (item.groupZones && typeof item.groupZones === 'object') {
            for (const [groupKey, zoneList] of Object.entries(item.groupZones as Record<string, ZoneRule[]>)) {
              for (const z of (zoneList || []) as ZoneRule[]) {
                const zTarget = resolveZoneTargetStage(z, stageNames);
                if (zTarget && zTarget.toLowerCase() === targetFinalsStage.toLowerCase()) {
                  linkedZoneSources.push({
                    sourceStageName: item.label || item.stageName || grp.name,
                    groupName: groupKey,
                    zone: z,
                    itemType: item.type === 'STAGE' ? 'STAGE' : 'CUSTOM_TAB',
                    includeStages: item.includeStages || (item.stageName ? [item.stageName] : undefined),
                  });
                }
              }
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
        if (tab.groupZones && typeof tab.groupZones === 'object') {
          for (const [groupKey, zoneList] of Object.entries(tab.groupZones as Record<string, ZoneRule[]>)) {
            for (const z of (zoneList || []) as ZoneRule[]) {
              const zTarget = resolveZoneTargetStage(z, stageNames);
              if (zTarget && zTarget.toLowerCase() === targetFinalsStage.toLowerCase()) {
                linkedZoneSources.push({
                  sourceStageName: tab.label,
                  groupName: groupKey,
                  zone: z,
                  itemType: 'CUSTOM_TAB',
                  includeStages: tab.includeStages,
                });
              }
            }
          }
        }
      }
    }

    // Deduplicate identical zone definitions
    const uniqueSources: typeof linkedZoneSources = [];
    const seenSourceKeys = new Set<string>();
    for (const src of linkedZoneSources) {
      const key = `${src.sourceStageName.toLowerCase()}:${(src.groupName || 'all').toLowerCase()}:${src.zone.from}-${src.zone.to}`;
      if (!seenSourceKeys.has(key)) {
        seenSourceKeys.add(key);
        uniqueSources.push(src);
      }
    }

    // Order qualification sources chronologically so teams qualifying in earlier stages are handled first
    uniqueSources.sort((a, b) => {
      const seqA = getSourceConclusionSequence(a, stages);
      const seqB = getSourceConclusionSequence(b, stages);
      return seqA - seqB;
    });

    // Process each qualifying zone source
    for (const source of uniqueSources) {
      const conclusionSeq = getSourceConclusionSequence(source, stages);

      let sourceMatches = matches;
      if (source.includeStages && source.includeStages.length > 0) {
        sourceMatches = matches.filter((m) => {
          const stName = m.stage?.name || '';
          return source.includeStages!.some((s) => s.toLowerCase() === stName.toLowerCase());
        });
      } else if (source.sourceStageName) {
        sourceMatches = matches.filter((m) => {
          const stName = m.stage?.name || '';
          return stName.toLowerCase() === source.sourceStageName.toLowerCase();
        });
      }

      if (source.groupName && source.groupName.trim()) {
        const normGrp = source.groupName.trim().toLowerCase();
        const plainGrp = normGrp.replace(/^group\s*/i, '');
        sourceMatches = sourceMatches.filter((m) => {
          const mg = (m.groupName || '').trim().toLowerCase();
          return mg === normGrp || mg.replace(/^group\s*/i, '') === plainGrp;
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
        const groupSuffix = source.groupName ? ` (${source.groupName})` : '';
        const isTargetName =
          !source.zone.label || source.zone.label.toLowerCase() === targetFinalsStage.toLowerCase();
        const routeDesc = isTargetName
          ? `Top ${source.zone.to} in ${source.sourceStageName}${groupSuffix} (Rank #${st.rank})`
          : `${source.zone.label} via ${source.sourceStageName}${groupSuffix} (Rank #${st.rank})`;

        // Build chronological stage journey across ALL preceding stages
        const stagesJourney: StagePerformanceSummary[] = [];
        const cleanQualStage = source.sourceStageName.trim().toLowerCase();

        for (const s of precedingStages) {
          const stageStandingData = stageStandingsMap.get(s.name.toLowerCase())?.get(st.teamId);
          const stagePerf = perf?.stageStats?.[s.name];

          const mp = stageStandingData?.matchesPlayed || stagePerf?.matchesPlayed || 0;
          const participated = mp > 0;

          const isQualStage =
            s.name.toLowerCase() === cleanQualStage ||
            cleanQualStage.includes(s.name.toLowerCase()) ||
            s.name.toLowerCase().includes(cleanQualStage) ||
            (source.includeStages?.some((stName) => stName.toLowerCase() === s.name.toLowerCase()) ?? false);

          let status: 'QUALIFIED' | 'PLAYED' | 'BYPASSED' | 'MISSED';
          if (participated) {
            status = isQualStage ? 'QUALIFIED' : 'PLAYED';
          } else {
            // Team already qualified before this stage occurred -> BYPASSED
            status = conclusionSeq < s.sequence ? 'BYPASSED' : 'MISSED';
          }

          stagesJourney.push({
            stageId: s.id,
            stageName: s.name,
            groupName: stageStandingData?.groupName ?? null,
            sequence: s.sequence,
            matchesPlayed: mp,
            totalPoints: stageStandingData?.totalPoints ?? stagePerf?.totalPoints ?? 0,
            wwcdCount: stageStandingData?.wwcd ?? stagePerf?.wwcdCount ?? 0,
            elimsCount: stageStandingData?.elims ?? stagePerf?.elims ?? 0,
            placePoints: stageStandingData?.placePoints ?? stagePerf?.placePoints ?? 0,
            stageRank: stageStandingData?.rank ?? null,
            isQualifyingStage: isQualStage,
            participated,
            status,
          });
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
          sourceStageName: source.groupName ? `${source.sourceStageName} (${source.groupName})` : source.sourceStageName,
          sourceType: 'ZONE',
          zoneColor: (source.zone.color as string) || 'blue',
          isConfirmed: true,
          totalMatchesPlayed: perf?.matchesPlayed || st.matchesPlayed || 0,
          totalPoints: perf?.totalPoints || st.totalPoints || 0,
          wwcdCount: perf?.wwcdCount || st.wwcd || 0,
          elimsCount: perf?.totalElimsPoints || st.eliminationPoints || 0,
          avgPoints: perf?.avgTotalPoints || Number((st.totalPoints / (st.matchesPlayed || 1)).toFixed(2)),
          stagesJourney,
          qualifyingStageName: source.groupName ? `${source.sourceStageName} (${source.groupName})` : source.sourceStageName,
          qualifyingStageSequence: conclusionSeq,
          qualifyingRank: st.rank,
          qualifyingZone: { from: source.zone.from, to: source.zone.to },
          routeIsCumulative: (source.includeStages?.length ?? 0) > 1,
          routeIncludeStages: source.includeStages ?? [],
          roster,
        });
      }
    }

    // 2. Fallback if no zones configured: top overall teams
    if (results.length === 0) {
      const topTeams = teamPerformanceRows.slice(0, 16);
      topTeams.forEach((tRow, idx) => {
        const tt = teamMetaMap.get(tRow.teamId);

        const stagesJourney: StagePerformanceSummary[] = [];
        for (const s of precedingStages) {
          const stagePerf = tRow.stageStats?.[s.name];
          const mp = stagePerf?.matchesPlayed || 0;
          const participated = mp > 0;

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
            isQualifyingStage: false,
            participated,
            status: participated ? 'PLAYED' : 'MISSED',
          });
        }

        results.push({
          teamId: tRow.teamId,
          teamName: tRow.teamName,
          teamTag: tRow.teamTag ?? null,
          teamSlug: tRow.teamSlug ?? null,
          logoUrl: tRow.teamLogo ?? null,
          logoDarkUrl: tRow.teamLogoDark ?? null,
          country: tt?.country || tt?.team?.region || null,
          slotNumber: idx + 1,
          routeLabel: `Overall Standings (Rank #${idx + 1})`,
          sourceStageName: 'Overall Standings',
          sourceType: 'STANDINGS',
          zoneColor: 'blue',
          isConfirmed: true,
          totalMatchesPlayed: tRow.matchesPlayed,
          totalPoints: tRow.totalPoints,
          wwcdCount: tRow.wwcdCount,
          elimsCount: tRow.totalElimsPoints,
          avgPoints: tRow.avgTotalPoints,
          stagesJourney,
          qualifyingStageName: 'Overall Standings',
          qualifyingStageSequence: 999,
          qualifyingRank: idx + 1,
          qualifyingZone: null,
          routeIsCumulative: false,
          routeIncludeStages: [],
          roster: Array.isArray(tt?.rosterJson) ? tt!.rosterJson : [],
        });
      });
    }

    // Sort finalists: Teams qualified in earlier stages appear on top!
    results.sort((a, b) => {
      // 1. Earlier qualifying stage sequence first
      if (a.qualifyingStageSequence !== b.qualifyingStageSequence) {
        return a.qualifyingStageSequence - b.qualifyingStageSequence;
      }
      // 2. Rank in that qualifying stage
      if (a.qualifyingRank !== b.qualifyingRank) {
        return a.qualifyingRank - b.qualifyingRank;
      }
      // 3. Tiebreak by total tournament points
      return b.totalPoints - a.totalPoints;
    });

    // Re-index slot numbers so earlier qualifying teams have slots 1, 2, 3...
    results.forEach((team, idx) => {
      team.slotNumber = idx + 1;
    });

    return results;
  }, [
    stages,
    precedingStages,
    matches,
    standingsConfig,
    stageNames,
    targetFinalsStage,
    teamMetaMap,
    perfMap,
    stageStandingsMap,
    teamPerformanceRows,
  ]);

  // Group finalists by qualification route, preserving qualification order
  const routeGroups = useMemo(() => {
    const groups: Array<{
      name: string;
      zone: { from: number; to: number } | null;
      color: string;
      cumulative: boolean;
      includeStages: string[];
      teams: GrandFinalistEntry[];
    }> = [];
    const byName = new Map<string, (typeof groups)[0]>();

    for (const t of finalists) {
      let g = byName.get(t.sourceStageName);
      if (!g) {
        g = {
          name: t.sourceStageName,
          zone: t.qualifyingZone,
          color: t.zoneColor,
          cumulative: t.routeIsCumulative,
          includeStages: t.routeIncludeStages,
          teams: [],
        };
        byName.set(t.sourceStageName, g);
        groups.push(g);
      }
      g.teams.push(t);
    }
    return groups;
  }, [finalists]);

  // Controls state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<'slot' | 'matches' | 'points'>('slot');
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<{
    teamName: string;
    stage: StagePerformanceSummary;
    x: number;
    top: number;
    bottom: number;
    placement: 'above' | 'below';
  } | null>(null);

  // Fixed-position tooltip anchored to the node's viewport rect — a plain
  // absolute popover would be clipped by the journey track's overflow scroll.
  const openStageTooltip = (
    team: GrandFinalistEntry,
    stageItem: StagePerformanceSummary,
    e: React.MouseEvent
  ) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActiveTooltip({
      teamName: team.teamName,
      stage: stageItem,
      x: rect.left + rect.width / 2,
      top: rect.top,
      bottom: rect.bottom,
      placement: rect.top > 240 ? 'above' : 'below',
    });
  };

  // A scrolled page leaves a fixed tooltip anchored to stale coordinates.
  useEffect(() => {
    if (!activeTooltip) return;
    const close = () => setActiveTooltip(null);
    window.addEventListener('scroll', close, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', close, true);
  }, [activeTooltip]);

  // Filter & sort within each route group
  const visibleGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const sortTeams = (list: GrandFinalistEntry[]) => {
      const arr = [...list];
      if (sortOption === 'matches') {
        arr.sort((a, b) => b.totalMatchesPlayed - a.totalMatchesPlayed);
      } else if (sortOption === 'points') {
        arr.sort((a, b) => b.totalPoints - a.totalPoints);
      } else {
        arr.sort((a, b) => a.slotNumber - b.slotNumber);
      }
      return arr;
    };

    return routeGroups
      .map((g) => ({
        ...g,
        teams: sortTeams(
          q
            ? g.teams.filter(
                (t) =>
                  t.teamName.toLowerCase().includes(q) ||
                  (t.teamTag && t.teamTag.toLowerCase().includes(q)) ||
                  t.routeLabel.toLowerCase().includes(q)
              )
            : g.teams
        ),
      }))
      .filter((g) => g.teams.length > 0);
  }, [routeGroups, searchQuery, sortOption]);

  // Average matches played to reach finals
  const avgMatchesToReach = useMemo(() => {
    if (finalists.length === 0) return '0';
    const total = finalists.reduce((acc, f) => acc + f.totalMatchesPlayed, 0);
    return (total / finalists.length).toFixed(0);
  }, [finalists]);

  const toggleExpand = (teamId: string) => {
    setExpandedTeamId((prev) => (prev === teamId ? null : teamId));
  };

  const scrollToRoute = (name: string) => {
    document
      .getElementById(`route-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const journeyColCount = precedingStages.length + 1;
  // Stage columns stretch to fill wide screens but scroll horizontally below their 88px floor
  const gridTemplate = `${IDENTITY_W}px repeat(${journeyColCount}, minmax(${STAGE_W}px, 1fr)) ${TOTALS_W}px`;
  const matrixMinWidth = IDENTITY_W + journeyColCount * STAGE_W + TOTALS_W;

  const stickyCellBg =
    'bg-[var(--ed-surface)] group-hover:bg-[#eef2f7] dark:group-hover:bg-[#1a222e]';

  const headerStats = [
    { label: 'Finalists', value: `${finalists.length}` },
    { label: 'Routes', value: `${routeGroups.length}` },
    { label: 'Avg matches', value: `${avgMatchesToReach}` },
  ];

  return (
    <div className="space-y-4">
      {/* ================= HEADER + ROUTE MAP ================= */}
      <section className="ed-card px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-[var(--ed-ink)] sm:text-lg">
              <RouteIcon className="h-4 w-4 shrink-0 text-[var(--ed-blue)]" />
              Road to {targetFinalsStage}
            </h2>
            <p className="mt-0.5 text-[12px] font-medium text-[var(--ed-stone)]">
              How every squad punched its ticket — stage by stage.
            </p>
          </div>

          <div className="flex items-center gap-5">
            {headerStats.map((stat, i) => (
              <div
                key={stat.label}
                className={i > 0 ? 'border-l border-[var(--ed-hair)] pl-5' : ''}
              >
                <span className="block text-lg font-bold leading-tight tabular-nums text-[var(--ed-ink)]">
                  {stat.value}
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--ed-stone)]">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Route cards — the qualification map, click to jump to a route */}
        {routeGroups.length > 0 && (
          <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
            {routeGroups.map((g) => (
              <button
                key={g.name}
                onClick={() => scrollToRoute(g.name)}
                className="group cursor-pointer rounded-xl border border-[var(--ed-hair)] bg-[var(--ed-surface)] px-3.5 py-2.5 text-left transition-colors hover:border-[var(--ed-blue)]"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${routeDotClass(g.color)}`} />
                  <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-[var(--ed-stone)]">
                    {g.name}
                  </span>
                  <span className="ml-auto shrink-0 text-[11px] font-bold tabular-nums text-[var(--ed-ink)]">
                    {g.teams.length}
                  </span>
                </div>
                <div className="mt-1 text-[13px] font-bold text-[var(--ed-ink)]">
                  {g.zone ? `Top ${g.zone.to} → ${targetFinalsStage}` : `Top ${g.teams.length} overall`}
                </div>
                <div className="text-[11px] font-medium text-[var(--ed-stone)]">
                  {g.cumulative
                    ? `Cumulative · ${g.includeStages.map((s) => getStageAbbreviation(s)).join(' + ')}`
                    : 'Stage standings'}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Toolbar: legend + search + sort */}
        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--ed-hair)] pt-3">
          <div className="hidden flex-wrap items-center gap-x-4 gap-y-1 lg:flex">
            <span className="ed-label">Reading the row</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[var(--ed-stone)]">
              <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full border border-amber-400/60 bg-amber-400/15 text-[8px] font-bold text-amber-700 dark:text-amber-300">
                1
              </span>
              Stage win
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[var(--ed-stone)]">
              <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 text-[8px] font-bold text-blue-700 dark:text-blue-300">
                4
              </span>
              Top 4
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[var(--ed-stone)]">
              <span className="relative flex h-4.5 w-4.5 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/10 text-[8px] font-bold text-emerald-700 dark:text-emerald-300">
                6
              </span>
              Qualified here
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[var(--ed-stone)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ed-hair)]" />
              Did not play
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[var(--ed-stone)]">
              <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/5 text-emerald-600/80 dark:text-emerald-400/80">
                <Check className="h-2.5 w-2.5" />
              </span>
              Skipped — already through
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative w-44 sm:w-52">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ed-stone)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search squad…"
                className="h-8.5 w-full rounded-lg border border-[var(--ed-hair)] bg-[var(--ed-surface)] py-1.5 pl-8 pr-2.5 text-[12px] font-medium text-[var(--ed-ink)] placeholder:text-[var(--ed-stone)] focus:border-[var(--ed-blue)] focus:outline-none"
              />
            </div>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
              className="h-8.5 cursor-pointer rounded-lg border border-[var(--ed-hair)] bg-[var(--ed-surface)] px-2 py-1.5 text-[12px] font-semibold text-[var(--ed-ink)] focus:border-[var(--ed-blue)] focus:outline-none"
            >
              <option value="slot">Qualification order</option>
              <option value="matches">Most matches</option>
              <option value="points">Most points</option>
            </select>
          </div>
        </div>
      </section>

      {/* ================= ROUTE SECTIONS ================= */}
      {finalists.length === 0 ? (
        <section className="ed-card">
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
            <RouteIcon className="h-8 w-8 text-[var(--ed-hair)]" />
            <p className="ed-label">No finalists confirmed yet</p>
            <p className="max-w-sm text-xs font-medium text-[var(--ed-stone)]">
              Finalists appear here once qualification zones targeting {targetFinalsStage} are
              configured and their stage matches have results.
            </p>
          </div>
        </section>
      ) : visibleGroups.length === 0 ? (
        <section className="ed-card">
          <div className="px-6 py-10 text-center text-xs font-semibold text-[var(--ed-stone)]">
            No squads match the current search.
          </div>
        </section>
      ) : (
        visibleGroups.map((group) => {
          return (
            <section
              key={group.name}
              id={`route-${group.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              className="ed-card scroll-mt-24"
            >
              {/* Route head */}
              <div className="ed-card-head">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${routeDotClass(group.color)}`} />
                  <h3 className="truncate text-sm font-bold text-[var(--ed-ink)]">{group.name}</h3>
                  <span className="ed-chip hidden shrink-0 sm:inline-flex">
                    {group.zone
                      ? `Top ${group.zone.to} → ${targetFinalsStage}`
                      : `Top ${group.teams.length} overall`}
                  </span>
                  {group.cumulative && (
                    <span className="hidden shrink-0 text-[11px] font-medium text-[var(--ed-stone)] md:inline">
                      Cumulative ·{' '}
                      {group.includeStages.map((s) => getStageAbbreviation(s)).join(' + ')}
                    </span>
                  )}
                </div>
                <span className="ed-label shrink-0">
                  {group.teams.length} {group.teams.length === 1 ? 'squad' : 'squads'}
                </span>
              </div>

              {/* Journey matrix */}
              <div className="overflow-x-auto no-scrollbar">
                <div
                  className="progression-scroll-inner"
                  style={
                    {
                      '--stage-count': journeyColCount,
                      '--matrix-min-w': `${matrixMinWidth}px`,
                    } as React.CSSProperties
                  }
                >
                  {/* Column header */}
                  <div
                    className="progression-matrix grid border-b border-[var(--ed-hair)] bg-[var(--ed-sand)]/50"
                    style={{ gridTemplateColumns: gridTemplate }}
                  >
                    <div className="ed-th sticky left-0 z-20 bg-[var(--ed-sand)] px-3 py-2">
                      Squad
                    </div>
                    {precedingStages.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-center gap-1 px-1 py-2 text-center"
                        title={s.name}
                      >
                        <span className="text-[9px] font-medium text-[var(--ed-stone)]">
                          {s.sequence}
                        </span>
                        <span className="truncate text-[10px] font-bold uppercase tracking-wide text-[var(--ed-ink)]">
                          {getStageAbbreviation(s.name)}
                        </span>
                      </div>
                    ))}
                    <div
                      className="flex items-center justify-center gap-1 px-1 py-2 text-amber-600 dark:text-amber-400"
                      title={targetFinalsStage}
                    >
                      <Trophy className="h-3 w-3 shrink-0 fill-amber-300 text-amber-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wide">
                        {getStageAbbreviation(targetFinalsStage)}
                      </span>
                    </div>
                    <div className="ed-th sticky right-0 z-20 hidden bg-[var(--ed-sand)] px-3 py-2 text-right sm:block">
                      Totals
                    </div>
                  </div>

                  {/* Team rows */}
                  <div className="ed-rows">
                    {group.teams.map((team) => {
                      const isExpanded = expandedTeamId === team.teamId;
                      const qIdx = team.stagesJourney.findIndex((j) => j.isQualifyingStage);

                      return (
                        <div key={team.teamId} className="group">
                          <div
                            role="button"
                            tabIndex={0}
                            aria-expanded={isExpanded}
                            onClick={() => toggleExpand(team.teamId)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleExpand(team.teamId);
                              }
                            }}
                            className="progression-matrix grid cursor-pointer items-stretch select-none"
                            style={{ gridTemplateColumns: gridTemplate }}
                          >
                            {/* --- Identity (sticky) --- */}
                            <div
                              className={`sticky left-0 z-20 flex items-center gap-2 border-r border-[var(--ed-hair)] px-2.5 py-2.5 transition-colors ${stickyCellBg}`}
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--ed-sand)] text-[10px] font-bold tabular-nums text-[var(--ed-ink)]">
                                {team.slotNumber}
                              </span>

                              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--ed-hair)] bg-[var(--ed-sand)]">
                                {team.logoUrl || team.logoDarkUrl ? (
                                  <ThemeLogo
                                    lightSrc={team.logoUrl}
                                    darkSrc={team.logoDarkUrl}
                                    alt={team.teamName}
                                    className="object-contain p-0.5"
                                  />
                                ) : (
                                  <span className="text-[9px] font-bold text-[var(--ed-stone)]">
                                    {team.teamName.slice(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="truncate text-[13px] font-bold text-[var(--ed-ink)]">
                                    {team.teamName}
                                  </h4>
                                  {team.teamTag && (
                                    <span className="hidden shrink-0 text-[9px] font-semibold uppercase text-[var(--ed-stone)] sm:inline">
                                      {team.teamTag}
                                    </span>
                                  )}
                                </div>
                                {/* Mobile-only totals: the sticky totals column is hidden on small screens */}
                                <div className="mt-0.5 text-[10px] font-semibold tabular-nums text-[var(--ed-stone)] sm:hidden">
                                  {team.totalPoints} pts · {team.totalMatchesPlayed}m ·{' '}
                                  {team.wwcdCount} WWCD
                                </div>
                              </div>
                            </div>

                            {/* --- Journey nodes --- */}
                            {team.stagesJourney.map((stageItem, stageIdx) => {
                              // Track segments: emerald once the squad has qualified, dashed when it wasn't there
                              const segAfterQ = (cellIdx: number) => qIdx >= 0 && cellIdx > qIdx;
                              const segClass = (cellIdx: number) => {
                                if (segAfterQ(cellIdx)) return 'h-[2px] bg-emerald-500/50';
                                const cur = team.stagesJourney[cellIdx];
                                const prevCell = team.stagesJourney[cellIdx - 1];
                                const bothPlayed =
                                  (!prevCell || prevCell.participated) && cur.participated;
                                return bothPlayed
                                  ? 'h-px bg-[var(--ed-hair)]'
                                  : 'border-t border-dashed border-[var(--ed-hair)]';
                              };

                              return (
                                <div
                                  key={stageItem.stageName}
                                  className="relative flex items-center justify-center px-1"
                                >
                                  {/* Left connector */}
                                  {stageIdx > 0 && (
                                    <div
                                      className={`absolute left-0 right-1/2 top-1/2 z-0 -translate-y-1/2 ${segClass(stageIdx)}`}
                                    />
                                  )}
                                  {/* Right connector */}
                                  <div
                                    className={`absolute left-1/2 right-0 top-1/2 z-0 -translate-y-1/2 ${segClass(stageIdx + 1)}`}
                                  />

                                  {stageItem.participated ? (
                                    <button
                                      type="button"
                                      aria-label={`${team.teamName} — ${stageItem.stageName}: rank ${stageItem.stageRank ?? '—'}, ${stageItem.totalPoints} points`}
                                      onMouseEnter={(e) => openStageTooltip(team, stageItem, e)}
                                      onMouseLeave={() => setActiveTooltip(null)}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openStageTooltip(team, stageItem, e);
                                      }}
                                      className={`relative z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border text-[11px] font-bold tabular-nums transition-transform hover:scale-110 ${
                                        stageItem.isQualifyingStage
                                          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-700 ring-2 ring-emerald-500/20 dark:text-emerald-300'
                                          : rankNodeClass(stageItem.stageRank)
                                      }`}
                                    >
                                      {stageItem.stageRank ?? '·'}
                                      {stageItem.isQualifyingStage && (
                                        <Star className="absolute -right-1 -top-1 h-3 w-3 fill-emerald-500 text-emerald-500" />
                                      )}
                                    </button>
                                  ) : stageItem.status === 'BYPASSED' ? (
                                    <div
                                      onMouseEnter={(e) => openStageTooltip(team, stageItem, e)}
                                      onMouseLeave={() => setActiveTooltip(null)}
                                      className="relative z-10 flex h-5.5 w-5.5 cursor-help items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/5 text-emerald-600/80 dark:text-emerald-400/80"
                                    >
                                      <Check className="h-3 w-3" />
                                    </div>
                                  ) : (
                                    <div
                                      onMouseEnter={(e) => openStageTooltip(team, stageItem, e)}
                                      onMouseLeave={() => setActiveTooltip(null)}
                                      className="relative z-10 flex h-4 w-4 cursor-help items-center justify-center"
                                    >
                                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--ed-hair)]" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Finals milestone */}
                            <div className="relative flex items-center justify-center px-1">
                              <div
                                className={`absolute left-0 right-1/2 top-1/2 z-0 -translate-y-1/2 ${
                                  qIdx >= 0 ? 'h-[2px] bg-emerald-500/50' : 'h-px bg-[var(--ed-hair)]'
                                }`}
                              />
                              <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-amber-400/60 bg-amber-400/15 shadow-xs shadow-amber-400/20">
                                <Trophy className="h-3.5 w-3.5 fill-amber-300 text-amber-500" />
                              </div>
                            </div>

                            {/* --- Totals (sticky, desktop only — mobile shows them in the squad cell) --- */}
                            <div
                              className={`sticky right-0 z-20 hidden items-center justify-between gap-1 border-l border-[var(--ed-hair)] px-3 py-2.5 transition-colors sm:flex ${stickyCellBg}`}
                            >
                              <div className="text-right leading-tight">
                                <span className="block text-[13px] font-bold tabular-nums text-[var(--ed-ink)]">
                                  {team.totalMatchesPlayed}
                                  <span className="text-[9px] font-semibold text-[var(--ed-stone)]">m</span>
                                </span>
                                <span className="block text-[10px] font-semibold tabular-nums text-[var(--ed-stone)]">
                                  {team.totalPoints} pts
                                </span>
                                <span className="block text-[9px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                  {team.wwcdCount} WWCD
                                </span>
                              </div>
                              <ChevronDown
                                className={`h-3.5 w-3.5 shrink-0 text-[var(--ed-stone)] transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180 text-[var(--ed-blue)]' : ''
                                }`}
                              />
                            </div>
                          </div>

                          {/* ================= EXPANDED TEAM DOSSIER ================= */}
                          {isExpanded && (
                            <div className="border-t border-[var(--ed-hair)] bg-[var(--ed-sand)]/40 px-4 py-4">
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                {/* 1. Stage Performance Bar Breakdown */}
                                <div className="rounded-xl border border-[var(--ed-hair)] bg-[var(--ed-surface)] p-4 md:col-span-2">
                                  <h5 className="mb-3 flex items-center gap-1.5 ed-label">
                                    <Layers className="h-3 w-3 text-[var(--ed-blue)]" />
                                    Stage-by-stage scoring
                                  </h5>

                                  <div className="space-y-2">
                                    {team.stagesJourney
                                      .filter((st) => st.participated)
                                      .map((st) => {
                                        const maxStagePts = Math.max(
                                          ...team.stagesJourney.map((s) => s.totalPoints),
                                          1
                                        );
                                        const widthPct = Math.round((st.totalPoints / maxStagePts) * 100);

                                        return (
                                          <div key={st.stageName} className="flex items-center gap-2.5 text-[11px]">
                                            <div className="w-28 truncate font-semibold text-[var(--ed-ink)]">
                                              {st.stageName}
                                              {st.groupName && (
                                                <span className="ml-1 text-[9px] font-medium text-[var(--ed-stone)]">
                                                  ({st.groupName})
                                                </span>
                                              )}
                                            </div>
                                            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--ed-sand)]">
                                              <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                  st.isQualifyingStage
                                                    ? 'bg-emerald-500'
                                                    : 'bg-[var(--ed-blue)]'
                                                }`}
                                                style={{ width: `${Math.max(widthPct, 4)}%` }}
                                              />
                                            </div>
                                            <div className="w-24 text-right font-bold tabular-nums text-[var(--ed-ink)]">
                                              {st.totalPoints} pts
                                              <span className="ml-1 text-[9px] font-medium text-[var(--ed-stone)]">
                                                ({st.matchesPlayed}m)
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>

                                {/* 2. Squad Roster & Quick Highlights */}
                                <div className="flex flex-col justify-between rounded-xl border border-[var(--ed-hair)] bg-[var(--ed-surface)] p-4">
                                  <div>
                                    <h5 className="mb-2.5 flex items-center gap-1.5 ed-label">
                                      <Users className="h-3 w-3 text-[var(--ed-blue)]" />
                                      Championship roster
                                    </h5>

                                    {team.roster && team.roster.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {team.roster.map((player) => (
                                          <span
                                            key={player.ign}
                                            className="ed-chip"
                                          >
                                            {player.captain && (
                                              <Crown className="h-2.5 w-2.5 text-amber-500" />
                                            )}
                                            {player.ign}
                                            {player.role && (
                                              <span className="text-[9px] font-medium text-[var(--ed-stone)]">
                                                {player.role}
                                              </span>
                                            )}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[11px] font-medium text-[var(--ed-stone)]">
                                        Active tournament lineup
                                      </p>
                                    )}
                                  </div>

                                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--ed-hair)] pt-3 text-center">
                                    <div className="rounded-lg bg-[var(--ed-sand)] p-1.5">
                                      <span className="block text-[9px] font-semibold uppercase text-[var(--ed-stone)]">
                                        Total WWCD
                                      </span>
                                      <span className="text-[13px] font-bold tabular-nums text-amber-600 dark:text-amber-400">
                                        {team.wwcdCount}
                                      </span>
                                    </div>
                                    <div className="rounded-lg bg-[var(--ed-sand)] p-1.5">
                                      <span className="block text-[9px] font-semibold uppercase text-[var(--ed-stone)]">
                                        Total elims
                                      </span>
                                      <span className="text-[13px] font-bold tabular-nums text-[var(--ed-ink)]">
                                        {team.elimsCount}
                                      </span>
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
            </section>
          );
        })
      )}

      {/* ================= STAGE TOOLTIP (fixed, escapes row clipping) ================= */}
      {activeTooltip && (
        <div
          className="pointer-events-none fixed z-[70] w-48 rounded-xl border border-[var(--ed-hair)] bg-[var(--ed-surface)] p-2.5 text-left shadow-lg"
          style={{
            left: activeTooltip.x,
            top: activeTooltip.placement === 'above' ? activeTooltip.top - 6 : activeTooltip.bottom + 6,
            transform:
              activeTooltip.placement === 'above'
                ? 'translate(-50%, -100%)'
                : 'translate(-50%, 0)',
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--ed-hair)] pb-1.5">
            <span className="truncate text-[11px] font-bold text-[var(--ed-ink)]">
              {activeTooltip.teamName}
            </span>
            {activeTooltip.stage.stageRank && (
              <span className="shrink-0 rounded bg-amber-400 px-1 py-0.5 text-[9px] font-bold text-slate-950">
                #{activeTooltip.stage.stageRank}
                {activeTooltip.stage.groupName ? ` (${activeTooltip.stage.groupName})` : ''}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-[var(--ed-blue)]">
            <span>{activeTooltip.stage.stageName}</span>
            {activeTooltip.stage.groupName && (
              <span className="text-[9px] font-semibold text-[var(--ed-stone)]">
                {activeTooltip.stage.groupName}
              </span>
            )}
          </div>

          {activeTooltip.stage.participated ? (
            <div className="mt-1 space-y-0.5 text-[10px]">
              <div className="flex justify-between text-[var(--ed-stone)]">
                <span>Matches</span>
                <span className="font-bold tabular-nums text-[var(--ed-ink)]">
                  {activeTooltip.stage.matchesPlayed}
                </span>
              </div>
              <div className="flex justify-between text-[var(--ed-stone)]">
                <span>Points</span>
                <span className="font-bold tabular-nums text-[var(--ed-blue)]">
                  {activeTooltip.stage.totalPoints}
                </span>
              </div>
              <div className="flex justify-between text-[var(--ed-stone)]">
                <span>WWCD</span>
                <span className="font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {activeTooltip.stage.wwcdCount}
                </span>
              </div>
              <div className="flex justify-between text-[var(--ed-stone)]">
                <span>Elims / Place</span>
                <span className="font-semibold tabular-nums text-[var(--ed-ink)]">
                  {activeTooltip.stage.elimsCount} / {activeTooltip.stage.placePoints}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-1.5 text-[10px]">
              {activeTooltip.stage.status === 'BYPASSED' ? (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Stage skipped — squad earned direct entry to {targetFinalsStage} earlier.
                </span>
              ) : (
                <span className="font-medium text-[var(--ed-stone)]">
                  Did not participate in this stage.
                </span>
              )}
            </div>
          )}

          {activeTooltip.stage.isQualifyingStage && (
            <div className="mt-1.5 rounded-md bg-emerald-500/10 py-1 text-center text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Qualified for finals here
            </div>
          )}
        </div>
      )}
    </div>
  );
}
