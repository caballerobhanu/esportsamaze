import type { Metadata } from 'next';
import {
  CalendarDays,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import prisma from '@/lib/prisma';
import { DirectoryPagination } from '@/components/directory-pagination';
import { TeamsDirectoryExplorer } from '@/components/teams/teams-directory-explorer';
import { directoryMetadata, SITE_NAME } from '@/lib/seo';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';
import { getGameBySlug } from '@/lib/game-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/*
 * A game page lists its whole FAMILY's teams and opens with the path's game
 * selected; `?game=` picks another family game or ALL. Teams with no game fall
 * back to the default game, so they are included when the default family is the
 * one being shown.
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
    title: `${label} Teams — Rosters, Rankings & Results | ${SITE_NAME}`,
    description:
      `Every ${pathGame?.name ?? 'BGMI'} and same-family esports team — verified rosters, regional info, KRAFTON rankings and tournament history.`,
    ...directoryMetadata({
      path: gameHref(game, 'teams'),
      params: search,
      filterKeys: ['q', 'status', 'region', 'letter', 'game'],
      defaults: { status: 'ALL', region: 'ALL', letter: 'ALL', game },
    }),
  };
}

const PAGE_SIZE = 200;

type TeamsFilters = {
  q: string;
  status: string;
  game: string;
  family: string;
  region: string;
  letter: string;
  sort: string;
};

/** The family's game slugs; `includeNull` covers teams with no game (default-game fallback). */
interface TeamScope {
  familySlugs: string[];
  includeNull: boolean;
}

/**
 * A Team-level filter for the family, or one game within it. Teams with no game
 * answer the DEFAULT game's URLs, so they join only when that game is in scope.
 */
function teamGameClause(gameSlugs: string[], includeNull: boolean): Record<string, unknown> {
  const parts: Record<string, unknown>[] = [];
  if (gameSlugs.length > 0) parts.push({ game: { slug: { in: gameSlugs } } });
  if (includeNull) parts.push({ gameId: null });
  if (parts.length === 0) return { game: { slug: '__no_game_family__' } };
  return parts.length === 1 ? parts[0] : { OR: parts };
}

/** Whether unassigned (null-game) teams belong to this selection. */
function scopeIncludesNull(scope: TeamScope, gameSlugs: string[]): boolean {
  return scope.includeNull && (gameSlugs.length !== 1 || gameSlugs[0] === DEFAULT_GAME_SLUG);
}

function teamsWhere(
  filters: TeamsFilters,
  scope: TeamScope,
  opts: { skip?: 'status' | 'game' | 'region' } = {}
) {
  const where: Record<string, unknown> = { isVerified: true };

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: 'insensitive' } },
      { displayName: { contains: filters.q, mode: 'insensitive' } },
      { tag: { contains: filters.q, mode: 'insensitive' } },
      { region: { contains: filters.q, mode: 'insensitive' } },
      { game: { name: { contains: filters.q, mode: 'insensitive' } } },
      { game: { shortName: { contains: filters.q, mode: 'insensitive' } } },
    ];
  }
  if (filters.letter !== 'ALL') {
    where.name = { startsWith: filters.letter, mode: 'insensitive' };
  }
  if (opts.skip !== 'status' && filters.status !== 'ALL') {
    where.status = filters.status;
  }
  // The family bound always applies; for the game facet count, ignore which game
  // is selected so the other chips keep their own counts. AND-ed so it never
  // clobbers the search OR above.
  const gameSlugs =
    opts.skip === 'game' || filters.game === 'ALL' ? scope.familySlugs : [filters.game];
  where.AND = [teamGameClause(gameSlugs, scopeIncludesNull(scope, gameSlugs))];
  if (opts.skip !== 'region' && filters.region !== 'ALL') {
    where.region = filters.region;
  }
  return where as never;
}

async function getTeamsDirectoryData(filters: TeamsFilters, scope: TeamScope, page: number) {
  const where = teamsWhere(filters, scope);
  const orderBy =
    filters.sort === 'titles'
      ? [{ tournamentsWon: { _count: 'desc' as const } }, { name: 'asc' as const }]
      : filters.sort === 'name-desc'
        ? [{ name: 'desc' as const }]
        : [{ name: 'asc' as const }];

  return Promise.all([
    prisma.team.findMany({
      where,
      orderBy: orderBy as never,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        displayName: true,
        slug: true,
        tag: true,
        logoUrl: true,
        imageDarkUrl: true,
        region: true,
        status: true,
        founded: true,
        game: {
          select: {
            name: true,
            slug: true,
            shortName: true,
            logoUrl: true,
            logoDarkUrl: true,
            family: { select: { slug: true, name: true } },
          },
        },
        _count: {
          select: {
            players: true,
            tournamentRosters: true,
            tournamentsWon: true,
          },
        },
      },
    }),
    prisma.team.count({ where }),
  ]);
}

