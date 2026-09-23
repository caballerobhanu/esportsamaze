'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Crosshair,
  Flame,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { playerHref } from '@/lib/entity-links';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';

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

export interface PlayersDirectoryFilters {
  q: string;
  role: string;
  game: string;
  letter: string;
  sort: string;
}

export interface PlayersFacetCounts {
  total: number;
  roles: Record<string, number>;
  games: Array<{ slug: string; name: string; count: number }>;
}

const ROLES = ['ALL', 'Assaulter', 'IGL', 'Support', 'Sniper', 'Flex'];
const ALPHABET = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

export function PlayersDirectoryExplorer({
  players,
  filters,
  counts,
  page = 1,
  totalPages = 1,
  basePath = gameHref(DEFAULT_GAME_SLUG, 'players'),
}: {
  players: PlayersDirectoryItem[];
  filters: PlayersDirectoryFilters;
  counts: PlayersFacetCounts;
  page?: number;
  totalPages?: number;
  basePath?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = React.useState(filters.q);
  const searchSeq = React.useRef(0);

  const navigate = (updates: Record<string, string>) => {
    const params = new URLSearchParams();
    const merged = { ...filters, ...updates };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'ALL') params.set(k, v);
    }
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };


  const [lastUrlQ, setLastUrlQ] = React.useState(filters.q);
  if (lastUrlQ !== filters.q) {
    // URL changed externally (e.g. Clear filters link) — adjust during render
    setLastUrlQ(filters.q);
    setSearch(filters.q);
  }

  // Debounced URL navigation — the server searches across the whole database
  React.useEffect(() => {
    if (search === filters.q) return;
    const seq = ++searchSeq.current;
    const timer = setTimeout(() => {
      if (seq !== searchSeq.current) return;
      navigate({ q: search.trim() });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const toggleLetter = (letter: string) => {
    navigate({ letter: filters.letter === letter ? '' : letter });
  };

  // Chevron page switcher hrefs (filters carried, page swapped)
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v && v !== 'ALL') params.set(k, v);
    }
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by IGN, real name, or team..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-(--ed-blue) transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Game Filter */}
            {counts.games.length > 1 && (
              <select
                value={filters.game || 'ALL'}
                onChange={(e) => navigate({ game: e.target.value })}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
              >
                <option value="ALL">All Games</option>
                {counts.games.map((g) => (
                  <option key={g.slug} value={g.slug}>
                    {g.name} ({g.count})
                  </option>
                ))}
              </select>
            )}

            {/* Sort Toggle */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => navigate({ sort: 'ign' })}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-bold transition-all',
                  (filters.sort || 'ign') === 'ign'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                A–Z
              </button>
              <button
                type="button"
                onClick={() => navigate({ sort: 'ign-desc' })}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-bold transition-all',
                  filters.sort === 'ign-desc'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                Z–A
              </button>
              <button
                type="button"
                onClick={() => navigate({ sort: 'matches' })}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1',
                  filters.sort === 'matches'
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
              onClick={() => navigate({ role: r })}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                (filters.role || 'ALL') === r
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
            onClick={() => navigate({ letter: '' })}
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors',
              !filters.letter
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
              onClick={() => toggleLetter(char)}
              className={cn(
                'w-6 h-6 rounded flex items-center justify-center text-[11px] font-mono font-bold transition-colors',
                filters.letter === char
                  ? 'bg-(--ed-blue) text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              {char}
            </button>
          ))}
        </div>
      </div>

      {/* Counter + page switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span>
          Showing <strong className="text-slate-800 dark:text-slate-200">{players.length}</strong> verified esports players
        </span>
        <div className="flex items-center gap-1.5">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              prefetch
              aria-label="Previous page"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-sm font-black text-slate-700 hover:border-(--ed-blue) hover:text-(--ed-blue) transition-colors dark:border-slate-700 dark:text-slate-200"
            >
              ‹
            </Link>
          ) : (
            <span aria-disabled className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-sm font-black text-slate-400 opacity-40 select-none dark:border-slate-700">
              ‹
            </span>
          )}
          <span className="num rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-extrabold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              prefetch
              aria-label="Next page"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-sm font-black text-slate-700 hover:border-(--ed-blue) hover:text-(--ed-blue) transition-colors dark:border-slate-700 dark:text-slate-200"
            >
              ›
            </Link>
          ) : (
            <span aria-disabled className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-sm font-black text-slate-400 opacity-40 select-none dark:border-slate-700">
              ›
            </span>
          )}
        </div>
      </div>

      {/* Grid of Players */}
      {players.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-[#0b101c]/50">
          <Crosshair className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No players match your filters</p>
          <p className="text-xs text-slate-400 mt-1">Try broadening your search query or clearing the letter filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {players.map((p) => {
            const playerUrl = p.slug ? playerHref(p) : '#';

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
