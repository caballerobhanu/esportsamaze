'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Users,
  Shield,
  Search,
  Trophy,
  Flame,
  Crosshair,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Sparkles,
  Crown,
  Award,
} from 'lucide-react';
import type {
  PlayerPerformanceRow,
  TeamPerformanceRow,
  TeamPointsMode,
} from './panel-types';
import type { StandingsLogoMode, PlayerStatColumnKey, CustomPlayerColumn } from '@/lib/standings-config';
import { TEAM_CHIP_BOX, TEAM_CHIP_FILL, TeamMark } from '@/components/ui/team-mark';

export interface EstaticStatisticsPanelProps {
  playerRows: PlayerPerformanceRow[];
  teamRows: TeamPerformanceRow[];
  stages: string[];
  mapsList: string[];
  daysList?: string[];
  stageGroups?: Record<string, string[]>;
  logoMode?: StandingsLogoMode;
  defaultView?: 'players' | 'teams';
  defaultTeamPointsMode?: TeamPointsMode;
  adminPlayerColumns?: PlayerStatColumnKey[];
  customPlayerColumns?: CustomPlayerColumn[];
}

function computeCustomColumnValue(
  col: CustomPlayerColumn,
  activeMatches: Array<{
    playerElims: number;
    playerPowerplay?: number;
    damage?: number;
    headshots?: number;
    assists?: number;
    knockouts?: number;
    survivalTime?: number;
    healing?: number;
    damageReceived?: number;
    utilities?: number;
    totalDist?: number;
  }>
): number {
  if (activeMatches.length === 0) return 0;

  const values = activeMatches.map((m) => {
    switch (col.metric) {
      case 'elims':
        return m.playerElims || 0;
      case 'damage':
        return m.damage || 0;
      case 'powerplay':
        return m.playerPowerplay || 0;
      case 'headshots':
        return m.headshots || 0;
      case 'assists':
        return m.assists || 0;
      case 'knockouts':
        return m.knockouts || 0;
      case 'survivalTime':
        return m.survivalTime || 0;
      case 'healing':
        return m.healing || 0;
      case 'damageReceived':
        return m.damageReceived || 0;
      case 'utilities':
        return m.utilities || 0;
      case 'totalDist':
        return m.totalDist || 0;
      default:
        return 0;
    }
  });

  switch (col.aggregator) {
    case 'sum': {
      const sum = values.reduce((a, b) => a + b, 0);
      return Number(sum.toFixed(2));
    }
    case 'avg': {
      const sum = values.reduce((a, b) => a + b, 0);
      return Number((sum / values.length).toFixed(2));
    }
    case 'max': {
      return Math.max(0, ...values);
    }
    case 'min': {
      return Math.min(...values);
    }
    case 'count_zero': {
      return values.filter((v) => v === 0).length;
    }
    case 'count_gte': {
      const th = col.threshold ?? 5;
      return values.filter((v) => v >= th).length;
    }
  }
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) {
    return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity ml-1 inline shrink-0" />;
  }
  return dir === 'asc' ? (
    <ArrowUp className="w-3 h-3 text-[#0A5FC4] ml-1 inline shrink-0" />
  ) : (
    <ArrowDown className="w-3 h-3 text-[#0A5FC4] ml-1 inline shrink-0" />
  );
}

const COLUMN_CONFIG_MAP: Record<
  PlayerStatColumnKey,
  {
    field: keyof PlayerPerformanceRow;
    label: string;
    render: (player: PlayerPerformanceRow) => React.ReactNode;
    headerClass?: string;
    cellClass?: string;
  }
