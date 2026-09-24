'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Crosshair, Users } from 'lucide-react';
import { GameLogo } from '@/components/ui/game-capsule';
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
  games: Array<{
    slug: string;
    name: string;
    count: number;
    shortName?: string | null;
    logoUrl?: string | null;
    logoDarkUrl?: string | null;
  }>;
}

const ROLES = ['ALL', 'Assaulter', 'IGL', 'Support', 'Sniper', 'Flex'];
const ALPHABET = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

/* Player-profile language: slate surfaces, #0A5FC4 accents, no editorial chips. */
const fieldCls =
  'rounded-xl border border-slate-200 bg-slate-50 text-slate-900 transition-colors placeholder:text-slate-400 focus:border-[#0A5FC4] focus:outline-none focus:ring-2 focus:ring-[#0A5FC4]/25 dark:border-white/10 dark:bg-white/5 dark:text-white';
const labelCls = 'mr-1 text-[10px] font-black uppercase tracking-wider text-slate-400';
const chipBase =
  'inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1 text-xs font-bold transition-colors';
const letterChip =
  'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-xs font-bold transition-colors';
const chipOn = 'border-[#0A5FC4] bg-[#0A5FC4] text-white';
const chipOff =
  'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300';
const pagerCls =
  'flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-sm font-black text-slate-700 transition-colors hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 dark:text-slate-200';
const pagerIdle =
  'flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-sm font-black text-slate-300 opacity-60 select-none dark:border-white/10 dark:text-slate-600';

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
      // `game` keeps an explicit ALL (otherwise the page falls back to the path
      // game); every other facet treats ALL as "no filter".
      if (!v || (v === 'ALL' && k !== 'game')) continue;
      params.set(k, v);
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

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (!v || (v === 'ALL' && k !== 'game')) continue;
      params.set(k, v);
    }
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const gameCount = (slug: string) => counts.games.find((g) => g.slug === slug)?.count ?? 0;
  const roleCount = (role: string) => counts.roles[role] ?? 0;

  const hasActiveFilters =
    filters.q !== '' || filters.role !== 'ALL' || filters.game !== 'ALL' || filters.letter !== '';

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search players, IGNs, real names, teams…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(fieldCls, 'w-full py-2.5 pl-10 pr-3.5 text-sm')}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ['ign', 'A–Z'],
                ['ign-desc', 'Z–A'],
                ['matches', 'Most Matches'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => navigate({ sort: value })}
                className={cn(chipBase, (filters.sort || 'ign') === value ? chipOn : chipOff)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
          <span className={labelCls}>Game</span>
          <button
            type="button"
            onClick={() => navigate({ game: 'ALL' })}
            className={cn(chipBase, filters.game === 'ALL' ? chipOn : chipOff)}
          >
            All games
          </button>
          {counts.games.map((g) => (
            <button
              key={g.slug}
              type="button"
              onClick={() => navigate({ game: g.slug })}
              className={cn(chipBase, filters.game === g.slug ? chipOn : chipOff)}
              title={g.name}
            >
              <GameLogo game={g} className="h-3.5 w-3.5" />
              {g.shortName || g.name}
              {gameCount(g.slug) > 0 && <span className="opacity-70">({gameCount(g.slug)})</span>}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
          <span className={labelCls}>Role</span>
          {ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => navigate({ role })}
              className={cn(chipBase, (filters.role || 'ALL') === role ? chipOn : chipOff)}
            >
              {role === 'ALL' ? `All (${counts.total})` : `${role} (${roleCount(role)})`}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
          <span className={labelCls}>Name</span>
          <button
            type="button"
            onClick={() => navigate({ letter: '' })}
            className={cn(chipBase, !filters.letter ? chipOn : chipOff)}
          >
            All
          </button>
          {ALPHABET.map((char) => (
            <button
              key={char}
              type="button"
              onClick={() => toggleLetter(char)}
              className={cn(letterChip, filters.letter === char ? chipOn : chipOff)}
            >
              {char}
            </button>
          ))}
        </div>
      </div>

      {/* Results header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing{' '}
            <span className="font-bold tabular-nums text-slate-900 dark:text-white">{players.length}</span> players
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => router.push(basePath)}
              className="text-sm font-medium text-[#0A5FC4] hover:underline dark:text-blue-300"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} prefetch aria-label="Previous page" className={pagerCls}>
              ‹
            </Link>
          ) : (
            <span aria-disabled className={pagerIdle}>
              ‹
            </span>
          )}
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} prefetch aria-label="Next page" className={pagerCls}>
              ›
            </Link>
          ) : (
            <span aria-disabled className={pagerIdle}>
              ›
            </span>
          )}
        </div>
      </div>

      {players.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white py-20 text-center shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <Crosshair className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-lg font-black tracking-tight text-slate-950 dark:text-white">No players match your filters</p>
          <p className="max-w-sm text-sm font-medium text-slate-500 dark:text-slate-400">
            Try adjusting your search or selecting a different role, game, or letter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {players.map((p) => {
            const playerUrl = p.slug ? playerHref(p) : '#';

            return (
              <Link
                key={p.id}
                href={playerUrl}
                className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:border-[#0A5FC4] hover:shadow-lg dark:border-white/10 dark:bg-[#0b1220]"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                      {p.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- same-origin /api/media, nginx-cached
                        <img src={p.avatarUrl} alt={p.ign} loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-base font-black text-slate-400 dark:text-slate-500">
                          {p.ign.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-base font-black leading-snug tracking-tight text-slate-950 transition-colors group-hover:text-[#0A5FC4] dark:text-white dark:group-hover:text-blue-300">
                        {p.ign}
                      </h3>
                      {p.name && (
                        <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{p.name}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Facts — label above value, matching the tournaments card skeleton */}
                <div className="border-t border-slate-200 p-5 dark:border-white/10">
                  <dl className="space-y-4">
                    <div>
                      <dt className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <Users className="h-3.5 w-3.5 text-[#0A5FC4] dark:text-blue-300" />
                        Current team
                      </dt>
                      <dd className="mt-1.5 flex items-center gap-2">
                        {p.currentTeam?.logoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element -- same-origin /api/media, nginx-cached
                          <img
                            src={p.currentTeam.logoUrl}
                            alt=""
                            loading="lazy"
                            className="h-4 w-4 shrink-0 rounded object-contain"
                          />
                        )}
                        <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">
                          {p.currentTeam ? p.currentTeam.name : 'Free Agent'}
                        </span>
                      </dd>
                    </div>

                    <div>
                      <dt className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <Crosshair className="h-3.5 w-3.5 text-[#0A5FC4] dark:text-blue-300" />
                        Matches played
                      </dt>
                      <dd className="mt-1 text-xl font-black tracking-tight tabular-nums text-[#0A5FC4] dark:text-blue-300">
                        {p._count.matchStats.toLocaleString('en-IN')}
                      </dd>
                    </div>
                  </dl>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
