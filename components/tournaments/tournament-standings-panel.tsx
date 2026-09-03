'use client';

import React from 'react';
import {
  Trophy,
  ChevronUp,
  ChevronDown,
  Award,
  X,
  Users,
  Sparkles,
  Layers,
  Info,
  Calendar,
  Filter,
  Flame,
  ShieldCheck,
  EyeOff,
  Eye,
} from 'lucide-react';
import { calculateTournamentStandings, type AggregatedTeamStanding } from '@/lib/tournament-math';
import {
  getStageConfig,
  zoneForRank,
  STANDINGS_COLUMN_DEFS,
  STANDINGS_FILTER_DEFS,
  type StandingsConfig,
  type StandingsFilterKey,
  type StandingsColumnKey,
  type StandingsMatchLite,
  type StandingsTeamMeta,
  type StandingsStageSummary,
  type StandingsCustomTab,
  type StandingsTabGroup,
  type StandingsNavigationItem,
  type ZoneRule,
  type ZoneColor,
} from '@/lib/standings-config';

type SortKey =
  | 'rank'
  | 'matchesPlayed'
  | 'wwcd'
  | 'placementPoints'
  | 'eliminationPoints'
  | 'bonusPoints'
  | 'totalPoints'
  | 'totalDamage'
  | 'totalDamageReceived'
  | 'totalHealing'
  | 'headshots'
  | 'assists'
  | 'knockouts'
  | 'longestElim'
  | 'vehicleElims'
  | 'grenadeElims'
  | 'smokesUsed'
  | 'grenadesUsed'
  | 'molotovsUsed'
  | 'flashUsed'
  | 'airdrops'
  | 'rescues'
  | 'distDrove'
  | 'distWalk';

const SORT_FOR_COLUMN: Record<Exclude<StandingsColumnKey, 'form'>, SortKey> = {
  mp: 'matchesPlayed',
  wwcd: 'wwcd',
  place: 'placementPoints',
  elims: 'eliminationPoints',
  bonus: 'bonusPoints',
  total: 'totalPoints',
  damage: 'totalDamage',
  damageReceived: 'totalDamageReceived',
  healing: 'totalHealing',
  headshots: 'headshots',
  assists: 'assists',
  knockouts: 'knockouts',
  longestElim: 'longestElim',
  vehicleElims: 'vehicleElims',
  grenadeElims: 'grenadeElims',
  smokesUsed: 'smokesUsed',
  grenadesUsed: 'grenadesUsed',
  molotovsUsed: 'molotovsUsed',
  flashUsed: 'flashUsed',
  airdrops: 'airdrops',
  rescues: 'rescues',
  distDrove: 'distDrove',
  distWalk: 'distWalk',
};

const COLUMN_WIDTH: Record<StandingsColumnKey, number> = {
  mp: 3.5,
  wwcd: 4,
  place: 4,
  elims: 4,
  bonus: 4,
  total: 5,
  damage: 5.5,
  damageReceived: 5.5,
  healing: 5,
  headshots: 4,
  assists: 4,
  knockouts: 4,
  longestElim: 4.5,
  vehicleElims: 4.5,
  grenadeElims: 4.5,
  smokesUsed: 4,
  grenadesUsed: 4,
  molotovsUsed: 4,
  flashUsed: 4,
  airdrops: 4,
  rescues: 4,
  distDrove: 4.5,
  distWalk: 4.5,
  form: 12,
};

