import type { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { Trophy, Swords, Users, ArrowRight, Flame } from 'lucide-react';
import { PrizePoolBadge } from '@/components/ui/prize-pool-badge';
import { GameLogo } from '@/components/ui/game-capsule';
import { TournamentsDirectoryExplorer } from '@/components/tournaments/tournaments-directory-explorer';
import { formatTournamentDates } from '@/lib/tournament-dates';
import { DirectoryPagination } from '@/components/directory-pagination';
import { gameHref } from '@/lib/games';
import { getGameBySlug } from '@/lib/game-queries';
import { directoryMetadata, SITE_NAME } from '@/lib/seo';

/*
 * A game page lists its whole FAMILY (BGMI ↔ PUBG Mobile ↔ Game for Peace) and
 * opens with the path's game selected. `?game=` picks another family game, or
 * `ALL` for every event in the family. The family boundary is always applied, so
 * a Valorant event can never appear here.
 */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ game: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const { game } = await params;
  const search = await searchParams;
  const pathGame = await getGameBySlug(game);
  const label = pathGame?.shortName?.trim() || pathGame?.name || 'BGMI';

  return {
    title: `${label} Tournaments — Standings & Results | ${SITE_NAME}`,
    description:
      `Browse ${pathGame?.name ?? 'BGMI'} and same-family esports tournaments — points tables, match schedules, prize pools and championship results.`,
    ...directoryMetadata({
      path: gameHref(game, 'tournaments'),
      params: search,
      // `game` is the chip selection; the path's own game is the unfiltered default.
      filterKeys: ['q', 'status', 'tier', 'game'],
      defaults: { status: 'ALL', tier: 'ALL', game },
    }),
  };
}

const PAGE_SIZE = 200;

type TournamentsFilters = { q: string; status: string; game: string; tier: string };

/** The family's game slugs — the only games this page may ever show. */
interface GameScope {
  familySlugs: string[];
}

function tournamentsWhere(
  filters: TournamentsFilters,
  scope: GameScope,
  opts: { skip?: 'status' | 'game' | 'tier' } = {}
) {
  const where: Record<string, unknown> = {};
  if (opts.skip !== 'status' && filters.status !== 'ALL') where.status = filters.status;
  if (opts.skip !== 'tier' && filters.tier !== 'ALL') where.tier = { startsWith: filters.tier };

  // The game facet count must ignore the selected game but keep the family bound.
  const gameSlugs =
    opts.skip === 'game' || filters.game === 'ALL' ? scope.familySlugs : [filters.game];

  if (gameSlugs.length === 0) {
    // No family resolved: match nothing rather than silently listing every game.
    where.OR = [{ game: { slug: '__no_game_family__' } }];
  } else {
    where.OR = [
      { game: { slug: { in: gameSlugs } } },
      { games: { some: { game: { slug: { in: gameSlugs } } } } },
    ];
  }

  if (filters.q) {
    where.AND = [
      {
        OR: [
          { name: { contains: filters.q, mode: 'insensitive' } },
          { series: { contains: filters.q, mode: 'insensitive' } },
          { season: { contains: filters.q, mode: 'insensitive' } },
          { venues: { some: { venue: { OR: [
            { name: { contains: filters.q, mode: 'insensitive' } },
            { city: { contains: filters.q, mode: 'insensitive' } },
          ] } } } },
          { organizers: { some: { organizer: { name: { contains: filters.q, mode: 'insensitive' } } } } },
          { game: { name: { contains: filters.q, mode: 'insensitive' } } },
        ],
      },
    ];
  }
  return where as never;
}

/** The event whose card leads the page — within this family only. */
async function getFeaturedTournament(scope: GameScope) {
  const family =
    scope.familySlugs.length > 0
      ? {
          OR: [
            { game: { slug: { in: scope.familySlugs } } },
            { games: { some: { game: { slug: { in: scope.familySlugs } } } } },
          ],
        }
      : { id: '__none__' };

  for (const status of ['ONGOING', 'UPCOMING'] as const) {
    const t = await prisma.tournament.findFirst({
      where: { status, ...family },
      orderBy: { startDate: status === 'ONGOING' ? 'desc' : 'asc' },
      select: featuredSelect,
    });
    if (t) return t;
  }
  return prisma.tournament.findFirst({
    where: family,
    orderBy: { startDate: 'desc' },
    select: featuredSelect,
  });
}

const featuredSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  series: true,
  season: true,
  startDate: true,
  endDate: true,
  datePrecision: true,
  prizePool: true,
  currency: true,
  usdRate: true,
  winner: true,
  game: { select: { name: true, slug: true, shortName: true, logoUrl: true, logoDarkUrl: true } },
  _count: { select: { matches: true, teams: true } },
} as const;

