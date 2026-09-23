'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Crown,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { GameLogo } from '@/components/ui/game-capsule';
import { ThemeLogo } from '@/components/ui/theme-logo';
import { cn } from '@/lib/utils';
import { teamHref } from '@/lib/entity-links';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';

export interface TeamsDirectoryItem {
  id: string;
  name: string;
  displayName?: string | null;
  slug?: string | null;
  tag?: string | null;
  logoUrl?: string | null;
  imageDarkUrl?: string | null;
  region?: string | null;
  status: string;
  founded?: Date | string | null;
  game?:
    | {
        name: string;
        slug: string;
        shortName?: string | null;
        logoUrl?: string | null;
        logoDarkUrl?: string | null;
        family?: { slug: string; name: string } | null;
      }
    | null;
  _count: {
    players: number;
    tournamentRosters: number;
    tournamentsWon: number;
  };
}

export interface TeamsDirectoryFilters {
  q: string;
  status: string;
  game: string;
  family: string;
  region: string;
  letter: string;
  sort: string;
}

export interface TeamsFacetCounts {
  total: number;
  statuses: Array<[string, number]>;
  games: Array<{ slug: string; name: string; shortName?: string | null; logoUrl?: string | null; logoDarkUrl?: string | null; count: number }>;
  families: Array<{ slug: string; name: string; count: number }>;
  regions: Array<{ name: string; count: number }>;
}

const ALPHABET = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

