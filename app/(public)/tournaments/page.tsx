import type { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { Trophy, Swords, Users, ArrowRight, Flame } from 'lucide-react';
import { PrizePoolBadge } from '@/components/ui/prize-pool-badge';
import { GameLogo } from '@/components/ui/game-capsule';
import { TournamentsDirectoryExplorer } from '@/components/tournaments/tournaments-directory-explorer';
import { formatDate } from '@/lib/utils';
import { DirectoryPagination } from '@/components/directory-pagination';
import { directoryMetadata, SITE_NAME } from '@/lib/seo';

/*
 * Filter and page state over the same directory — see the note on /teams.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;

  return {
    title: `BGMI Tournaments — Standings & Results | ${SITE_NAME}`,
    description:
      'Browse official BGMI, Valorant, CS2, MLBB and Free Fire esports tournaments — points tables, match schedules, prize pools and championship results.',
    ...directoryMetadata({
      path: '/tournaments',
      params,
      filterKeys: ['q', 'status', 'game', 'tier'],
      defaults: { status: 'ALL', game: 'ALL', tier: 'ALL' },
    }),
  };
}

const PAGE_SIZE = 200;

type TournamentsFilters = { q: string; status: string; game: string; tier: string };

function tournamentsWhere(filters: TournamentsFilters, opts: { skip?: 'status' | 'game' | 'tier' } = {}) {
  const where: Record<string, unknown> = {};
  if (opts.skip !== 'status' && filters.status !== 'ALL') where.status = filters.status;
  if (opts.skip !== 'tier' && filters.tier !== 'ALL') where.tier = { startsWith: filters.tier };
  if (opts.skip !== 'game' && filters.game !== 'ALL') {
    where.OR = [
      { game: { slug: filters.game } },
      { games: { some: { game: { slug: filters.game } } } },
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

async function getFeaturedTournament() {
  for (const status of ['ONGOING', 'UPCOMING'] as const) {
    const t = await prisma.tournament.findFirst({
      where: { status },
      orderBy: { startDate: status === 'ONGOING' ? 'desc' : 'asc' },
      select: featuredSelect,
    });
    if (t) return t;
  }
  return prisma.tournament.findFirst({
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
  prizePool: true,
  currency: true,
  usdRate: true,
  winner: true,
  game: { select: { name: true, slug: true, shortName: true, logoUrl: true, logoDarkUrl: true } },
  _count: { select: { matches: true, teams: true } },
} as const;

async function getTournamentsDirectoryData(filters: TournamentsFilters, page: number) {
  try {
    const [tournaments, games] = await Promise.all([
      prisma.tournament.findMany({
        where: tournamentsWhere(filters),
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
      prisma.game.findMany({
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
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filters: TournamentsFilters = {
    q: params.q?.trim() ?? '',
    status: params.status ?? 'ALL',
    game: params.game ?? 'ALL',
    tier: params.tier ?? 'ALL',
  };
  const page = Math.max(1, Number(params.page) || 1);

  const [{ tournaments, games }, total, statusGroups, gameGroups, tierGroups, totalMatchesTracked, totalTeamsTracked, featured] =
    await Promise.all([
      getTournamentsDirectoryData(filters, page),
      prisma.tournament.count({ where: tournamentsWhere(filters) }),
      prisma.tournament.groupBy({ by: ['status'], where: tournamentsWhere(filters, { skip: 'status' }), _count: { _all: true } }),
      prisma.tournament.groupBy({ by: ['gameId'], where: tournamentsWhere(filters, { skip: 'game' }), _count: { _all: true } }),
      prisma.tournament.groupBy({ by: ['tier'], where: tournamentsWhere(filters, { skip: 'tier' }), _count: { _all: true } }),
      prisma.match.count(),
      prisma.tournamentTeam.count(),
      getFeaturedTournament(),
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
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
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
                    {formatDate(featured.startDate)} — {formatDate(featured.endDate)}
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
                  href={`/tournaments/${featured.slug}`}
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
        />

        <div className="mt-10">
          <DirectoryPagination
            basePath="/tournaments"
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
