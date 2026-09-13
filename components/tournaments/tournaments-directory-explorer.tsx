'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Trophy, Calendar, MapPin, ArrowRight, Banknote } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { PrizePoolBadge } from '@/components/ui/prize-pool-badge';
import { GameLogo } from '@/components/ui/game-capsule';
import { ThemeLogo } from '@/components/ui/theme-logo';

export interface TournamentDirectoryItem {
  id: string;
  name: string;
  slug: string;
  tier?: string | null;
  status: string;
  series?: string | null;
  season?: string | null;
  eventType?: string | null;
  gameMode?: string | null;
  startDate: Date | string;
  endDate: Date | string;
  prizePool?: number | null;
  currency?: string | null;
  usdRate?: number | null;
  imageUrl?: string | null;
  imageDarkUrl?: string | null;
  winner?: string | null;
  game: { name: string; slug: string; shortName?: string | null; logoUrl?: string | null; logoDarkUrl?: string | null };
  games?: { game: { name: string; slug: string; shortName?: string | null; logoUrl?: string | null; logoDarkUrl?: string | null } }[];
  venues?: { venue: { name: string; city?: string | null; country?: string | null } }[];
  organizers?: { organizer: { name: string } }[];
  _count: {
    matches: number;
    teams: number;
  };
}

export interface TournamentsDirectoryFilters {
  q: string;
  status: string;
  game: string;
  tier: string;
}

export interface TournamentsFacetCounts {
  total: number;
  statuses: Record<string, number>;
  tiers: Record<string, number>;
  games: Array<{ slug: string; count: number }>;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; dot?: boolean }> = {
  ONGOING: {
    label: 'Live now',
    className: 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400',
    dot: true,
  },
  UPCOMING: { label: 'Upcoming', className: 'text-(--ed-blue)' },
  COMPLETED: { label: 'Completed', className: 'text-(--ed-stone)' },
  CANCELED: { label: 'Canceled', className: 'text-(--ed-stone)' },
};

