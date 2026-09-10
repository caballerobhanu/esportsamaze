'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Search,
  Users,
  Shield,
  Crosshair,
  Trophy,
  Flame,
  ArrowUpDown,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PlayersDirectoryItem {
  id: string;
  ign: string;
  slug: string | null;
  name?: string | null;
  role?: string | null;
  status: string;
  avatarUrl?: string | null;
  nationality?: string | null;
  isVerified: boolean;
  game?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  currentTeam?: {
    id: string;
    name: string;
    tag?: string | null;
    logoUrl?: string | null;
  } | null;
  _count: {
    matchStats: number;
    transferHistory: number;
  };
}

const ROLES = ['ALL', 'Assaulter', 'IGL', 'Support', 'Sniper', 'Flex'];
const ALPHABET = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

export function PlayersDirectoryExplorer({
  players,
}: {
  players: PlayersDirectoryItem[];
}) {
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('ALL');
  const [gameFilter, setGameFilter] = React.useState('ALL');
  const [letterFilter, setLetterFilter] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<'ign' | 'matches'>('ign');

  // Extract unique games
  const gamesList = React.useMemo(() => {
    const map = new Map<string, string>();
    players.forEach((p) => {
      if (p.game) {
        map.set(p.game.id, p.game.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [players]);

  // Filtering
  const filtered = React.useMemo(() => {
    return players.filter((p) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchIgn = p.ign.toLowerCase().includes(q);
        const matchName = p.name ? p.name.toLowerCase().includes(q) : false;
        const matchTeam = p.currentTeam
          ? p.currentTeam.name.toLowerCase().includes(q) || (p.currentTeam.tag && p.currentTeam.tag.toLowerCase().includes(q))
          : false;
        if (!matchIgn && !matchName && !matchTeam) return false;
      }

      // Role filter
      if (roleFilter !== 'ALL') {
        if (p.role?.toLowerCase() !== roleFilter.toLowerCase()) return false;
      }

      // Game filter
      if (gameFilter !== 'ALL') {
        if (p.game?.id !== gameFilter) return false;
      }

      // Alphabet filter
      if (letterFilter) {
        if (!p.ign.toUpperCase().startsWith(letterFilter)) return false;
      }

      return true;
    });
  }, [players, search, roleFilter, gameFilter, letterFilter]);

  // Sorting
  const sorted = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'matches') {
        return (b._count?.matchStats ?? 0) - (a._count?.matchStats ?? 0);
      }
      return a.ign.localeCompare(b.ign);
    });
  }, [filtered, sortBy]);

  return (
    <div className="space-y-6">
      {/* Search & Filter Header Bar */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0b101c]/80 backdrop-blur-md shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (letterFilter) setLetterFilter(null);
              }}
              placeholder="Search by IGN, real name, or team..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-(--ed-blue) transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Game Filter */}
            {gamesList.length > 1 && (
              <select
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
              >
                <option value="ALL">All Games</option>
                {gamesList.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}

            {/* Sort Toggle */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setSortBy('ign')}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-bold transition-all',
                  sortBy === 'ign'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                A–Z
              </button>
              <button
                type="button"
                onClick={() => setSortBy('matches')}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1',
                  sortBy === 'matches'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Flame className="w-3 h-3 text-rose-500" />
                Most Matches
              </button>
            </div>
          </div>
        </div>

        {/* Role Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Role:</span>
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                roleFilter === r
                  ? 'bg-(--ed-blue) text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              {r === 'ALL' ? 'All Roles' : r}
            </button>
          ))}
        </div>

        {/* Alphabet Jump Bar */}
        <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => setLetterFilter(null)}
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors',
              letterFilter === null
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            All
          </button>
          {ALPHABET.map((char) => (
            <button
              key={char}
              type="button"
              onClick={() => setLetterFilter(letterFilter === char ? null : char)}
              className={cn(
                'w-6 h-6 rounded flex items-center justify-center text-[11px] font-mono font-bold transition-colors',
                letterFilter === char
                  ? 'bg-(--ed-blue) text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              {char}
            </button>
          ))}
        </div>
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing <strong className="text-slate-800 dark:text-slate-200">{sorted.length}</strong> verified esports players
        </span>
      </div>

      {/* Grid of Players */}
      {sorted.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-[#0b101c]/50">
          <Crosshair className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No players match your filters</p>
          <p className="text-xs text-slate-400 mt-1">Try broadening your search query or clearing the letter filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map((p) => {
            const playerUrl = p.slug ? `/players/${p.slug}` : '#';

            return (
              <Link
                key={p.id}
                href={playerUrl}
                className="group p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] hover:border-(--ed-blue) dark:hover:border-blue-500/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                      {p.avatarUrl ? (
                        <img
                          src={p.avatarUrl}
                          alt={p.ign}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <span className="text-base font-black text-slate-400 font-mono">
                          {p.ign.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Role & Verification Badge */}
                    <div className="flex flex-col items-end gap-1">
                      {p.role && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                          {p.role}
                        </span>
                      )}
                      {p.isVerified && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                          ✓ Pro
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-(--ed-blue) dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                      {p.ign}
                    </h3>
                    {p.name && (
                      <p className="text-[11px] text-slate-400 truncate">
                        {p.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer with Team & Stats */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  {p.currentTeam ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      {p.currentTeam.logoUrl && (
                        <img
                          src={p.currentTeam.logoUrl}
                          alt={p.currentTeam.name}
                          className="w-4 h-4 rounded object-contain shrink-0"
                        />
                      )}
                      <span className="font-bold text-slate-700 dark:text-slate-300 truncate text-[11px]">
                        {p.currentTeam.tag || p.currentTeam.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-[11px] italic">Free Agent</span>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono text-slate-400">
                      {p._count.matchStats} matches
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-(--ed-blue) group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
