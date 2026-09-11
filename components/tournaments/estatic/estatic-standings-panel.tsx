'use client';

import React from 'react';
import Link from 'next/link';
import {
  Trophy,
  ChevronUp,
  ChevronDown,
  Layers,
  Calendar,
  Filter,
  Flame,
  ShieldCheck,
  Sparkles,
  Info,
  CheckCircle2,
  Eye,
  EyeOff,
  Scale,
} from 'lucide-react';
import { calculateTournamentStandings, type AggregatedTeamStanding } from '@/lib/tournament-math';
import {
  getStageConfig,
  zoneForRank,
  STANDINGS_COLUMN_DEFS,
  type StandingsConfig,
  type StandingsStageConfig,
  type StandingsColumnKey,
  type StandingsMatchLite,
  type StandingsTeamMeta,
  type StandingsStageSummary,
  type StandingsCustomTab,
  type StandingsNavigationItem,
  type ZoneRule,
  type ZoneColor,
} from '@/lib/standings-config';
import { ThemeLogo } from './theme-logo';
import { SearchableSelect } from '@/components/ui/searchable-select';

type SortKey =
  | 'rank'
  | 'matchesPlayed'
  | 'wwcd'
  | 'placementPoints'
  | 'eliminationPoints'
  | 'bonusPoints'
  | 'totalPoints'
  | 'totalDamage'
  | 'headshots'
  | 'assists';

const SORT_FOR_COLUMN: Partial<Record<StandingsColumnKey, SortKey>> = {
  mp: 'matchesPlayed',
  wwcd: 'wwcd',
  place: 'placementPoints',
  elims: 'eliminationPoints',
  bonus: 'bonusPoints',
  total: 'totalPoints',
  damage: 'totalDamage',
  headshots: 'headshots',
  assists: 'assists',
};

const COLOR_MAP: Record<ZoneColor, { border: string; dot: string; text: string; bgSoft: string }> = {
  blue: {
    border: 'border-[#0A5FC4]',
    dot: 'bg-[#0A5FC4]',
    text: 'text-[#0A5FC4] dark:text-blue-300',
    bgSoft: 'bg-[#0A5FC4]/10 border-[#0A5FC4]/20',
  },
  green: {
    border: 'border-emerald-500',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    bgSoft: 'bg-emerald-500/10 border-emerald-500/20',
  },
  emerald: {
    border: 'border-emerald-500',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    bgSoft: 'bg-emerald-500/10 border-emerald-500/20',
  },
  yellow: {
    border: 'border-amber-400',
    dot: 'bg-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
    bgSoft: 'bg-amber-400/15 border-amber-400/20',
  },
  orange: {
    border: 'border-orange-500',
    dot: 'bg-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
    bgSoft: 'bg-orange-500/10 border-orange-500/20',
  },
  amber: {
    border: 'border-amber-500',
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
    bgSoft: 'bg-amber-500/10 border-amber-500/20',
  },
  red: {
    border: 'border-rose-500',
    dot: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    bgSoft: 'bg-rose-500/10 border-rose-500/20',
  },
  rose: {
    border: 'border-rose-500',
    dot: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    bgSoft: 'bg-rose-500/10 border-rose-500/20',
  },
  purple: {
    border: 'border-purple-500',
    dot: 'bg-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
    bgSoft: 'bg-purple-500/10 border-purple-500/20',
  },
  pink: {
    border: 'border-pink-500',
    dot: 'bg-pink-500',
    text: 'text-pink-600 dark:text-pink-400',
    bgSoft: 'bg-pink-500/10 border-pink-500/20',
  },
  cyan: {
    border: 'border-cyan-500',
    dot: 'bg-cyan-500',
    text: 'text-cyan-600 dark:text-cyan-400',
    bgSoft: 'bg-cyan-500/10 border-cyan-500/20',
  },
  teal: {
    border: 'border-teal-500',
    dot: 'bg-teal-500',
    text: 'text-teal-600 dark:text-teal-400',
    bgSoft: 'bg-teal-500/10 border-teal-500/20',
  },
  gold: {
    border: 'border-amber-400',
    dot: 'bg-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
    bgSoft: 'bg-amber-400/15 border-amber-400/20',
  },
  slate: {
    border: 'border-slate-500',
    dot: 'bg-slate-500',
    text: 'text-slate-600 dark:text-slate-400',
    bgSoft: 'bg-slate-500/10 border-slate-500/20',
  },
};

const DEFAULT_ZONE_PALETTE: ZoneColor[] = [
  'blue',
  'emerald',
  'amber',
  'rose',
  'purple',
  'cyan',
  'teal',
  'orange',
];

interface FormEntry {
  matchNumber?: number | null;
  overallMatchNumber?: number | null;
  rank: number;
  wwcd: boolean;
  mapName: string | null;
  totalPoints: number;
}

interface PrecedenceQualification {
  label: string;
  color?: string;
  sourceTabName: string;
}

