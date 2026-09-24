import type { Metadata } from 'next';
import { Crosshair, Users, ShieldCheck, Flame } from 'lucide-react';
import prisma from '@/lib/prisma';
import { DirectoryPagination } from '@/components/directory-pagination';
import { PlayersDirectoryExplorer, type PlayersDirectoryItem } from '@/components/players/players-directory-explorer';
import { directoryMetadata, SITE_NAME } from '@/lib/seo';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';
import { getGameBySlug } from '@/lib/game-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/*
 * A game page lists its whole FAMILY's players and opens with the path's game
 * selected; `?game=` picks another family game or ALL. Players with no game fall
 * back to the default game, so they are included for the default family.
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
    title: `${label} Players — Stats, Teams & Profiles | ${SITE_NAME}`,
    description:
      `Verified ${pathGame?.name ?? 'BGMI'} and same-family esports athletes — in-game names, roles, teams and career statistics.`,
    ...directoryMetadata({
      path: gameHref(game, 'players'),
      params: search,
      filterKeys: ['q', 'role', 'letter', 'game'],
      defaults: { role: 'ALL', game },
    }),
  };
}

const PAGE_SIZE = 80;
const ROLES = ['ALL', 'Assaulter', 'IGL', 'Support', 'Sniper', 'Flex'];

type PlayersFilters = {
  q: string;
  role: string;
  game: string;
  letter: string;
  sort: string;
};

/** The family's game slugs; `includeNull` covers players with no game. */
interface PlayerScope {
  familySlugs: string[];
  includeNull: boolean;
}

/**
 * A Player-level filter. Players with no game answer the DEFAULT game's URLs, so
 * they join only when that game is in scope.
 */
function playerGameClause(gameSlugs: string[], includeNull: boolean): Record<string, unknown> {
  const parts: Record<string, unknown>[] = [];
  if (gameSlugs.length > 0) parts.push({ game: { slug: { in: gameSlugs } } });
  if (includeNull) parts.push({ gameId: null });
  if (parts.length === 0) return { game: { slug: '__no_game_family__' } };
  return parts.length === 1 ? parts[0] : { OR: parts };
}

/** Whether unassigned (null-game) players belong to this selection. */
function scopeIncludesNull(scope: PlayerScope, gameSlugs: string[]): boolean {
  return scope.includeNull && (gameSlugs.length !== 1 || gameSlugs[0] === DEFAULT_GAME_SLUG);
}

function playersWhere(
  filters: PlayersFilters,
  scope: PlayerScope,
  opts: { skip?: 'role' | 'game' } = {}
) {
  const where: Record<string, unknown> = { isVerified: true };
  if (filters.q) {
    where.OR = [
      { ign: { contains: filters.q, mode: 'insensitive' } },
      { firstName: { contains: filters.q, mode: 'insensitive' } },
      { lastName: { contains: filters.q, mode: 'insensitive' } },
      { currentTeam: { name: { contains: filters.q, mode: 'insensitive' } } },
      { currentTeam: { tag: { contains: filters.q, mode: 'insensitive' } } },
    ];
  }
  if (opts.skip !== 'role' && filters.role !== 'ALL') {
    where.role = { equals: filters.role, mode: 'insensitive' };
  }
  // The family bound always applies; for the game facet count, ignore which game
  // is selected so the other chips keep their own counts. AND-ed so it never
  // clobbers the search OR above.
  const gameSlugs =
    opts.skip === 'game' || filters.game === 'ALL' ? scope.familySlugs : [filters.game];
  where.AND = [playerGameClause(gameSlugs, scopeIncludesNull(scope, gameSlugs))];
  if (filters.letter) {
    where.ign = { startsWith: filters.letter, mode: 'insensitive' };
  }
  return where as never;
}

async function getPlayersDirectoryData(
  filters: PlayersFilters,
  scope: PlayerScope,
  page: number
): Promise<PlayersDirectoryItem[]> {
  const list = await prisma.player.findMany({
    where: playersWhere(filters, scope),
    orderBy:
      filters.sort === 'matches'
        ? [{ matchStats: { _count: 'desc' as const } }, { ign: 'asc' as const }]
        : filters.sort === 'ign-desc'
          ? [{ ign: 'desc' as const }]
          : [{ ign: 'asc' as const }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      ign: true,
      slug: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      avatarUrl: true,
      nationality: true,
      isVerified: true,
      game: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      currentTeam: {
        select: {
          id: true,
          name: true,
          tag: true,
          logoUrl: true,
        },
      },
      _count: {
        select: {
          matchStats: true,
          transferHistory: true,
        },
      },
    },
  });

  return list.map((p) => ({
    ...p,
    name: [p.firstName, p.lastName].filter(Boolean).join(' ') || null,
  }));
}