export default async function TeamsPage({
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
        select: {
          id: true,
          name: true,
          slug: true,
          shortName: true,
          logoUrl: true,
          logoDarkUrl: true,
          family: { select: { slug: true, name: true } },
        },
        orderBy: { name: 'asc' },
      })
    : [];
  const familySlugs = siblingGames.length > 0 ? siblingGames.map((g) => g.slug) : [pathGame];
  const scope: TeamScope = {
    familySlugs,
    // Teams with no game answer the default game's URLs, so they belong here.
    includeNull: familySlugs.includes(DEFAULT_GAME_SLUG),
  };

  const requested = params.game?.trim() ?? '';
  const selectedGame =
    requested && (requested === 'ALL' || familySlugs.includes(requested)) ? requested : pathGame;

  const filters: TeamsFilters = {
    q: params.q?.trim() ?? '',
    status: params.status ?? 'ALL',
    game: selectedGame,
    // The page is family-pinned, so the separate family filter no longer applies.
    family: 'ALL',
    region: params.region ?? 'ALL',
    letter: (params.letter ?? 'ALL').toUpperCase(),
    sort: ['titles', 'name-desc'].includes(params.sort ?? '') ? (params.sort as string) : 'name',
  };
  const page = Math.max(1, Number(params.page) || 1);

  const familyClause = teamGameClause(scope.familySlugs, scope.includeNull);

  // Slice + total + facet counts (each facet's count excludes its own filter)
  const [[teams, total], statusGroups, gameGroups, regionGroups, playersOnRosters, totalAppearances, totalTitles] =
    await Promise.all([
      getTeamsDirectoryData(filters, scope, page),
      prisma.team.groupBy({ by: ['status'], where: teamsWhere(filters, scope, { skip: 'status' }), _count: { _all: true } }),
      prisma.team.groupBy({ by: ['gameId'], where: teamsWhere(filters, scope, { skip: 'game' }), _count: { _all: true } }),
      prisma.team.groupBy({ by: ['region'], where: teamsWhere(filters, scope, { skip: 'region' }), _count: { _all: true } }),
      prisma.player.count({ where: { currentTeam: { isVerified: true, AND: [familyClause] } } }),
      prisma.tournamentTeam.count({ where: { team: { isVerified: true, AND: [familyClause] } } }),
      prisma.tournament.count({ where: { winnerTeam: { isVerified: true, AND: [familyClause] } } }),
    ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const gameCountById = new Map(gameGroups.map((g) => [g.gameId, g._count._all]));
  const counts = {
    total,
    statuses: statusGroups
      .map((s) => [s.status?.trim() || 'ACTIVE', s._count._all] as [string, number])
      .sort((a, b) => b[1] - a[1]),
    games: siblingGames
      .map((g) => ({
        slug: g.slug,
        name: g.name,
        shortName: g.shortName,
        logoUrl: g.logoUrl,
        logoDarkUrl: g.logoDarkUrl,
        count: gameCountById.get(g.id) ?? 0,
      }))
      .sort((a, b) => b.count - a.count),
    families: (() => {
      const byFamily = new Map<string, { name: string; count: number }>();
      for (const g of siblingGames) {
        const count = gameCountById.get(g.id) ?? 0;
        if (!g.family || count === 0) continue;
        const entry = byFamily.get(g.family.slug) ?? { name: g.family.name, count: 0 };
        entry.count += count;
        byFamily.set(g.family.slug, entry);
      }
      return [...byFamily.entries()].map(([slug, v]) => ({ slug, ...v })).sort((a, b) => b.count - a.count);
    })(),
    regions: regionGroups
      .map((r) => ({ name: r.region?.trim() || 'Global', count: r._count._all }))
      .sort((a, b) => b.count - a.count),
  };

  const metrics = [
    { label: 'Teams Tracked', icon: ShieldCheck, value: total },
    { label: 'Players on Rosters', icon: Users, value: playersOnRosters },
    { label: 'Event Appearances', icon: CalendarDays, value: totalAppearances },
    { label: 'Championships Won', icon: Trophy, value: totalTitles },
  ];

  const paginationParams = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v && v !== 'ALL')
  ) as Record<string, string>;

  return (
    <div className="min-h-screen bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors">
      {/* ================= HERO MASTHEAD ================= */}
      <section className="border-b border-[var(--ed-hair)] bg-[var(--ed-surface)] py-7 sm:py-12">
        <div className="mx-auto w-full max-w-[var(--page-max-width)] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="kicker inline-flex items-center gap-2 text-[var(--ed-blue)]">
                <ShieldCheck className="h-3 w-3 text-[var(--ed-blue)]" aria-hidden />
                Official Team &amp; Roster Wiki
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
                Teams
              </h1>
              <p className="mt-2 max-w-xl text-sm font-medium text-[var(--ed-stone)]">
                Every organization in the eSportsAmaze verified database — explore active rosters,
                trophy cabinets, match history, and publisher circuit records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= MAIN CONTENT ================= */}
      <main className="mx-auto w-full max-w-[var(--page-max-width)] space-y-8 px-4 py-8 sm:space-y-10 sm:px-6 lg:px-8">
        {/* Metric ribbon */}
        <div className="ed-card grid grid-cols-2 md:grid-cols-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] overflow-hidden shadow-xs">
          {metrics.map((m) => (
            <div key={m.label} className="flex flex-col items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-4 py-6 last:border-b-0 md:border-r md:last:border-r-0">
              <m.icon className="h-4 w-4 text-[var(--ed-blue)]" aria-hidden />
              <p className="num text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{m.value}</p>
              <p className="ed-label text-[10px] font-bold uppercase tracking-wider text-slate-400">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Directory */}
        <TeamsDirectoryExplorer
          teams={teams}
          filters={filters}
          counts={counts}
          page={page}
          totalPages={totalPages}
          basePath={gameHref(pathGame, 'teams')}
        />

        <DirectoryPagination
          basePath={gameHref(pathGame, 'teams')}
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          entityPlural="teams"
          params={paginationParams}
        />
      </main>
    </div>
  );
}