async function getTournamentsDirectoryData(filters: TournamentsFilters, scope: GameScope, page: number) {
  try {
    const [tournaments, games] = await Promise.all([
      prisma.tournament.findMany({
        where: tournamentsWhere(filters, scope),
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          slug: true,
          tier: true,
          status: true,
          series: true,
          season: true,
          eventType: true,
          gameMode: true,
          startDate: true,
          endDate: true,
          datePrecision: true,
          prizePool: true,
          currency: true,
          usdRate: true,
          imageUrl: true,
          imageDarkUrl: true,
          winner: true,
          game: { select: { name: true, slug: true, shortName: true, logoUrl: true, logoDarkUrl: true } },
          games: {
            include: { game: { select: { name: true, slug: true } } },
            orderBy: { position: 'asc' },
          },
          venues: { include: { venue: { select: { name: true, city: true, country: true } } } },
          organizers: { include: { organizer: { select: { name: true } } } },
          _count: {
            select: {
              matches: true,
              teams: true,
            },
          },
        },
        orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
      }),
      // Only the family's games are offered as chips.
      prisma.game.findMany({
        where: scope.familySlugs.length > 0 ? { slug: { in: scope.familySlugs } } : { id: '__none__' },
        select: { id: true, name: true, slug: true, shortName: true, logoUrl: true, logoDarkUrl: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return { tournaments, games };
  } catch (error) {
    console.error('Failed to fetch tournaments directory data:', error);
    return { tournaments: [], games: [] };
  }
}

export default async function TournamentsPage({
  params: routeParams,
  searchParams,
}: {
  params: Promise<{ game: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { game: pathGame } = await routeParams;
  const params = await searchParams;

  // The family of the game in the path; every query below is bounded by it.
  const pathGameRow = await getGameBySlug(pathGame);
  const siblingGames = pathGameRow?.familyId
    ? await prisma.game.findMany({
        where: { familyId: pathGameRow.familyId },
        select: { id: true, name: true, slug: true, shortName: true, logoUrl: true, logoDarkUrl: true },
        orderBy: { name: 'asc' },
      })
    : [];
  const scope: GameScope = { familySlugs: siblingGames.map((g) => g.slug) };
  const familySlugs = scope.familySlugs.length > 0 ? scope.familySlugs : [pathGame];

  // The path's game is the default selection; a `?game=` chip may pick another
  // family game (or ALL), but never one outside the family.
  const requested = params.game?.trim() ?? '';
  const selectedGame =
    requested && (requested === 'ALL' || familySlugs.includes(requested)) ? requested : pathGame;

  const filters: TournamentsFilters = {
    q: params.q?.trim() ?? '',
    status: params.status ?? 'ALL',
    game: selectedGame,
    tier: params.tier ?? 'ALL',
  };
  const page = Math.max(1, Number(params.page) || 1);

  const [{ tournaments, games }, total, statusGroups, gameGroups, tierGroups, totalMatchesTracked, totalTeamsTracked, featured] =
    await Promise.all([
      getTournamentsDirectoryData(filters, scope, page),
      prisma.tournament.count({ where: tournamentsWhere(filters, scope) }),
      prisma.tournament.groupBy({ by: ['status'], where: tournamentsWhere(filters, scope, { skip: 'status' }), _count: { _all: true } }),
      prisma.tournament.groupBy({ by: ['gameId'], where: tournamentsWhere(filters, scope, { skip: 'game' }), _count: { _all: true } }),
      prisma.tournament.groupBy({ by: ['tier'], where: tournamentsWhere(filters, scope, { skip: 'tier' }), _count: { _all: true } }),
      prisma.match.count({ where: { game: { slug: { in: familySlugs } } } }),
      prisma.tournamentTeam.count({ where: { tournament: { game: { slug: { in: familySlugs } } } } }),
      getFeaturedTournament(scope),
    ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const statusCount = (s: string) => statusGroups.find((g) => g.status === s)?._count._all ?? 0;
  const gameCount = (slug: string) => gameGroups.find((g) => g.gameId === games.find((x) => x.slug === slug)?.id)?._count._all ?? 0;
  const tierCount = (t: string) => tierGroups.find((g) => g.tier?.startsWith(t))?._count._all ?? 0;
  const counts = { total, statuses: Object.fromEntries(['ONGOING', 'UPCOMING', 'COMPLETED', 'CANCELED'].map((s) => [s, statusCount(s)])), games: games.map((g) => ({ slug: g.slug, count: gameCount(g.slug) })), tiers: Object.fromEntries(['S', 'A', 'B', 'C'].map((t) => [t, tierCount(t)])) };

  const metrics = [
    { label: 'Total Tournaments', icon: Trophy, value: total },
    { label: 'Live Competitions', icon: Flame, value: statusCount('ONGOING'), live: true },
    { label: 'Matches Tracked', icon: Swords, value: totalMatchesTracked },
    { label: 'Teams Registered', icon: Users, value: totalTeamsTracked },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white">
      <main className="mx-auto w-full max-w-[var(--page-max-width)] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Estatic masthead */}
        <div className="mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#0A5FC4]/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-300">
            <Trophy className="h-3.5 w-3.5" />
            <span>Official Esports Championships</span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            Tournaments
          </h1>
          <p className="max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
            Browse verified esports championships — live stage standings, scheduled matchups,
            prize distributions, and competitive squad leaderboards.
          </p>
        </div>

        {/* Metric ribbon — rounded-3xl card */}
        <div className="mb-10 grid grid-cols-2 gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0b1220] md:grid-cols-4 md:divide-x divide-slate-200 dark:divide-white/10">
          {metrics.map((m) => (
            <div key={m.label} className="flex flex-col items-center gap-1.5 p-3 text-center">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <m.icon className={`h-3.5 w-3.5 ${m.live ? 'text-rose-500' : 'text-[#0A5FC4] dark:text-blue-300'}`} />
                {m.label}
              </p>
              <p className="flex items-center gap-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                {m.live && m.value > 0 && <span className="h-2 w-2 animate-ping rounded-full bg-rose-500" />}
                <span>{m.value}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Featured split card */}
        {featured && (
          <div className="relative mb-12 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
              <div className="space-y-4 lg:col-span-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                      featured.status === 'ONGOING'
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : featured.status === 'COMPLETED'
                          ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : featured.status === 'CANCELED'
                            ? 'border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-300'
                    }`}
                  >
                    {featured.status === 'ONGOING' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />}
                    {featured.status === 'COMPLETED' && <Trophy className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                    {featured.status === 'ONGOING'
                      ? 'Live Tournament'
                      : featured.status === 'COMPLETED'
                        ? 'Completed Championship'
                        : featured.status === 'CANCELED'
                          ? 'Canceled'
                          : 'Upcoming Event'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-600 dark:bg-white/5 dark:text-slate-300">
                    <GameLogo game={featured.game} className="h-3 w-3" />
                    {featured.game.shortName?.trim() || featured.game.name}
                  </span>
                  {featured.winner && featured.status === 'COMPLETED' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-black tracking-wider text-amber-600 dark:text-amber-400">
                      🏆 Champion: {featured.winner}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                  {featured.name}
                </h2>

                <p className="max-w-lg text-sm font-medium text-slate-500 dark:text-slate-400">
                  {featured.series ? `${featured.series} ${featured.season ? `· ${featured.season}` : ''} — ` : ''}
                  {featured._count.teams} professional teams{' '}
                  {featured.status === 'COMPLETED' ? 'competed' : 'competing'} across official match stages.
                </p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>
                    {formatTournamentDates(featured.startDate, featured.endDate, featured.datePrecision)}
                  </span>
                  <span>•</span>
                  <span>
                    {featured.status === 'COMPLETED'
                      ? `${featured._count.matches} matches played`
                      : `${featured._count.matches} matches scheduled`}
                  </span>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-6 dark:border-white/10 dark:bg-white/5 lg:col-span-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Total Prize Pool</p>
                  <div className="text-2xl font-black tracking-tight text-[#0A5FC4] dark:text-blue-300">
                    <PrizePoolBadge amount={featured.prizePool} currency={featured.currency} usdRate={featured.usdRate} />
                  </div>
                </div>

                <Link
                  href={gameHref(featured.game?.slug || pathGame, `tournaments/${featured.slug}`)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A5FC4] px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-600 hover:shadow-lg"
                >
                  <span>View Standings &amp; Matches</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Directory */}
        <TournamentsDirectoryExplorer
          tournaments={tournaments}
          games={games}
          filters={filters}
          counts={counts}
          page={page}
          totalPages={totalPages}
          basePath={gameHref(pathGame, 'tournaments')}
        />

        <div className="mt-10">
          <DirectoryPagination
            basePath={gameHref(pathGame, 'tournaments')}
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            entityPlural="tournaments"
            params={Object.fromEntries(Object.entries(filters).filter(([, v]) => v && v !== 'ALL'))}
          />
        </div>
      </main>
    </div>
  );
}