export default async function PlayersPage({
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
  const familySlugs = siblingGames.length > 0 ? siblingGames.map((g) => g.slug) : [pathGame];
  const scope: PlayerScope = {
    familySlugs,
    includeNull: familySlugs.includes(DEFAULT_GAME_SLUG),
  };

  const requested = params.game?.trim() ?? '';
  const selectedGame =
    requested && (requested === 'ALL' || familySlugs.includes(requested)) ? requested : pathGame;

  const filters: PlayersFilters = {
    q: params.q?.trim() ?? '',
    role: params.role ?? 'ALL',
    game: selectedGame,
    letter: (params.letter ?? '').toUpperCase(),
    sort: ['matches', 'ign-desc'].includes(params.sort ?? '') ? (params.sort as string) : 'ign',
  };
  const page = Math.max(1, Number(params.page) || 1);

  const familyClause = playerGameClause(scope.familySlugs, scope.includeNull);
  const [players, total, roleGroups, gameGroups, teamsRepresented] = await Promise.all([
    getPlayersDirectoryData(filters, scope, page),
    prisma.player.count({ where: playersWhere(filters, scope) }),
    prisma.player.groupBy({ by: ['role'], where: playersWhere(filters, scope, { skip: 'role' }), _count: { _all: true } }),
    prisma.player.groupBy({ by: ['gameId'], where: playersWhere(filters, scope, { skip: 'game' }), _count: { _all: true } }),
    prisma.team.count({
      where: { players: { some: { isVerified: true, AND: [familyClause] } } },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const roleCountBy = new Map(roleGroups.map((r) => [r.role?.toLowerCase() ?? '', r._count._all]));
  const gameCountById = new Map(gameGroups.map((g) => [g.gameId, g._count._all]));
  const counts = {
    total,
    roles: Object.fromEntries(ROLES.map((r) => [r, roleCountBy.get(r.toLowerCase()) ?? 0])),
    // Only the family's games are offered.
    games: siblingGames
      .map((g) => ({
        slug: g.slug,
        name: g.name,
        count: gameCountById.get(g.id) ?? 0,
        shortName: g.shortName,
        logoUrl: g.logoUrl,
        logoDarkUrl: g.logoDarkUrl,
      }))
      .filter((g) => g.count > 0),
  };

  const metrics = [
    { label: 'Verified Athletes', icon: Crosshair, value: total },
    { label: 'Assaulters & Fraggers', icon: Flame, value: counts.roles['Assaulter'] ?? 0 },
    { label: 'In-Game Leaders (IGLs)', icon: ShieldCheck, value: counts.roles['IGL'] ?? 0 },
    { label: 'Rosters Represented', icon: Users, value: teamsRepresented },
  ];

  const paginationParams = Object.fromEntries(
    Object.entries(filters).filter(([k, v]) => v && (v !== 'ALL' || k === 'game'))
  ) as Record<string, string>;

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white">
      <main className="mx-auto w-full max-w-[var(--page-max-width)] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Masthead */}
        <div className="mb-10 space-y-3">
          <h1 className="text-4xl font-black uppercase tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            Players
          </h1>
          <p className="max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
            Browse verified esports athletes — tactical roles, current rosters, match records, and
            career statistics across every registered competitor.
          </p>
        </div>

        {/* Metric ribbon — rounded-3xl card */}
        <div className="mb-10 grid grid-cols-2 gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0b1220] md:grid-cols-4 md:divide-x divide-slate-200 dark:divide-white/10">
          {metrics.map((m) => (
            <div key={m.label} className="flex flex-col items-center gap-1.5 p-3 text-center">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <m.icon className="h-3.5 w-3.5 text-[#0A5FC4] dark:text-blue-300" />
                {m.label}
              </p>
              <p className="flex items-center gap-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                {m.value}
              </p>
            </div>
          ))}
        </div>

        {/* Directory */}
        <PlayersDirectoryExplorer
          players={players}
          filters={filters}
          counts={counts}
          page={page}
          totalPages={totalPages}
          basePath={gameHref(pathGame, 'players')}
        />

        <div className="mt-10">
          <DirectoryPagination
            basePath={gameHref(pathGame, 'players')}
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            entityPlural="players"
            params={paginationParams}
          />
        </div>
      </main>
    </div>
  );
}