export function TournamentsDirectoryExplorer({
  tournaments,
  games,
  filters,
  counts,
  page = 1,
  totalPages = 1,
  basePath = '/tournaments',
}: {
  tournaments: TournamentDirectoryItem[];
  games: { name: string; slug: string; shortName?: string | null; logoUrl?: string | null; logoDarkUrl?: string | null }[];
  filters: TournamentsDirectoryFilters;
  counts: TournamentsFacetCounts;
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

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v && v !== 'ALL') params.set(k, v);
    }
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const statusCount = (status: string) => counts.statuses[status] ?? 0;
  const gameCount = (slug: string) => counts.games.find((g) => g.slug === slug)?.count ?? 0;
  const tierCount = (tier: string) => counts.tiers[tier] ?? 0;

  const hasActiveFilters =
    filters.q !== '' || filters.status !== 'ALL' || filters.game !== 'ALL' || filters.tier !== 'ALL';

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="ed-card space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--ed-stone)" />
            <input
              type="text"
              placeholder="Search tournaments, series, organisers, cities…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ed-input pl-10"
            />
          </div>

          {/* Status tabs */}
          <div className="flex items-end gap-6 overflow-x-auto border-b border-(--ed-hair) lg:border-b-0">
            <button onClick={() => navigate({ status: 'ALL' })} className={`ed-tab lg:border-b-0 lg:py-1.5 ${filters.status === 'ALL' ? 'ed-tab-active' : ''}`}>
              All <span className="num text-xs opacity-70">({counts.total})</span>
            </button>
            <button onClick={() => navigate({ status: 'ONGOING' })} className={`ed-tab lg:border-b-0 lg:py-1.5 ${filters.status === 'ONGOING' ? 'ed-tab-active' : ''}`}>
              {statusCount('ONGOING') > 0 && <span className="h-1.5 w-1.5 animate-live rounded-full bg-rose-500" />}
              Live <span className="num text-xs opacity-70">({statusCount('ONGOING')})</span>
            </button>
            <button onClick={() => navigate({ status: 'UPCOMING' })} className={`ed-tab lg:border-b-0 lg:py-1.5 ${filters.status === 'UPCOMING' ? 'ed-tab-active' : ''}`}>
              Upcoming <span className="num text-xs opacity-70">({statusCount('UPCOMING')})</span>
            </button>
            <button onClick={() => navigate({ status: 'COMPLETED' })} className={`ed-tab lg:border-b-0 lg:py-1.5 ${filters.status === 'COMPLETED' ? 'ed-tab-active' : ''}`}>
              Completed <span className="num text-xs opacity-70">({statusCount('COMPLETED')})</span>
            </button>
          </div>
        </div>

        {/* Game & tier filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-(--ed-hair) pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="ed-label mr-1">Game</span>
            <button
              onClick={() => navigate({ game: 'ALL' })}
              className={`ed-chip transition-colors ${filters.game === 'ALL' ? 'border-(--ed-blue) bg-(--ed-blue) text-white' : 'text-(--ed-stone) hover:border-(--ed-stone)/50'}`}
            >
              All games
            </button>
            {games.map((g) => (
              <button
                key={g.slug}
                onClick={() => navigate({ game: g.slug })}
                className={`ed-chip transition-colors ${filters.game === g.slug ? 'border-(--ed-blue) bg-(--ed-blue) text-white' : 'text-(--ed-stone) hover:border-(--ed-stone)/50'}`}
                title={g.name}
              >
                <GameLogo game={g} className="h-3.5 w-3.5" />
                {g.shortName || g.name}
                {gameCount(g.slug) > 0 && <span className="num text-[10px] opacity-70">({gameCount(g.slug)})</span>}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="ed-label mr-1">Tier</span>
            {['ALL', 'S', 'A', 'B', 'C'].map((tier) => (
              <button
                key={tier}
                onClick={() => navigate({ tier: tier })}
                className={`ed-chip transition-colors ${filters.tier === tier ? 'border-(--ed-blue) bg-(--ed-blue) text-white' : 'text-(--ed-stone) hover:border-(--ed-stone)/50'}`}
              >
                {tier === 'ALL' ? `All (${counts.total})` : `Tier ${tier} (${tierCount(tier)})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-(--ed-stone)">
            Showing <span className="num font-medium text-(--ed-ink)">{tournaments.length}</span> tournaments
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => router.push(basePath)}
              className="text-sm font-medium text-(--ed-blue) hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              prefetch
              aria-label="Previous page"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-(--ed-hair) text-sm font-black text-(--ed-ink) hover:border-(--ed-blue) hover:text-(--ed-blue) transition-colors cursor-pointer"
            >
              ‹
            </Link>
          ) : (
            <span aria-disabled className="flex h-7 w-7 items-center justify-center rounded-lg border border-(--ed-hair) text-sm font-black text-(--ed-stone) opacity-40 select-none">
              ‹
            </span>
          )}
          <span className="num rounded-lg border border-(--ed-hair) bg-white px-2.5 py-1 text-xs font-extrabold text-(--ed-ink)">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              prefetch
              aria-label="Next page"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-(--ed-hair) text-sm font-black text-(--ed-ink) hover:border-(--ed-blue) hover:text-(--ed-blue) transition-colors cursor-pointer"
            >
              ›
            </Link>
          ) : (
            <span aria-disabled className="flex h-7 w-7 items-center justify-center rounded-lg border border-(--ed-hair) text-sm font-black text-(--ed-stone) opacity-40 select-none">
              ›
            </span>
          )}
        </div>
      </div>

      {tournaments.length === 0 ? (
        <div className="ed-card flex flex-col items-center gap-3 py-20 text-center">
          <Trophy className="h-8 w-8 text-(--ed-stone) opacity-40" />
          <p className="font-display text-lg font-medium">No tournaments match your filters</p>
          <p className="max-w-sm text-sm text-(--ed-stone)">Try adjusting your search or selecting a different status, game, or tier.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => {
            const statusCfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.COMPLETED;
            const primaryVenue = t.venues?.[0]?.venue;

            return (
              <Link
                key={t.id}
                href={`/tournaments/${t.slug}`}
                className="ed-card group flex flex-col justify-between transition-colors hover:border-(--ed-stone)/50"
              >
                <div className="p-6 pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-lg border border-(--ed-hair) px-2.5 py-1 text-[11px] font-medium ${statusCfg.className}`}>
                      {statusCfg.dot && <span className="h-1.5 w-1.5 animate-live rounded-full bg-rose-500" />}
                      {statusCfg.label}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {t.tier && <span className="ed-chip px-2 py-0.5 text-[11px] text-(--ed-stone)">{t.tier}</span>}
                    </div>
                  </div>

                  {/* Ecosystem chips — primary + cross-region participants */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="ed-chip border-(--ed-blue)/25 bg-(--ed-blue)/10 px-2 py-0.5 text-[11px] text-(--ed-blue)" title={t.game.name}>
                      <GameLogo game={t.game} className="h-3 w-3" />
                      {t.game.shortName || t.game.name}
                    </span>
                    {(t.games ?? [])
                      .filter((g) => g.game.slug !== t.game.slug)
                      .map((g) => (
                        <span key={g.game.slug} className="ed-chip px-2 py-0.5 text-[11px] text-(--ed-stone)" title={g.game.name}>
                          <GameLogo game={g.game} className="h-3 w-3" />
                          {g.game.shortName || g.game.name}
                        </span>
                      ))}
                  </div>

                  <div className="mt-5 flex items-start gap-4">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-(--ed-hair) bg-(--ed-canvas) p-1.5 overflow-hidden">
                      {t.imageUrl || t.imageDarkUrl ? (
                        <ThemeLogo
                          lightSrc={t.imageUrl}
                          darkSrc={t.imageDarkUrl}
                          alt={t.name}
                          className="object-contain p-1"
                        />
                      ) : (
                        <Trophy className="h-5 w-5 text-(--ed-stone) opacity-50" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-display line-clamp-2 text-lg font-medium leading-snug tracking-tight transition-colors group-hover:text-(--ed-blue)">
                        {t.name}
                      </h3>
                      {t.series && (
                        <p className="mt-0.5 truncate text-xs text-(--ed-stone)">
                          {t.series} {t.season ? `· ${t.season}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Facts */}
                <div className="mt-5 space-y-2.5 border-t border-(--ed-hair) p-6 pt-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-(--ed-stone)">
                      <Banknote className="h-4 w-4" />
                      Prize pool
                    </span>
                    <span className="font-medium">
                      <PrizePoolBadge amount={t.prizePool} currency={t.currency} usdRate={t.usdRate} inline />
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-(--ed-stone)">
                      <Calendar className="h-4 w-4" />
                      Dates
                    </span>
                    <span className="num text-right">{formatDate(t.startDate)} — {formatDate(t.endDate)}</span>
                  </div>

                  {primaryVenue && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-(--ed-stone)">
                        <MapPin className="h-4 w-4" />
                        Location
                      </span>
                      <span className="truncate text-right">
                        {primaryVenue.name} {primaryVenue.city ? `(${primaryVenue.city})` : ''}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 border-t border-(--ed-hair) pt-3">
                    <span className="flex items-center gap-3 text-xs text-(--ed-stone)">
                      <span className="num">{t._count.matches} matches</span>
                      <span aria-hidden>·</span>
                      <span className="num">{t._count.teams} teams</span>
                    </span>
                    <span className="flex items-center gap-1 text-sm font-medium text-(--ed-blue)">
                      Explore <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
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
