'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Trophy, Calendar, MapPin, Users, ArrowRight, Banknote } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { PrizePoolBadge } from '@/components/ui/prize-pool-badge';

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
  game: { name: string; slug: string };
  venues?: { venue: { name: string; city?: string | null; country?: string | null } }[];
  organizers?: { organizer: { name: string } }[];
  _count: {
    matches: number;
    teams: number;
  };
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
}: {
  tournaments: TournamentDirectoryItem[];
  games: { name: string; slug: string }[];
}) {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [gameFilter, setGameFilter] = React.useState<string>('ALL');
  const [tierFilter, setTierFilter] = React.useState<string>('ALL');

  const filtered = React.useMemo(() => {
    return tournaments.filter((t) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesSeries = t.series?.toLowerCase().includes(q);
        const matchesGame = t.game.name.toLowerCase().includes(q);
        const matchesOrg = t.organizers?.some((o) => o.organizer.name.toLowerCase().includes(q));
        const matchesVenue = t.venues?.some((v) => v.venue.name.toLowerCase().includes(q) || v.venue.city?.toLowerCase().includes(q));
        if (!matchesName && !matchesSeries && !matchesGame && !matchesOrg && !matchesVenue) {
          return false;
        }
      }

      if (statusFilter !== 'ALL' && t.status !== statusFilter) {
        return false;
      }

      if (gameFilter !== 'ALL' && t.game.slug !== gameFilter) {
        return false;
      }

      if (tierFilter !== 'ALL' && !(t.tier ?? '').startsWith(tierFilter)) {
        return false;
      }

      return true;
    });
  }, [tournaments, search, statusFilter, gameFilter, tierFilter]);

  const liveCount = tournaments.filter((t) => t.status === 'ONGOING').length;
  const upcomingCount = tournaments.filter((t) => t.status === 'UPCOMING').length;
  const completedCount = tournaments.filter((t) => t.status === 'COMPLETED').length;

  const hasActiveFilters =
    search !== '' || statusFilter !== 'ALL' || gameFilter !== 'ALL' || tierFilter !== 'ALL';

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
            <button onClick={() => setStatusFilter('ALL')} className={`ed-tab lg:border-b-0 lg:py-1.5 ${statusFilter === 'ALL' ? 'ed-tab-active' : ''}`}>
              All <span className="num text-xs opacity-70">({tournaments.length})</span>
            </button>
            <button onClick={() => setStatusFilter('ONGOING')} className={`ed-tab lg:border-b-0 lg:py-1.5 ${statusFilter === 'ONGOING' ? 'ed-tab-active' : ''}`}>
              {liveCount > 0 && <span className="h-1.5 w-1.5 animate-live rounded-full bg-rose-500" />}
              Live <span className="num text-xs opacity-70">({liveCount})</span>
            </button>
            <button onClick={() => setStatusFilter('UPCOMING')} className={`ed-tab lg:border-b-0 lg:py-1.5 ${statusFilter === 'UPCOMING' ? 'ed-tab-active' : ''}`}>
              Upcoming <span className="num text-xs opacity-70">({upcomingCount})</span>
            </button>
            <button onClick={() => setStatusFilter('COMPLETED')} className={`ed-tab lg:border-b-0 lg:py-1.5 ${statusFilter === 'COMPLETED' ? 'ed-tab-active' : ''}`}>
              Completed <span className="num text-xs opacity-70">({completedCount})</span>
            </button>
          </div>
        </div>

        {/* Game & tier filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-(--ed-hair) pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="ed-label mr-1">Game</span>
            <button
              onClick={() => setGameFilter('ALL')}
              className={`ed-chip transition-colors ${gameFilter === 'ALL' ? 'border-(--ed-blue) bg-(--ed-blue) text-white' : 'text-(--ed-stone) hover:border-(--ed-stone)/50'}`}
            >
              All games
            </button>
            {games.map((g) => (
              <button
                key={g.slug}
                onClick={() => setGameFilter(g.slug)}
                className={`ed-chip transition-colors ${gameFilter === g.slug ? 'border-(--ed-blue) bg-(--ed-blue) text-white' : 'text-(--ed-stone) hover:border-(--ed-stone)/50'}`}
              >
                {g.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="ed-label mr-1">Tier</span>
            {['ALL', 'S', 'A', 'B', 'C'].map((tier) => (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                className={`ed-chip transition-colors ${tierFilter === tier ? 'border-(--ed-blue) bg-(--ed-blue) text-white' : 'text-(--ed-stone) hover:border-(--ed-stone)/50'}`}
              >
                {tier === 'ALL' ? 'All' : `Tier ${tier}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-(--ed-stone)">
          Showing <span className="num font-medium text-(--ed-ink)">{filtered.length}</span> tournaments
        </p>
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('ALL');
              setGameFilter('ALL');
              setTierFilter('ALL');
            }}
            className="text-sm font-medium text-(--ed-blue) hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="ed-card flex flex-col items-center gap-3 py-20 text-center">
          <Trophy className="h-8 w-8 text-(--ed-stone) opacity-40" />
          <p className="font-display text-lg font-medium">No tournaments match your filters</p>
          <p className="max-w-sm text-sm text-(--ed-stone)">Try adjusting your search or selecting a different status, game, or tier.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => {
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
                      <span className="ed-chip px-2 py-0.5 text-[11px] text-(--ed-stone)">{t.game.name}</span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-(--ed-hair) bg-(--ed-canvas) p-1.5">
                      {t.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.imageUrl} alt={t.name} className="max-h-full max-w-full object-contain dark:hidden" />
                      )}
                      {t.imageDarkUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.imageDarkUrl} alt={t.name} className={`max-h-full max-w-full object-contain ${t.imageUrl ? 'hidden dark:block' : ''}`} />
                      )}
                      {!t.imageUrl && !t.imageDarkUrl && <Trophy className="h-5 w-5 text-(--ed-stone) opacity-50" />}
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
