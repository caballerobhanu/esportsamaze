'use client';

import React, { useState, useTransition, useMemo } from 'react';
import {
  Shield,
  Users,
  Save,
  Trash2,
  Check,
  Loader2,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Flame,
} from 'lucide-react';
import { getPlacementPoints } from '@/lib/tournament-math';
import {
  updateInlineTeamResultAction,
  batchUpdateTeamResultsAction,
  updateInlinePlayerStatAction,
  batchUpdatePlayerStatsAction,
  deleteInlineTeamResultAction,
  deleteInlinePlayerStatAction,
  type InlineTeamResultUpdateInput,
  type InlinePlayerStatUpdateInput,
} from '@/app/admin/(panel)/matches/actions';

interface TeamResultRow {
  id: string;
  teamId: string;
  shortCode?: string | null;
  rank: number;
  wwcd: boolean;
  placePoints: number;
  elimsPoints: number;
  bonusPoints: number;
  totalPoints: number;
  damage: number;
  smokesUsed: number;
  rescues: number;
  team: {
    id?: string;
    name: string;
    tag?: string | null;
    logoUrl?: string | null;
  };
}

interface PlayerStatRow {
  id: string;
  playerId: string;
  teamId?: string | null;
  shortCode?: string | null;
  role?: string | null;
  playerElims: number;
  damage: number;
  survivalTime: number;
  healing: number;
  damageReceived: number;
  knockouts?: number;
  assists?: number;
  vehicleElims?: number;
  grenadeElims?: number;
  isMvp: boolean;
  player: {
    id?: string;
    ign: string;
    avatarUrl?: string | null;
  };
  team?: {
    id?: string;
    name: string;
    tag?: string | null;
  } | null;
}

interface Props {
  matchId: string;
  matchGameId: string;
  initialTeamResults: TeamResultRow[];
  initialPlayerStats: PlayerStatRow[];
  pointsMatrix?: Record<number, number>;
  killMultiplier?: number;
}