> = {
  elims: {
    field: 'totalElims',
    label: 'Elims',
    render: (p) => (
      <span className="text-base font-black text-[#0A5FC4] dark:text-blue-300 font-mono">
        {p.totalElims}
      </span>
    ),
    headerClass: 'text-center w-20',
    cellClass: 'text-center',
  },
  powerplay: {
    field: 'totalPowerplay',
    label: 'Powerplay',
    render: (p) => (
      <span className="font-bold text-slate-700 dark:text-slate-200">
        {p.totalPowerplay || 0}
      </span>
    ),
    headerClass: 'text-center w-24',
    cellClass: 'text-center',
  },
  avgElims: {
    field: 'avgElims',
    label: 'Avg',
    render: (p) => (
      <span className="font-bold text-slate-600 dark:text-slate-300">
        {p.avgElims}
      </span>
    ),
    headerClass: 'text-center w-16',
    cellClass: 'text-center',
  },
  maxElims: {
    field: 'maxElims',
    label: 'Max Elims',
    render: (p) => (
      <span className="font-bold text-slate-800 dark:text-slate-200">
        {p.maxElims ?? 0}
      </span>
    ),
    headerClass: 'text-center w-20',
    cellClass: 'text-center',
  },
  zeroElimsMatches: {
    field: 'zeroElimsMatches',
    label: '0 Elims',
    render: (p) => (
      <span className="font-bold text-slate-500">
        {p.zeroElimsMatches ?? 0}
      </span>
    ),
    headerClass: 'text-center w-20',
    cellClass: 'text-center',
  },
  fivePlusElimsMatches: {
    field: 'fivePlusElimsMatches',
    label: '5+ Elims',
    render: (p) => (
      <span className="font-black text-purple-600 dark:text-purple-400">
        {p.fivePlusElimsMatches ?? 0}
      </span>
    ),
    headerClass: 'text-center w-20',
    cellClass: 'text-center',
  },
  damage: {
    field: 'totalDamage',
    label: 'Damage',
    render: (p) => (
      <span className="font-bold text-slate-800 dark:text-slate-200">
        {p.totalDamage?.toLocaleString() ?? 0}
      </span>
    ),
    headerClass: 'text-center w-24',
    cellClass: 'text-center',
  },
  headshots: {
    field: 'totalHeadshots',
    label: 'HS',
    render: (p) => (
      <span className="font-bold text-slate-600 dark:text-slate-300">
        {p.totalHeadshots ?? 0}
      </span>
    ),
    headerClass: 'text-center w-16',
    cellClass: 'text-center',
  },
  assists: {
    field: 'totalAssists',
    label: 'Assists',
    render: (p) => (
      <span className="font-bold text-slate-600 dark:text-slate-300">
        {p.totalAssists ?? 0}
      </span>
    ),
    headerClass: 'text-center w-16',
    cellClass: 'text-center',
  },
  knockouts: {
    field: 'totalKnockouts',
    label: 'Knocks',
    render: (p) => (
      <span className="font-bold text-slate-700 dark:text-slate-200">
        {p.totalKnockouts ?? 0}
      </span>
    ),
    headerClass: 'text-center w-16',
    cellClass: 'text-center',
  },
  survivalTime: {
    field: 'totalSurvivalTime',
    label: 'Survival',
    render: (p) => {
      const totalSec = p.totalSurvivalTime || 0;
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      return (
        <span className="font-medium text-slate-600 dark:text-slate-300 font-mono text-xs">
          {mins}m {secs}s
        </span>
      );
    },
    headerClass: 'text-center w-24',
    cellClass: 'text-center',
  },
  healing: {
    field: 'totalHealing',
    label: 'Healing',
    render: (p) => (
      <span className="font-bold text-emerald-600 dark:text-emerald-400">
        {p.totalHealing?.toLocaleString() ?? 0}
      </span>
    ),
    headerClass: 'text-center w-20',
    cellClass: 'text-center',
  },
  damageReceived: {
    field: 'totalDamageReceived',
    label: 'Dmg Recv',
    render: (p) => (
      <span className="font-bold text-rose-500">
        {p.totalDamageReceived?.toLocaleString() ?? 0}
      </span>
    ),
    headerClass: 'text-center w-24',
    cellClass: 'text-center',
  },
  utilities: {
    field: 'totalUtilities',
    label: 'Utilities',
    render: (p) => (
      <span className="font-bold text-slate-600 dark:text-slate-300">
        {p.totalUtilities ?? 0}
      </span>
    ),
    headerClass: 'text-center w-20',
    cellClass: 'text-center',
  },
  totalDist: {
    field: 'totalDist',
    label: 'Distance',
    render: (p) => (
      <span className="font-bold text-slate-600 dark:text-slate-300">
        {((p.totalDist || 0) / 1000).toFixed(1)} km
      </span>
    ),
    headerClass: 'text-center w-24',
    cellClass: 'text-center',
  },
  mvp: {
    field: 'totalMvps',
    label: 'MVPs',
    render: (p) =>
      p.totalMvps > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[11px] font-black text-amber-700 dark:text-amber-300">
          <Award className="h-3 w-3" /> {p.totalMvps}
        </span>
      ) : (
        <span className="text-slate-400 text-xs">—</span>
      ),
    headerClass: 'text-center w-20',
    cellClass: 'text-center',
  },
};

