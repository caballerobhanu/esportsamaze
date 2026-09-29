import prisma from '@/lib/prisma';
import type { GameNaming } from '@/lib/games';
import { GAMES_TAG } from '@/lib/cache-tags';
import { cachedRead } from '@/lib/cached-read';

/**
 * Server-only game/family lookups (Prisma), split from `lib/games.ts` so client
 * components can import the pure helpers without pulling Prisma into the bundle.
 *
 * Every lookup here is cached. `getGameBySlug` in particular runs on the request
 * path of every game-scoped route — the `[game]` layout reads it — so it was one
 * of the queries every public request paid for. Games and families change only
 * when an admin edits them (`app/admin/(panel)/games/page.tsx`, which purges
 * `GAMES_TAG`), so a long TTL is safe.
 */

export interface GameSummary {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  familyId: string | null;
  familySlug: string | null;
}

export interface FamilySummary {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
}

const GAME_SELECT = {
  id: true,
  slug: true,
  name: true,
  shortName: true,
  familyId: true,
  family: { select: { slug: true } },
} as const;

/** Games and families are admin-edited only, so an hour between revalidations is ample. */
const GAMES_REVALIDATE = 3600;

function toGame(g: {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  familyId: string | null;
  family: { slug: string } | null;
}): GameSummary {
  return {
    id: g.id,
    slug: g.slug,
    name: g.name,
    shortName: g.shortName,
    familyId: g.familyId,
    familySlug: g.family?.slug ?? null,
  };
}

async function readGameBySlug(slug: string): Promise<GameSummary | null> {
  const trimmed = slug?.trim();
  if (!trimmed) return null;
  const game = await prisma.game.findUnique({ where: { slug: trimmed }, select: GAME_SELECT });
  return game ? toGame(game) : null;
}

/** A game by its URL slug, or null when no such game exists (caller renders 404). */
export const getGameBySlug = cachedRead(readGameBySlug, 'game-queries:game-by-slug', {
  tags: [GAMES_TAG],
  revalidate: GAMES_REVALIDATE,
});

async function readListGames(): Promise<GameSummary[]> {
  const games = await prisma.game.findMany({ select: GAME_SELECT, orderBy: { name: 'asc' } });
  return games.map(toGame);
}

/** Every game, for `generateStaticParams` and the nav switcher. */
export const listGames = cachedRead(readListGames, 'game-queries:list-games', {
  tags: [GAMES_TAG],
  revalidate: GAMES_REVALIDATE,
});

async function readListFamilies(): Promise<FamilySummary[]> {
  return prisma.gameFamily.findMany({
    select: { id: true, slug: true, name: true, logoUrl: true },
    orderBy: { name: 'asc' },
  });
}

/** Every game family, for the nav switcher and family hubs. */
export const listFamilies = cachedRead(readListFamilies, 'game-queries:list-families', {
  tags: [GAMES_TAG],
  revalidate: GAMES_REVALIDATE,
});

async function readGamesInFamily(familyId: string): Promise<GameSummary[]> {
  const games = await prisma.game.findMany({
    where: { familyId },
    select: GAME_SELECT,
    orderBy: { name: 'asc' },
  });
  return games.map(toGame);
}

/** The games sharing a family — the set `/compare` may pair across. */
export const gamesInFamily = cachedRead(readGamesInFamily, 'game-queries:games-in-family', {
  tags: [GAMES_TAG],
  revalidate: GAMES_REVALIDATE,
});

export interface FamilyWithGames extends FamilySummary {
  games: GameSummary[];
}

async function readFamilyBySlug(slug: string): Promise<FamilyWithGames | null> {
  const trimmed = slug?.trim();
  if (!trimmed) return null;
  const family = await prisma.gameFamily.findUnique({
    where: { slug: trimmed },
    select: { id: true, slug: true, name: true, logoUrl: true, games: { select: GAME_SELECT, orderBy: { name: 'asc' } } },
  });
  if (!family) return null;
  return {
    id: family.id,
    slug: family.slug,
    name: family.name,
    logoUrl: family.logoUrl,
    games: family.games.map(toGame),
  };
}

/** A family by slug, with its games, for a family hub. */
export const getFamilyBySlug = cachedRead(readFamilyBySlug, 'game-queries:family-by-slug', {
  tags: [GAMES_TAG],
  revalidate: GAMES_REVALIDATE,
});

/** The family slug a game belongs to, or null when the game has none / is unknown. */
export async function familyOf(gameSlug: string): Promise<string | null> {
  const game = await getGameBySlug(gameSlug);
  return game?.familySlug ?? null;
}

/**
 * Whether two games may be compared. Games with no family compare only with
 * themselves, so an ungrouped title never silently pairs with another.
 */
export async function sameFamily(gameSlugA: string, gameSlugB: string): Promise<boolean> {
  if (gameSlugA === gameSlugB) return true;
  const [a, b] = await Promise.all([familyOf(gameSlugA), familyOf(gameSlugB)]);
  return a !== null && a === b;
}