const COLOR_MAP: Record<ZoneColor, { border: string; dot: string; text: string; bgSoft: string }> = {
  blue: {
    border: 'border-(--ed-blue)',
    dot: 'bg-(--ed-blue)',
    text: 'text-(--ed-blue)',
    bgSoft: 'bg-(--ed-blue)/10',
  },
  green: {
    border: 'border-emerald-500',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    bgSoft: 'bg-emerald-500/10',
  },
  emerald: {
    border: 'border-emerald-500',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    bgSoft: 'bg-emerald-500/10',
  },
  yellow: {
    border: 'border-yellow-400',
    dot: 'bg-yellow-400',
    text: 'text-yellow-600 dark:text-yellow-400',
    bgSoft: 'bg-yellow-400/15',
  },
  orange: {
    border: 'border-amber-500',
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    bgSoft: 'bg-amber-500/10',
  },
  amber: {
    border: 'border-amber-500',
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    bgSoft: 'bg-amber-500/10',
  },
  red: {
    border: 'border-rose-500',
    dot: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    bgSoft: 'bg-rose-500/10',
  },
  rose: {
    border: 'border-rose-500',
    dot: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    bgSoft: 'bg-rose-500/10',
  },
  purple: {
    border: 'border-purple-500',
    dot: 'bg-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
    bgSoft: 'bg-purple-500/10',
  },
  pink: {
    border: 'border-pink-500',
    dot: 'bg-pink-500',
    text: 'text-pink-600 dark:text-pink-400',
    bgSoft: 'bg-pink-500/10',
  },
  cyan: {
    border: 'border-cyan-500',
    dot: 'bg-cyan-500',
    text: 'text-cyan-600 dark:text-cyan-400',
    bgSoft: 'bg-cyan-500/10',
  },
  teal: {
    border: 'border-teal-500',
    dot: 'bg-teal-500',
    text: 'text-teal-600 dark:text-teal-400',
    bgSoft: 'bg-teal-500/10',
  },
  gold: {
    border: 'border-amber-400',
    dot: 'bg-amber-400',
    text: 'text-amber-500',
    bgSoft: 'bg-amber-400/20',
  },
  slate: {
    border: 'border-slate-500',
    dot: 'bg-slate-500',
    text: 'text-slate-600 dark:text-slate-400',
    bgSoft: 'bg-slate-500/10',
  },
};

const DEFAULT_ZONE_PALETTE: ZoneColor[] = [
  'blue',
  'green',
  'yellow',
  'orange',
  'red',
  'purple',
  'pink',
  'cyan',
  'teal',
  'gold',
  'slate',
];

interface FormEntry {
  matchNumber?: number | null;
  overallMatchNumber?: number | null;
  rank: number;
  wwcd: boolean;
  mapName: string | null;
  totalPoints: number;
}

interface Rows {
  sorted: AggregatedTeamStanding[];
  formByTeam: Map<string, FormEntry[]>;
}

interface PrecedenceQualification {
  label: string;
  color?: string;
  sourceTabName: string;
}

