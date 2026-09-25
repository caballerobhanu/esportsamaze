'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Trophy, Calendar, MapPin, ArrowRight, Banknote } from 'lucide-react';
import { formatTournamentDates } from '@/lib/tournament-dates';
import { PrizePoolBadge } from '@/components/ui/prize-pool-badge';
import { GameLogo } from '@/components/ui/game-capsule';
import { ThemeLogo } from '@/components/ui/theme-logo';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';

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
  datePrecision?: string | null;
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
    className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    dot: true,
  },
  UPCOMING: { label: 'Upcoming', className: 'bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-300' },
  COMPLETED: {
    label: 'Completed',
    className: 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  CANCELED: { label: 'Canceled', className: 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300' },
};

export function TournamentsDirectoryExplorer({
  tournaments,
  games,
  filters,
  counts,
  page = 1,
  totalPages = 1,
  basePath = gameHref(DEFAULT_GAME_SLUG, 'tournaments'),
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
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white py-20 text-center shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <Trophy className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-lg font-black tracking-tight text-slate-950 dark:text-white">No tournaments match your filters</p>
          <p className="max-w-sm text-sm font-medium text-slate-500 dark:text-slate-400">Try adjusting your search or selecting a different status, game, or tier.</p>
        </div>
      ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tournaments.map((t) => {
            const statusCfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.COMPLETED;
            const primaryVenue = t.venues?.[0]?.venue;

            return (
              <Link
                key={t.id}
                href={gameHref(t.game?.slug || DEFAULT_GAME_SLUG, `tournaments/${t.slug}`)}
                className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:border-[#0A5FC4] hover:shadow-lg dark:border-white/10 dark:bg-[#0b1220]"
              >
                <div className="p-5 pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${statusCfg.className}`}
                    >
                      {statusCfg.dot && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />}
                      {statusCfg.label}
                    </span>

                    {t.tier && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:bg-white/5 dark:text-slate-300">
                        {t.tier}
                      </span>
                    )}
                  </div>

                  {/* Ecosystem chips — primary + cross-region participants */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#0A5FC4]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-300"
                      title={t.game.name}
                    >
                      <GameLogo game={t.game} className="h-3 w-3" />
                      {t.game.shortName || t.game.name}
                    </span>
                    {(t.games ?? [])
                      .filter((g) => g.game.slug !== t.game.slug)
                      .map((g) => (
                        <span
                          key={g.game.slug}
                          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:bg-white/5 dark:text-slate-300"
                          title={g.game.name}
                        >
                          <GameLogo game={g.game} className="h-3 w-3" />
                          {g.game.shortName || g.game.name}
                        </span>
                      ))}
                  </div>

                  <div className="mt-5 flex items-start gap-4">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/5">
                      {t.imageUrl || t.imageDarkUrl ? (
                        <ThemeLogo
                          lightSrc={t.imageUrl}
                          darkSrc={t.imageDarkUrl}
                          alt={t.name}
                          className="object-contain p-1"
                        />
                      ) : (
                        <Trophy className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-base font-black leading-snug tracking-tight text-slate-950 transition-colors group-hover:text-[#0A5FC4] dark:text-white dark:group-hover:text-blue-300">
                        {t.name}
                      </h3>
                      {t.series && (
                        <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {t.series} {t.season ? `· ${t.season}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Facts — label above value, so every figure gets the full card
                    width and all cards in a row share one skeleton */}
                <div className="mt-5 border-t border-slate-200 p-5 pt-5 dark:border-white/10">
                  <dl className="space-y-4">
                    <div>
                      <dt className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <Banknote className="h-3.5 w-3.5 text-[#0A5FC4] dark:text-blue-300" />
                        Prize pool
                      </dt>
                      <dd className="mt-1.5 text-xl font-black tracking-tight text-[#0A5FC4] dark:text-blue-300">
                        <PrizePoolBadge amount={t.prizePool} currency={t.currency} usdRate={t.usdRate} inline />
                      </dd>
                    </div>

                    <div>
                      <dt className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <Calendar className="h-3.5 w-3.5 text-[#0A5FC4] dark:text-blue-300" />
                        Dates
                      </dt>
                      <dd className="num mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                        {formatTournamentDates(t.startDate, t.endDate, t.datePrecision)}
                      </dd>
                    </div>

                    <div>
                      <dt className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <MapPin className="h-3.5 w-3.5 text-[#0A5FC4] dark:text-blue-300" />
                        Location
                      </dt>
                      <dd className="mt-1 truncate text-sm font-bold text-slate-700 dark:text-slate-200">
                        {primaryVenue?.city || t.eventType || '—'}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-white/10">
                    <span className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span className="num">{t._count.matches} matches</span>
                      <span aria-hidden>·</span>
                      <span className="num">{t._count.teams} teams</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-300">
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