export function MatchInlineScorecardEditor({
  matchId,
  matchGameId,
  initialTeamResults,
  initialPlayerStats,
  pointsMatrix,
  killMultiplier = 1,
}: Props) {
  // --- Team Results State ---
  const [teamResults, setTeamResults] = useState<TeamResultRow[]>(initialTeamResults);
  const [dirtyTeamIds, setDirtyTeamIds] = useState<Set<string>>(new Set());
  const [savingTeamIds, setSavingTeamIds] = useState<Set<string>>(new Set());
  const [savedTeamIds, setSavedTeamIds] = useState<Set<string>>(new Set());
  const [teamSearch, setTeamSearch] = useState('');

  // --- Player Stats State ---
  const [playerStats, setPlayerStats] = useState<PlayerStatRow[]>(initialPlayerStats);
  const [dirtyPlayerIds, setDirtyPlayerIds] = useState<Set<string>>(new Set());
  const [savingPlayerIds, setSavingPlayerIds] = useState<Set<string>>(new Set());
  const [savedPlayerIds, setSavedPlayerIds] = useState<Set<string>>(new Set());
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerTeamFilter, setPlayerTeamFilter] = useState('ALL');

  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sync with initial props only when nothing is locally dirty — a parent
  // refresh (router.refresh after another admin action) must never silently
  // discard unsaved edits. The dirty sets are read through refs so that
  // clearing them after a save does NOT re-trigger a reset from stale props.
  const dirtyTeamRef = React.useRef(dirtyTeamIds);
  dirtyTeamRef.current = dirtyTeamIds;
  const dirtyPlayerRef = React.useRef(dirtyPlayerIds);
  dirtyPlayerRef.current = dirtyPlayerIds;

  React.useEffect(() => {
    if (dirtyTeamRef.current.size === 0) {
      setTeamResults(initialTeamResults);
    }
  }, [initialTeamResults]);

  React.useEffect(() => {
    if (dirtyPlayerRef.current.size === 0) {
      setPlayerStats(initialPlayerStats);
    }
  }, [initialPlayerStats]);

  // ──────────────────────────────────────────────────────────────────────────
  // Team Results Handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handleTeamFieldChange = (
    id: string,
    field: keyof TeamResultRow,
    value: any
  ) => {
    setTeamResults((prev) =>
      prev.map((tr) => {
        if (tr.id !== id) return tr;

        const updated = { ...tr, [field]: value };

        // Auto recalculate placement points if rank changes
        if (field === 'rank') {
          const rankNum = Number(value) || 1;
          const autoPlace = getPlacementPoints(rankNum, pointsMatrix);
          updated.rank = rankNum;
          updated.placePoints = autoPlace;
          updated.wwcd = rankNum === 1;
          updated.totalPoints = autoPlace + (updated.elimsPoints || 0) + (updated.bonusPoints || 0);
        } else if (field === 'placePoints' || field === 'elimsPoints' || field === 'bonusPoints') {
          const place = field === 'placePoints' ? Number(value) || 0 : tr.placePoints;
          const elims = field === 'elimsPoints' ? Number(value) || 0 : tr.elimsPoints;
          const bonus = field === 'bonusPoints' ? Number(value) || 0 : tr.bonusPoints;
          updated.totalPoints = place + elims + bonus;
        }

        return updated;
      })
    );

    setDirtyTeamIds((prev) => new Set(prev).add(id));
  };

  const handleSaveTeamRow = async (tr: TeamResultRow) => {
    setSavingTeamIds((prev) => new Set(prev).add(tr.id));
    try {
      await updateInlineTeamResultAction({
        id: tr.id,
        rank: tr.rank,
        wwcd: tr.wwcd,
        placePoints: tr.placePoints,
        elimsPoints: tr.elimsPoints,
        bonusPoints: tr.bonusPoints,
        damage: tr.damage,
        smokesUsed: tr.smokesUsed,
        rescues: tr.rescues,
        shortCode: tr.shortCode,
      });

      setDirtyTeamIds((prev) => {
        const next = new Set(prev);
        next.delete(tr.id);
        return next;
      });

      setSavedTeamIds((prev) => new Set(prev).add(tr.id));
      setTimeout(() => {
        setSavedTeamIds((prev) => {
          const next = new Set(prev);
          next.delete(tr.id);
          return next;
        });
      }, 2500);
    } catch (err) {
      console.error('Failed to save team row:', err);
      alert('Failed to save team result row.');
    } finally {
      setSavingTeamIds((prev) => {
        const next = new Set(prev);
        next.delete(tr.id);
        return next;
      });
    }
  };

  const handleSaveAllTeams = async () => {
    if (dirtyTeamIds.size === 0) return;
    const dirtyRows = teamResults.filter((tr) => dirtyTeamIds.has(tr.id));

    startTransition(async () => {
      try {
        await batchUpdateTeamResultsAction(
          dirtyRows.map((tr) => ({
            id: tr.id,
            rank: tr.rank,
            wwcd: tr.wwcd,
            placePoints: tr.placePoints,
            elimsPoints: tr.elimsPoints,
            bonusPoints: tr.bonusPoints,
            damage: tr.damage,
            smokesUsed: tr.smokesUsed,
            rescues: tr.rescues,
            shortCode: tr.shortCode,
          }))
        );

        setDirtyTeamIds(new Set());
        setStatusMessage(`Successfully updated ${dirtyRows.length} team results!`);
        setTimeout(() => setStatusMessage(null), 3500);
      } catch (err) {
        console.error('Batch save teams error:', err);
        alert('Failed to save team changes.');
      }
    });
  };

  const handleDeleteTeamRow = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete result for ${name}?`)) return;

    try {
      await deleteInlineTeamResultAction(id);
      setTeamResults((prev) => prev.filter((r) => r.id !== id));
      setDirtyTeamIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error('Failed to delete team row:', err);
      alert('Failed to delete team row.');
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Player Stats Handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handlePlayerFieldChange = (
    id: string,
    field: keyof PlayerStatRow,
    value: any
  ) => {
    setPlayerStats((prev) =>
      prev.map((ps) => {
        if (ps.id !== id) return ps;
        return { ...ps, [field]: value };
      })
    );
    setDirtyPlayerIds((prev) => new Set(prev).add(id));
  };

  const handleSavePlayerRow = async (ps: PlayerStatRow) => {
    setSavingPlayerIds((prev) => new Set(prev).add(ps.id));
    try {
      await updateInlinePlayerStatAction({
        id: ps.id,
        playerElims: Number(ps.playerElims) || 0,
        damage: Number(ps.damage) || 0,
        survivalTime: Number(ps.survivalTime) || 0,
        healing: Number(ps.healing) || 0,
        damageReceived: Number(ps.damageReceived) || 0,
        knockouts: Number(ps.knockouts) || 0,
        assists: Number(ps.assists) || 0,
        vehicleElims: Number(ps.vehicleElims) || 0,
        grenadeElims: Number(ps.grenadeElims) || 0,
        isMvp: !!ps.isMvp,
        role: ps.role,
      });

      setDirtyPlayerIds((prev) => {
        const next = new Set(prev);
        next.delete(ps.id);
        return next;
      });

      setSavedPlayerIds((prev) => new Set(prev).add(ps.id));
      setTimeout(() => {
        setSavedPlayerIds((prev) => {
          const next = new Set(prev);
          next.delete(ps.id);
          return next;
        });
      }, 2500);
    } catch (err) {
      console.error('Failed to save player row:', err);
      alert('Failed to save player row.');
    } finally {
      setSavingPlayerIds((prev) => {
        const next = new Set(prev);
        next.delete(ps.id);
        return next;
      });
    }
  };

  const handleSaveAllPlayers = async () => {
    if (dirtyPlayerIds.size === 0) return;
    const dirtyRows = playerStats.filter((ps) => dirtyPlayerIds.has(ps.id));

    startTransition(async () => {
      try {
        await batchUpdatePlayerStatsAction(
          dirtyRows.map((ps) => ({
            id: ps.id,
            playerElims: Number(ps.playerElims) || 0,
            damage: Number(ps.damage) || 0,
            survivalTime: Number(ps.survivalTime) || 0,
            healing: Number(ps.healing) || 0,
            damageReceived: Number(ps.damageReceived) || 0,
            knockouts: Number(ps.knockouts) || 0,
            assists: Number(ps.assists) || 0,
            vehicleElims: Number(ps.vehicleElims) || 0,
            grenadeElims: Number(ps.grenadeElims) || 0,
            isMvp: !!ps.isMvp,
            role: ps.role,
          }))
        );

        setDirtyPlayerIds(new Set());
        setStatusMessage(`Successfully updated ${dirtyRows.length} player stats!`);
        setTimeout(() => setStatusMessage(null), 3500);
      } catch (err) {
        console.error('Batch save players error:', err);
        alert('Failed to save player changes.');
      }
    });
  };

  const handleDeletePlayerRow = async (id: string, ign: string) => {
    if (!confirm(`Are you sure you want to delete performance stat for ${ign}?`)) return;

    try {
      await deleteInlinePlayerStatAction(id);
      setPlayerStats((prev) => prev.filter((p) => p.id !== id));
      setDirtyPlayerIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error('Failed to delete player row:', err);
      alert('Failed to delete player row.');
    }
  };

  // Filtered lists
  const filteredTeams = useMemo(() => {
    const q = teamSearch.toLowerCase().trim();
    if (!q) return teamResults;
    return teamResults.filter(
      (tr) =>
        tr.team.name.toLowerCase().includes(q) ||
        (tr.team.tag && tr.team.tag.toLowerCase().includes(q)) ||
        (tr.shortCode && tr.shortCode.toLowerCase().includes(q))
    );
  }, [teamResults, teamSearch]);

  const uniquePlayerTeams = useMemo(() => {
    const set = new Set<string>();
    playerStats.forEach((p) => {
      if (p.team?.name) set.add(p.team.name);
    });
    return Array.from(set).sort();
  }, [playerStats]);

  const filteredPlayers = useMemo(() => {
    const q = playerSearch.toLowerCase().trim();
    return playerStats.filter((ps) => {
      const matchSearch =
        !q ||
        ps.player.ign.toLowerCase().includes(q) ||
        (ps.team?.name && ps.team.name.toLowerCase().includes(q)) ||
        (ps.team?.tag && ps.team.tag.toLowerCase().includes(q));

      const matchTeam =
        playerTeamFilter === 'ALL' || (ps.team?.name && ps.team.name === playerTeamFilter);

      return matchSearch && matchTeam;
    });
  }, [playerStats, playerSearch, playerTeamFilter]);

  const inputCls =
    'px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-center';

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. ROW-WISE EDITABLE TEAM RESULTS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        id="team-results"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-5 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-(--ed-blue) dark:text-blue-400 flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> 2. Team Match Results ({teamResults.length} recorded)
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Edit placement rank, points, elims, or damage directly in the table. Changes calculate live.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                placeholder="Search team…"
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-(--ed-blue) w-36 sm:w-48"
              />
            </div>

            {dirtyTeamIds.size > 0 && (
              <button
                type="button"
                onClick={handleSaveAllTeams}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm animate-pulse cursor-pointer"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save All ({dirtyTeamIds.size})
              </button>
            )}
          </div>
        </div>

        {teamResults.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            No team results recorded yet for this match. Use the Batch Importer above to paste or import results.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2.5 px-2 text-center w-16">Rank</th>
                  <th className="py-2.5 px-2 text-center w-12">🍗</th>
                  <th className="py-2.5 px-3 text-left">Team</th>
                  <th className="py-2.5 px-2 text-center w-20">Place Pts</th>
                  <th className="py-2.5 px-2 text-center w-20">Elims Pts</th>
                  <th className="py-2.5 px-2 text-center w-16">Bonus</th>
                  <th className="py-2.5 px-2 text-center w-20 font-bold text-(--ed-blue)">Total</th>
                  <th className="py-2.5 px-2 text-center w-24">Damage</th>
                  <th className="py-2.5 px-2 text-center w-16">Smokes</th>
                  <th className="py-2.5 px-2 text-center w-16">Rescues</th>
                  <th className="py-2.5 px-2 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTeams.map((tr) => {
                  const isDirty = dirtyTeamIds.has(tr.id);
                  const isSaving = savingTeamIds.has(tr.id);
                  const isSaved = savedTeamIds.has(tr.id);

                  return (
                    <tr
                      key={tr.id}
                      className={`transition-colors ${
                        isDirty
                          ? 'bg-amber-500/5 dark:bg-amber-500/10'
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min={1}
                          max={32}
                          value={tr.rank}
                          onChange={(e) => handleTeamFieldChange(tr.id, 'rank', e.target.value)}
                          className={`${inputCls} w-12 font-bold`}
                        />
                      </td>

                      {/* WWCD */}
                      <td className="py-1.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleTeamFieldChange(tr.id, 'wwcd', !tr.wwcd)}
                          className={`w-6 h-6 rounded-md text-xs inline-flex items-center justify-center transition-all ${
                            tr.wwcd
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold scale-110'
                              : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'
                          }`}
                          title={tr.wwcd ? 'Winner (WWCD)' : 'Mark as Winner'}
                        >
                          🍗
                        </button>
                      </td>

                      {/* Team Name */}
                      <td className="py-1.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {tr.team.name}
                          </span>
                          {(tr.shortCode || tr.team.tag) && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {tr.shortCode || tr.team.tag}
                            </span>
                          )}
                          {isDirty && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          )}
                        </div>
                      </td>

                      {/* Place Points */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min={0}
                          value={tr.placePoints}
                          onChange={(e) => handleTeamFieldChange(tr.id, 'placePoints', e.target.value)}
                          className={`${inputCls} w-14`}
                        />
                      </td>

                      {/* Elims Points */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min={0}
                          value={tr.elimsPoints}
                          onChange={(e) => handleTeamFieldChange(tr.id, 'elimsPoints', e.target.value)}
                          className={`${inputCls} w-14 font-semibold`}
                        />
                      </td>

                      {/* Bonus Points */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min={0}
                          value={tr.bonusPoints || 0}
                          onChange={(e) => handleTeamFieldChange(tr.id, 'bonusPoints', e.target.value)}
                          className={`${inputCls} w-12 text-slate-500`}
                        />
                      </td>

                      {/* Total Points (Live calculated) */}
                      <td className="py-1.5 px-2 text-center font-mono font-black text-(--ed-blue) dark:text-blue-400 text-sm">
                        {tr.totalPoints}
                      </td>

                      {/* Damage */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min={0}
                          value={tr.damage}
                          onChange={(e) => handleTeamFieldChange(tr.id, 'damage', e.target.value)}
                          className={`${inputCls} w-20 text-slate-600 dark:text-slate-300`}
                        />
                      </td>

                      {/* Smokes */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min={0}
                          value={tr.smokesUsed}
                          onChange={(e) => handleTeamFieldChange(tr.id, 'smokesUsed', e.target.value)}
                          className={`${inputCls} w-12 text-slate-400`}
                        />
                      </td>

                      {/* Rescues */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min={0}
                          value={tr.rescues}
                          onChange={(e) => handleTeamFieldChange(tr.id, 'rescues', e.target.value)}
                          className={`${inputCls} w-12 text-slate-400`}
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-1.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isSaved ? (
                            <span className="p-1 text-emerald-500 flex items-center gap-0.5 text-[10px] font-bold">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSaveTeamRow(tr)}
                              disabled={isSaving || !isDirty}
                              className={`p-1.5 rounded transition-colors cursor-pointer ${
                                isDirty
                                  ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-bold'
                                  : 'text-slate-300 dark:text-slate-700 cursor-default opacity-40'
                              }`}
                              title={isDirty ? 'Save row changes' : 'No unsaved changes'}
                            >
                              {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteTeamRow(tr.id, tr.team.name)}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete this team result"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. ROW-WISE EDITABLE PLAYER STATS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        id="player-stats"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-5 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-(--ed-blue) dark:text-blue-400 flex items-center gap-1.5">
              <Users className="w-4 h-4" /> 3. Individual Player Stats ({playerStats.length} recorded)
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Directly edit elims, damage, survival, or MVP for any player. Fast inline updates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {uniquePlayerTeams.length > 1 && (
              <select
                value={playerTeamFilter}
                onChange={(e) => setPlayerTeamFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none"
              >
                <option value="ALL">All Teams ({uniquePlayerTeams.length})</option>
                {uniquePlayerTeams.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                placeholder="Search player / team…"
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-(--ed-blue) w-36 sm:w-48"
              />
            </div>

            {dirtyPlayerIds.size > 0 && (
              <button
                type="button"
                onClick={handleSaveAllPlayers}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm animate-pulse cursor-pointer"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save All ({dirtyPlayerIds.size})
              </button>
            )}
          </div>
        </div>

        {playerStats.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            No player stats recorded yet. Use the Batch Importer or the form below to add player performances.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800 max-h-[32rem] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 shadow-sm">
                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2.5 px-3 text-left">Player (IGN)</th>
                  <th className="py-2.5 px-3 text-left">Team</th>
                  <th className="py-2.5 px-2 text-center w-12">MVP</th>
                  <th className="py-2.5 px-2 text-center w-20 font-bold text-rose-500">Elims</th>
                  <th className="py-2.5 px-2 text-center w-24">Damage</th>
                  <th className="py-2.5 px-2 text-center w-20">Survival (s)</th>
                  <th className="py-2.5 px-2 text-center w-20">Healing</th>
                  <th className="py-2.5 px-2 text-center w-20">Dmg Rec</th>
                  <th className="py-2.5 px-2 text-center w-16">Knocks</th>
                  <th className="py-2.5 px-2 text-center w-16">Assists</th>
                  <th className="py-2.5 px-2 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPlayers.map((ps) => {
                  const isDirty = dirtyPlayerIds.has(ps.id);
                  const isSaving = savingPlayerIds.has(ps.id);
                  const isSaved = savedPlayerIds.has(ps.id);

                  return (
                    <tr
                      key={ps.id}
                      className={`transition-colors ${
                        isDirty
                          ? 'bg-amber-500/5 dark:bg-amber-500/10'
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      {/* Player IGN */}
                      <td className="py-1.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {ps.player.ign}
                          </span>
                          {isDirty && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          )}
                        </div>
                      </td>

                      {/* Team */}
                      <td className="py-1.5 px-3 text-slate-500">
                        {ps.team?.name || '—'}
                      </td>

                      {/* MVP */}
                      <td className="py-1.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handlePlayerFieldChange(ps.id, 'isMvp', !ps.isMvp)}
                          className={`w-6 h-6 rounded-md text-xs inline-flex items-center justify-center transition-all ${
                            ps.isMvp
                              ? 'bg-amber-500/20 text-amber-500 font-bold scale-110'
                              : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'
                          }`}
                          title={ps.isMvp ? 'Match MVP' : 'Mark as MVP'}
                        >
                          ⭐
                        </button>
                      </td>

                      {/* Elims */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min={0}
                          value={ps.playerElims}
                          onChange={(e) => handlePlayerFieldChange(ps.id, 'playerElims', e.target.value)}
                          className={`${inputCls} w-14 font-black text-rose-600 dark:text-rose-400`}
                        />
                      </td>

                      {/* Damage */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min={0}
                          value={ps.damage}
                          onChange={(e) => handlePlayerFieldChange(ps.id, 'damage', e.target.value)}
                          className={`${inputCls} w-20 text-slate-700 dark:text-slate-200`}
                        />
                      </td>

                      {/* Survival (seconds) */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min={0}
                          value={ps.survivalTime}
                          onChange={(e) => handlePlayerFieldChange(ps.id, 'survivalTime', e.target.value)}
                          className={`${inputCls} w-16 text-slate-400`}
                          title={`${Math.floor(ps.survivalTime / 60)}m ${ps.survivalTime % 60}s`}
                        />
                      </td>

                      {/* Healing */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min={0}
                          value={ps.healing}
                          onChange={(e) => handlePlayerFieldChange(ps.id, 'healing', e.target.value)}
                          className={`${inputCls} w-14 text-emerald-600 dark:text-emerald-400`}
                        />
                      </td>

                      {/* Damage Received */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min={0}
                          value={ps.damageReceived}
                          onChange={(e) => handlePlayerFieldChange(ps.id, 'damageReceived', e.target.value)}
                          className={`${inputCls} w-16 text-amber-600 dark:text-amber-400`}
                        />
                      </td>

                      {/* Knockouts */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min={0}
                          value={ps.knockouts || 0}
                          onChange={(e) => handlePlayerFieldChange(ps.id, 'knockouts', e.target.value)}
                          className={`${inputCls} w-12 text-slate-500`}
                        />
                      </td>

                      {/* Assists */}
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min={0}
                          value={ps.assists || 0}
                          onChange={(e) => handlePlayerFieldChange(ps.id, 'assists', e.target.value)}
                          className={`${inputCls} w-12 text-slate-500`}
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-1.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isSaved ? (
                            <span className="p-1 text-emerald-500 flex items-center gap-0.5 text-[10px] font-bold">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSavePlayerRow(ps)}
                              disabled={isSaving || !isDirty}
                              className={`p-1.5 rounded transition-colors cursor-pointer ${
                                isDirty
                                  ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-bold'
                                  : 'text-slate-300 dark:text-slate-700 cursor-default opacity-40'
                              }`}
                              title={isDirty ? 'Save row changes' : 'No unsaved changes'}
                            >
                              {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeletePlayerRow(ps.id, ps.player.ign)}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete this player stat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
    </div>
  );
}