export function TournamentStandingsPanel({
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

  // Sub-division Group Selection
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

  // Default active tab item
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

  // Find active navigation item (if in tabGroups)
  const activeNavItem: StandingsNavigationItem | undefined = React.useMemo(() => {
    if (!hasTabGroups) return undefined;
    for (const g of tabGroups) {
      const match = g.items.find((it) => it.id === activeId);
      if (match) return match;
    }
    return activeGroup?.items[0];
  }, [hasTabGroups, tabGroups, activeId, activeGroup]);

  // Find active custom tab (if legacy customTabs)
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
        precedenceFromTabId: activeNavItem.precedenceFromTabId,
        hidePrecedenceQualified: activeNavItem.hidePrecedenceQualified,
      };
    }
    return customTabs.find((t) => t.id === activeId || t.label === activeId);
  }, [activeNavItem, customTabs, activeId]);

  // ── Calculate Eliminated Teams from Multiple Stages (e.g. League Week 1 & League Week 2) ──
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

      // Find zones marked as elimination or red/rose
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
        // Fallback: If no explicit zone, eliminate bottom 2 teams of that stage
        const bottom2 = stageStandings.slice(-2);
        for (const t of bottom2) {
          elimSet.add(t.teamId);
        }
      }
    }

    return elimSet;
  }, [activeNavItem, activeCustomTab, matches, config]);

  // ── Calculate Precedence Qualified Teams (from Multiple Precedence Tabs) ──
  const precedenceQualifications = React.useMemo(() => {
    const rawPrecIds =
      activeNavItem?.precedenceFromTabIds ||
      activeCustomTab?.precedenceFromTabIds ||
      (activeNavItem?.precedenceFromTabId ? [activeNavItem.precedenceFromTabId] : []) ||
      (activeCustomTab?.precedenceFromTabId ? [activeCustomTab.precedenceFromTabId] : []);

    if (!rawPrecIds || rawPrecIds.length === 0) return new Map<string, PrecedenceQualification>();

    const resultMap = new Map<string, PrecedenceQualification>();

    for (const precTabId of rawPrecIds) {
      // Find the precedence tab in tabGroups or customTabs
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

      // Get matches for precedence tab
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
            label: zone.label,
            color: zone.color,
            sourceTabName: precItem.label,
          });
        }
      }
    }

    return resultMap;
  }, [activeNavItem, activeCustomTab, hasTabGroups, tabGroups, customTabs, matches, config]);

  const stageCfg = React.useMemo(() => {
    if (activeNavItem) {
      if (activeNavItem.type === 'CUSTOM_TAB' || activeNavItem.type === 'OVERALL') {
        return {
          mode: 'STAGE' as const,
          groupMode: 'CUMULATIVE' as const,
          filters: config.filters,
          zones: activeNavItem.zones && activeNavItem.zones.length > 0 ? activeNavItem.zones : config.zones,
        };
      }
      const stgName = activeNavItem.stageName || activeNavItem.label;
      const base = getStageConfig(config, stgName);
      return {
        ...base,
        zones: activeNavItem.zones && activeNavItem.zones.length > 0 ? activeNavItem.zones : base.zones,
      };
    }

    if (activeCustomTab) {
      return {
        mode: 'STAGE' as const,
        groupMode: 'CUMULATIVE' as const,
        filters: config.filters,
        zones: activeCustomTab.zones && activeCustomTab.zones.length > 0 ? activeCustomTab.zones : config.zones,
      };
    }
    if (activeId === 'OVERALL') {
      return {
        mode: 'STAGE' as const,
        groupMode: 'CUMULATIVE' as const,
        filters: config.filters,
        zones: config.zones,
      };
    }
    return getStageConfig(config, activeId);
  }, [activeNavItem, activeCustomTab, activeId, config]);

  const scopeMatches = React.useMemo(() => {
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
    } else if (stageCfg.mode === 'CUMULATIVE') {
      const order = stages.map((s) => s.stageName);
      const idx = order.indexOf(activeId);
      const through = new Set(order.slice(0, idx === -1 ? order.length : idx + 1));
      result = matches.filter((m) => through.has(m.stageName));
    } else {
      result = matches.filter((m) => m.stageName === activeId);
    }

    // Apply Elimination Filter: Exclude teams eliminated in previous stage (e.g. LW1)
    if (eliminatedTeamIds.size > 0) {
      result = result.map((m) => ({
        ...m,
        results: m.results.filter((r) => !eliminatedTeamIds.has(r.teamId)),
      }));
    }

    return result;
  }, [activeNavItem, activeCustomTab, activeId, matches, stages, stageCfg.mode, eliminatedTeamIds]);

  const options = React.useMemo(() => {
    const days = [...new Set(scopeMatches.map((m) => m.day))].sort((a, b) => Number(a) - Number(b));
    const maps = [...new Set(scopeMatches.map((m) => m.mapName).filter((v): v is string => !!v))].sort();
    const groups = [...new Set(scopeMatches.map((m) => m.groupName).filter((v): v is string => !!v))].sort();
    return { days, maps, groups };
  }, [scopeMatches]);

  const perGroup = !activeCustomTab && activeId !== 'OVERALL' && stageCfg.groupMode === 'PER_GROUP' && options.groups.length > 0;

  // Filter check: If user filters by Day, Map, or Group, qualification zones must NOT apply
  const isFiltered = Boolean(day || map || (group && !perGroup));

  // Only apply qualification zones when looking at full unfiltered stage standings
  const effectiveZones = React.useMemo(() => {
    return isFiltered ? [] : stageCfg.zones;
  }, [isFiltered, stageCfg.zones]);

  const filtered = React.useMemo(
    () =>
      scopeMatches.filter(
        (m) =>
          (!day || m.day === day) &&
          (!map || m.mapName === map) &&
          (!group || (perGroup ? true : m.groupName === group))
      ),
    [scopeMatches, day, map, group, perGroup]
  );

  const buildRows = React.useCallback(
    (subset: StandingsMatchLite[]): Rows => {
      let standings = calculateTournamentStandings(subset.flatMap((m) => m.results));

      // If Hide Precedence Qualified is checked, omit teams already qualified from prior tab
      if (hidePrecedenceQualified && precedenceQualifications.size > 0) {
        standings = standings.filter((t) => !precedenceQualifications.has(t.teamId));
        // Re-index ranks
        standings = standings.map((t, idx) => ({ ...t, rank: idx + 1 }));
      }

      const sorted = [...standings].sort((a, b) =>
        sortDir === 'asc' ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]
      );
      const formByTeam = new Map<string, FormEntry[]>();
      const completed = subset
        .filter((m) => m.status === 'COMPLETED')
        .sort((a, b) => {
          const timeA = new Date(a.scheduledAt).getTime() || 0;
          const timeB = new Date(b.scheduledAt).getTime() || 0;
          if (timeA !== timeB) return timeA - timeB;
          const numA = Number(a.matchNumber || a.overallMatchNumber || 0);
          const numB = Number(b.matchNumber || b.overallMatchNumber || 0);
          return numA - numB;
        });

      for (const m of completed) {
        for (const r of m.results) {
          const list = formByTeam.get(r.teamId) ?? [];
          list.push({
            matchNumber: m.matchNumber,
            overallMatchNumber: m.overallMatchNumber,
            rank: r.rank,
            wwcd: !!r.wwcd || r.rank === 1,
            mapName: m.mapName,
            totalPoints: r.totalPoints ?? 0,
          });
          formByTeam.set(r.teamId, list);
        }
      }
      return { sorted, formByTeam };
    },
    [sortKey, sortDir, hidePrecedenceQualified, precedenceQualifications]
  );

  const singleRows = React.useMemo(() => buildRows(filtered), [buildRows, filtered]);

  const groupRows = React.useMemo(() => {
    if (!perGroup) return new Map<string, Rows>();
    const mapByGroup = new Map<string, Rows>();
    for (const g of options.groups) {
      mapByGroup.set(g, buildRows(filtered.filter((m) => m.groupName === g)));
    }
    return mapByGroup;
  }, [perGroup, options.groups, filtered, buildRows]);

  // ── Calculate Pass-Through Zones for Teams (Skipping Precedence Qualified) ──
  const teamAssignedZones = React.useMemo(() => {
    const map = new Map<string, { zone: ZoneRule | null; isPrecedence: boolean; precedenceLabel?: string; precedenceColor?: string }>();
    if (effectiveZones.length === 0 && precedenceQualifications.size === 0) return map;

    let eligibleRankCounter = 1;

    for (const team of singleRows.sorted) {
      const prec = precedenceQualifications.get(team.teamId);

      if (prec) {
        // Team has higher precedence qualification (e.g. from Super Weekends)
        map.set(team.teamId, {
          zone: null,
          isPrecedence: true,
          precedenceLabel: `✓ ${prec.label} (${prec.sourceTabName})`,
          precedenceColor: prec.color || 'blue',
        });
      } else {
        // Team is competing for the active tab's qualification slots
        const assignedZone = effectiveZones.length > 0 ? zoneForRank(effectiveZones, eligibleRankCounter) : null;
        map.set(team.teamId, {
          zone: assignedZone,
          isPrecedence: false,
        });
        eligibleRankCounter++;
      }
    }
    return map;
  }, [singleRows.sorted, effectiveZones, precedenceQualifications]);

  const toggle = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'rank' || key === 'matchesPlayed' ? 'asc' : 'desc');
    }
  };

  const columns = STANDINGS_COLUMN_DEFS.filter((c) => config.columns.includes(c.key));
  const gridTemplate = `minmax(11rem,1fr) ${columns.map((c) => `${COLUMN_WIDTH[c.key]}rem`).join(' ')}`;
  const minWidth = 176 + columns.reduce((sum, c) => sum + COLUMN_WIDTH[c.key] * 16, 0);

  const clearFilters = () => {
    setDay('');
    setMap('');
    setGroup('');
  };

  const switchTabItem = (id: string) => {
    setActiveId(id);
    clearFilters();
  };

  const switchGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    const grp = tabGroups.find((g) => g.id === groupId);
    if (grp && grp.items.length > 0) {
      setActiveId(grp.items[0].id);
    }
    clearFilters();
  };

  const getZoneStyle = (zones: ZoneRule[], zone: ZoneRule | null, explicitColor?: string) => {
    const colorKey =
      (explicitColor as ZoneColor) ||
      (zone?.color as ZoneColor) ||
      (zone ? DEFAULT_ZONE_PALETTE[zones.indexOf(zone) % DEFAULT_ZONE_PALETTE.length] : 'blue');
    return COLOR_MAP[colorKey] || COLOR_MAP.blue;
  };

  const renderFilterRow = (
    key: StandingsFilterKey,
    label: string,
    opts: string[],
    value: string,
    set: (v: string) => void,
    labelFn: (o: string) => string
  ) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="ed-label mr-1">{label}</span>
      <button
        onClick={() => set('')}
        className={`ed-chip transition-colors ${
          value === ''
            ? 'border-(--ed-blue) bg-(--ed-blue) text-white'
            : 'text-(--ed-stone) hover:border-(--ed-stone)/50'
        }`}
      >
        All
      </button>
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => set(value === o ? '' : o)}
          className={`ed-chip transition-colors ${
            value === o
              ? 'border-(--ed-blue) bg-(--ed-blue) text-white'
              : 'text-(--ed-stone) hover:border-(--ed-stone)/50'
          }`}
        >
          {labelFn(o)}
        </button>
      ))}
    </div>
  );

  const renderTable = (rows: Rows, zones: ZoneRule[]) => (
    <div className="overflow-x-auto">
      <div style={{ minWidth }}>
        {/* Header row */}
        <div
          className="grid border-b border-(--ed-hair) bg-(--ed-canvas)"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <button
            onClick={() => toggle('rank')}
            className="ed-th sticky left-0 z-10 bg-(--ed-canvas) px-3 text-left transition-colors hover:text-(--ed-ink)"
          >
            <span className="inline-flex items-center gap-1">
              #
              {sortKey === 'rank' &&
                (sortDir === 'asc' ? (
                  <ChevronUp className="h-3 w-3 text-(--ed-blue)" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-(--ed-blue)" />
                ))}
            </span>
          </button>
          {columns.map((c) => {
            const key = c.key === 'form' ? null : SORT_FOR_COLUMN[c.key];
            return (
              <button
                key={c.key}
                onClick={key ? () => toggle(key) : undefined}
                aria-label={
                  key
                    ? `Sort by ${c.short}${sortKey === key ? (sortDir === 'asc' ? ', sorted ascending' : ', sorted descending') : ''}`
                    : undefined
                }
                className={`ed-th px-2 text-center ${
                  key ? 'cursor-pointer transition-colors hover:text-(--ed-ink)' : 'cursor-default'
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {c.short}
                  {key &&
                    sortKey === key &&
                    (sortDir === 'asc' ? (
                      <ChevronUp className="h-3 w-3 text-(--ed-blue)" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-(--ed-blue)" />
                    ))}
                </span>
              </button>
            );
          })}
        </div>

        {/* Team rows */}
        <div className="divide-y divide-(--ed-hair)">
          {rows.sorted.map((team: AggregatedTeamStanding) => {
            const meta = teams[team.teamId];
            const assignment = teamAssignedZones.get(team.teamId);
            const isPrec = assignment?.isPrecedence;
            const zone = assignment?.zone || null;

            const zStyle = isPrec
              ? getZoneStyle(zones, null, assignment.precedenceColor)
              : zone
              ? getZoneStyle(zones, zone)
              : { border: 'border-transparent', dot: 'bg-transparent', text: '', bgSoft: '' };

            const form = (rows.formByTeam.get(team.teamId) ?? []).slice(-5).reverse();

            return (
              <div
                key={team.teamId}
                className={`group grid transition-colors ${
                  isPrec ? 'bg-slate-50/50 dark:bg-slate-900/30' : 'hover:bg-(--ed-canvas)'
                }`}
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {/* Sticky team cell */}
                <div
                  className={`sticky left-0 z-10 flex items-center gap-2 border-l-4 bg-(--ed-surface) px-3 py-2 group-hover:bg-(--ed-canvas) ${
                    isPrec || zone ? zStyle.border : 'border-transparent'
                  }`}
                >
                  <span
                    className={`num w-6 shrink-0 text-sm ${
                      team.rank <= 3 ? 'font-black text-(--ed-ink)' : 'text-(--ed-stone)'
                    }`}
                  >
                    {String(team.rank).padStart(2, '0')}
                  </span>
                  {(config.logoMode === 'BOTH' || config.logoMode === 'COUNTRY') && meta?.countryCode && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://flagcdn.com/20x15/${meta.countryCode.toLowerCase()}.png`}
                      alt={meta.countryCode}
                      loading="lazy"
                      className="h-[15px] w-5 shrink-0 rounded-[2px] object-cover"
                    />
                  )}
                  {(config.logoMode === 'BOTH' || config.logoMode === 'TEAM') &&
                    (meta?.logoUrl || meta?.logoDarkUrl) && (
                      <>
                        {meta?.logoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={meta.logoUrl} alt="" className="h-6 w-6 shrink-0 object-contain dark:hidden" />
                        )}
                        {meta?.logoDarkUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={meta.logoDarkUrl}
                            alt=""
                            className={`h-6 w-6 shrink-0 object-contain ${
                              meta.logoUrl ? 'hidden dark:block' : 'dark:block'
                            }`}
                          />
                        )}
                      </>
                    )}
                  <span className="hidden truncate text-sm font-bold sm:inline">
                    {meta?.displayName || meta?.name || team.teamName}
                  </span>
                  <span className="truncate text-sm font-bold sm:hidden">
                    {meta?.tag || meta?.name || team.teamName}
                  </span>

                  {/* Precedence qualification badge */}
                  {isPrec && (
                    <span
                      className={`ml-auto hidden text-[10px] font-black uppercase px-2 py-0.5 rounded-full lg:inline-flex items-center gap-1 border ${zStyle.bgSoft} ${zStyle.text} border-current/20`}
                      title="Qualified via previous higher-tier stage"
                    >
                      <ShieldCheck className="w-3 h-3" /> {assignment.precedenceLabel}
                    </span>
                  )}

                  {/* Active stage qualification badge */}
                  {!isPrec && zone && (
                    <span
                      className={`ml-auto hidden text-[10px] font-black uppercase px-2 py-0.5 rounded-full lg:inline-flex items-center gap-1 ${zStyle.bgSoft} ${zStyle.text}`}
                    >
                      {zone.label}
                    </span>
                  )}
                </div>

                {/* Metric columns */}
                {columns.map((c) => {
                  if (c.key === 'form') {
                    return (
                      <div
                        key={c.key}
                        className="flex items-center justify-center gap-1 px-2 py-1.5"
                      >
                        {form.length === 0 ? (
                          <span className="text-[11px] text-(--ed-stone)">—</span>
                        ) : (
                          form.map((entry, idx) => (
                            <span
                              key={idx}
                              title={`${
                                entry.matchNumber
                                  ? `Match ${entry.matchNumber}`
                                  : entry.overallMatchNumber
                                  ? `Match #${entry.overallMatchNumber}`
                                  : 'Match'
                              }${entry.mapName ? ` (${entry.mapName})` : ''}: Rank #${entry.rank} • ${entry.totalPoints} pts${
                                entry.wwcd ? ' • 🏆 WWCD' : ''
                              }`}
                              className={`num min-w-5 h-5 px-1 flex items-center justify-center rounded-[3px] text-[10px] font-black tracking-tight ${
                                entry.wwcd
                                  ? 'bg-emerald-500 text-white shadow-xs'
                                  : entry.rank <= 3
                                  ? 'bg-(--ed-blue)/15 text-(--ed-blue) font-bold'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {entry.totalPoints}
                            </span>
                          ))
                        )}
                      </div>
                    );
                  }

                  const val =
                    c.key === 'mp'
                      ? team.matchesPlayed
                      : c.key === 'wwcd'
                      ? team.wwcd
                      : c.key === 'place'
                      ? team.placementPoints
                      : c.key === 'elims'
                      ? team.eliminationPoints
                      : c.key === 'bonus'
                      ? team.bonusPoints
                      : c.key === 'damage'
                      ? Math.round(team.totalDamage).toLocaleString('en-US')
                      : c.key === 'damageReceived'
                      ? Math.round(team.totalDamageReceived).toLocaleString('en-US')
                      : c.key === 'healing'
                      ? Math.round(team.totalHealing).toLocaleString('en-US')
                      : c.key === 'headshots'
                      ? team.headshots
                      : c.key === 'assists'
                      ? team.assists
                      : c.key === 'knockouts'
                      ? team.knockouts
                      : c.key === 'longestElim'
                      ? `${Math.round(team.longestElim)}m`
                      : c.key === 'vehicleElims'
                      ? team.vehicleElims
                      : c.key === 'grenadeElims'
                      ? team.grenadeElims
                      : c.key === 'smokesUsed'
                      ? team.smokesUsed
                      : c.key === 'grenadesUsed'
                      ? team.grenadesUsed
                      : c.key === 'molotovsUsed'
                      ? team.molotovsUsed
                      : c.key === 'flashUsed'
                      ? team.flashUsed
                      : c.key === 'airdrops'
                      ? team.airdrops
                      : c.key === 'rescues'
                      ? team.rescues
                      : c.key === 'distDrove'
                      ? `${(team.distDrove / 1000).toFixed(1)}k`
                      : c.key === 'distWalk'
                      ? `${(team.distWalk / 1000).toFixed(1)}k`
                      : team.totalPoints;

                  const isTotal = c.key === 'total';
                  return (
                    <div
                      key={c.key}
                      className={`num flex items-center justify-center px-2 py-1.5 text-sm whitespace-nowrap ${
                        isTotal
                          ? 'font-black text-(--ed-blue)'
                          : c.key === 'wwcd' && Number(val) > 0
                          ? 'font-bold text-emerald-600 dark:text-emerald-400'
                          : 'text-(--ed-ink)'
                      }`}
                    >
                      {val}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderZoneLegend = (zones: ZoneRule[]) => {
    if (isFiltered) {
      return (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium">
          <Filter className="w-3.5 h-3.5 shrink-0" />
          <span>
            Filters active ({[day ? `Day ${day}` : '', map ? `Map: ${map}` : '', group ? `Group: ${group}` : ''].filter(Boolean).join(', ')}) — Qualification colors and tags are hidden on filtered views.
          </span>
        </div>
      );
    }

    if (zones.length === 0 && precedenceQualifications.size === 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-(--ed-hair)">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
          <Info className="w-3.5 h-3.5" /> Advancement Zones:
        </span>
        {zones.map((z, i) => {
          const zStyle = getZoneStyle(zones, z);
          return (
            <span key={i} className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
              <span className={`h-2.5 w-2.5 rounded-full ${zStyle.dot}`} />
              <span className="num font-bold">Slot #{z.from}–#{z.to}</span>
              <span>{z.label}</span>
            </span>
          );
        })}
        {precedenceQualifications.size > 0 && (
          <span className="flex items-center gap-1 text-xs text-(--ed-blue) font-bold ml-auto">
            <ShieldCheck className="w-3.5 h-3.5" /> {precedenceQualifications.size} teams already qualified via Super Weekends (Slots pass to next teams)
          </span>
        )}
      </div>
    );
  };

  const emptyCard = (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <Trophy className="h-8 w-8 text-(--ed-stone) opacity-40" />
      <p className="font-display text-lg font-medium">No standings data recorded yet</p>
      <p className="max-w-sm text-sm text-(--ed-stone)">
        Standings calculate automatically once match scorecards are submitted.
      </p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── Sub-Division Top Level Tabs (e.g. League Weeks, Weekends, Playoffs, Finals) ── */}
      {hasTabGroups ? (
        <div className="space-y-3">
          {/* Top-Level Sub-Division Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900/80 w-fit border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
            {tabGroups.map((grp) => {
              const isGroupActive = grp.id === activeGroupId;
              return (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => switchGroup(grp.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    isGroupActive
                      ? 'bg-white dark:bg-slate-800 text-(--ed-blue) shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Flame className={`w-3.5 h-3.5 ${isGroupActive ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span>{grp.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isGroupActive
                        ? 'bg-(--ed-blue)/10 text-(--ed-blue)'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {grp.items.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Second-Level Sub-Tabs (Stages & Custom Cumulative views inside the active sub-division) */}
          {activeGroup && (
            <div className="flex items-end gap-2 overflow-x-auto border-b border-(--ed-hair) pb-px pt-1">
              {activeGroup.items.map((item) => {
                const isItemActive = activeId === item.id;
                const isCustom = item.type === 'CUSTOM_TAB' || item.type === 'OVERALL';

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => switchTabItem(item.id)}
                    className={`ed-tab whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      isItemActive
                        ? 'ed-tab-active font-black text-(--ed-blue)'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {isCustom && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Legacy / Fallback Standings Tabs */
        <div className="flex items-end gap-2 overflow-x-auto border-b border-(--ed-hair) pb-px">
          {stages.map((s) => {
            const isActive = activeId === s.stageName;
            return (
              <button
                key={s.stageName}
                onClick={() => switchTabItem(s.stageName)}
                className={`ed-tab whitespace-nowrap ${isActive ? 'ed-tab-active font-black' : ''}`}
              >
                <span>{s.stageName}</span>
                <span className={`num text-[11px] ${isActive ? 'opacity-80' : 'text-(--ed-stone)'}`}>
                  {s.matchesCount}m
                </span>
              </button>
            );
          })}

          {customTabs.map((ct) => {
            const isActive = activeId === ct.id || activeId === ct.label;
            return (
              <button
                key={ct.id}
                onClick={() => switchTabItem(ct.id)}
                className={`ed-tab whitespace-nowrap flex items-center gap-1.5 ${
                  isActive ? 'ed-tab-active font-black text-(--ed-blue)' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{ct.label}</span>
              </button>
            );
          })}

          {config.showOverall && (
            <button
              onClick={() => switchTabItem('OVERALL')}
              className={`ed-tab whitespace-nowrap flex items-center gap-1.5 ${
                activeId === 'OVERALL' ? 'ed-tab-active font-black' : ''
              }`}
            >
              <Trophy className="h-4 w-4 text-amber-500" />
              <span>Overall</span>
            </button>
          )}
        </div>
      )}

      {/* Custom Tab Banner & Precedence Toggle */}
      {(activeNavItem?.type === 'CUSTOM_TAB' || activeCustomTab) && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-(--ed-blue) text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3" /> Cumulative Standings
              </span>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {activeNavItem?.label || activeCustomTab?.label}
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {activeNavItem?.description ||
                activeCustomTab?.description ||
                `Aggregating points across: ${(
                  activeNavItem?.includeStages ||
                  activeCustomTab?.includeStages ||
                  []
                ).join(', ')}`}
            </p>
          </div>

          {/* Precedence Filter Toggle */}
          {precedenceQualifications.size > 0 && (
            <button
              type="button"
              onClick={() => setHidePrecedenceQualified((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                hidePrecedenceQualified
                  ? 'bg-(--ed-blue) border-(--ed-blue) text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400'
              }`}
            >
              {hidePrecedenceQualified ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>
                {hidePrecedenceQualified
                  ? 'Show All Teams (Including Qualified)'
                  : `Hide ${precedenceQualifications.size} Already Qualified Teams`}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Filter bar */}
      <div className="space-y-2.5">
        {STANDINGS_FILTER_DEFS.filter((f) => stageCfg.filters.includes(f.key)).map((f) => {
          const opts = f.key === 'day' ? options.days : f.key === 'map' ? options.maps : options.groups;
          if (opts.length < 2) return null;
          if (f.key === 'group' && perGroup) return null;
          const value = f.key === 'day' ? day : f.key === 'map' ? map : group;
          const set = f.key === 'day' ? setDay : f.key === 'map' ? setMap : setGroup;
          return (
            <React.Fragment key={f.key}>
              {renderFilterRow(
                f.key,
                f.label,
                opts,
                value,
                set,
                f.key === 'day' ? (o) => `Day ${o}` : (o) => o
              )}
            </React.Fragment>
          );
        })}
        {isFiltered && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs font-medium text-(--ed-blue) hover:underline"
          >
            <X className="h-3 w-3" /> Clear filters (Show Official Qualification Standings)
          </button>
        )}
        {!activeCustomTab && activeId !== 'OVERALL' && stageCfg.mode === 'CUMULATIVE' && (
          <span className="ed-label">Cumulative through this stage</span>
        )}
        {perGroup && (
          <span className="ed-label flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Qualification decided per group
          </span>
        )}
      </div>

      {/* Standings Table Rendering */}
      {perGroup ? (
        <div className="space-y-8">
          {options.groups.map((g) => {
            const rows = groupRows.get(g)!;
            return (
              <section key={g}>
                <div className="mb-3 space-y-2.5">
                  <h3 className="font-display flex items-center gap-2 text-lg font-bold tracking-tight">
                    {g}
                    <span className="num text-xs text-(--ed-stone)">{rows.sorted.length} teams</span>
                  </h3>
                  {renderZoneLegend(effectiveZones)}
                </div>
                <div className="ed-card">
                  {rows.sorted.length === 0 ? emptyCard : renderTable(rows, effectiveZones)}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {renderZoneLegend(effectiveZones)}
          <div className="ed-card">
            {singleRows.sorted.length === 0 ? emptyCard : renderTable(singleRows, effectiveZones)}
          </div>
        </div>
      )}

      {/* Footer notes */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--ed-hair) bg-(--ed-canvas) px-6 py-3">
        <p className="text-xs text-(--ed-stone)">
          Tie-breaker: Total Points → WWCDs → Placement Pts → Elimination Pts → Rank in Last Match
        </p>
        {overallTopFragger && (
          <p className="flex items-center gap-1.5 text-xs text-(--ed-stone)">
            <Award className="h-3.5 w-3.5 text-(--ed-blue)" />
            Top fragger: <span className="font-medium text-(--ed-ink)">{overallTopFragger.ign}</span>
            <span className="num">({overallTopFragger.kills} elims)</span>
          </p>
        )}
      </div>
    </div>
  );
}
