'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Users,
  Shield,
  Search,
  Layers,
  MapPin,
  Trophy,
  Star,
  Flame,
  Crosshair,
  TrendingUp,
  Award,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Calendar,
} from 'lucide-react';
import type { StandingsLogoMode, PlayerStatColumnKey, CustomPlayerColumn } from '@/lib/standings-config';

export interface PlayerPerformanceRow {
  playerId: string;
  playerSlug?: string | null;
  ign: string;
  teamId?: string | null;
  teamSlug?: string | null;
  teamName: string;
  teamTag?: string | null;
  teamLogo?: string | null;
  teamLogoDark?: string | null;
  role?: string | null;
  matchesPlayed: number;
  totalElims: number;
  totalPowerplay: number;
  totalDamage: number;
  totalHeadshots: number;
  totalAssists: number;
  totalKnockouts: number;
  totalSurvivalTime: number;
  totalHealing: number;
  totalDamageReceived: number;
  totalUtilities: number;
  totalDist: number;
  totalMvps: number;
  avgElims: number;
  maxElims?: number;
  zeroElimsMatches?: number;
  fivePlusElimsMatches?: number;
  customStats?: Record<string, number>;
  matchStats: Record<
    string,
    {
      matchId: string;
      stageName: string;
      groupName?: string | null;
      mapName?: string | null;
      day?: string | null;
      playerElims: number;
      playerPowerplay?: number;
      damage: number;
      headshots: number;
      assists: number;
      knockouts: number;
      survivalTime: number;
      healing?: number;
      damageReceived?: number;
      utilities?: number;
      totalDist?: number;
      isMvp: boolean;
    }
  >;
}

