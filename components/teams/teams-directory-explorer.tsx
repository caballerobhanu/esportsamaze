'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowUpDown,
  Crown,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { GameLogo } from '@/components/ui/game-capsule';
import { cn } from '@/lib/utils';

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

type SortOption = 'name' | 'titles';

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

function initialOf(name: string): string {
  const c = name.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

export function TeamsDirectoryExplorer({
  teams,
}: {
  teams: TeamsDirectoryItem[];
}) {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [gameFilter, setGameFilter] = React.useState<string>('ALL');
  const [familyFilter, setFamilyFilter] = React.useState<string>('ALL');
  const [regionFilter, setRegionFilter] = React.useState<string>('ALL');
  const [letterFilter, setLetterFilter] = React.useState<string>('ALL');
  const [sortBy, setSortBy] = React.useState<SortOption>('name');

  const games = React.useMemo(() => {
    const map = new Map<string, { name: string; slug: string; shortName?: string | null; logoUrl?: string | null; logoDarkUrl?: string | null; count: number }>();
    teams.forEach((t) => {
      if (!t.game?.slug) return;
      const entry = map.get(t.game.slug) ?? {
        name: t.game.name,
        slug: t.game.slug,
        shortName: t.game.shortName,
        logoUrl: t.game.logoUrl,
        logoDarkUrl: t.game.logoDarkUrl,
        count: 0,
      };
      entry.count += 1;
      map.set(t.game.slug, entry);
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [teams]);

  const families = React.useMemo(() => {
    const map = new Map<string, { slug: string; name: string; count: number }>();
    teams.forEach((t) => {
      if (!t.game?.family?.slug) return;
      const entry = map.get(t.game.family.slug) ?? { slug: t.game.family.slug, name: t.game.family.name, count: 0 };
      entry.count += 1;
      map.set(t.game.family.slug, entry);
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [teams]);

  const regions = React.useMemo(() => {
    const map = new Map<string, number>();
    teams.forEach((t) => {
      const region = t.region?.trim() || 'Global';
      map.set(region, (map.get(region) ?? 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [teams]);

  const statuses = React.useMemo(() => {
    const map = new Map<string, number>();
    teams.forEach((t) => {
      const status = t.status?.trim() || 'ACTIVE';
      map.set(status, (map.get(status) ?? 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [teams]);

  const letterCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    teams.forEach((t) => {
      const key = initialOf(t.displayName || t.name);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [teams]);

  const filtered = React.useMemo(() => {
    const list = teams.filter((t) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const name = t.displayName || t.name;
        const matchesName = name.toLowerCase().includes(q);
        const matchesTag = t.tag?.toLowerCase().includes(q);
        const matchesRegion = (t.region || '').toLowerCase().includes(q);
        const matchesGame = (t.game?.name || '').toLowerCase().includes(q) || (t.game?.shortName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesTag && !matchesRegion && !matchesGame) {
          return false;
        }
      }

      if (statusFilter !== 'ALL' && (t.status?.trim() || 'ACTIVE') !== statusFilter) {
        return false;
      }

      if (gameFilter !== 'ALL' && t.game?.slug !== gameFilter) {
        return false;
      }

      if (familyFilter !== 'ALL' && t.game?.family?.slug !== familyFilter) {
        return false;
      }

      if (regionFilter !== 'ALL' && (t.region?.trim() || 'Global') !== regionFilter) {
        return false;
      }

      if (letterFilter !== 'ALL' && initialOf(t.displayName || t.name) !== letterFilter) {
        return false;
      }

      return true;
    });

    const cmpName = (a: TeamsDirectoryItem, b: TeamsDirectoryItem) =>
      (a.displayName || a.name).localeCompare(b.displayName || b.name);

    if (sortBy === 'titles') {
      list.sort((a, b) => {
        const diff = b._count.tournamentsWon - a._count.tournamentsWon;
        return diff !== 0 ? diff : cmpName(a, b);
      });
    } else {
      list.sort(cmpName);
    }

    return list;
  }, [teams, search, statusFilter, gameFilter, familyFilter, regionFilter, letterFilter, sortBy]);

  const hasActiveFilters =
    search !== '' ||
    statusFilter !== 'ALL' ||
    gameFilter !== 'ALL' ||
    familyFilter !== 'ALL' ||
    regionFilter !== 'ALL' ||
    letterFilter !== 'ALL';

  const clearAll = () => {
    setSearch('');
    setStatusFilter('ALL');
    setGameFilter('ALL');
    setFamilyFilter('ALL');
    setRegionFilter('ALL');
    setLetterFilter('ALL');
  };

  const setLetter = (letter: string) => {
    setLetterFilter(letterFilter === letter ? 'ALL' : letter);
  };

  return (
    <div className="space-y-6">
      {/* ── Controls ── */}
      <div className="ed-card space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ed-stone)]" />
            <input
              type="text"
              placeholder="Search teams, tags, regions, games…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ed-input pl-10"
            />
          </div>

          {/* Status tabs */}
          <div className="flex items-end gap-6 overflow-x-auto border-b border-[var(--ed-hair)] no-scrollbar lg:border-b-0">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`ed-tab lg:border-b-0 lg:py-1.5 ${statusFilter === 'ALL' ? 'ed-tab-active' : ''}`}
            >
              All <span className="num text-xs opacity-70">({teams.length})</span>
            </button>
            {statuses.map(({ name, count }) => (
              <button
                key={name}
                onClick={() => setStatusFilter(name)}
                className={`ed-tab lg:border-b-0 lg:py-1.5 ${statusFilter === name ? 'ed-tab-active' : ''}`}
              >
                {name} <span className="num text-xs opacity-70">({count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Game, universe & region filters */}
        <div className="flex flex-wrap items-center gap-4 border-t border-[var(--ed-hair)] pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="ed-label mr-1">Game</span>
            <button
              onClick={() => setGameFilter('ALL')}
              className={`ed-chip transition-colors ${gameFilter === 'ALL' ? 'border-[var(--ed-blue)] bg-[var(--ed-blue)] text-white' : 'text-[var(--ed-stone)] hover:border-[var(--ed-stone)]/50'}`}
            >
              All games
            </button>
            {games.map((g) => (
              <button
                key={g.slug}
                onClick={() => setGameFilter(g.slug)}
                className={`ed-chip transition-colors ${gameFilter === g.slug ? 'border-[var(--ed-blue)] bg-[var(--ed-blue)] text-white' : 'text-[var(--ed-stone)] hover:border-[var(--ed-stone)]/50'}`}
                title={g.name}
              >
                <GameLogo game={g} className="h-3.5 w-3.5" />
                {g.shortName || g.name} <span className="num text-[10px] opacity-70">({g.count})</span>
              </button>
            ))}
          </div>

          {families.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="ed-label mr-1">Universe</span>
              <button
                onClick={() => setFamilyFilter('ALL')}
                className={`ed-chip transition-colors ${familyFilter === 'ALL' ? 'border-[var(--ed-blue)] bg-[var(--ed-blue)] text-white' : 'text-[var(--ed-stone)] hover:border-[var(--ed-stone)]/50'}`}
              >
                All universes
              </button>
              {families.map(({ slug, name, count }) => (
                <button
                  key={slug}
                  onClick={() => setFamilyFilter(familyFilter === slug ? 'ALL' : slug)}
                  className={`ed-chip transition-colors ${familyFilter === slug ? 'border-[var(--ed-blue)] bg-[var(--ed-blue)] text-white' : 'text-[var(--ed-stone)] hover:border-[var(--ed-stone)]/50'}`}
                  title={`Includes every ${name} ecosystem`}
                >
                  {name} <span className="num text-[10px] opacity-70">({count})</span>
                </button>
              ))}
            </div>
          )}

          {regions.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="ed-label mr-1">Region</span>
              <button
                onClick={() => setRegionFilter('ALL')}
                className={`ed-chip transition-colors ${regionFilter === 'ALL' ? 'border-[var(--ed-blue)] bg-[var(--ed-blue)] text-white' : 'text-[var(--ed-stone)] hover:border-[var(--ed-stone)]/50'}`}
              >
                All regions
              </button>
              {regions.map(({ name, count }) => (
                <button
                  key={name}
                  onClick={() => setRegionFilter(name)}
                  className={`ed-chip transition-colors ${regionFilter === name ? 'border-[var(--ed-blue)] bg-[var(--ed-blue)] text-white' : 'text-[var(--ed-stone)] hover:border-[var(--ed-stone)]/50'}`}
                >
                  {name} <span className="num text-[10px] opacity-70">({count})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Alphabet jump bar ── */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--ed-hair)] pb-2 no-scrollbar">
        <button
          onClick={() => setLetterFilter('ALL')}
          className={`ed-chip whitespace-nowrap px-2.5 py-1 transition-colors ${letterFilter === 'ALL' ? 'border-[var(--ed-blue)] bg-[var(--ed-blue)] text-white' : 'hover:border-[var(--ed-stone)]/50'}`}
        >
          All
          <span className="num rounded-full bg-[var(--ed-sand)] px-1.5 text-[10px]">{teams.length}</span>
        </button>
        {ALPHABET.map((letter) => {
          const count = letterCounts.get(letter) ?? 0;
          return (
            <button
              key={letter}
              onClick={() => setLetter(letter)}
              disabled={count === 0}
              className={`ed-chip whitespace-nowrap px-2.5 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                letterFilter === letter
                  ? 'border-[var(--ed-blue)] bg-[var(--ed-blue)] text-white'
                  : count === 0
                    ? 'text-[var(--ed-stone)] opacity-40'
                    : 'hover:border-[var(--ed-stone)]/50'
              }`}
              aria-label={`Teams starting with ${letter}`}
            >
              {letter}
              <span className={`num ${count > 0 ? 'text-[10px] opacity-70' : ''}`}>{count || ''}</span>
            </button>
          );
        })}
        {letterCounts.get('#') ? (
          <button
            onClick={() => setLetter('#')}
            className={`ed-chip whitespace-nowrap px-2.5 py-1 transition-colors ${letterFilter === '#' ? 'border-[var(--ed-blue)] bg-[var(--ed-blue)] text-white' : 'hover:border-[var(--ed-stone)]/50'}`}
            aria-label="Teams with non-alphabetic names"
          >
            #<span className="num text-[10px] opacity-70">{letterCounts.get('#')}</span>
          </button>
        ) : null}
      </div>

      {/* ── Results header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--ed-stone)]">
          Showing <span className="num font-medium text-[var(--ed-ink)]">{filtered.length}</span>{' '}
          {filtered.length === 1 ? 'team' : 'teams'}
          {letterFilter !== 'ALL' && (
            <>
              {' '}starting with <span className="font-bold text-[var(--ed-blue)]">{letterFilter}</span>
            </>
          )}
        </p>

        <div className="flex items-center gap-2.5">
          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-lg border border-[var(--ed-hair)] bg-[var(--ed-surface)] py-1.5 pl-3 pr-8 text-xs font-semibold text-[var(--ed-ink)] focus:border-[var(--ed-blue)] focus:outline-none cursor-pointer appearance-none"
              aria-label="Sort teams"
            >
              <option value="name">Sort: Name (A – Z)</option>
              <option value="titles">Sort: Champions first</option>
            </select>
            <ArrowUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ed-stone)]" />
          </div>

          {hasActiveFilters && (
            <button onClick={clearAll} className="text-sm font-medium text-[var(--ed-blue)] hover:underline">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 ? (
        <div className="ed-card flex flex-col items-center gap-3 py-20 text-center">
          <ShieldCheck className="h-8 w-8 text-[var(--ed-stone)] opacity-40" />
          <p className="font-display text-lg font-medium">No teams match your filters</p>
          <p className="max-w-sm text-sm text-[var(--ed-stone)]">
            Try adjusting your search or selecting a different game, region, or status.
          </p>
          {hasActiveFilters && (
            <button onClick={clearAll} className="ed-btn mt-2 px-4 py-2 text-xs">
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <CrestGrid teams={filtered} />
      )}
    </div>
  );
}

/* ═══════════ CREST GRID — logo + name, scales to 1000+ teams ═══════════ */

function teamHref(team: { slug?: string | null; tag?: string | null; id: string }) {
  return `/teams/${team.slug || team.tag || team.id}`;
}

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
              'group relative aspect-[3/4] overflow-hidden rounded-2xl border border-[var(--ed-hair)] bg-[var(--ed-surface)] flex flex-col cursor-pointer transition-all',
              'hover:-translate-y-0.5 hover:border-[var(--ed-blue)] hover:shadow-sm'
            )}
          >
            {/* Top 3/4 — logo plate */}
            <div className="team-plate relative aspect-square flex items-center justify-center p-4">
              {hasLogo ? (
                <span className="inline-flex h-full w-full max-h-[78%] max-w-[78%] items-center justify-center transition-transform duration-200 group-hover:scale-105">
                  {team.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={team.logoUrl} alt={fullName} className="max-h-full max-w-full object-contain dark:hidden" />
                  )}
                  {team.imageDarkUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={team.imageDarkUrl} alt={fullName} className={`max-h-full max-w-full object-contain ${team.logoUrl ? 'hidden dark:block' : ''}`} />
                  )}
                </span>
              ) : (
                <span className="font-display text-3xl font-black leading-none tracking-tight text-[var(--ed-ink)] transition-transform duration-200 group-hover:scale-105">
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
              <span className="sm:hidden truncate text-[10px] font-black uppercase tracking-wide text-[var(--ed-stone)]">
                {shortLabel(team)}
              </span>
              <span className="hidden truncate font-display text-xs font-bold text-[var(--ed-ink)] transition-colors group-hover:text-[var(--ed-blue)] sm:block">
                {fullName}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}