export function EstaticStandingsPanel({
  stages,
  matches,
  teams,
  config,
  overallTopFragger,
}: {
  stages: StandingsStageSummary[];
  matches: StandingsMatchLite[];
  teams: Record<string, StandingsTeamMeta>;
  config: StandingsConfig;
  overallTopFragger?: { ign: string; teamName: string; kills: number } | null;
}) {
  const tabGroups = React.useMemo(() => config.tabGroups || [], [config.tabGroups]);
  const hasTabGroups = tabGroups.length > 0;
  const customTabs = React.useMemo(() => config.customTabs || [], [config.customTabs]);

  // Active Tab Group (Level 1)
  const [activeGroupId, setActiveGroupId] = React.useState<string>(() => {
    if (hasTabGroups && tabGroups[0]) return tabGroups[0].id;
    return 'default';
  });

  const activeGroup = React.useMemo(() => {
    if (hasTabGroups) {
      return tabGroups.find((g) => g.id === activeGroupId) || tabGroups[0];
    }
    return null;
  }, [hasTabGroups, tabGroups, activeGroupId]);

  // Active Sub-Tab / Stage (Level 2)
  const initialActiveId = React.useMemo(() => {
    if (activeGroup && activeGroup.items.length > 0) {
      return activeGroup.items[0].id;
    }
    if (customTabs.length > 0) return customTabs[0].id;
    return stages[stages.length - 1]?.stageName ?? 'OVERALL';
  }, [activeGroup, customTabs, stages]);

  const [activeId, setActiveId] = React.useState<string>(initialActiveId);
  const [day, setDay] = React.useState('');
  const [map, setMap] = React.useState('');
  const [group, setGroup] = React.useState('');
  const [sortKey, setSortKey] = React.useState<SortKey>('rank');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');
  const [hidePrecedenceQualified, setHidePrecedenceQualified] = React.useState(false);

  // Find active navigation item
  const activeNavItem: StandingsNavigationItem | undefined = React.useMemo(() => {
    if (!hasTabGroups) return undefined;
    for (const g of tabGroups) {
      const match = g.items.find((it) => it.id === activeId);
      if (match) return match;
    }
    return activeGroup?.items[0];
  }, [hasTabGroups, tabGroups, activeId, activeGroup]);

  // Find active custom tab
  const activeCustomTab: StandingsCustomTab | undefined = React.useMemo(() => {
    if (activeNavItem && activeNavItem.type === 'CUSTOM_TAB') {
      return {
        id: activeNavItem.id,
        label: activeNavItem.label,
        shortLabel: activeNavItem.shortLabel,
        description: activeNavItem.description,
        includeStages: activeNavItem.includeStages || [],
        zones: activeNavItem.zones,
        excludeEliminatedFromStage: activeNavItem.excludeEliminatedFromStage,
        excludeEliminatedFromStages: activeNavItem.excludeEliminatedFromStages,
        precedenceFromTabId: activeNavItem.precedenceFromTabId,
        precedenceFromTabIds: activeNavItem.precedenceFromTabIds,
        hidePrecedenceQualified: activeNavItem.hidePrecedenceQualified,
      };
    }
    return customTabs.find((t) => t.id === activeId || t.label === activeId);
  }, [activeNavItem, customTabs, activeId]);

  // ── Calculate Eliminated Teams from Multiple Stages ──
  const eliminatedTeamIds = React.useMemo(() => {
    const rawStages =
      activeNavItem?.excludeEliminatedFromStages ||
      activeCustomTab?.excludeEliminatedFromStages ||
      (activeNavItem?.excludeEliminatedFromStage ? [activeNavItem.excludeEliminatedFromStage] : []) ||
      (activeCustomTab?.excludeEliminatedFromStage ? [activeCustomTab.excludeEliminatedFromStage] : []);

    if (!rawStages || rawStages.length === 0) return new Set<string>();

    const elimSet = new Set<string>();

    for (const stageName of rawStages) {
      const targetStageClean = stageName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
      const stageMatches = matches.filter(
        (m) => m.stageName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '') === targetStageClean
      );
      if (stageMatches.length === 0) continue;

      const stageStandings = calculateTournamentStandings(stageMatches.flatMap((m) => m.results));
      const stageConfig = getStageConfig(config, stageName);
      const zones = stageConfig.zones || [];

      const elimZones = zones.filter(
        (z) =>
          z.label.toLowerCase().includes('elim') ||
          z.color === 'red' ||
          z.color === 'rose'
      );

      if (elimZones.length > 0) {
        for (const team of stageStandings) {
          if (elimZones.some((z) => team.rank >= z.from && team.rank <= z.to)) {
            elimSet.add(team.teamId);
          }
        }
      } else {
        const bottom2 = stageStandings.slice(-2);
        for (const t of bottom2) {
          elimSet.add(t.teamId);
        }
      }
    }

    return elimSet;
  }, [activeNavItem, activeCustomTab, matches, config]);

  // Precedence qualifications
  const precedenceQualifications = React.useMemo(() => {
    const rawPrecIds =
      activeNavItem?.precedenceFromTabIds ||
      activeCustomTab?.precedenceFromTabIds ||
      (activeNavItem?.precedenceFromTabId ? [activeNavItem.precedenceFromTabId] : []) ||
      (activeCustomTab?.precedenceFromTabId ? [activeCustomTab.precedenceFromTabId] : []);

    if (!rawPrecIds || rawPrecIds.length === 0) return new Map<string, PrecedenceQualification>();

    const resultMap = new Map<string, PrecedenceQualification>();

    for (const precTabId of rawPrecIds) {
      let precItem: { label: string; includeStages?: string[]; stageName?: string; zones?: ZoneRule[] } | undefined;
      if (hasTabGroups) {
        for (const g of tabGroups) {
          const it = g.items.find((x) => x.id === precTabId || x.label === precTabId);
          if (it) {
            precItem = it;
            break;
          }
        }
      }
      if (!precItem) {
        precItem = customTabs.find((x) => x.id === precTabId || x.label === precTabId);
      }
      if (!precItem) continue;

      let precMatches: StandingsMatchLite[] = [];
      if (precItem.includeStages && precItem.includeStages.length > 0) {
        const allowed = new Set(
          precItem.includeStages.map((s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, ''))
        );
        precMatches = matches.filter((m) =>
          allowed.has(m.stageName.trim().toLowerCase().replace(/[^a-z0-9]+/g, ''))
        );
      } else if (precItem.stageName) {
        const stgClean = precItem.stageName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
        precMatches = matches.filter(
          (m) => m.stageName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '') === stgClean
        );
      }

      if (precMatches.length === 0) continue;

      const precStandings = calculateTournamentStandings(precMatches.flatMap((m) => m.results));
      const precZones = precItem.zones && precItem.zones.length > 0 ? precItem.zones : config.zones;

      for (const team of precStandings) {
        const zone = zoneForRank(precZones, team.rank);
        if (
          zone &&
          !zone.label.toLowerCase().includes('elim') &&
          zone.color !== 'red' &&
          zone.color !== 'rose' &&
          !resultMap.has(team.teamId)
        ) {
          resultMap.set(team.teamId, {
            label: `✓ ${zone.label.toUpperCase()} (${precItem.label.toUpperCase()})`,
            color: precItem.zones?.[0]?.color || zone.color || 'purple',
            sourceTabName: precItem.label,
          });
        }
      }
    }

    return resultMap;
  }, [activeNavItem, activeCustomTab, hasTabGroups, tabGroups, customTabs, matches, config]);

  const [activeGroupSubTab, setActiveGroupSubTab] = React.useState<string>('OVERALL');

  React.useEffect(() => {
    if (activeNavItem?.enableGroupSubTabs && activeNavItem.showOverallInGroupTabs === false) {
      setActiveGroupSubTab(activeNavItem.groups?.[0] || 'FIRST');
    } else {
      setActiveGroupSubTab('OVERALL');
    }
  }, [activeId, activeNavItem]);

  const rawStageMatches = React.useMemo(() => {
    let result: StandingsMatchLite[] = [];
    if (activeNavItem) {
      if (activeNavItem.type === 'OVERALL') {
        result = matches;
      } else if (activeNavItem.type === 'CUSTOM_TAB') {
        const allowedStages = new Set(
          (activeNavItem.includeStages || []).map((s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, ''))
        );
        result = allowedStages.size === 0
          ? matches
          : matches.filter((m) =>
              allowedStages.has(m.stageName.trim().toLowerCase().replace(/[^a-z0-9]+/g, ''))
            );
      } else {
        const targetStage = (activeNavItem.stageName || activeNavItem.label)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '');
        result = matches.filter(
          (m) => m.stageName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '') === targetStage
        );
      }
    } else if (activeCustomTab) {
      const allowedStages = new Set(
        activeCustomTab.includeStages.map((s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, ''))
      );
      result = allowedStages.size === 0
        ? matches
        : matches.filter((m) =>
            allowedStages.has(m.stageName.trim().toLowerCase().replace(/[^a-z0-9]+/g, ''))
          );
    } else if (activeId === 'OVERALL') {
      result = matches;
    } else {
      const mode = getStageConfig(config, activeId).mode;
      if (mode === 'CUMULATIVE') {
        const order = stages.map((s) => s.stageName);
        const idx = order.indexOf(activeId);
        const through = new Set(order.slice(0, idx === -1 ? order.length : idx + 1));
        result = matches.filter((m) => through.has(m.stageName));
      } else {
        result = matches.filter((m) => m.stageName === activeId);
      }
    }

    return result;
  }, [activeNavItem, activeCustomTab, activeId, matches, stages, config]);

  // Detected group sub-tabs
  const availableGroups = React.useMemo(() => {
    if (!activeNavItem?.enableGroupSubTabs) return [];
    if (activeNavItem.groups && activeNavItem.groups.length > 0) {
      return activeNavItem.groups;
    }
    const set = new Set<string>();
    for (const m of rawStageMatches) {
      if (m.groupName && m.groupName.trim()) {
        set.add(m.groupName.trim());
      }
    }
    if (activeNavItem.groupZones) {
      for (const k of Object.keys(activeNavItem.groupZones)) {
        if (k && k.trim()) set.add(k.trim());
      }
    }
    if (set.size > 0) {
      return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
    return ['Group A', 'Group B', 'Group C', 'Group D'];
  }, [activeNavItem, rawStageMatches]);

  const effectiveGroupSubTab = React.useMemo(() => {
    if (!activeNavItem?.enableGroupSubTabs || availableGroups.length === 0) return 'OVERALL';
    if (activeGroupSubTab === 'FIRST' && availableGroups.length > 0) return availableGroups[0];
    if (activeGroupSubTab !== 'OVERALL' && !availableGroups.includes(activeGroupSubTab)) {
      return activeNavItem.showOverallInGroupTabs === false ? availableGroups[0] : 'OVERALL';
    }
    return activeGroupSubTab;
  }, [activeNavItem, availableGroups, activeGroupSubTab]);

  const scopeMatches = React.useMemo(() => {
    if (effectiveGroupSubTab === 'OVERALL') {
      if (activeNavItem?.groupName) {
        return rawStageMatches.filter(
          (m) => m.groupName?.trim().toLowerCase() === activeNavItem.groupName?.trim().toLowerCase()
        );
      }
      return rawStageMatches;
    }
    const target = effectiveGroupSubTab.trim().toLowerCase();
    const targetPlain = target.replace(/^group\s*/i, '');
    return rawStageMatches.filter((m) => {
      if (!m.groupName) return false;
      const mGrp = m.groupName.trim().toLowerCase();
      const mGrpPlain = mGrp.replace(/^group\s*/i, '');
      return mGrp === target || mGrpPlain === targetPlain;
    });
  }, [rawStageMatches, effectiveGroupSubTab, activeNavItem?.groupName]);

  const stageCfg = React.useMemo(() => {
    let baseCfg: StandingsStageConfig;
    if (activeNavItem) {
      if (activeNavItem.type === 'CUSTOM_TAB' || activeNavItem.type === 'OVERALL') {
        baseCfg = {
          mode: 'STAGE' as const,
          groupMode: 'CUMULATIVE' as const,
          filters: config.filters,
          zones: activeNavItem.zones && activeNavItem.zones.length > 0 ? activeNavItem.zones : config.zones,
        };
      } else {
        const stgName = activeNavItem.stageName || activeNavItem.label;
        const base = getStageConfig(config, stgName);
        baseCfg = {
          ...base,
          zones: activeNavItem.zones && activeNavItem.zones.length > 0 ? activeNavItem.zones : base.zones,
        };
      }
    } else if (activeCustomTab) {
      baseCfg = {
        mode: 'STAGE' as const,
        groupMode: 'CUMULATIVE' as const,
        filters: config.filters,
        zones: activeCustomTab.zones && activeCustomTab.zones.length > 0 ? activeCustomTab.zones : config.zones,
      };
    } else if (activeId === 'OVERALL') {
      baseCfg = {
        mode: 'STAGE' as const,
        groupMode: 'CUMULATIVE' as const,
        filters: config.filters,
        zones: config.zones,
      };
    } else {
      baseCfg = getStageConfig(config, activeId);
    }

    if (
      effectiveGroupSubTab !== 'OVERALL' &&
      activeNavItem?.groupZones
    ) {
      const target = effectiveGroupSubTab.trim().toLowerCase();
      const targetPlain = target.replace(/^group\s*/i, '');
      const matchKey = Object.keys(activeNavItem.groupZones).find((k) => {
        const kLower = k.trim().toLowerCase();
        return kLower === target || kLower.replace(/^group\s*/i, '') === targetPlain;
      });
      if (matchKey && activeNavItem.groupZones[matchKey]?.length > 0) {
        return {
          ...baseCfg,
          zones: activeNavItem.groupZones[matchKey],
        };
      }
    }

    return baseCfg;
  }, [activeNavItem, activeCustomTab, activeId, config, effectiveGroupSubTab]);

  const options = React.useMemo(() => {
    const days = [...new Set(scopeMatches.map((m) => m.day))].sort((a, b) => Number(a) - Number(b));
    const maps = [...new Set(scopeMatches.map((m) => m.mapName).filter((v): v is string => !!v))].sort();
    const groups = [...new Set(scopeMatches.map((m) => m.groupName).filter((v): v is string => !!v))].sort();
    return { days, maps, groups };
  }, [scopeMatches]);

  const isFiltered = Boolean(day || map || group);
  const effectiveZones = React.useMemo(() => {
    return isFiltered ? [] : (stageCfg.zones || []);
  }, [isFiltered, stageCfg.zones]);

  const filteredMatches = React.useMemo(
    () =>
      scopeMatches.filter(
        (m) =>
          (!day || m.day === day) &&
          (!map || m.mapName === map) &&
          (!group || m.groupName === group)
      ),
    [scopeMatches, day, map, group]
  );

  const baseStandings = React.useMemo(() => {
    let raw = calculateTournamentStandings(filteredMatches.flatMap((m) => m.results));

    // Exclude teams eliminated in earlier stages!
    if (eliminatedTeamIds.size > 0) {
      raw = raw.filter((t) => !eliminatedTeamIds.has(t.teamId));
    }

    // Exclude precedence qualified teams if toggle is on!
    if (hidePrecedenceQualified && precedenceQualifications.size > 0) {
      raw = raw.filter((t) => !precedenceQualifications.has(t.teamId));
    }

    // Re-rank after exclusions
    return raw.map((t, idx) => ({ ...t, rank: idx + 1 }));
  }, [filteredMatches, eliminatedTeamIds, hidePrecedenceQualified, precedenceQualifications]);

  // Form entries
  const formByTeam = React.useMemo(() => {
    const map = new Map<string, FormEntry[]>();
    const completed = filteredMatches
      .filter((m) => m.status === 'COMPLETED')
      .sort((a, b) => {
        const timeA = new Date(a.scheduledAt).getTime() || 0;
        const timeB = new Date(b.scheduledAt).getTime() || 0;
        if (timeA !== timeB) return timeA - timeB;
        return Number(a.matchNumber || 0) - Number(b.matchNumber || 0);
      });

    for (const m of completed) {
      for (const r of m.results) {
        if (!map.has(r.teamId)) map.set(r.teamId, []);
        map.get(r.teamId)!.push({
          matchNumber: m.matchNumber,
          overallMatchNumber: m.overallMatchNumber,
          rank: r.rank,
          wwcd: Boolean(r.wwcd || r.rank === 1),
          mapName: m.mapName,
          totalPoints: r.totalPoints,
        });
      }
    }
    return map;
  }, [filteredMatches]);

  // Assigned zones respecting precedence
  const teamAssignedZones = React.useMemo(() => {
    const map = new Map<string, { zone: ZoneRule | null; isPrecedence: boolean; precedenceLabel?: string; precedenceColor?: string }>();
    if (effectiveZones.length === 0 && precedenceQualifications.size === 0) return map;

    let eligibleRankCounter = 1;

    for (const team of baseStandings) {
      const prec = precedenceQualifications.get(team.teamId);

      if (prec) {
        map.set(team.teamId, {
          zone: null,
          isPrecedence: true,
          precedenceLabel: prec.label,
          precedenceColor: prec.color || 'purple',
        });
      } else {
        const assignedZone = effectiveZones.length > 0 ? zoneForRank(effectiveZones, eligibleRankCounter) : null;
        map.set(team.teamId, {
          zone: assignedZone,
          isPrecedence: false,
        });
        eligibleRankCounter++;
      }
    }
    return map;
  }, [baseStandings, effectiveZones, precedenceQualifications]);

  // Sort standings
  const sortedStandings = React.useMemo(() => {
    const list = [...baseStandings];
    list.sort((a, b) => {
      let diff = 0;
      if (sortKey === 'rank') diff = a.rank - b.rank;
      else if (sortKey === 'matchesPlayed') diff = b.matchesPlayed - a.matchesPlayed;
      else if (sortKey === 'wwcd') diff = b.wwcd - a.wwcd;
      else if (sortKey === 'placementPoints') diff = b.placementPoints - a.placementPoints;
      else if (sortKey === 'eliminationPoints') diff = b.eliminationPoints - a.eliminationPoints;
      else if (sortKey === 'totalPoints') diff = b.totalPoints - a.totalPoints;
      else if (sortKey === 'totalDamage') diff = b.totalDamage - a.totalDamage;
      else if (sortKey === 'headshots') diff = b.headshots - a.headshots;
      else if (sortKey === 'assists') diff = b.assists - a.assists;

      return sortDir === 'asc' ? diff : -diff;
    });
    return list;
  }, [baseStandings, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'rank' ? 'asc' : 'desc');
    }
  };

  const getZoneStyle = (zone: ZoneRule | null, explicitColor?: string) => {
    const colorKey =
      (explicitColor as ZoneColor) ||
      (zone?.color as ZoneColor) ||
      (zone ? DEFAULT_ZONE_PALETTE[effectiveZones.indexOf(zone) % DEFAULT_ZONE_PALETTE.length] : 'blue');
    return COLOR_MAP[colorKey] || COLOR_MAP.blue;
  };

  return (
    <div className="space-y-5">
      {/* ============ NAVIGATION & STAGE SELECTOR ============ */}
      <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
        {/* Mobile: Stages & Sub-views Dropdowns */}
        {hasTabGroups && (
          <div className="space-y-2.5 sm:hidden">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">
                Select Stage:
              </span>
              <SearchableSelect
                size="sm"
                options={tabGroups.map((grp) => ({
                  value: grp.id,
                  label: `${grp.name} (${grp.items.length})`,
                }))}
                value={activeGroupId}
                onChange={(grpId) => {
                  setActiveGroupId(grpId);
                  const grp = tabGroups.find((g) => g.id === grpId);
                  if (grp && grp.items.length > 0) {
                    setActiveId(grp.items[0].id);
                  }
                  setDay('');
                  setMap('');
                  setGroup('');
                }}
                showSearch={tabGroups.length > 4}
                searchPlaceholder="Search stage..."
              />
            </div>

            {activeGroup && activeGroup.items.length > 1 && (
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">
                  Select Sub-view:
                </span>
                <SearchableSelect
                  size="sm"
                  options={activeGroup.items.map((item) => ({
                    value: item.id,
                    label: item.label,
                  }))}
                  value={activeId}
                  onChange={(itemId) => {
                    setActiveId(itemId);
                    setDay('');
                    setMap('');
                    setGroup('');
                  }}
                  showSearch={activeGroup.items.length > 4}
                  searchPlaceholder="Search sub-view..."
                />
              </div>
            )}
          </div>
        )}

        {/* Desktop: Primary Tab Groups */}
        {hasTabGroups && (
          <div className="hidden sm:flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300 mr-2 shrink-0">
              Stages:
            </span>
            <div className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1 dark:border-white/10 dark:bg-white/5">
              {tabGroups.map((grp) => {
                const active = activeGroupId === grp.id;
                return (
                  <button
                    key={grp.id}
                    onClick={() => {
                      setActiveGroupId(grp.id);
                      if (grp.items.length > 0) {
                        setActiveId(grp.items[0].id);
                      }
                      setDay('');
                      setMap('');
                      setGroup('');
                    }}
                    className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      active
                        ? 'bg-[#0A5FC4] text-white shadow-md shadow-blue-500/25 scale-[1.01]'
                        : 'text-slate-600 hover:text-slate-950 hover:bg-white/70 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10'
                    }`}
                  >
                    <span>{grp.name}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[9px] font-extrabold ${
                        active ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300'
                      }`}
                    >
                      {grp.items.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Desktop: Secondary Items / Stages within Active Group */}
        {activeGroup && activeGroup.items.length > 1 && (
          <div className="hidden sm:flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-slate-100 dark:border-white/10">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-2 shrink-0">
              Sub-view:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeGroup.items.map((item) => {
                const active = activeId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveId(item.id);
                      setDay('');
                      setMap('');
                      setGroup('');
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? 'bg-[#0A5FC4] text-white shadow-sm'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Desktop & Mobile: Tier 3 Group Sub-Tabs within Active Stage (e.g. Groups A, B, C, D) */}
        {availableGroups.length > 0 && activeNavItem?.enableGroupSubTabs && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-slate-100 dark:border-white/10">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-300 mr-2 shrink-0">
              Groups:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeNavItem.showOverallInGroupTabs !== false && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveGroupSubTab('OVERALL');
                    setDay('');
                    setMap('');
                    setGroup('');
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    effectiveGroupSubTab === 'OVERALL'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                  }`}
                >
                  Combined Overall ({rawStageMatches.length}m)
                </button>
              )}
              {availableGroups.map((grpName) => {
                const active = effectiveGroupSubTab === grpName;
                const grpMatchCount = rawStageMatches.filter((m) => m.groupName === grpName).length;
                return (
                  <button
                    key={grpName}
                    type="button"
                    onClick={() => {
                      setActiveGroupSubTab(grpName);
                      setDay('');
                      setMap('');
                      setGroup('');
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                    }`}
                  >
                    <span>{grpName}</span>
                    {grpMatchCount > 0 && (
                      <span className="text-[9px] opacity-75 font-mono">({grpMatchCount}m)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Match Filters (Day, Map, Group) */}
        {(options.days.length > 1 || options.maps.length > 1) && (
          <div className="flex flex-wrap items-center gap-4 pt-2.5 border-t border-slate-100 dark:border-white/10 text-xs">
            {options.days.length > 1 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Day:</span>
                <div className="flex gap-1 flex-wrap">
                  <button
                    onClick={() => setDay('')}
                    className={`rounded-lg px-2 py-0.5 text-xs font-bold transition cursor-pointer ${day === '' ? 'bg-[#0A5FC4] text-white' : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400'}`}
                  >
                    All
                  </button>
                  {options.days.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDay(day === d ? '' : d)}
                      className={`rounded-lg px-2 py-0.5 text-xs font-bold transition cursor-pointer ${day === d ? 'bg-[#0A5FC4] text-white' : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400'}`}
                    >
                      D{d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {options.maps.length > 1 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Map:</span>
                <div className="flex gap-1 flex-wrap">
                  <button
                    onClick={() => setMap('')}
                    className={`rounded-lg px-2 py-0.5 text-xs font-bold transition cursor-pointer ${map === '' ? 'bg-[#0A5FC4] text-white' : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400'}`}
                  >
                    All
                  </button>
                  {options.maps.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMap(map === m ? '' : m)}
                      className={`rounded-lg px-2 py-0.5 text-xs font-bold transition cursor-pointer ${map === m ? 'bg-[#0A5FC4] text-white' : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============ CUMULATIVE STANDINGS BANNER & PRECEDENCE TOGGLE ============ */}
      {(activeNavItem?.type === 'CUSTOM_TAB' || activeCustomTab) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-3xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-5 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-md bg-[#0A5FC4] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                <Layers className="h-3 w-3" /> Cumulative Standings
              </span>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {activeNavItem?.label || activeCustomTab?.label}
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {activeNavItem?.description ||
                activeCustomTab?.description ||
                'Cumulative standings across selected stages'}
            </p>
          </div>

          {precedenceQualifications.size > 0 && (
            <button
              type="button"
              onClick={() => setHidePrecedenceQualified((prev) => !prev)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all border cursor-pointer whitespace-nowrap ${
                hidePrecedenceQualified
                  ? 'bg-[#0A5FC4] border-[#0A5FC4] text-white shadow-md shadow-blue-500/25'
                  : 'bg-white dark:bg-[#0b1220] border-slate-300 dark:border-white/10 text-slate-800 dark:text-white hover:border-[#0A5FC4]'
              }`}
            >
              {hidePrecedenceQualified ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              <span>
                {hidePrecedenceQualified
                  ? 'Show All Teams (Including Qualified)'
                  : `Hide ${precedenceQualifications.size} Already Qualified Teams`}
              </span>
            </button>
          )}
        </div>
      )}

      {/* ============ ADVANCEMENT RULES LEGEND (Subtle & Refined) ============ */}
      {effectiveZones.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm dark:border-white/10 dark:bg-[#0b1220] text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
              Advancement Zones:
            </span>
            {effectiveZones.map((z: ZoneRule, idx: number) => {
              const zStyle = getZoneStyle(z);
              return (
                <div key={idx} className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                  <span className={`h-2 w-2 rounded-full ${zStyle.dot} shrink-0`} />
                  <span>
                    Slot #{z.from}–#{z.to}: <strong className="font-bold text-slate-900 dark:text-white">{z.label}</strong>
                  </span>
                </div>
              );
            })}
          </div>

          {precedenceQualifications.size > 0 && (
            <div className="inline-flex items-center gap-1.5 text-xs text-[#0A5FC4] dark:text-blue-300 font-bold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{precedenceQualifications.size} teams already qualified via Super Weekends (Slots pass to next teams)</span>
            </div>
          )}
        </div>
      )}

      {/* ============ STANDINGS TABLE ============ */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-white/5">
                {/* Rank # */}
                <th
                  className="py-2.5 sm:py-3.5 pl-2.5 sm:pl-5 w-8 sm:w-14 text-center cursor-pointer"
                  onClick={() => toggleSort('rank')}
                >
                  <span className="inline-flex items-center gap-0.5">
                    # {sortKey === 'rank' && (sortDir === 'asc' ? '▲' : '▼')}
                  </span>
                </th>

                {/* Squad */}
                <th className="py-2.5 sm:py-3.5 pl-1.5 sm:pl-4 min-w-[75px] sm:min-w-[240px]">
                  Squad
                </th>

                {/* MP (M on mobile) */}
                <th className="py-2.5 sm:py-3.5 px-1 sm:px-3 text-center cursor-pointer w-7 sm:w-14" onClick={() => toggleSort('matchesPlayed')}>
                  <span className="inline-flex items-center gap-0.5">
                    <span className="sm:hidden">M</span>
                    <span className="hidden sm:inline">MP</span>
                    {sortKey === 'matchesPlayed' && (sortDir === 'asc' ? '▲' : '▼')}
                  </span>
                </th>

                {/* WWCD (W on mobile) */}
                <th className="py-2.5 sm:py-3.5 px-1 sm:px-3 text-center cursor-pointer w-7 sm:w-16" onClick={() => toggleSort('wwcd')}>
                  <span className="inline-flex items-center gap-0.5">
                    <span className="sm:hidden">W</span>
                    <span className="hidden sm:inline">WWCD</span>
                    {sortKey === 'wwcd' && (sortDir === 'asc' ? '▲' : '▼')}
                  </span>
                </th>

                {/* Elims Pts (E on mobile) */}
                <th className="py-2.5 sm:py-3.5 px-1 sm:px-2 text-center cursor-pointer w-8 sm:w-16" onClick={() => toggleSort('eliminationPoints')}>
                  <span className="inline-flex items-center gap-0.5">
                    <span className="sm:hidden">E</span>
                    <span className="hidden sm:inline">Elims</span>
                    {sortKey === 'eliminationPoints' && (sortDir === 'asc' ? '▲' : '▼')}
                  </span>
                </th>

                {/* Place Pts (P on mobile) */}
                <th className="py-2.5 sm:py-3.5 px-1 sm:px-2 text-center cursor-pointer w-8 sm:w-16" onClick={() => toggleSort('placementPoints')}>
                  <span className="inline-flex items-center gap-0.5">
                    <span className="sm:hidden">P</span>
                    <span className="hidden sm:inline">Place</span>
                    {sortKey === 'placementPoints' && (sortDir === 'asc' ? '▲' : '▼')}
                  </span>
                </th>

                {/* Bonus Pts */}
                <th className="hidden lg:table-cell py-2.5 sm:py-3.5 px-2 text-center cursor-pointer" onClick={() => toggleSort('bonusPoints')}>
                  <span className="inline-flex items-center gap-0.5">
                    Bonus {sortKey === 'bonusPoints' && (sortDir === 'asc' ? '▲' : '▼')}
                  </span>
                </th>

                {/* Total Points */}
                <th className="py-2.5 sm:py-3.5 pr-2.5 sm:pr-6 text-right cursor-pointer w-12 sm:w-24" onClick={() => toggleSort('totalPoints')}>
                  <span className="inline-flex items-center gap-0.5">
                    Total {sortKey === 'totalPoints' && (sortDir === 'asc' ? '▲' : '▼')}
                  </span>
                </th>

                {/* Recent Form */}
                <th className="hidden lg:table-cell py-2.5 sm:py-3.5 pr-5 pl-3 text-center min-w-[120px]">
                  Form
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {sortedStandings.map((team) => {
                const meta = teams[team.teamId];
                const cleanName = meta?.displayName || meta?.name || team.teamName;
                const teamTag = meta?.tag || cleanName.slice(0, 4).toUpperCase();
                const assignment = teamAssignedZones.get(team.teamId);
                const isPrec = assignment?.isPrecedence;
                const zone = assignment?.zone || null;
                const zStyle = isPrec
                  ? getZoneStyle(null, assignment.precedenceColor)
                  : zone
                  ? getZoneStyle(zone)
                  : null;

                const form = (formByTeam.get(team.teamId) ?? []).slice(-5).reverse();

                return (
                  <tr
                    key={team.teamId}
                    className={`group text-xs sm:text-sm transition-colors hover:bg-slate-50/80 dark:hover:bg-white/5 ${
                      isPrec ? 'bg-blue-50/20 dark:bg-blue-950/10' : ''
                    }`}
                  >
                    {/* Rank Badge with left border accent */}
                    <td
                      className={`py-2.5 sm:py-3 pl-3 sm:pl-5 text-center font-black transition-colors border-l-[3px] sm:border-l-4 ${
                        zStyle ? zStyle.border : 'border-transparent'
                      }`}
                    >
                      <span
                        className={`inline-flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black ${
                          team.rank === 1
                            ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/25'
                            : team.rank === 2
                            ? 'bg-slate-300 text-slate-900'
                            : team.rank === 3
                            ? 'bg-amber-600/20 text-amber-600 dark:text-amber-400'
                            : isPrec || zone
                            ? 'bg-blue-50 text-[#0A5FC4] dark:bg-white/5 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
                        }`}
                      >
                        {team.rank}
                      </span>
                    </td>

                    {/* Squad & Qualification Badge */}
                    <td className="py-2.5 sm:py-3 pl-2 sm:pl-4 pr-2">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <Link
                          href={`/teams/${team.teamId}`}
                          className="relative flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center overflow-hidden rounded-md sm:rounded-xl border border-slate-200 bg-slate-50 shadow-2xs dark:border-white/10 dark:bg-black/40 hover:scale-105 transition-transform"
                        >
                          {meta?.logoUrl || meta?.logoDarkUrl ? (
                            <ThemeLogo
                              lightSrc={meta?.logoUrl}
                              darkSrc={meta?.logoDarkUrl}
                              alt={cleanName}
                              className="object-contain p-0.5 sm:p-1"
                            />
                          ) : (
                            <span className="text-[9px] sm:text-xs font-black text-slate-400">
                              {cleanName.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </Link>
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          {/* Mobile: Short tag */}
                          <Link
                            href={`/teams/${team.teamId}`}
                            className="font-black text-xs text-slate-900 hover:text-[#0A5FC4] dark:text-white transition-colors block sm:hidden uppercase tracking-wide"
                            title={cleanName}
                          >
                            {teamTag}
                          </Link>
                          {/* Desktop: Full squad name */}
                          <Link
                            href={`/teams/${team.teamId}`}
                            className="hidden sm:block font-extrabold text-slate-900 hover:text-[#0A5FC4] dark:text-white transition-colors truncate"
                          >
                            {cleanName}
                          </Link>

                          {/* Outline Qualification Badge matching exact image */}
                          {isPrec && zStyle && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${zStyle.bgSoft} ${zStyle.text}`}
                            >
                              <ShieldCheck className="h-3 w-3 shrink-0" />
                              <span className="truncate">{assignment.precedenceLabel}</span>
                            </span>
                          )}
                          {!isPrec && zone && zStyle && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${zStyle.bgSoft} ${zStyle.text}`}
                            >
                              <span className="truncate">{zone.label}</span>
                            </span>
                          )}

                          {/* Tiebreaker Explanation Badge */}
                          {team.tiebreaker?.isTied && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black tracking-tight border cursor-help shadow-2xs transition-transform hover:scale-105 ${
                                team.tiebreaker.won
                                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-amber-500/15 border-amber-500/35 text-amber-700 dark:text-amber-300'
                              }`}
                              title={team.tiebreaker.reason}
                            >
                              <Scale className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{team.tiebreaker.shortBadge}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* MP (M on mobile) */}
                    <td className="py-2 sm:py-3 px-1 sm:px-3 text-center font-bold text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                      {team.matchesPlayed}
                    </td>

                    {/* WWCD (W on mobile) */}
                    <td className="py-2 sm:py-3 px-1 sm:px-3 text-center font-black text-amber-500 text-xs sm:text-sm">
                      {team.wwcd > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-[11px] sm:text-xs">
                          {team.wwcd}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Elims Pts (E on mobile) */}
                    <td className="py-2 sm:py-3 px-1 sm:px-2 text-center font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                      {team.eliminationPoints}
                    </td>

                    {/* Place Pts (P on mobile) */}
                    <td className="py-2 sm:py-3 px-1 sm:px-2 text-center font-bold text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                      {team.placementPoints}
                    </td>

                    {/* Bonus Pts */}
                    <td className="hidden lg:table-cell py-2 sm:py-3 text-center font-bold text-slate-600 dark:text-slate-300">
                      {team.bonusPoints || 0}
                    </td>

                    {/* Total Points */}
                    <td className="py-2 sm:py-3 pr-2.5 sm:pr-6 text-right">
                      <span className="text-xs sm:text-base font-black text-[#0A5FC4] dark:text-blue-300">
                        {team.totalPoints}
                      </span>
                    </td>

                    {/* Recent Match Form */}
                    <td className="hidden lg:table-cell py-2.5 sm:py-3 pr-5 pl-3 text-center">
                      {form.length > 0 ? (
                        <div className="inline-flex items-center gap-1">
                          {form.map((f, idx) => {
                            const isWwcd = f.wwcd || f.rank === 1;
                            const isTop3 = !isWwcd && f.rank <= 3;
                            const isZero = f.totalPoints === 0;

                            return (
                              <span
                                key={idx}
                                className={`inline-flex h-5 min-w-5 px-1 items-center justify-center rounded-md text-[10px] font-extrabold ${
                                  isWwcd
                                    ? 'bg-amber-400 text-slate-950 font-black ring-1 ring-amber-400 shadow-xs'
                                    : isTop3
                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold'
                                    : isZero
                                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold'
                                    : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 font-semibold'
                                }`}
                                title={`Match ${f.overallMatchNumber ?? f.matchNumber ?? ''}: ${f.totalPoints} pts (Rank #${f.rank}${isWwcd ? ' · WWCD' : ''})`}
                              >
                                {f.totalPoints}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
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