function computeCustomColumnValue(
  col: CustomPlayerColumn,
  activeMatches: Array<{
    playerElims: number;
    playerPowerplay?: number;
    damage: number;
    headshots: number;
    assists: number;
    knockouts: number;
    survivalTime: number;
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

export interface TeamMatchDetail {
  matchId: string;
  stageName: string;
  mapName: string;
  day: string;
  groupName?: string | null;
  rank: number;
  wwcd: boolean;
  placePoints: number;
  elimsPoints: number;
  totalPoints: number;
}

export type TeamPointsMode = 'sum' | 'avg' | 'max';

export interface TeamPerformanceRow {
  teamId: string;
  teamSlug?: string | null;
  teamName: string;
  teamTag?: string | null;
  teamLogo?: string | null;
  teamLogoDark?: string | null;
  matchesPlayed: number;
  wwcdCount: number;
  winRate: number;
  top5Count: number;
  midCount: number;
  bottomCount: number;
  totalPlacePoints: number;
  avgPlacePoints: number;
  maxPlacePoints: number;
  totalElimsPoints: number;
  avgElims: number;
  maxElims: number;
  totalPoints: number;
  avgTotalPoints: number;
  maxTotalPoints: number;
  matches?: TeamMatchDetail[];
  mapStats: Record<
    string,
    {
      mapName: string;
      matchesPlayed: number;
      wwcdCount: number;
      elims: number;
      placePoints: number;
      totalPoints: number;
    }
  >;
  stageStats: Record<
    string,
    {
      stageName: string;
      matchesPlayed: number;
      wwcdCount: number;
      elims: number;
      placePoints: number;
      totalPoints: number;
      maps: Record<string, { matchesPlayed: number; wwcdCount: number; elims: number; totalPoints: number }>;
    }
  >;
}

export interface TournamentStatisticsPanelProps {
  playerRows: PlayerPerformanceRow[];
  teamRows: TeamPerformanceRow[];
  stages: string[];
  mapsList: string[];
  daysList?: string[];
  stageGroups?: Record<string, string[]>;
  logoMode?: StandingsLogoMode;
  defaultView?: 'players' | 'teams';
  adminPlayerColumns?: PlayerStatColumnKey[];
  customPlayerColumns?: CustomPlayerColumn[];
  variant?: 'editorial' | 'estatic';
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) {
    return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-30 group-hover:opacity-100 transition-opacity ml-1 inline shrink-0" />;
  }
  return dir === 'asc' ? (
    <ArrowUp className="w-3 h-3 text-(--ed-blue) ml-1 inline shrink-0" />
  ) : (
    <ArrowDown className="w-3 h-3 text-(--ed-blue) ml-1 inline shrink-0" />
  );
}

export function TournamentStatisticsPanel({
  playerRows,
  teamRows,
  stages = [],
  mapsList = [],
  daysList = [],
  stageGroups = {},
  logoMode = 'BOTH',
  defaultView = 'players',
  adminPlayerColumns,
  customPlayerColumns,
  variant = 'editorial',
}: TournamentStatisticsPanelProps) {
  const isEstatic = variant === 'estatic';
  const [activeSection, setActiveSection] = React.useState<'players' | 'teams'>(defaultView);
  const [selectedStages, setSelectedStages] = React.useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = React.useState<string>('ALL');
  const [selectedRole, setSelectedRole] = React.useState<string>('ALL');
  const [selectedMap, setSelectedMap] = React.useState<string>('ALL');
  const [selectedDay, setSelectedDay] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  const toggleStage = (st: string) => {
    if (st === 'ALL') {
      setSelectedStages([]);
    } else {
      setSelectedStages((prev) => {
        if (prev.includes(st)) {
          return prev.filter((s) => s !== st);
        } else {
          return [...prev, st];
        }
      });
    }
  };

  // Player Sort State (3-Way Toggle: desc -> asc -> default)
  const DEFAULT_PLAYER_SORT_KEY = 'totalElims';
  const DEFAULT_PLAYER_SORT_DIR: 'asc' | 'desc' = 'desc';
  const [playerSortKey, setPlayerSortKey] = React.useState<string>(DEFAULT_PLAYER_SORT_KEY);
  const [playerSortDir, setPlayerSortDir] = React.useState<'asc' | 'desc'>(DEFAULT_PLAYER_SORT_DIR);

  const togglePlayerSort = (key: string) => {
    const primaryDir = key === 'avgPlacement' ? 'asc' : 'desc';
    const secondaryDir = primaryDir === 'desc' ? 'asc' : 'desc';

    if (playerSortKey !== key) {
      setPlayerSortKey(key);
      setPlayerSortDir(primaryDir);
    } else if (playerSortDir === primaryDir) {
      setPlayerSortDir(secondaryDir);
    } else {
      setPlayerSortKey(DEFAULT_PLAYER_SORT_KEY);
      setPlayerSortDir(DEFAULT_PLAYER_SORT_DIR);
    }
  };

  // Team Sort State (3-Way Toggle: desc -> asc -> default)
  const DEFAULT_TEAM_SORT_KEY = 'totalPoints';
  const DEFAULT_TEAM_SORT_DIR: 'asc' | 'desc' = 'desc';
  const [teamSortKey, setTeamSortKey] = React.useState<string>(DEFAULT_TEAM_SORT_KEY);
  const [teamSortDir, setTeamSortDir] = React.useState<'asc' | 'desc'>(DEFAULT_TEAM_SORT_DIR);

  // Toggle for points display: 'sum' (Total) vs 'avg' (Per Match) vs 'max' (Match Peak)
  const [teamPointsMode, setTeamPointsMode] = React.useState<TeamPointsMode>('sum');

  const handlePointsModeChange = (mode: TeamPointsMode) => {
    setTeamPointsMode(mode);
    // Smoothly align the sort key to the corresponding active mode metric
    if (['totalPoints', 'avgTotalPoints', 'maxTotalPoints'].includes(teamSortKey)) {
      setTeamSortKey(mode === 'avg' ? 'avgTotalPoints' : mode === 'max' ? 'maxTotalPoints' : 'totalPoints');
    } else if (['totalElimsPoints', 'avgElims', 'maxElims'].includes(teamSortKey)) {
      setTeamSortKey(mode === 'avg' ? 'avgElims' : mode === 'max' ? 'maxElims' : 'totalElimsPoints');
    } else if (['totalPlacePoints', 'avgPlacePoints', 'maxPlacePoints'].includes(teamSortKey)) {
      setTeamSortKey(mode === 'avg' ? 'avgPlacePoints' : mode === 'max' ? 'maxPlacePoints' : 'totalPlacePoints');
    }
  };

  const toggleTeamSort = (key: string) => {
    const primaryDir = 'desc';
    const secondaryDir = 'asc';

    if (teamSortKey !== key) {
      setTeamSortKey(key);
      setTeamSortDir(primaryDir);
    } else if (teamSortDir === primaryDir) {
      setTeamSortDir(secondaryDir);
    } else {
      setTeamSortKey(DEFAULT_TEAM_SORT_KEY);
      setTeamSortDir(DEFAULT_TEAM_SORT_DIR);
    }
  };

  // Reset secondary filters on stage change
  React.useEffect(() => {
    setSelectedGroup('ALL');
  }, [selectedStages]);

  // Available groups for stage
  const availableGroups = React.useMemo(() => {
    if (selectedStages.length === 0) {
      const allGrps = new Set<string>();
      Object.values(stageGroups).forEach((grps) => grps.forEach((g) => allGrps.add(g)));
      return Array.from(allGrps).sort();
    }
    const grps = new Set<string>();
    selectedStages.forEach((st) => {
      (stageGroups[st] || []).forEach((g) => grps.add(g));
    });
    return Array.from(grps).sort();
  }, [selectedStages, stageGroups]);

  // Available days dynamically filtered by selected stages
  const availableDays = React.useMemo(() => {
    const daysSet = new Set<string>();

    playerRows.forEach((p) => {
      Object.values(p.matchStats).forEach((m) => {
        if (m.day && (selectedStages.length === 0 || selectedStages.includes(m.stageName))) {
          daysSet.add(m.day);
        }
      });
    });

    teamRows.forEach((t) => {
      (t.matches || []).forEach((m) => {
        if (m.day && (selectedStages.length === 0 || selectedStages.includes(m.stageName))) {
          daysSet.add(m.day);
        }
      });
    });

    if (daysSet.size === 0 && daysList && daysList.length > 0 && selectedStages.length === 0) {
      daysList.forEach((d) => daysSet.add(d));
    }

    return Array.from(daysSet).sort((a, b) => Number(a) - Number(b));
  }, [playerRows, teamRows, selectedStages, daysList]);

  // Reset selectedDay if no longer available in filtered days
  React.useEffect(() => {
    if (selectedDay !== 'ALL' && !availableDays.includes(selectedDay)) {
      setSelectedDay('ALL');
    }
  }, [availableDays, selectedDay]);

  // Map each day to its primary stage name for clear display in dropdowns
  const dayStageMap = React.useMemo(() => {
    const map = new Map<string, string>();
    playerRows.forEach((p) => {
      Object.values(p.matchStats).forEach((m) => {
        if (m.day && m.stageName && !map.has(m.day)) {
          map.set(m.day, m.stageName);
        }
      });
    });
    teamRows.forEach((t) => {
      (t.matches || []).forEach((m) => {
        if (m.day && m.stageName && !map.has(m.day)) {
          map.set(m.day, m.stageName);
        }
      });
    });
    return map;
  }, [playerRows, teamRows]);

  // Available player roles
  const availableRoles = React.useMemo(() => {
    const rolesSet = new Set<string>();
    playerRows.forEach((p) => {
      if (p.role && p.role.trim()) rolesSet.add(p.role.trim());
    });
    return Array.from(rolesSet).sort();
  }, [playerRows]);

  // 1. Detect which player columns actually have real non-zero data submitted
  const availablePlayerMetrics = React.useMemo(() => {
    const hasData = {
      elims: playerRows.some((p) => p.totalElims > 0),
      powerplay: playerRows.some((p) => (p.totalPowerplay || 0) > 0),
      avgElims: playerRows.some((p) => p.totalElims > 0),
      maxElims: playerRows.some((p) => (p.maxElims || 0) > 0 || p.totalElims > 0),
      zeroElimsMatches: playerRows.some((p) => (p.matchesPlayed || 0) > 0),
      fivePlusElimsMatches: playerRows.some((p) => (p.fivePlusElimsMatches || 0) > 0 || (p.maxElims || 0) >= 5),
      damage: playerRows.some((p) => p.totalDamage > 0),
      headshots: playerRows.some((p) => p.totalHeadshots > 0),
      assists: playerRows.some((p) => p.totalAssists > 0),
      knockouts: playerRows.some((p) => p.totalKnockouts > 0),
      survivalTime: playerRows.some((p) => p.totalSurvivalTime > 0),
      healing: playerRows.some((p) => p.totalHealing > 0),
      damageReceived: playerRows.some((p) => p.totalDamageReceived > 0),
      utilities: playerRows.some((p) => p.totalUtilities > 0),
      totalDist: playerRows.some((p) => p.totalDist > 0),
      mvp: playerRows.some((p) => p.totalMvps > 0),
    };
    return hasData;
  }, [playerRows]);

  // 2. Active showcase columns: Dictated by Admin config intersected with actually available data
  const visiblePlayerColumns = React.useMemo(() => {
    const candidateKeys: PlayerStatColumnKey[] =
      adminPlayerColumns && adminPlayerColumns.length > 0
        ? adminPlayerColumns
        : ['elims', 'powerplay', 'avgElims', 'maxElims', 'zeroElimsMatches', 'fivePlusElimsMatches', 'damage', 'headshots'];

    return candidateKeys.filter((key) => availablePlayerMetrics[key]);
  }, [adminPlayerColumns, availablePlayerMetrics]);

  // 3. Filtered Players aggregation based on Multi-Stage / Map / Day / Group / Role / Search
  const filteredPlayers = React.useMemo(() => {
    return playerRows
      .map((p) => {
        const isAllStages = selectedStages.length === 0;
        const isAllGroups = selectedGroup === 'ALL';
        const isAllMaps = selectedMap === 'ALL';
        const isAllDays = selectedDay === 'ALL';

        if (isAllStages && isAllGroups && isAllMaps && isAllDays) {
          const allMatches = Object.values(p.matchStats);
          const customStats: Record<string, number> = {};
          if (customPlayerColumns && customPlayerColumns.length > 0) {
            for (const col of customPlayerColumns) {
              customStats[col.id] = computeCustomColumnValue(col, allMatches);
            }
          }
          return {
            ...p,
            customStats,
          };
        }

        const activeMatches = Object.values(p.matchStats).filter((m) => {
          if (!isAllStages && !selectedStages.includes(m.stageName)) return false;
          if (!isAllGroups && m.groupName !== selectedGroup) return false;
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
  }, [playerRows, selectedStages, selectedGroup, selectedMap, selectedDay, selectedRole, searchQuery, playerSortKey, playerSortDir, customPlayerColumns]);

  // 4. Filtered Teams aggregation based on Multi-Stage / Map / Day / Search
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
          const top5 = activeMatches.filter((m) => m.rank >= 1 && m.rank <= 5).length;
          const mid = activeMatches.filter((m) => m.rank >= 6 && m.rank <= 10).length;
          const bottom = activeMatches.filter((m) => m.rank >= 11).length;
          const placePts = activeMatches.reduce((s, m) => s + (m.placePoints || 0), 0);
          const elimsPts = activeMatches.reduce((s, m) => s + (m.elimsPoints || 0), 0);
          const totalPts = activeMatches.reduce((s, m) => s + (m.totalPoints || 0), 0);
          const maxElims = activeMatches.reduce((mx, m) => Math.max(mx, m.elimsPoints || 0), 0);
          const maxPlace = activeMatches.reduce((mx, m) => Math.max(mx, m.placePoints || 0), 0);
          const maxTotal = activeMatches.reduce((mx, m) => Math.max(mx, m.totalPoints || 0), 0);

          return {
            ...t,
            matchesPlayed: mp,
            wwcdCount: wwcd,
            winRate: Number(((wwcd / mp) * 100).toFixed(1)),
            top5Count: top5,
            midCount: mid,
            bottomCount: bottom,
            totalPlacePoints: placePts,
            avgPlacePoints: Number((placePts / mp).toFixed(2)),
            maxPlacePoints: maxPlace,
            totalElimsPoints: elimsPts,
            avgElims: Number((elimsPts / mp).toFixed(2)),
            maxElims,
            totalPoints: totalPts,
            avgTotalPoints: Number((totalPts / mp).toFixed(2)),
            maxTotalPoints: maxTotal,
          };
        }

        let mp = 0;
        let wwcd = 0;
        let placePts = 0;
        let elimsPts = 0;
        let totalPts = 0;

        const stageEntries = Object.entries(t.stageStats).filter(([stName]) => {
          if (!isAllStages && !selectedStages.includes(stName)) return false;
          return true;
        });

        for (const [, st] of stageEntries) {
          if (isAllMaps) {
            mp += st.matchesPlayed;
            wwcd += st.wwcdCount;
            placePts += st.placePoints;
            elimsPts += st.elims;
            totalPts += st.totalPoints;
          } else if (st.maps[selectedMap]) {
            const m = st.maps[selectedMap];
            mp += m.matchesPlayed;
            wwcd += m.wwcdCount;
            placePts += (m.totalPoints - m.elims);
            elimsPts += m.elims;
            totalPts += m.totalPoints;
          }
        }

        if (mp === 0) return null;

        return {
          ...t,
          matchesPlayed: mp,
          wwcdCount: wwcd,
          winRate: Number(((wwcd / mp) * 100).toFixed(1)),
          top5Count: t.top5Count,
          midCount: t.midCount,
          bottomCount: t.bottomCount,
          totalPlacePoints: placePts,
          avgPlacePoints: Number((placePts / mp).toFixed(2)),
          maxPlacePoints: t.maxPlacePoints || 0,
          totalElimsPoints: elimsPts,
          avgElims: Number((elimsPts / mp).toFixed(2)),
          maxElims: t.maxElims || 0,
          totalPoints: totalPts,
          avgTotalPoints: Number((totalPts / mp).toFixed(2)),
          maxTotalPoints: t.maxTotalPoints || 0,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .filter((t) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          t.teamName.toLowerCase().includes(q) ||
          (t.teamTag && t.teamTag.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        let cmp = 0;
        if (teamSortKey === 'teamName') {
          cmp = (a.teamName || '').localeCompare(b.teamName || '');
        } else {
          const valA = ((a as unknown) as Record<string, number>)[teamSortKey] ?? 0;
          const valB = ((b as unknown) as Record<string, number>)[teamSortKey] ?? 0;
          cmp = valA - valB;
        }
        if (cmp === 0) {
          cmp = a.totalPoints - b.totalPoints || a.wwcdCount - b.wwcdCount || a.totalElimsPoints - b.totalElimsPoints;
        }
        return teamSortDir === 'desc' ? -cmp : cmp;
      });
  }, [teamRows, selectedStages, selectedMap, selectedDay, searchQuery, teamSortKey, teamSortDir]);

  return (
    <div className={`space-y-6 ${isEstatic ? 'rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm dark:border-white/10 dark:bg-[#0b1220]' : ''}`}>
      {/* ── Top Header ── */}
      <div>
        <h2 className="font-display flex items-center gap-2.5 text-xl font-medium tracking-tight">
          <Trophy className={`h-5 w-5 ${isEstatic ? 'text-[#0A5FC4] dark:text-blue-400' : 'text-(--ed-magenta)'}`} />
          Tournament Performance &amp; Statistics
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Comprehensive performance statistics for participating players and teams.
        </p>
      </div>

      {/* ── Two Cards to Pick From: Teams or Players (Requirement 5) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Player Performance */}
        <button
          type="button"
          onClick={() => setActiveSection('players')}
          className={`text-left p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            activeSection === 'players'
              ? isEstatic
                ? 'border-[#0A5FC4] bg-[#0A5FC4]/5 shadow-md shadow-blue-500/10 ring-2 ring-[#0A5FC4]/30'
                : 'border-(--ed-blue) bg-blue-500/5 shadow-md shadow-blue-500/10 ring-2 ring-(--ed-blue)/30'
              : isEstatic
              ? 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20'
              : 'border-(--ed-hair) bg-(--ed-surface) hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2.5 rounded-xl ${
              activeSection === 'players'
                ? isEstatic
                  ? 'bg-[#0A5FC4] text-white shadow-sm'
                  : 'bg-(--ed-blue) text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>
              <Users className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
              activeSection === 'players' ? 'bg-[#0A5FC4] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              {activeSection === 'players' ? 'Active View' : 'Select'}
            </span>
          </div>
          <h3 className={`font-display text-base font-bold ${isEstatic ? 'text-slate-900 dark:text-white group-hover:text-[#0A5FC4]' : 'text-(--ed-ink) group-hover:text-(--ed-blue)'} transition-colors`}>
            👥 Player Performance
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Individual fraggers leaderboard, eliminations, powerplay, and combat statistics.
          </p>
          <div className={`mt-4 pt-3 border-t ${isEstatic ? 'border-slate-100 dark:border-white/10' : 'border-(--ed-hair)'} flex items-center justify-between text-[11px] text-slate-500`}>
            <span>{playerRows.length} Participating Players</span>
            <span className={`font-mono font-bold ${isEstatic ? 'text-slate-900 dark:text-white' : 'text-(--ed-ink)'}`}>
              Top: {playerRows[0]?.totalElims || 0} Finishes
            </span>
          </div>
        </button>

        {/* Card 2: Team Performance */}
        <button
          type="button"
          onClick={() => setActiveSection('teams')}
          className={`text-left p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            activeSection === 'teams'
              ? isEstatic
                ? 'border-[#0A5FC4] bg-[#0A5FC4]/5 shadow-md shadow-blue-500/10 ring-2 ring-[#0A5FC4]/30'
                : 'border-(--ed-blue) bg-blue-500/5 shadow-md shadow-blue-500/10 ring-2 ring-(--ed-blue)/30'
              : isEstatic
              ? 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20'
              : 'border-(--ed-hair) bg-(--ed-surface) hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2.5 rounded-xl ${
              activeSection === 'teams'
                ? isEstatic
                  ? 'bg-[#0A5FC4] text-white shadow-sm'
                  : 'bg-(--ed-blue) text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>
              <Shield className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
              activeSection === 'teams' ? 'bg-[#0A5FC4] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              {activeSection === 'teams' ? 'Active View' : 'Select'}
            </span>
          </div>
          <h3 className={`font-display text-base font-bold ${isEstatic ? 'text-slate-900 dark:text-white group-hover:text-[#0A5FC4]' : 'text-(--ed-ink) group-hover:text-(--ed-blue)'} transition-colors`}>
            🛡️ Team Performance
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Map statistics with stage filters, average placements, WWCDs, and totals across maps.
          </p>
          <div className={`mt-4 pt-3 border-t ${isEstatic ? 'border-slate-100 dark:border-white/10' : 'border-(--ed-hair)'} flex items-center justify-between text-[11px] text-slate-500`}>
            <span>{teamRows.length} Participating Squads</span>
            <span className={`font-mono font-bold ${isEstatic ? 'text-slate-900 dark:text-white' : 'text-(--ed-ink)'}`}>
              {mapsList.length > 0 ? `${mapsList.length} Maps Played` : 'All Maps'}
            </span>
          </div>
        </button>
      </div>

      {/* ── Global Filter Toolbar (Stage, Group / Map, Search) ── */}
      <div className="rounded-2xl border border-(--ed-hair) bg-(--ed-surface) p-4 space-y-3.5 shadow-xs">
        {/* Stage Filter Buttons (Multi-Select, only if stages.length > 1) */}
        {stages.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mr-2 shrink-0 flex items-center gap-1">
              <Layers className="w-3 h-3" /> Stages:
            </span>
            <button
              type="button"
              onClick={() => toggleStage('ALL')}
              className={`num px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedStages.length === 0
                  ? 'bg-(--ed-blue) text-white shadow-xs'
                  : 'bg-(--ed-canvas) text-(--ed-stone) hover:text-(--ed-ink)'
              }`}
            >
              All Stages
            </button>
            {stages.map((st) => {
              const isSelected = selectedStages.includes(st);
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => toggleStage(st)}
                  className={`num px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-(--ed-blue) text-white shadow-xs'
                      : 'bg-(--ed-canvas) text-(--ed-stone) hover:text-(--ed-ink)'
                  }`}
                >
                  {isSelected ? `✓ ${st}` : st}
                </button>
              );
            })}
          </div>
        )}

        {/* Day Filter (Applies to both Players and Teams, only if availableDays.length > 1) */}
        {availableDays.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-(--ed-hair)/60">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Day:
            </span>

            {availableDays.length <= 6 ? (
              // When 6 or fewer days (e.g. within a specific stage), show clean compact quick-click chips
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedDay('ALL')}
                  className={`num px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedDay === 'ALL'
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-950'
                      : 'bg-(--ed-canvas) text-(--ed-stone) hover:text-(--ed-ink)'
                  }`}
                >
                  All Days
                </button>
                {availableDays.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDay(d)}
                    className={`num px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedDay === d
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-950'
                        : 'bg-(--ed-canvas) text-(--ed-stone) hover:text-(--ed-ink)'
                    }`}
                  >
                    Day {d}
                  </button>
                ))}
              </div>
            ) : (
              // When more than 6 days (e.g. All Stages with 23 days), use a clean compact select dropdown
              <div className="flex items-center gap-2">
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="num rounded-lg border border-(--ed-hair) bg-(--ed-canvas) px-3 py-1.5 text-xs font-bold text-(--ed-ink) focus:outline-none focus:ring-1 focus:ring-(--ed-blue) cursor-pointer"
                >
                  <option value="ALL">All Days ({availableDays.length} Days Total)</option>
                  {availableDays.map((d) => (
                    <option key={d} value={d}>
                      Day {d}{dayStageMap.has(d) ? ` — ${dayStageMap.get(d)}` : ''}
                    </option>
                  ))}
                </select>
                {selectedDay !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelectedDay('ALL')}
                    className="text-[11px] font-bold text-(--ed-blue) hover:underline cursor-pointer"
                  >
                    Reset Day
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Map Filter (Applies to both Players and Teams, only if mapsList.length > 1) */}
        {mapsList.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-(--ed-hair)/60">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mr-2 shrink-0 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Map:
            </span>
            <button
              type="button"
              onClick={() => setSelectedMap('ALL')}
              className={`num px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedMap === 'ALL'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-950'
                  : 'bg-(--ed-canvas) text-(--ed-stone) hover:text-(--ed-ink)'
              }`}
            >
              All Maps
            </button>
            {mapsList.map((mp) => (
              <button
                key={mp}
                type="button"
                onClick={() => setSelectedMap(mp)}
                className={`num px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedMap === mp
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-950'
                    : 'bg-(--ed-canvas) text-(--ed-stone) hover:text-(--ed-ink)'
                }`}
              >
                {mp}
              </button>
            ))}
          </div>
        )}

        {/* Group Filter (Only for Player Performance when specific stage(s) selected and availableGroups.length > 1) */}
        {activeSection === 'players' && selectedStages.length > 0 && availableGroups.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-(--ed-hair)/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-2 shrink-0">
              Group:
            </span>
            <button
              type="button"
              onClick={() => setSelectedGroup('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                selectedGroup === 'ALL'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-950'
                  : 'bg-(--ed-canvas) text-(--ed-stone) hover:text-(--ed-ink)'
              }`}
            >
              All Groups
            </button>
            {availableGroups.map((grp) => (
              <button
                key={grp}
                type="button"
                onClick={() => setSelectedGroup(grp)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                  selectedGroup === grp
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-950'
                    : 'bg-(--ed-canvas) text-(--ed-stone) hover:text-(--ed-ink)'
                }`}
              >
                {grp}
              </button>
            ))}
          </div>
        )}

        {/* Role Filter (Only for Player Performance if availableRoles.length > 1) */}
        {activeSection === 'players' && availableRoles.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-(--ed-hair)/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-2 shrink-0">
              Role:
            </span>
            <button
              type="button"
              onClick={() => setSelectedRole('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                selectedRole === 'ALL'
                  ? 'bg-(--ed-blue) text-white shadow-xs'
                  : 'bg-(--ed-canvas) text-(--ed-stone) hover:text-(--ed-ink)'
              }`}
            >
              All Roles
            </button>
            {availableRoles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRole(r)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                  selectedRole === r
                    ? 'bg-(--ed-blue) text-white shadow-xs'
                    : 'bg-(--ed-canvas) text-(--ed-stone) hover:text-(--ed-ink)'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {/* Search Bar */}
        <div className="relative w-full pt-1 border-t border-(--ed-hair)/60">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none mt-0.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeSection === 'players' ? 'Search player IGN, team name, or tag...' : 'Search team name or tag...'}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-(--ed-canvas) border border-(--ed-hair) text-xs focus:outline-none focus:ring-2 focus:ring-(--ed-blue) placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 mt-0.5"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── 1. PLAYER PERFORMANCE: FRAGGERS TABLE (Requirements 1, 8, 9) ── */}
      {activeSection === 'players' && (
        <div className="ed-card overflow-hidden">
          <div className="px-6 py-4 border-b border-(--ed-hair) bg-(--ed-canvas) flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-(--ed-ink) flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-(--ed-magenta)" />
                Individual Fraggers Leaderboard ({filteredPlayers.length} Players)
              </h3>
              <p className="text-[11px] text-(--ed-stone) mt-0.5">
                Columns displayed are based on tournament data and configured by administration.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-(--ed-hair) bg-(--ed-canvas) text-xs">
                <tr>
                  <th className="ed-th w-14 px-6 text-left whitespace-nowrap">#</th>
                  <th
                    onClick={() => togglePlayerSort('ign')}
                    className="ed-th text-left cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                  >
                    <span className="inline-flex items-center gap-1">
                      Player IGN <SortIcon active={playerSortKey === 'ign'} dir={playerSortDir} />
                    </span>
                  </th>
                  <th
                    onClick={() => togglePlayerSort('team')}
                    className="ed-th text-left cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                  >
                    <span className="inline-flex items-center gap-1">
                      Team <SortIcon active={playerSortKey === 'team'} dir={playerSortDir} />
                    </span>
                  </th>
                  <th
                    onClick={() => togglePlayerSort('matchesPlayed')}
                    className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                  >
                    <span className="inline-flex items-center justify-center gap-1">
                      Matches <SortIcon active={playerSortKey === 'matchesPlayed'} dir={playerSortDir} />
                    </span>
                  </th>
                  {visiblePlayerColumns.includes('elims') && (
                    <th
                      onClick={() => togglePlayerSort('totalElims')}
                      className="ed-th text-center text-(--ed-magenta) cursor-pointer hover:opacity-80 select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Elims <SortIcon active={playerSortKey === 'totalElims'} dir={playerSortDir} />
                      </span>
                    </th>
                  )}
                  {visiblePlayerColumns.includes('powerplay') && (
                    <th
                      onClick={() => togglePlayerSort('totalPowerplay')}
                      className="ed-th text-center text-purple-600 dark:text-purple-400 cursor-pointer hover:opacity-80 select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Powerplay <SortIcon active={playerSortKey === 'totalPowerplay'} dir={playerSortDir} />
                      </span>
                    </th>
                  )}
                  {visiblePlayerColumns.includes('avgElims') && (
                    <th
                      onClick={() => togglePlayerSort('avgElims')}
                      className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Avg/M <SortIcon active={playerSortKey === 'avgElims'} dir={playerSortDir} />
                      </span>
                    </th>
                  )}
                  {visiblePlayerColumns.includes('maxElims') && (
                    <th
                      onClick={() => togglePlayerSort('maxElims')}
                      className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Max Elims <SortIcon active={playerSortKey === 'maxElims'} dir={playerSortDir} />
                      </span>
                    </th>
                  )}
                  {visiblePlayerColumns.includes('zeroElimsMatches') && (
                    <th
                      onClick={() => togglePlayerSort('zeroElimsMatches')}
                      className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        0 Elims <SortIcon active={playerSortKey === 'zeroElimsMatches'} dir={playerSortDir} />
                      </span>
                    </th>
                  )}
                  {visiblePlayerColumns.includes('fivePlusElimsMatches') && (
                    <th
                      onClick={() => togglePlayerSort('fivePlusElimsMatches')}
                      className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        5+ Elims <SortIcon active={playerSortKey === 'fivePlusElimsMatches'} dir={playerSortDir} />
                      </span>
                    </th>
                  )}
                  {visiblePlayerColumns.includes('damage') && (
                    <th
                      onClick={() => togglePlayerSort('totalDamage')}
                      className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Damage <SortIcon active={playerSortKey === 'totalDamage'} dir={playerSortDir} />
                      </span>
                    </th>
                  )}
                  {visiblePlayerColumns.includes('headshots') && (
                    <th
                      onClick={() => togglePlayerSort('totalHeadshots')}
                      className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Headshots <SortIcon active={playerSortKey === 'totalHeadshots'} dir={playerSortDir} />
                      </span>
                    </th>
                  )}
                  {visiblePlayerColumns.includes('knockouts') && (
                    <th
                      onClick={() => togglePlayerSort('totalKnockouts')}
                      className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Knocks <SortIcon active={playerSortKey === 'totalKnockouts'} dir={playerSortDir} />
                      </span>
                    </th>
                  )}
                  {visiblePlayerColumns.includes('assists') && (
                    <th
                      onClick={() => togglePlayerSort('totalAssists')}
                      className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Assists <SortIcon active={playerSortKey === 'totalAssists'} dir={playerSortDir} />
                      </span>
                    </th>
                  )}
                  {visiblePlayerColumns.includes('survivalTime') && (
                    <th
                      onClick={() => togglePlayerSort('totalSurvivalTime')}
                      className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Survival <SortIcon active={playerSortKey === 'totalSurvivalTime'} dir={playerSortDir} />
                      </span>
                    </th>
                  )}
                  {visiblePlayerColumns.includes('healing') && (
                    <th
                      onClick={() => togglePlayerSort('totalHealing')}
                      className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Healing <SortIcon active={playerSortKey === 'totalHealing'} dir={playerSortDir} />
                      </span>
                    </th>
                  )}
                  {visiblePlayerColumns.includes('damageReceived') && (
                    <th
                      onClick={() => togglePlayerSort('totalDamageReceived')}
                      className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Dmg Recv <SortIcon active={playerSortKey === 'totalDamageReceived'} dir={playerSortDir} />
                      </span>
                    </th>
                  )}
                  {visiblePlayerColumns.includes('utilities') && (
                    <th
                      onClick={() => togglePlayerSort('totalUtilities')}
                      className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Utilities <SortIcon active={playerSortKey === 'totalUtilities'} dir={playerSortDir} />
                      </span>
                    </th>
                  )}
                  {visiblePlayerColumns.includes('totalDist') && (
                    <th
                      onClick={() => togglePlayerSort('totalDist')}
                      className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Distance <SortIcon active={playerSortKey === 'totalDist'} dir={playerSortDir} />
                      </span>
                    </th>
                  )}
                  {visiblePlayerColumns.includes('mvp') && (
                    <th
                      onClick={() => togglePlayerSort('totalMvps')}
                      className="ed-th text-center text-amber-500 cursor-pointer hover:opacity-80 select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        MVP <SortIcon active={playerSortKey === 'totalMvps'} dir={playerSortDir} />
                      </span>
                    </th>
                  )}
                  {customPlayerColumns?.map((col) => (
                    <th
                      key={col.id}
                      onClick={() => togglePlayerSort(col.id)}
                      className="ed-th text-center font-bold cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap text-(--ed-ink)"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        {col.label} <SortIcon active={playerSortKey === col.id} dir={playerSortDir} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--ed-hair) font-mono">
                {filteredPlayers.map((p, idx) => (
                  <tr key={p.playerId} className="transition-colors hover:bg-(--ed-canvas)">
                    <td className="num px-6 py-3 text-(--ed-stone) font-sans whitespace-nowrap">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="py-3 font-sans whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {p.playerSlug ? (
                          <Link
                            href={`/players/${p.playerSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-(--ed-ink) hover:text-(--ed-blue) hover:underline transition-colors"
                          >
                            {p.ign}
                          </Link>
                        ) : (
                          <span className="text-sm font-bold text-(--ed-ink)">{p.ign}</span>
                        )}
                        {p.totalMvps > 0 && (
                          <span className="flex items-center gap-0.5 rounded-md border border-amber-600/25 px-1 text-[10px] text-amber-700 dark:border-amber-400/25 dark:text-amber-400">
                            <Star className="h-2.5 w-2.5" /> {p.totalMvps}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 font-sans whitespace-nowrap">
                      {p.teamSlug ? (
                        <Link
                          href={`/teams/${p.teamSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-(--ed-stone) hover:text-(--ed-blue) hover:underline transition-colors"
                        >
                          {p.teamName || '—'}
                        </Link>
                      ) : (
                        <span className="text-(--ed-stone)">{p.teamName || '—'}</span>
                      )}
                    </td>
                    <td className="num px-3 py-3 text-center text-(--ed-stone) whitespace-nowrap">{p.matchesPlayed}</td>
                    {visiblePlayerColumns.includes('elims') && (
                      <td className="num px-3 py-3 text-center font-bold text-sm text-(--ed-magenta) whitespace-nowrap">
                        {p.totalElims}
                      </td>
                    )}
                    {visiblePlayerColumns.includes('powerplay') && (
                      <td className="num px-3 py-3 text-center font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                        {p.totalPowerplay || 0}
                      </td>
                    )}
                    {visiblePlayerColumns.includes('avgElims') && (
                      <td className="num px-3 py-3 text-center text-(--ed-stone) whitespace-nowrap">
                        {p.avgElims}
                      </td>
                    )}
                    {visiblePlayerColumns.includes('maxElims') && (
                      <td className="num px-3 py-3 text-center font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        {p.maxElims ?? 0}
                      </td>
                    )}
                    {visiblePlayerColumns.includes('zeroElimsMatches') && (
                      <td className="num px-3 py-3 text-center text-slate-400 whitespace-nowrap">
                        {p.zeroElimsMatches ?? 0}
                      </td>
                    )}
                    {visiblePlayerColumns.includes('fivePlusElimsMatches') && (
                      <td className="num px-3 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {p.fivePlusElimsMatches ?? 0}
                      </td>
                    )}
                    {visiblePlayerColumns.includes('damage') && (
                      <td className="num px-3 py-3 text-center text-(--ed-stone) whitespace-nowrap">
                        {p.totalDamage.toLocaleString('en-US')}
                      </td>
                    )}
                    {visiblePlayerColumns.includes('headshots') && (
                      <td className="num px-3 py-3 text-center text-(--ed-stone) whitespace-nowrap">
                        {p.totalHeadshots}
                      </td>
                    )}
                    {visiblePlayerColumns.includes('knockouts') && (
                      <td className="num px-3 py-3 text-center text-(--ed-stone) whitespace-nowrap">
                        {p.totalKnockouts}
                      </td>
                    )}
                    {visiblePlayerColumns.includes('assists') && (
                      <td className="num px-3 py-3 text-center text-(--ed-stone) whitespace-nowrap">
                        {p.totalAssists}
                      </td>
                    )}
                    {visiblePlayerColumns.includes('survivalTime') && (
                      <td className="num px-3 py-3 text-center text-(--ed-stone) whitespace-nowrap">
                        {Math.round(p.totalSurvivalTime / 60)}m
                      </td>
                    )}
                    {visiblePlayerColumns.includes('healing') && (
                      <td className="num px-3 py-3 text-center text-(--ed-stone) whitespace-nowrap">
                        {p.totalHealing}
                      </td>
                    )}
                    {visiblePlayerColumns.includes('damageReceived') && (
                      <td className="num px-3 py-3 text-center text-(--ed-stone) whitespace-nowrap">
                        {p.totalDamageReceived}
                      </td>
                    )}
                    {visiblePlayerColumns.includes('utilities') && (
                      <td className="num px-3 py-3 text-center text-(--ed-stone) whitespace-nowrap">
                        {p.totalUtilities}
                      </td>
                    )}
                    {visiblePlayerColumns.includes('totalDist') && (
                      <td className="num px-3 py-3 text-center text-(--ed-stone) whitespace-nowrap">
                        {Math.round(p.totalDist)}m
                      </td>
                    )}
                    {visiblePlayerColumns.includes('mvp') && (
                      <td className="num px-3 py-3 text-center text-amber-700 dark:text-amber-400 font-bold whitespace-nowrap">
                        {p.totalMvps > 0 ? p.totalMvps : '—'}
                      </td>
                    )}
                    {customPlayerColumns?.map((col) => {
                      const val = p.customStats?.[col.id] ?? 0;
                      return (
                        <td
                          key={col.id}
                          className="num px-3 py-3 text-center font-bold text-(--ed-ink) whitespace-nowrap"
                        >
                          {col.aggregator === 'avg'
                            ? val.toFixed(2)
                            : col.metric === 'damage' && col.aggregator === 'sum'
                            ? Math.round(val).toLocaleString('en-US')
                            : val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPlayers.length === 0 && (
            <div className="p-12 text-center text-xs text-(--ed-stone)">
              No player records match the current filter.
            </div>
          )}
        </div>
      )}

      {/* ── 2. TEAM PERFORMANCE: MAP STATS & METRICS (Requirements 1, 6) ── */}
      {activeSection === 'teams' && (
        <div className="space-y-6">
          {/* Main Team Performance Table */}
          <div className="ed-card overflow-hidden">
            <div className="px-6 py-4 border-b border-(--ed-hair) bg-(--ed-canvas) flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-(--ed-ink) flex items-center gap-2">
                  <Shield className="w-4 h-4 text-(--ed-blue)" />
                  Team Performance &amp; Map Metrics ({filteredTeams.length} Squads)
                </h3>
                <p className="text-[11px] text-(--ed-stone) mt-0.5">
                  Wins, placements, eliminations, and points across {selectedStages.length === 0 ? 'all stages' : selectedStages.join(', ')} {selectedMap !== 'ALL' ? `on ${selectedMap}` : ''} {selectedDay !== 'ALL' ? `(Day ${selectedDay})` : ''}.
                </p>
              </div>

              {/* Toggle for Points Columns: Sum vs Avg vs Max */}
              <div className="flex items-center gap-1 bg-(--ed-card) p-1 rounded-xl border border-(--ed-hair) shadow-2xs shrink-0 self-start sm:self-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 select-none">
                  Points:
                </span>
                <button
                  type="button"
                  onClick={() => handlePointsModeChange('sum')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    teamPointsMode === 'sum'
                      ? 'bg-(--ed-blue) text-white shadow-xs'
                      : 'text-(--ed-stone) hover:text-(--ed-ink) hover:bg-(--ed-canvas)'
                  }`}
                >
                  Sum (Total)
                </button>
                <button
                  type="button"
                  onClick={() => handlePointsModeChange('avg')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    teamPointsMode === 'avg'
                      ? 'bg-(--ed-blue) text-white shadow-xs'
                      : 'text-(--ed-stone) hover:text-(--ed-ink) hover:bg-(--ed-canvas)'
                  }`}
                >
                  Avg / Match
                </button>
                <button
                  type="button"
                  onClick={() => handlePointsModeChange('max')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    teamPointsMode === 'max'
                      ? 'bg-(--ed-blue) text-white shadow-xs'
                      : 'text-(--ed-stone) hover:text-(--ed-ink) hover:bg-(--ed-canvas)'
                  }`}
                >
                  Match Max
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-(--ed-hair) bg-(--ed-canvas) text-xs">
                  <tr>
                    <th className="ed-th w-14 px-5 text-left whitespace-nowrap">#</th>
                    <th
                      onClick={() => toggleTeamSort('teamName')}
                      className="ed-th text-left cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center gap-1">
                        Squad <SortIcon active={teamSortKey === 'teamName'} dir={teamSortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => toggleTeamSort('matchesPlayed')}
                      className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Matches <SortIcon active={teamSortKey === 'matchesPlayed'} dir={teamSortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => toggleTeamSort('wwcdCount')}
                      className="ed-th text-center text-amber-600 dark:text-amber-400 cursor-pointer hover:opacity-80 select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        WWCD <SortIcon active={teamSortKey === 'wwcdCount'} dir={teamSortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => toggleTeamSort('winRate')}
                      className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Win Rate <SortIcon active={teamSortKey === 'winRate'} dir={teamSortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => toggleTeamSort('top5Count')}
                      className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Top 5 <SortIcon active={teamSortKey === 'top5Count'} dir={teamSortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => toggleTeamSort('midCount')}
                      className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Mid (6-10) <SortIcon active={teamSortKey === 'midCount'} dir={teamSortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => toggleTeamSort('bottomCount')}
                      className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Bottom (11+) <SortIcon active={teamSortKey === 'bottomCount'} dir={teamSortDir} />
                      </span>
                    </th>

                    {/* Dynamic Point Column 1: Elims (Sum vs Avg vs Max) */}
                    <th
                      onClick={() =>
                        toggleTeamSort(
                          teamPointsMode === 'avg'
                            ? 'avgElims'
                            : teamPointsMode === 'max'
                            ? 'maxElims'
                            : 'totalElimsPoints'
                        )
                      }
                      className="ed-th text-center text-(--ed-magenta) cursor-pointer hover:opacity-80 select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        {teamPointsMode === 'avg'
                          ? 'Avg Elims/M'
                          : teamPointsMode === 'max'
                          ? 'Max Elims'
                          : 'Elims'}
                        <SortIcon
                          active={
                            teamSortKey ===
                            (teamPointsMode === 'avg'
                              ? 'avgElims'
                              : teamPointsMode === 'max'
                              ? 'maxElims'
                              : 'totalElimsPoints')
                          }
                          dir={teamSortDir}
                        />
                      </span>
                    </th>

                    {/* Dynamic Point Column 2: Place Pts (Sum vs Avg vs Max) */}
                    <th
                      onClick={() =>
                        toggleTeamSort(
                          teamPointsMode === 'avg'
                            ? 'avgPlacePoints'
                            : teamPointsMode === 'max'
                            ? 'maxPlacePoints'
                            : 'totalPlacePoints'
                        )
                      }
                      className="ed-th text-center cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        {teamPointsMode === 'avg'
                          ? 'Avg Place/M'
                          : teamPointsMode === 'max'
                          ? 'Max Place'
                          : 'Place Pts'}
                        <SortIcon
                          active={
                            teamSortKey ===
                            (teamPointsMode === 'avg'
                              ? 'avgPlacePoints'
                              : teamPointsMode === 'max'
                              ? 'maxPlacePoints'
                              : 'totalPlacePoints')
                          }
                          dir={teamSortDir}
                        />
                      </span>
                    </th>

                    {/* Dynamic Point Column 3: Total Points (Sum vs Avg vs Max) */}
                    <th
                      onClick={() =>
                        toggleTeamSort(
                          teamPointsMode === 'avg'
                            ? 'avgTotalPoints'
                            : teamPointsMode === 'max'
                            ? 'maxTotalPoints'
                            : 'totalPoints'
                        )
                      }
                      className="ed-th px-6 text-right font-black text-(--ed-ink) cursor-pointer hover:text-(--ed-blue) select-none group whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-end gap-1">
                        {teamPointsMode === 'avg'
                          ? 'Total Pts/M'
                          : teamPointsMode === 'max'
                          ? 'Max Pts'
                          : 'Total Pts'}
                        <SortIcon
                          active={
                            teamSortKey ===
                            (teamPointsMode === 'avg'
                              ? 'avgTotalPoints'
                              : teamPointsMode === 'max'
                              ? 'maxTotalPoints'
                              : 'totalPoints')
                          }
                          dir={teamSortDir}
                        />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--ed-hair) font-mono">
                  {filteredTeams.map((t, idx) => (
                    <tr key={t.teamId} className="transition-colors hover:bg-(--ed-canvas)">
                      <td className="num px-5 py-3 text-(--ed-stone) font-sans whitespace-nowrap">{String(idx + 1).padStart(2, '0')}</td>
                      <td className="py-3 font-sans whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {t.teamSlug ? (
                            <Link
                              href={`/teams/${t.teamSlug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-bold text-(--ed-ink) hover:text-(--ed-blue) hover:underline transition-colors"
                            >
                              {t.teamName}
                            </Link>
                          ) : (
                            <span className="text-sm font-bold text-(--ed-ink)">{t.teamName}</span>
                          )}
                          {t.teamTag && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              [{t.teamTag}]
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="num px-3 py-3 text-center text-(--ed-stone) whitespace-nowrap">{t.matchesPlayed}</td>
                      <td className="num px-3 py-3 text-center font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        {t.wwcdCount > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> {t.wwcdCount}
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="num px-3 py-3 text-center text-(--ed-stone) whitespace-nowrap">{t.winRate}%</td>
                      <td className="num px-3 py-3 text-center font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {t.top5Count}
                      </td>
                      <td className="num px-3 py-3 text-center text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {t.midCount}
                      </td>
                      <td className="num px-3 py-3 text-center text-slate-400 whitespace-nowrap">
                        {t.bottomCount}
                      </td>

                      {/* Dynamic Point Column 1: Elims */}
                      <td className="num px-3 py-3 text-center font-bold text-(--ed-magenta) whitespace-nowrap">
                        {teamPointsMode === 'avg'
                          ? t.avgElims
                          : teamPointsMode === 'max'
                          ? t.maxElims
                          : t.totalElimsPoints}
                      </td>

                      {/* Dynamic Point Column 2: Place Pts */}
                      <td className="num px-3 py-3 text-center text-(--ed-stone) whitespace-nowrap">
                        {teamPointsMode === 'avg'
                          ? t.avgPlacePoints
                          : teamPointsMode === 'max'
                          ? t.maxPlacePoints
                          : t.totalPlacePoints}
                      </td>

                      {/* Dynamic Point Column 3: Total Points */}
                      <td className="num px-6 py-3 text-right font-black text-sm text-(--ed-ink) whitespace-nowrap">
                        {teamPointsMode === 'avg'
                          ? t.avgTotalPoints
                          : teamPointsMode === 'max'
                          ? t.maxTotalPoints
                          : t.totalPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredTeams.length === 0 && (
              <div className="p-12 text-center text-xs text-(--ed-stone)">
                No team records match the current filter.
              </div>
            )}
          </div>

          {/* Map Breakdown Cards (Requirement 6) */}
          {selectedMap === 'ALL' && mapsList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-(--ed-blue)" />
                <h4 className="text-xs font-black uppercase tracking-wider text-(--ed-ink)">
                  Map-by-Map Performance Highlights
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mapsList.map((mapName) => {
                  // Find top performer on this map
                  const teamsOnMap = teamRows
                    .map((t) => {
                      const m = t.mapStats[mapName];
                      if (!m || m.matchesPlayed === 0) return null;
                      return {
                        teamName: t.teamName,
                        teamTag: t.teamTag,
                        matches: m.matchesPlayed,
                        wwcd: m.wwcdCount,
                        elims: m.elims,
                        points: m.totalPoints,
                        ptsPerMatch: Number((m.totalPoints / m.matchesPlayed).toFixed(2)),
                      };
                    })
                    .filter((x): x is NonNullable<typeof x> => x !== null)
                    .sort((a, b) => b.points - a.points || b.wwcd - a.wwcd || b.elims - a.elims);

                  const bestTeam = teamsOnMap[0];

                  return (
                    <div
                      key={mapName}
                      className="ed-card p-4 space-y-3 hover:border-(--ed-blue)/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-sm font-bold text-(--ed-ink) flex items-center gap-1.5">
                          🗺️ {mapName}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-(--ed-stone)">
                          {bestTeam ? `${bestTeam.matches} matches` : '0 matches'}
                        </span>
                      </div>

                      {bestTeam ? (
                        <div className="space-y-1.5 pt-2 border-t border-(--ed-hair)">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Map Leader
                          </span>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-(--ed-ink) truncate max-w-[160px]">
                              {bestTeam.teamName}
                            </span>
                            <span className="font-mono text-xs font-black text-amber-600 dark:text-amber-400">
                              {bestTeam.wwcd} WWCD · {bestTeam.points} Pts
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-(--ed-stone) pt-1">
                            <span>{bestTeam.ptsPerMatch} Pts/M</span>
                            <span>{bestTeam.elims} Elims</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic pt-2 border-t border-(--ed-hair)">
                          No match data on this map yet.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