export function EstaticStatisticsPanel({
  playerRows,
  teamRows,
  stages = [],
  mapsList = [],
  daysList = [],
  stageGroups,
  defaultView = 'players',
  defaultTeamPointsMode = 'sum',
  adminPlayerColumns,
  customPlayerColumns,
  logoMode = 'TEAM',
}: EstaticStatisticsPanelProps) {
  // Navigation & view states
  const [activeTab, setActiveTab] = React.useState<'players' | 'teams'>(defaultView);
  const [selectedStages, setSelectedStages] = React.useState<string[]>([]);
  const [selectedMap, setSelectedMap] = React.useState<string>('ALL');
  const [selectedDay, setSelectedDay] = React.useState<string>('ALL');
  const [selectedRole, setSelectedRole] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');

  const activeColumns: PlayerStatColumnKey[] = React.useMemo(() => {
    if (adminPlayerColumns && adminPlayerColumns.length > 0) {
      return adminPlayerColumns.filter((col) => COLUMN_CONFIG_MAP[col]);
    }
    return ['elims', 'avgElims', 'damage', 'headshots', 'assists', 'mvp'];
  }, [adminPlayerColumns]);

  // Player Sort State
  const [playerSortKey, setPlayerSortKey] = React.useState<string>(() => {
    if (adminPlayerColumns && adminPlayerColumns.length > 0) {
      if (adminPlayerColumns.includes('elims')) return 'totalElims';
      const firstCol = adminPlayerColumns[0];
      return (COLUMN_CONFIG_MAP[firstCol]?.field as string) || 'totalElims';
    }
    return 'totalElims';
  });
  const [playerSortDir, setPlayerSortDir] = React.useState<'asc' | 'desc'>('desc');

  // Team Sort & Points Mode State
  const [teamSortKey, setTeamSortKey] = React.useState<string>('totalPoints');
  const [teamSortDir, setTeamSortDir] = React.useState<'asc' | 'desc'>('desc');
  const [teamPointsMode, setTeamPointsMode] = React.useState<TeamPointsMode>(defaultTeamPointsMode);

  React.useEffect(() => {
    if (defaultView) {
      setActiveTab(defaultView);
    }
  }, [defaultView]);

  React.useEffect(() => {
    if (defaultTeamPointsMode) {
      setTeamPointsMode(defaultTeamPointsMode);
    }
  }, [defaultTeamPointsMode]);

  // Roles available
  const rolesList = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of playerRows) {
      if (p.role && p.role.trim()) set.add(p.role.trim());
    }
    return Array.from(set);
  }, [playerRows]);

  // Handle stage multi-selection
  const toggleStage = (stage: string) => {
    if (stage === 'ALL') {
      setSelectedStages([]);
      return;
    }
    setSelectedStages((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]
    );
  };

  // Filtered Players aggregation based on Multi-Stage / Map / Day / Role / Search
  const filteredPlayers = React.useMemo(() => {
    return playerRows
      .map((p) => {
        const isAllStages = selectedStages.length === 0;
        const isAllMaps = selectedMap === 'ALL';
        const isAllDays = selectedDay === 'ALL';

        if (isAllStages && isAllMaps && isAllDays) {
          const allMatches = Object.values(p.matchStats);
          const customStats: Record<string, number> = {};
          if (customPlayerColumns && customPlayerColumns.length > 0) {
            for (const col of customPlayerColumns) {
              customStats[col.id] = computeCustomColumnValue(col, allMatches);
            }
          }
          return {
            ...p,
            maxElims:
              p.maxElims ??
              (allMatches.length > 0
                ? allMatches.reduce((mx, m) => Math.max(mx, m.playerElims || 0), 0)
                : 0),
            zeroElimsMatches:
              p.zeroElimsMatches ??
              (allMatches.length > 0
                ? allMatches.filter((m) => (m.playerElims || 0) === 0).length
                : 0),
            fivePlusElimsMatches:
              p.fivePlusElimsMatches ??
              (allMatches.length > 0
                ? allMatches.filter((m) => (m.playerElims || 0) >= 5).length
                : 0),
            customStats,
          };
        }

        const activeMatches = Object.values(p.matchStats).filter((m) => {
          if (!isAllStages && !selectedStages.includes(m.stageName)) return false;
          if (!isAllMaps && m.mapName !== selectedMap) return false;
          if (!isAllDays && m.day !== selectedDay) return false;
          return true;
        });

        if (activeMatches.length === 0) return null;

        const mp = activeMatches.length;
        const elims = activeMatches.reduce((s, m) => s + (m.playerElims || 0), 0);
        const powerplay = activeMatches.reduce((s, m) => s + (m.playerPowerplay || 0), 0);
        const damage = activeMatches.reduce((s, m) => s + (m.damage || 0), 0);
        const headshots = activeMatches.reduce((s, m) => s + (m.headshots || 0), 0);
        const assists = activeMatches.reduce((s, m) => s + (m.assists || 0), 0);
        const knockouts = activeMatches.reduce((s, m) => s + (m.knockouts || 0), 0);
        const survival = activeMatches.reduce((s, m) => s + (m.survivalTime || 0), 0);
        const mvps = activeMatches.filter((m) => m.isMvp).length;
        const maxElims = activeMatches.reduce((mx, m) => Math.max(mx, m.playerElims || 0), 0);
        const zeroElims = activeMatches.filter((m) => (m.playerElims || 0) === 0).length;
        const fivePlusElims = activeMatches.filter((m) => (m.playerElims || 0) >= 5).length;

        const customStats: Record<string, number> = {};
        if (customPlayerColumns && customPlayerColumns.length > 0) {
          for (const col of customPlayerColumns) {
            customStats[col.id] = computeCustomColumnValue(col, activeMatches);
          }
        }

        return {
          ...p,
          matchesPlayed: mp,
          totalElims: elims,
          totalPowerplay: powerplay,
          totalDamage: damage,
          totalHeadshots: headshots,
          totalAssists: assists,
          totalKnockouts: knockouts,
          totalSurvivalTime: survival,
          totalMvps: mvps,
          avgElims: Number((elims / (mp || 1)).toFixed(2)),
          maxElims,
          zeroElimsMatches: zeroElims,
          fivePlusElimsMatches: fivePlusElims,
          customStats,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .filter((p) => {
        if (selectedRole !== 'ALL') {
          if (!p.role || p.role.trim().toLowerCase() !== selectedRole.toLowerCase()) {
            return false;
          }
        }
        return true;
      })
      .filter((p) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          p.ign.toLowerCase().includes(q) ||
          p.teamName.toLowerCase().includes(q) ||
          (p.teamTag && p.teamTag.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        let cmp = 0;
        if (playerSortKey === 'ign') {
          cmp = a.ign.localeCompare(b.ign);
        } else if (playerSortKey === 'team') {
          cmp = (a.teamName || '').localeCompare(b.teamName || '');
        } else {
          const valA = a.customStats?.[playerSortKey] ?? ((a as unknown) as Record<string, number>)[playerSortKey] ?? 0;
          const valB = b.customStats?.[playerSortKey] ?? ((b as unknown) as Record<string, number>)[playerSortKey] ?? 0;
          cmp = valA - valB;
        }
        if (cmp === 0) {
          cmp = a.totalElims - b.totalElims || a.totalDamage - b.totalDamage;
        }
        return playerSortDir === 'desc' ? -cmp : cmp;
      });
  }, [playerRows, selectedStages, selectedMap, selectedDay, selectedRole, searchQuery, playerSortKey, playerSortDir, customPlayerColumns]);

  // Filtered Teams aggregation based on Multi-Stage / Map / Day / Search
  const filteredTeams = React.useMemo(() => {
    return teamRows
      .map((t) => {
        const isAllStages = selectedStages.length === 0;
        const isAllMaps = selectedMap === 'ALL';
        const isAllDays = selectedDay === 'ALL';

        if (isAllStages && isAllMaps && isAllDays) {
          return t;
        }

        if (t.matches && t.matches.length > 0) {
          const activeMatches = t.matches.filter((m) => {
            if (!isAllStages && !selectedStages.includes(m.stageName)) return false;
            if (!isAllMaps && m.mapName !== selectedMap) return false;
            if (!isAllDays && m.day !== selectedDay) return false;
            return true;
          });

          if (activeMatches.length === 0) return null;

          const mp = activeMatches.length;
          const wwcd = activeMatches.filter((m) => m.wwcd || m.rank === 1).length;
          const placePts = activeMatches.reduce((s, m) => s + (m.placePoints || 0), 0);
          const elimsPts = activeMatches.reduce((s, m) => s + (m.elimsPoints || 0), 0);
          // Bonus points must count, or filtered totals diverge from the
          // unfiltered rows and the standings table.
          const bonusPts = activeMatches.reduce((s, m) => s + (m.bonusPoints || 0), 0);
          const totalPts = placePts + elimsPts + bonusPts;

          return {
            ...t,
            matchesPlayed: mp,
            wwcdCount: wwcd,
            winRate: Number(((wwcd / (mp || 1)) * 100).toFixed(1)),
            totalPlacePoints: placePts,
            avgPlacePoints: Number((placePts / (mp || 1)).toFixed(1)),
            maxPlacePoints: activeMatches.reduce((mx, m) => Math.max(mx, m.placePoints || 0), 0),
            totalElimsPoints: elimsPts,
            avgElims: Number((elimsPts / (mp || 1)).toFixed(1)),
            maxElims: activeMatches.reduce((mx, m) => Math.max(mx, m.elimsPoints || 0), 0),
            totalPoints: totalPts,
            avgTotalPoints: Number((totalPts / (mp || 1)).toFixed(1)),
            maxTotalPoints: activeMatches.reduce((mx, m) => Math.max(mx, m.totalPoints || 0), 0),
          };
        }

        return t;
      })
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .filter((t) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return t.teamName.toLowerCase().includes(q) || (t.teamTag && t.teamTag.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        let cmp = 0;
        if (teamSortKey === 'teamName') {
          cmp = a.teamName.localeCompare(b.teamName);
        } else if (teamSortKey === 'totalPoints') {
          const valA = teamPointsMode === 'sum' ? a.totalPoints : teamPointsMode === 'avg' ? a.avgTotalPoints : a.maxTotalPoints;
          const valB = teamPointsMode === 'sum' ? b.totalPoints : teamPointsMode === 'avg' ? b.avgTotalPoints : b.maxTotalPoints;
          cmp = valA - valB;
        } else if (teamSortKey === 'placePoints') {
          const valA = teamPointsMode === 'sum' ? a.totalPlacePoints : teamPointsMode === 'avg' ? a.avgPlacePoints : a.maxPlacePoints;
          const valB = teamPointsMode === 'sum' ? b.totalPlacePoints : teamPointsMode === 'avg' ? b.avgPlacePoints : b.maxPlacePoints;
          cmp = valA - valB;
        } else if (teamSortKey === 'elimsPoints') {
          const valA = teamPointsMode === 'sum' ? a.totalElimsPoints : teamPointsMode === 'avg' ? a.avgElims : a.maxElims;
          const valB = teamPointsMode === 'sum' ? b.totalElimsPoints : teamPointsMode === 'avg' ? b.avgElims : b.maxElims;
          cmp = valA - valB;
        } else {
          const valA = ((a as unknown) as Record<string, number>)[teamSortKey] ?? 0;
          const valB = ((b as unknown) as Record<string, number>)[teamSortKey] ?? 0;
          cmp = valA - valB;
        }
        if (cmp === 0) {
          cmp = a.totalPoints - b.totalPoints;
        }
        return teamSortDir === 'desc' ? -cmp : cmp;
      });
  }, [teamRows, selectedStages, selectedMap, selectedDay, searchQuery, teamSortKey, teamSortDir, teamPointsMode]);

  // Top 3 Tournament Fraggers Spotlight
  const top3Fraggers = React.useMemo(() => {
    return [...playerRows]
      .sort((a, b) => b.totalElims - a.totalElims || b.totalDamage - a.totalDamage)
      .slice(0, 3);
  }, [playerRows]);

  // Top 3 Tournament Teams Spotlight
  const top3Teams = React.useMemo(() => {
    return [...teamRows]
      .sort((a, b) => {
        const valA = teamPointsMode === 'sum' ? a.totalPoints : teamPointsMode === 'avg' ? a.avgTotalPoints : a.maxTotalPoints;
        const valB = teamPointsMode === 'sum' ? b.totalPoints : teamPointsMode === 'avg' ? b.avgTotalPoints : b.maxTotalPoints;
        return valB - valA || b.wwcdCount - a.wwcdCount || b.totalElimsPoints - a.totalElimsPoints;
      })
      .slice(0, 3);
  }, [teamRows, teamPointsMode]);

  const handlePlayerSort = (key: string) => {
    if (playerSortKey === key) {
      setPlayerSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setPlayerSortKey(key);
      setPlayerSortDir('desc');
    }
  };

  const handleTeamSort = (key: string) => {
    if (teamSortKey === key) {
      setTeamSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setTeamSortKey(key);
      setTeamSortDir('desc');
    }
  };

  return (
    <div className="space-y-7">
      {/* ============ TOP FRAGGERS PODIUM SPOTLIGHT (When viewing Player Performance) ============ */}
      {activeTab === 'players' && top3Fraggers.length >= 3 && (
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(10,95,196,.08),transparent_65%)]" />
          
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                Tournament MVPs &amp; Top Fraggers
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                Kill Leaders Podium
              </h2>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-700 dark:text-amber-300">
              <Crown className="h-3.5 w-3.5" />
              <span>Overall Tournament Leaders</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* #1 Gold - Highlighted */}
            {top3Fraggers[0] && (
              <div className="relative flex flex-col justify-between sm:order-2 rounded-2xl border-2 border-amber-400/80 bg-gradient-to-b from-amber-400/10 via-amber-400/5 to-transparent p-5 shadow-md shadow-amber-400/10 dark:border-amber-400/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400 text-sm font-black text-slate-950 shadow-md shadow-amber-400/40">
                    #1
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    <Crown className="h-3 w-3" /> MVP Leader
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-950 dark:text-white">
                    {top3Fraggers[0].ign}
                  </h3>
                  <p className="text-xs font-extrabold text-[#0A5FC4] dark:text-blue-300">
                    {top3Fraggers[0].teamName}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-amber-400/30 pt-3">
                  <div>
                    <span className="text-3xl font-black text-[#0A5FC4] dark:text-blue-300">
                      {top3Fraggers[0].totalElims}
                    </span>
                    <span className="ml-1 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Finishes
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      {top3Fraggers[0].avgElims.toFixed(2)}
                    </span>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Avg/M
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* #2 Silver */}
            {top3Fraggers[1] && (
              <div className="relative flex flex-col justify-between sm:order-1 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/5 transition-all hover:border-[#0A5FC4]">
                <div className="flex items-center justify-between mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-xs font-black text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                    #2
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {top3Fraggers[1].matchesPlayed} Matches
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-950 dark:text-white">
                    {top3Fraggers[1].ign}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {top3Fraggers[1].teamName}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-3 dark:border-white/10">
                  <div>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {top3Fraggers[1].totalElims}
                    </span>
                    <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Elims
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      {top3Fraggers[1].avgElims.toFixed(2)}
                    </span>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Avg/M
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* #3 Bronze */}
            {top3Fraggers[2] && (
              <div className="relative flex flex-col justify-between sm:order-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/5 transition-all hover:border-[#0A5FC4]">
                <div className="flex items-center justify-between mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-700/20 text-xs font-black text-amber-700 dark:text-amber-400">
                    #3
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {top3Fraggers[2].matchesPlayed} Matches
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-950 dark:text-white">
                    {top3Fraggers[2].ign}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {top3Fraggers[2].teamName}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-3 dark:border-white/10">
                  <div>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {top3Fraggers[2].totalElims}
                    </span>
                    <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Elims
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      {top3Fraggers[2].avgElims.toFixed(2)}
                    </span>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Avg/M
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ TOP TEAMS CHAMPIONS PODIUM SPOTLIGHT (When viewing Team Performance) ============ */}
      {activeTab === 'teams' && top3Teams.length >= 3 && (
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(10,95,196,.08),transparent_65%)]" />
          
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                Tournament Leaders &amp; Top Squads
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                Team Performance Podium
              </h2>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-700 dark:text-blue-300">
              <Crown className="h-3.5 w-3.5" />
              <span>Overall Team Standings</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* #1 Gold - Highlighted */}
            {top3Teams[0] && (
              <div className="relative flex flex-col justify-between sm:order-2 rounded-2xl border-2 border-amber-400/80 bg-gradient-to-b from-amber-400/10 via-amber-400/5 to-transparent p-5 shadow-md shadow-amber-400/10 dark:border-amber-400/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400 text-sm font-black text-slate-950 shadow-md shadow-amber-400/40">
                    #1
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    <Crown className="h-3 w-3" /> Team Leader
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-950 dark:text-white">
                    {top3Teams[0].teamName}
                  </h3>
                  <p className="text-xs font-extrabold text-[#0A5FC4] dark:text-blue-300">
                    {top3Teams[0].winRate}% Win Rate · {top3Teams[0].wwcdCount} WWCDs
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-amber-400/30 pt-3">
                  <div>
                    <span className="text-3xl font-black text-[#0A5FC4] dark:text-blue-300">
                      {teamPointsMode === 'sum' ? top3Teams[0].totalPoints : teamPointsMode === 'avg' ? top3Teams[0].avgTotalPoints : top3Teams[0].maxTotalPoints}
                    </span>
                    <span className="ml-1 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Pts ({teamPointsMode.toUpperCase()})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      {top3Teams[0].totalPlacePoints}P / {top3Teams[0].totalElimsPoints}E
                    </span>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Place / Elims
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* #2 Silver */}
            {top3Teams[1] && (
              <div className="relative flex flex-col justify-between sm:order-1 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/5 transition-all hover:border-[#0A5FC4]">
                <div className="flex items-center justify-between mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-xs font-black text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                    #2
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {top3Teams[1].matchesPlayed} Matches · {top3Teams[1].wwcdCount} WWCD
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-950 dark:text-white">
                    {top3Teams[1].teamName}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {top3Teams[1].winRate}% Win Rate · {top3Teams[1].totalElimsPoints} Elims
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-3 dark:border-white/10">
                  <div>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {teamPointsMode === 'sum' ? top3Teams[1].totalPoints : teamPointsMode === 'avg' ? top3Teams[1].avgTotalPoints : top3Teams[1].maxTotalPoints}
                    </span>
                    <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Points ({teamPointsMode.toUpperCase()})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      {top3Teams[1].totalPlacePoints} Place / {top3Teams[1].totalElimsPoints} Elims
                    </span>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Split
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* #3 Bronze */}
            {top3Teams[2] && (
              <div className="relative flex flex-col justify-between sm:order-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/5 transition-all hover:border-[#0A5FC4]">
                <div className="flex items-center justify-between mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-700/20 text-xs font-black text-amber-700 dark:text-amber-400">
                    #3
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {top3Teams[2].matchesPlayed} Matches · {top3Teams[2].wwcdCount} WWCD
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-950 dark:text-white">
                    {top3Teams[2].teamName}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {top3Teams[2].winRate}% Win Rate · {top3Teams[2].totalElimsPoints} Elims
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-3 dark:border-white/10">
                  <div>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {teamPointsMode === 'sum' ? top3Teams[2].totalPoints : teamPointsMode === 'avg' ? top3Teams[2].avgTotalPoints : top3Teams[2].maxTotalPoints}
                    </span>
                    <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Points ({teamPointsMode.toUpperCase()})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      {top3Teams[2].totalPlacePoints} Place / {top3Teams[2].totalElimsPoints} Elims
                    </span>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Split
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ ESTATIC VIEW SWITCHER CARDS ============ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Player View Button */}
        <button
          type="button"
          onClick={() => setActiveTab('players')}
          className={`flex items-center justify-between rounded-3xl border p-6 text-left transition-all duration-200 cursor-pointer ${
            activeTab === 'players'
              ? 'border-[#0A5FC4] bg-white shadow-lg shadow-blue-500/10 dark:border-[#0A5FC4] dark:bg-[#0b1220] scale-[1.01]'
              : 'border-slate-200 bg-slate-50/70 hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
                activeTab === 'players'
                  ? 'bg-[#0A5FC4] text-white shadow-md shadow-blue-500/30'
                  : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300'
              }`}
            >
              <Crosshair className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-950 dark:text-white">
                Player Performance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Individual fraggers, powerplays, damage, and combat stats
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
              activeTab === 'players'
                ? 'bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-300'
                : 'text-slate-400'
            }`}
          >
            {playerRows.length} Players
          </span>
        </button>

        {/* Team View Button */}
        <button
          type="button"
          onClick={() => setActiveTab('teams')}
          className={`flex items-center justify-between rounded-3xl border p-6 text-left transition-all duration-200 cursor-pointer ${
            activeTab === 'teams'
              ? 'border-[#0A5FC4] bg-white shadow-lg shadow-blue-500/10 dark:border-[#0A5FC4] dark:bg-[#0b1220] scale-[1.01]'
              : 'border-slate-200 bg-slate-50/70 hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
                activeTab === 'teams'
                  ? 'bg-[#0A5FC4] text-white shadow-md shadow-blue-500/30'
                  : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300'
              }`}
            >
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-950 dark:text-white">
                Team Analytics
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Map stats, win rates, placement and elimination totals
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
              activeTab === 'teams'
                ? 'bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-300'
                : 'text-slate-400'
            }`}
          >
            {teamRows.length} Teams
          </span>
        </button>
      </div>

      {/* ============ ESTATIC FILTER TOOLBAR ============ */}
      <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
        {/* Stages Strip */}
        {stages.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-2 shrink-0">
              Stages:
            </span>
            <button
              type="button"
              onClick={() => toggleStage('ALL')}
              className={`rounded-xl px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                selectedStages.length === 0
                  ? 'bg-[#0A5FC4] text-white shadow-md shadow-blue-500/25'
                  : 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
              }`}
            >
              All Stages
            </button>
            {stages.map((stg) => {
              const active = selectedStages.includes(stg);
              return (
                <button
                  key={stg}
                  type="button"
                  onClick={() => toggleStage(stg)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#0A5FC4] text-white shadow-md shadow-blue-500/25'
                      : 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                  }`}
                >
                  {stg}
                </button>
              );
            })}
          </div>
        )}

        {/* Map, Day, Role & Points Mode Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3 dark:border-white/10 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Day Dropdown */}
            {daysList.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Day:</span>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="ALL">All Days ({daysList.length} Total)</option>
                  {daysList.map((d) => (
                    <option key={d} value={d}>
                      Day {d}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Map Pills */}
            {mapsList.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Map:</span>
                <button
                  type="button"
                  onClick={() => setSelectedMap('ALL')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                    selectedMap === 'ALL'
                      ? 'bg-[#0A5FC4] text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400'
                  }`}
                >
                  All
                </button>
                {mapsList.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMap(m)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                      selectedMap === m
                        ? 'bg-[#0A5FC4] text-white'
                        : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}

            {/* Role Filter (Player View Only) */}
            {activeTab === 'players' && rolesList.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Role:</span>
                <button
                  type="button"
                  onClick={() => setSelectedRole('ALL')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                    selectedRole === 'ALL'
                      ? 'bg-[#0A5FC4] text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400'
                  }`}
                >
                  All
                </button>
                {rolesList.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                      selectedRole === r
                        ? 'bg-[#0A5FC4] text-white'
                        : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Points Mode Switcher (Team View Only) */}
          {activeTab === 'teams' && (
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5">
              {(['sum', 'avg', 'max'] as TeamPointsMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTeamPointsMode(mode)}
                  className={`rounded-lg px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                    teamPointsMode === mode
                      ? 'bg-[#0A5FC4] text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {mode === 'sum' ? 'Total' : mode === 'avg' ? 'Average' : 'Peak'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="relative pt-1">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'players'
                ? 'Search player IGN, team name, or tag...'
                : 'Search squad or tag...'
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-[#0A5FC4] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
      </div>

      {/* ============ ESTATIC LEADERBOARD TABLE ============ */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
        <div className="overflow-x-auto">
          {activeTab === 'players' ? (
            /* ============ PLAYERS LEADERBOARD ============ */
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-white/5">
                  <th className="py-3.5 pl-4 sm:pl-6 w-12 text-center">#</th>
                  <th
                    className="py-3.5 pl-3 min-w-[180px] cursor-pointer group"
                    onClick={() => handlePlayerSort('ign')}
                  >
                    <span>Player</span>
                    <SortIcon active={playerSortKey === 'ign'} dir={playerSortDir} />
                  </th>
                  <th
                    className="py-3.5 px-3 text-center cursor-pointer group w-14"
                    onClick={() => handlePlayerSort('matchesPlayed')}
                  >
                    <span>MP</span>
                    <SortIcon active={playerSortKey === 'matchesPlayed'} dir={playerSortDir} />
                  </th>
                  {activeColumns.map((colKey) => {
                    const colDef = COLUMN_CONFIG_MAP[colKey];
                    if (!colDef) return null;
                    return (
                      <th
                        key={colKey}
                        className={`py-3.5 px-3 cursor-pointer group ${colDef.headerClass || 'text-center'}`}
                        onClick={() => handlePlayerSort(colDef.field as string)}
                      >
                        <span>{colDef.label}</span>
                        <SortIcon active={playerSortKey === colDef.field} dir={playerSortDir} />
                      </th>
                    );
                  })}
                  {customPlayerColumns?.map((customCol) => (
                    <th
                      key={customCol.id}
                      className="py-3.5 px-3 text-center cursor-pointer group w-24"
                      onClick={() => handlePlayerSort(customCol.id)}
                    >
                      <span title={customCol.label}>{customCol.short || customCol.label}</span>
                      <SortIcon active={playerSortKey === customCol.id} dir={playerSortDir} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10 text-xs sm:text-sm">
                {filteredPlayers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3 + activeColumns.length + (customPlayerColumns?.length || 0)}
                      className="py-12 text-center text-sm font-bold text-slate-400"
                    >
                      No player statistics found for selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((player, idx) => (
                    <tr
                      key={player.playerId}
                      className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-white/5"
                    >
                      {/* Rank # */}
                      <td className="py-3 pl-4 sm:pl-6 text-center font-black">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black ${
                            idx === 0
                              ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/30'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-900'
                              : idx === 2
                              ? 'bg-amber-600/20 text-amber-600 dark:text-amber-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>

                      {/* Player & Squad */}
                      <td className="py-3 pl-3">
                        <div className="flex items-center gap-3">
                          <TeamMark
                            mode={logoMode}
                            name={player.teamName}
                            lightSrc={player.teamLogo}
                            darkSrc={player.teamLogoDark}
                            countryCode={player.teamCountryCode}
                            tileClassName={`${TEAM_CHIP_BOX} ${TEAM_CHIP_FILL} relative flex items-center justify-center overflow-hidden`}
                            logoClassName="object-contain p-0.5 sm:p-1"
                            fallbackClassName="text-[10px] sm:text-xs font-black text-[#0A5FC4] dark:text-blue-300"
                          />
                          <div>
                            <Link
                              href={`/players/${player.playerSlug || player.playerId || encodeURIComponent(player.ign)}`}
                              className="font-extrabold text-slate-900 hover:text-[#0A5FC4] dark:text-white transition-colors block"
                            >
                              {player.ign}
                            </Link>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <span className="font-bold text-slate-600 dark:text-slate-300">
                                {player.teamTag || player.teamName}
                              </span>
                              {player.role && (
                                <>
                                  <span>•</span>
                                  <span className="font-semibold uppercase tracking-wider">
                                    {player.role}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* MP */}
                      <td className="py-3 px-3 text-center font-bold text-slate-600 dark:text-slate-300">
                        {player.matchesPlayed}
                      </td>

                      {/* Dynamic Standard Columns */}
                      {activeColumns.map((colKey) => {
                        const colDef = COLUMN_CONFIG_MAP[colKey];
                        if (!colDef) return null;
                        return (
                          <td
                            key={colKey}
                            className={`py-3 px-3 ${colDef.cellClass || 'text-center'}`}
                          >
                            {colDef.render(player)}
                          </td>
                        );
                      })}

                      {/* Dynamic Custom Columns */}
                      {customPlayerColumns?.map((customCol) => {
                        const val = player.customStats?.[customCol.id] ?? 0;
                        return (
                          <td
                            key={customCol.id}
                            className="py-3 px-3 text-center font-black text-indigo-600 dark:text-indigo-400"
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* ============ TEAMS LEADERBOARD ============ */
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-white/5">
                  <th className="py-3.5 pl-4 sm:pl-6 w-12 text-center">#</th>
                  <th
                    className="py-3.5 pl-3 min-w-[200px] cursor-pointer group"
                    onClick={() => handleTeamSort('teamName')}
                  >
                    <span>Squad</span>
                    <SortIcon active={teamSortKey === 'teamName'} dir={teamSortDir} />
                  </th>
                  <th
                    className="py-3.5 px-3 text-center cursor-pointer group w-16"
                    onClick={() => handleTeamSort('matchesPlayed')}
                  >
                    <span>MP</span>
                    <SortIcon active={teamSortKey === 'matchesPlayed'} dir={teamSortDir} />
                  </th>
                  <th
                    className="py-3.5 px-3 text-center cursor-pointer group w-16"
                    onClick={() => handleTeamSort('wwcdCount')}
                  >
                    <span>WWCD</span>
                    <SortIcon active={teamSortKey === 'wwcdCount'} dir={teamSortDir} />
                  </th>
                  <th
                    className="hidden sm:table-cell py-3.5 px-3 text-center cursor-pointer group w-20"
                    onClick={() => handleTeamSort('winRate')}
                  >
                    <span>Win %</span>
                    <SortIcon active={teamSortKey === 'winRate'} dir={teamSortDir} />
                  </th>
                  <th
                    className="hidden md:table-cell py-3.5 px-3 text-center cursor-pointer group w-24"
                    onClick={() => handleTeamSort('placePoints')}
                  >
                    <span>Place</span>
                    <SortIcon active={teamSortKey === 'placePoints'} dir={teamSortDir} />
                  </th>
                  <th
                    className="hidden md:table-cell py-3.5 px-3 text-center cursor-pointer group w-24"
                    onClick={() => handleTeamSort('elimsPoints')}
                  >
                    <span>Elims</span>
                    <SortIcon active={teamSortKey === 'elimsPoints'} dir={teamSortDir} />
                  </th>
                  <th
                    className="py-3.5 pr-4 sm:pr-6 text-right cursor-pointer group w-28"
                    onClick={() => handleTeamSort('totalPoints')}
                  >
                    <span>Points</span>
                    <SortIcon active={teamSortKey === 'totalPoints'} dir={teamSortDir} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10 text-xs sm:text-sm">
                {filteredTeams.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm font-bold text-slate-400">
                      No team statistics found for selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredTeams.map((team, idx) => {
                    const totalVal =
                      teamPointsMode === 'sum'
                        ? team.totalPoints
                        : teamPointsMode === 'avg'
                        ? team.avgTotalPoints
                        : team.maxTotalPoints;
                    const placeVal =
                      teamPointsMode === 'sum'
                        ? team.totalPlacePoints
                        : teamPointsMode === 'avg'
                        ? team.avgPlacePoints
                        : team.maxPlacePoints;
                    const elimsVal =
                      teamPointsMode === 'sum'
                        ? team.totalElimsPoints
                        : teamPointsMode === 'avg'
                        ? team.avgElims
                        : team.maxElims;

                    return (
                      <tr
                        key={team.teamId}
                        className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-white/5"
                      >
                        {/* Rank # */}
                        <td className="py-3 pl-4 sm:pl-6 text-center font-black">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black ${
                              idx === 0
                                ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/30'
                                : idx === 1
                                ? 'bg-slate-300 text-slate-900'
                                : idx === 2
                                ? 'bg-amber-600/20 text-amber-600 dark:text-amber-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>

                        {/* Squad */}
                        <td className="py-3 pl-3">
                          <div className="flex items-center gap-3">
                            <TeamMark
                              mode={logoMode}
                              name={team.teamName}
                              lightSrc={team.teamLogo}
                              darkSrc={team.teamLogoDark}
                              countryCode={team.countryCode}
                              tileClassName={`${TEAM_CHIP_BOX} ${TEAM_CHIP_FILL} relative flex items-center justify-center overflow-hidden`}
                              logoClassName="object-contain p-0.5 sm:p-1"
                              fallbackClassName="text-[10px] sm:text-xs font-black text-[#0A5FC4] dark:text-blue-300"
                            />
                            <div>
                              <Link
                                href={`/teams/${team.teamSlug || encodeURIComponent(team.teamName)}`}
                                className="font-extrabold text-slate-900 hover:text-[#0A5FC4] dark:text-white transition-colors block"
                              >
                                {team.teamName}
                              </Link>
                              {team.teamTag && (
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  {team.teamTag}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* MP */}
                        <td className="py-3 px-3 text-center font-bold text-slate-600 dark:text-slate-300">
                          {team.matchesPlayed}
                        </td>

                        {/* WWCD */}
                        <td className="py-3 px-3 text-center font-black text-amber-500">
                          {team.wwcdCount > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-xs">
                              {team.wwcdCount}🍗
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Win Rate */}
                        <td className="hidden sm:table-cell py-3 px-3 text-center font-bold text-slate-600 dark:text-slate-300">
                          {team.winRate}%
                        </td>

                        {/* Place Points */}
                        <td className="hidden md:table-cell py-3 px-3 text-center font-bold text-slate-600 dark:text-slate-300">
                          {placeVal}
                        </td>

                        {/* Elims Points */}
                        <td className="hidden md:table-cell py-3 px-3 text-center font-bold text-slate-600 dark:text-slate-300">
                          {elimsVal}
                        </td>

                        {/* Total Points */}
                        <td className="py-3 pr-4 sm:pr-6 text-right">
                          <span className="text-base font-black text-[#0A5FC4] dark:text-blue-300 font-mono">
                            {totalVal}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
