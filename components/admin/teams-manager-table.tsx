'use client';

import React, { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Pencil, Trash2, Copy, X, Shield, Users, Trophy } from 'lucide-react';
import { deleteTeamAction as deleteTeamServerAction } from '@/app/admin/(panel)/teams/actions';

export interface TeamRowItem {
  id: string;
  name: string;
  slug: string | null;
  displayName: string | null;
  tag: string | null;
  logoUrl: string | null;
  region: string | null;
  status: string;
  gameId: string | null;
  game: { id: string; name: string } | null;
  _count: {
    players: number;
    tournamentRosters: number;
  };
}

interface TeamsManagerTableProps {
  teams: TeamRowItem[];
  games: { id: string; name: string }[];
  deleteTeamAction: (formData: FormData) => Promise<void>;
  duplicateTeamAction: (formData: FormData) => Promise<void>;
}

export function TeamsManagerTable({
  teams,
  games,
  deleteTeamAction,
  duplicateTeamAction,
}: TeamsManagerTableProps) {
  const [search, setSearch] = useState('');
  const [gameFilter, setGameFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'WITH_TAG' | 'NO_TAG' | 'ACTIVE'>('ALL');
  const [isProcessing, startTransition] = useTransition();
  const [teamToDelete, setTeamToDelete] = useState<{ id: string; name: string } | null>(null);

  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesDisplay = (t.displayName || '').toLowerCase().includes(q);
        const matchesSlug = (t.slug || '').toLowerCase().includes(q);
        const matchesTag = (t.tag || '').toLowerCase().includes(q);
        const matchesRegion = (t.region || '').toLowerCase().includes(q);
        const matchesGame = (t.game?.name || '').toLowerCase().includes(q);

        if (!matchesName && !matchesDisplay && !matchesSlug && !matchesTag && !matchesRegion && !matchesGame) {
          return false;
        }
      }

      // Game dropdown
      if (gameFilter !== 'ALL') {
        if (t.gameId !== gameFilter) return false;
      }

      // Status dropdown
      if (statusFilter !== 'ALL') {
        if (t.status !== statusFilter) return false;
      }

      // Quick filter
      if (quickFilter === 'WITH_TAG') {
        if (!t.tag) return false;
      } else if (quickFilter === 'NO_TAG') {
        if (t.tag) return false;
      } else if (quickFilter === 'ACTIVE') {
        if (t.status !== 'ACTIVE') return false;
      }

      return true;
    });
  }, [teams, search, gameFilter, statusFilter, quickFilter]);

  const hasActiveFilters = search.trim() !== '' || gameFilter !== 'ALL' || statusFilter !== 'ALL' || quickFilter !== 'ALL';

  const resetFilters = () => {
    setSearch('');
    setGameFilter('ALL');
    setStatusFilter('ALL');
    setQuickFilter('ALL');
  };

  const withTagCount = useMemo(() => teams.filter((t) => Boolean(t.tag)).length, [teams]);
  const noTagCount = useMemo(() => teams.filter((t) => !t.tag).length, [teams]);
  const activeCount = useMemo(() => teams.filter((t) => t.status === 'ACTIVE').length, [teams]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Controls */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by team name, short code, slug, region..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Game Filter */}
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              className="py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
              aria-label="Filter by Game"
            >
              <option value="ALL">All Games ({teams.length})</option>
              {games.map((g) => {
                const count = teams.filter((t) => t.gameId === g.id).length;
                return (
                  <option key={g.id} value={g.id}>
                    {g.name} ({count})
                  </option>
                );
              })}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
              aria-label="Filter by Status"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="DISBANDED">DISBANDED</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Tabs & Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Filter:
            </span>
            {[
              { key: 'ALL', label: `All (${teams.length})` },
              { key: 'WITH_TAG', label: `With Short Code (${withTagCount})` },
              { key: 'NO_TAG', label: `Missing Short Code (${noTagCount})` },
              { key: 'ACTIVE', label: `Active (${activeCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setQuickFilter(tab.key as any)}
                className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
                  quickFilter === tab.key
                    ? 'bg-(--ed-blue) text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-900 dark:text-white font-mono">{filteredTeams.length}</strong> of{' '}
              <strong className="text-slate-900 dark:text-white font-mono">{teams.length}</strong> teams
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] font-semibold text-(--ed-blue) hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Teams Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17]">
              <th className="py-2.5 px-3 text-left">Team</th>
              <th className="py-2.5 px-3 text-left">Short Code</th>
              <th className="py-2.5 px-3 text-left hidden md:table-cell">Game</th>
              <th className="py-2.5 px-3 text-left hidden sm:table-cell">Region</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-center">Players</th>
              <th className="py-2.5 px-3 text-center hidden sm:table-cell">Events</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredTeams.map((t) => (
              <tr
                key={t.id}
                className="hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors group"
              >
                {/* Team Identity */}
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2.5">
                    {t.logoUrl ? (
                      <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
                        <img
                          src={t.logoUrl}
                          alt={t.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center text-slate-400">
                        <Shield className="w-3.5 h-3.5 opacity-60" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {t.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {t.displayName && t.displayName !== t.name ? `${t.displayName} • ` : ''}
                        <span className="font-mono text-[10px] text-slate-400/80">/{t.slug || t.id}</span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Short Code / Tag */}
                <td className="py-2.5 px-3">
                  {t.tag ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                      {t.tag}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">— None —</span>
                  )}
                </td>

                {/* Game */}
                <td className="py-2.5 px-3 text-slate-500 hidden md:table-cell text-xs">
                  {t.game?.name ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                      {t.game.name}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>

                {/* Region */}
                <td className="py-2.5 px-3 text-slate-500 hidden sm:table-cell text-xs">
                  {t.region || '—'}
                </td>

                {/* Status */}
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      t.status === 'ACTIVE'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        : t.status === 'DISBANDED'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {t.status}
                  </span>
                </td>

                {/* Players Count */}
                <td className="py-2.5 px-3 text-center font-mono text-xs">
                  <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                    <Users className="w-3 h-3 text-slate-400" />
                    {t._count.players}
                  </span>
                </td>

                {/* Events Count */}
                <td className="py-2.5 px-3 text-center font-mono text-xs hidden sm:table-cell">
                  <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                    <Trophy className="w-3 h-3 text-slate-400" />
                    {t._count.tournamentRosters}
                  </span>
                </td>

                {/* Actions */}
                <td className="py-2.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {/* Duplicate */}
                    <form action={duplicateTeamAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        className="p-1.5 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                        title={`Duplicate team "${t.name}"`}
                        aria-label={`Duplicate team "${t.name}"`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </form>

                    {/* Edit */}
                    <Link
                      href={`/admin/teams?edit=${t.id}`}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-(--ed-blue) transition-colors"
                      title={`Edit team "${t.name}"`}
                      aria-label={`Edit team "${t.name}"`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => setTeamToDelete({ id: t.id, name: t.name })}
                      className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title={`Delete team "${t.name}"`}
                      aria-label={`Delete team "${t.name}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredTeams.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                  <div className="max-w-xs mx-auto space-y-2">
                    <p className="font-semibold text-slate-500 dark:text-slate-400">
                      No matching teams found
                    </p>
                    {hasActiveFilters ? (
                      <div>
                        <p className="text-slate-400">Try changing your search terms or filters.</p>
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="mt-2 text-xs font-bold text-(--ed-blue) hover:underline cursor-pointer"
                        >
                          Clear all filters
                        </button>
                      </div>
                    ) : (
                      <p className="text-slate-400">No teams created yet. Add one above.</p>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Single Team Delete Confirmation Modal */}
      {teamToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Delete Team
                </h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to delete <strong className="text-slate-900 dark:text-white">&quot;{teamToDelete.name}&quot;</strong>?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg leading-relaxed">
              This will remove the team and unassign any active players, tournaments, and records attached to it. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setTeamToDelete(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  startTransition(async () => {
                    const res = await deleteTeamServerAction(teamToDelete.id, true);
                    if (res.success) {
                      setTeamToDelete(null);
                    } else {
                      alert(res.message || 'Failed to delete team');
                    }
                  });
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isProcessing ? 'Deleting...' : 'Delete Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
