'use client';

import React, { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import {
  Search,
  Trash2,
  Pencil,
  Merge,
  Filter,
  CheckSquare,
  Square,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react';
import { bulkDeletePlayersAction, mergePlayersAction, togglePlayerVerificationAction, batchVerifyPlayersAction } from '@/app/admin/(panel)/players/actions';

export interface PlayerRowItem {
  id: string;
  ign: string;
  slug: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  status: string;
  isVerified?: boolean;
  isPlayer: boolean;
  staffRole: string | null;
  currentTeam: {
    id: string;
    name: string;
    tag: string | null;
  } | null;
  game: {
    id: string;
    name: string;
  } | null;
  _count?: {
    matchStats?: number;
    transferHistory?: number;
  };
}

interface PlayersManagerTableProps {
  players: PlayerRowItem[];
  deletePlayerAction: (formData: FormData) => Promise<void>;
}

export function PlayersManagerTable({ players, deletePlayerAction }: PlayersManagerTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [viewFilter, setViewFilter] = useState<'ALL' | 'UNASSIGNED' | 'AUTO_SLUG' | 'UNVERIFIED' | 'NO_STATS'>('ALL');
  const [isProcessing, startTransition] = useTransition();

  // Merge modal state
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [sourcePlayerId, setSourcePlayerId] = useState<string | null>(null);
  const [targetPlayerId, setTargetPlayerId] = useState<string>('');
  const [mergeSearch, setMergeSearch] = useState('');

  // Extract unique teams for dropdown
  const uniqueTeams = useMemo(() => {
    const map = new Map<string, string>();
    players.forEach((p) => {
      if (p.currentTeam) {
        map.set(p.currentTeam.id, p.currentTeam.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [players]);

  // Filter logic
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesIgn = p.ign.toLowerCase().includes(q);
        const matchesSlug = (p.slug || '').toLowerCase().includes(q);
        const matchesName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase().includes(q);
        const matchesTeam = (p.currentTeam?.name || '').toLowerCase().includes(q);
        if (!matchesIgn && !matchesSlug && !matchesName && !matchesTeam) return false;
      }

      // Team filter
      if (teamFilter !== 'ALL') {
        if (p.currentTeam?.id !== teamFilter) return false;
      }

      // View quick filter
      if (viewFilter === 'UNASSIGNED') {
        if (p.currentTeam) return false;
      } else if (viewFilter === 'AUTO_SLUG') {
        // Slugs generated like `name-1234`
        if (!p.slug || !/-\d{4}$/.test(p.slug)) return false;
      } else if (viewFilter === 'UNVERIFIED') {
        if (p.isVerified !== false && p.status !== 'UNVERIFIED') return false;
      } else if (viewFilter === 'NO_STATS') {
        if ((p._count?.matchStats ?? 0) > 0) return false;
      }

      return true;
    });
  }, [players, search, teamFilter, viewFilter]);

  const toggleSelectAllVisible = () => {
    const next = new Set(selectedIds);
    const allVisibleSelected = filteredPlayers.length > 0 && filteredPlayers.every((p) => next.has(p.id));

    if (allVisibleSelected) {
      filteredPlayers.forEach((p) => next.delete(p.id));
    } else {
      filteredPlayers.forEach((p) => next.add(p.id));
    }
    setSelectedIds(next);
  };

  const handleBulkDelete = (cascade: boolean) => {
    if (selectedIds.size === 0) return;
    const confirmMsg = cascade
      ? `FORCE DELETE ${selectedIds.size} PLAYERS?\n\nThis will PERMANENTLY remove these players AND CASCADE-DELETE all their linked match statistics, rankings, and transfer records. This cannot be undone.`
      : `Delete ${selectedIds.size} players?\n\n(Only players with 0 attached match statistics will be removed. Players with linked matches will be preserved.)`;

    if (!confirm(confirmMsg)) return;

    startTransition(async () => {
      const res = await bulkDeletePlayersAction(Array.from(selectedIds), cascade);
      if (res.success) {
        setSelectedIds(new Set());
      } else {
        alert(res.message || 'Bulk delete failed');
      }
    });
  };

  const openMergeModal = (sourceId: string) => {
    setSourcePlayerId(sourceId);
    setTargetPlayerId('');
    setMergeSearch('');
    setMergeModalOpen(true);
  };

  const handleMergeSubmit = () => {
    if (!sourcePlayerId || !targetPlayerId || sourcePlayerId === targetPlayerId) return;

    const source = players.find((p) => p.id === sourcePlayerId);
    const target = players.find((p) => p.id === targetPlayerId);

    if (
      !confirm(
        `Merge "${source?.ign}" into "${target?.ign}"?\n\nAll match statistics, kills, damage, and transfers of "${source?.ign}" will be transferred to "${target?.ign}". "${source?.ign}" will then be deleted.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await mergePlayersAction(sourcePlayerId, targetPlayerId);
      if (res.success) {
        setMergeModalOpen(false);
        setSourcePlayerId(null);
      } else {
        alert(res.message || 'Merge failed');
      }
    });
  };

  // Candidate targets for merge modal
  const mergeCandidateTargets = useMemo(() => {
    if (!sourcePlayerId) return [];
    return players
      .filter((p) => p.id !== sourcePlayerId)
      .filter((p) => {
        if (!mergeSearch.trim()) return true;
        const q = mergeSearch.toLowerCase();
        return (
          p.ign.toLowerCase().includes(q) ||
          (p.currentTeam?.name || '').toLowerCase().includes(q) ||
          (p.slug || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 30);
  }, [players, sourcePlayerId, mergeSearch]);

  return (
    <div className="space-y-4">
      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search IGN, team, slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
            />
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="w-full sm:w-52 py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
            >
              <option value="ALL">All Teams ({players.length} players)</option>
              {uniqueTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Quick Filters:</span>
          {[
            { key: 'ALL', label: `All (${players.length})` },
            {
              key: 'AUTO_SLUG',
              label: `Auto-Generated Slugs (${players.filter((p) => /-\d{4}$/.test(p.slug || '')).length})`,
            },
            {
              key: 'UNVERIFIED',
              label: `🛡️ Qualifier / Unverified (${players.filter((p) => p.isVerified === false || p.status === 'UNVERIFIED').length})`,
            },
            { key: 'UNASSIGNED', label: `No Team (${players.filter((p) => !p.currentTeam).length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setViewFilter(tab.key as any)}
              className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
                viewFilter === tab.key
                  ? 'bg-(--ed-blue) text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Players Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17]">
              <th className="py-2.5 px-3 text-center w-8">
                <input
                  type="checkbox"
                  checked={filteredPlayers.length > 0 && filteredPlayers.every((p) => selectedIds.has(p.id))}
                  onChange={toggleSelectAllVisible}
                  className="rounded border-slate-300 dark:border-slate-700 text-(--ed-blue) focus:ring-(--ed-blue) cursor-pointer"
                  title="Select all visible players"
                />
              </th>
              <th className="py-2.5 px-3 text-left">IGN &amp; Details</th>
              <th className="py-2.5 px-3 text-left">Current Team</th>
              <th className="py-2.5 px-3 text-left hidden sm:table-cell">Role</th>
              <th className="py-2.5 px-3 text-left hidden md:table-cell">Game</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredPlayers.map((p) => {
              const isSelected = selectedIds.has(p.id);
              const isAutoSlug = /-\d{4}$/.test(p.slug || '');

              return (
                <tr
                  key={p.id}
                  className={`transition-colors ${
                    isSelected ? 'bg-blue-50/60 dark:bg-blue-950/25' : 'hover:bg-slate-50 dark:hover:bg-[#121929]'
                  }`}
                >
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) next.add(p.id);
                        else next.delete(p.id);
                        setSelectedIds(next);
                      }}
                      className="rounded border-slate-300 dark:border-slate-700 text-(--ed-blue) focus:ring-(--ed-blue) cursor-pointer"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{p.ign}</span>
                      {isAutoSlug && (
                        <span
                          className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          title="Auto-created during bulk match matrix import"
                        >
                          Matrix Slug
                        </span>
                      )}
                      {p.staffRole && (
                        <span className="rounded bg-indigo-500/10 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider text-indigo-500">
                          {p.staffRole}
                        </span>
                      )}
                      {!p.isPlayer && (
                        <span className="rounded bg-slate-500/10 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider text-slate-500">
                          Staff only
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block">/{p.slug || p.id}</span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                    {p.currentTeam ? (
                      <span className="flex items-center gap-1">
                        <span>{p.currentTeam.name}</span>
                        {p.currentTeam.tag && (
                          <span className="text-[9px] text-slate-400 font-mono">[{p.currentTeam.tag}]</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal italic">Free Agent / Unassigned</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 hidden sm:table-cell">{p.role ?? '—'}</td>
                  <td className="py-2.5 px-3 text-slate-500 hidden md:table-cell">{p.game?.name ?? '—'}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                        p.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Verify / Promote Pro */}
                      {(p.isVerified === false || p.status === 'UNVERIFIED') && (
                        <button
                          type="button"
                          onClick={() => {
                            startTransition(async () => {
                              await togglePlayerVerificationAction(p.id, true);
                            });
                          }}
                          className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                          title="Promote to Verified Pro"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Merge into another player */}
                      <button
                        type="button"
                        onClick={() => openMergeModal(p.id)}
                        className="p-1 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                        title={`Merge "${p.ign}" into another player`}
                      >
                        <Merge className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit */}
                      <Link
                        href={`/admin/players?edit=${p.id}`}
                        className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-(--ed-blue) transition-colors"
                        title={`Edit ${p.ign}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>

                      {/* Single Delete */}
                      <form action={deletePlayerAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          onClick={(e) => {
                            if (!confirm(`Delete player "${p.ign}"?`)) {
                              e.preventDefault();
                            }
                          }}
                          className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title={`Delete ${p.ign}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredPlayers.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                  No matching players found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white shadow-2xl backdrop-blur-md border border-slate-700 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-bold font-mono">
              {selectedIds.size} player{selectedIds.size > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="h-4 w-[1px] bg-slate-700" />

          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Deselect
          </button>

          <div className="flex items-center gap-2">
            {/* Batch Verify */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                startTransition(async () => {
                  await batchVerifyPlayersAction(Array.from(selectedIds));
                  setSelectedIds(new Set());
                });
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
              title="Promote selected players to Verified Pro"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Verify Selected ({selectedIds.size})</span>
            </button>

            {/* Force Cascade Delete */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleBulkDelete(true)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
              title="Deletes players and all linked match stats / rankings"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Force Delete ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Player Merge Modal */}
      {mergeModalOpen && sourcePlayerId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Merge className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Merge Player: &quot;{players.find((p) => p.id === sourcePlayerId)?.ign}&quot;
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMergeModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Merging transfers all historical matches, eliminations, damage, and ranking points to the chosen Target
              Player, then permanently removes this duplicate record.
            </p>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Select Target Player to Keep:
              </label>
              <input
                type="text"
                placeholder="Type to filter target players..."
                value={mergeSearch}
                onChange={(e) => setMergeSearch(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
              />

              <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {mergeCandidateTargets.map((candidate) => {
                  const isSelected = targetPlayerId === candidate.id;
                  return (
                    <div
                      key={candidate.id}
                      onClick={() => setTargetPlayerId(candidate.id)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-(--ed-blue) text-white'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div>
                        <span className="font-bold block">{candidate.ign}</span>
                        <span className={`text-[10px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          Team: {candidate.currentTeam?.name || 'Unassigned'} · /{candidate.slug || candidate.id}
                        </span>
                      </div>
                      {isSelected && <UserCheck className="w-4 h-4" />}
                    </div>
                  );
                })}
                {mergeCandidateTargets.length === 0 && (
                  <div className="p-4 text-center text-slate-400 text-xs">No matching target players found.</div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMergeModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!targetPlayerId || isProcessing}
                onClick={handleMergeSubmit}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Merge className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Merging...' : 'Confirm Merge'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