/** Short label for small screens: the tag when set, otherwise a compact name. */
function shortLabel(team: TeamsDirectoryItem): string {
  const tag = team.tag?.trim();
  if (tag) return tag;
  const name = team.displayName || team.name;
  return name.length > 14 ? name.split(/\s+/).slice(0, 2).join(' ') : name;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

/* Players-page design language: slate borders, white/#0b101c surfaces,
   blue-active pills, single-line chips. */
const chipCls = (active: boolean) =>
  cn(
    'inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
    active
      ? 'bg-(--ed-blue) text-white shadow-sm'
      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
  );
const labelCls = 'text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1';

export function TeamsDirectoryExplorer({
  teams,
  filters,
  counts,
  page = 1,
  totalPages = 1,
  basePath = gameHref(DEFAULT_GAME_SLUG, 'teams'),
}: {
  teams: TeamsDirectoryItem[];
  filters: TeamsDirectoryFilters;
  counts: TeamsFacetCounts;
  page?: number;
  totalPages?: number;
  basePath?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = React.useState(filters.q);
  const searchSeq = React.useRef(0);

  const [lastUrlQ, setLastUrlQ] = React.useState(filters.q);
  if (lastUrlQ !== filters.q) {
    setLastUrlQ(filters.q);
    setSearch(filters.q);
  }

  const navigate = (updates: Record<string, string>) => {
    const params = new URLSearchParams();
    const merged = { ...filters, ...updates };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'ALL') params.set(k, v);
    }
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

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
      if (v && v !== 'ALL') params.set(k, v);
    }
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const hasActiveFilters =
    filters.q !== '' ||
    filters.status !== 'ALL' ||
    filters.game !== 'ALL' ||
    filters.family !== 'ALL' ||
    filters.region !== 'ALL' ||
    filters.letter !== 'ALL';

  return (
    <div className="space-y-6">
      {/* ── Controls ── */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0b101c]/80 backdrop-blur-md shadow-sm space-y-4">
        {/* Row 1: Search + Sort */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search teams, tags, regions, games…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-(--ed-blue) transition-all"
            />
          </div>

          {/* Sort toggle — same segmented control as the players directory */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shrink-0">
            {(
              [
                ['name', 'A–Z'],
                ['name-desc', 'Z–A'],
                ['titles', 'Champions'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => navigate({ sort: value })}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-bold transition-all',
                  value === 'titles' && 'flex items-center gap-1',
                  (filters.sort || 'name') === value
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                {value === 'titles' && <Crown className="w-3 h-3 text-amber-500" />}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Status + Game */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className={labelCls}>Status:</span>
            <button onClick={() => navigate({ status: 'ALL' })} className={chipCls(filters.status === 'ALL')}>
              All
            </button>
            {counts.statuses.map(([name, count]) => (
              <button key={name} onClick={() => navigate({ status: name })} className={chipCls(filters.status === name)}>
                {name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={labelCls}>Game:</span>
            <button onClick={() => navigate({ game: 'ALL' })} className={chipCls(filters.game === 'ALL')}>
              All games
            </button>
            {counts.games.map((g) => (
              <button
                key={g.slug}
                onClick={() => navigate({ game: g.slug })}
                className={chipCls(filters.game === g.slug)}
                title={g.name}
              >
                <GameLogo game={g} className="h-3.5 w-3.5" />
                {g.shortName || g.name}
              </button>
            ))}
            {counts.families
              // A game page is already pinned to one family, so the family chip is
              // only offered when the directory actually spans more than one.
              .filter((f) => f.count > 0 && counts.families.length > 1)
              .map(({ slug, name }) => (
                <button
                  key={slug}
                  onClick={() => navigate({ family: filters.family === slug ? 'ALL' : slug })}
                  className={chipCls(filters.family === slug)}
                  title={`Includes every ${name} ecosystem`}
                >
                  {name}
                </button>
              ))}
          </div>
        </div>

        {/* Row 3: Region */}
        {counts.regions.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className={labelCls}>Region:</span>
            <button onClick={() => navigate({ region: 'ALL' })} className={chipCls(filters.region === 'ALL')}>
              All regions
            </button>
            {counts.regions.map(({ name, count }) => (
              <button key={name} onClick={() => navigate({ region: name })} className={chipCls(filters.region === name)}>
                {name}
              </button>
            ))}
          </div>
        )}

        {/* Row 4: Alphabet */}
        <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <button
            onClick={() => navigate({ letter: 'ALL' })}
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors',
              filters.letter === 'ALL'
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            All
          </button>
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              onClick={() => toggleLetter(letter)}
              className={cn(
                'w-6 h-6 rounded flex items-center justify-center text-[11px] font-mono font-bold transition-colors',
                filters.letter === letter
                  ? 'bg-(--ed-blue) text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
              aria-label={`Teams starting with ${letter}`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-3">
          <p>
            Showing <strong className="text-slate-800 dark:text-slate-200">{teams.length}</strong>{' '}
            {teams.length === 1 ? 'team' : 'teams'}
            {filters.letter !== 'ALL' && (
              <>
                {' '}starting with <span className="font-bold text-(--ed-blue)">{filters.letter}</span>
              </>
            )}
          </p>

          {hasActiveFilters && (
            <button onClick={() => router.push(basePath)} className="font-medium text-(--ed-blue) hover:underline">
              Clear filters
            </button>
          )}
        </div>

        {/* Chevron page switcher */}
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

      {/* ── Empty state ── */}
      {teams.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-[#0b101c]/50">
          <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No teams match your filters</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search or selecting a different game, region, or status.</p>
          {hasActiveFilters && (
            <button onClick={() => router.push(basePath)} className="mt-3 px-4 py-2 rounded-xl bg-(--ed-blue) text-white text-xs font-bold">
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <CrestGrid teams={teams} />
      )}
    </div>
  );
}

/* ═══════════ CREST GRID — logo + name, scales to 1000+ teams ═══════════ */

function CrestGrid({ teams }: { teams: TeamsDirectoryItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 min-[520px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {teams.map((team) => {
        const fullName = team.displayName || team.name;
        const isChampion = team._count.tournamentsWon > 0;
        const hasLogo = Boolean(team.logoUrl || team.imageDarkUrl);

        return (
          <Link
            key={team.id}
            href={teamHref(team)}
            title={fullName}
            className={cn(
              'group relative aspect-[3/4] overflow-hidden rounded-2xl border bg-white dark:bg-[#0b101c] flex flex-col shadow-xs transition-all',
              'border-slate-200 dark:border-slate-800',
              'hover:-translate-y-0.5 hover:border-(--ed-blue) dark:hover:border-blue-500/50 hover:shadow-md'
            )}
          >
            {/* Top 3/4 — logo plate */}
            <div className="team-plate relative aspect-square flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900/60">
              {hasLogo ? (
                <div className="relative h-full w-full max-h-[78%] max-w-[78%] transition-transform duration-200 group-hover:scale-105">
                  <ThemeLogo
                    lightSrc={team.logoUrl}
                    darkSrc={team.imageDarkUrl}
                    alt={fullName}
                    className="object-contain"
                  />
                </div>
              ) : (
                <span className="font-display text-3xl font-black leading-none tracking-tight text-slate-400 transition-transform duration-200 group-hover:scale-105">
                  {initials(fullName)}
                </span>
              )}

              {isChampion && (
                <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-sm">
                  <Crown className="h-3 w-3" />
                </span>
              )}
            </div>

            {/* Bottom 1/4 — name ribbon */}
            <div className="flex min-h-0 flex-1 items-center justify-center px-1.5">
              <span className="sm:hidden truncate text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {shortLabel(team)}
              </span>
              <span className="hidden truncate font-display text-xs font-bold text-slate-900 dark:text-white transition-colors group-hover:text-(--ed-blue) sm:block">
                {fullName}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
