import prisma from '@/lib/prisma';
import type { GameNaming } from '@/lib/games';

/**
 * Server-only game/family lookups (Prisma), split from `lib/games.ts` so client
 * components can import the pure helpers without pulling Prisma into the bundle.
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

/** A game by its URL slug, or null when no such game exists (caller renders 404). */
export async function getGameBySlug(slug: string): Promise<GameSummary | null> {
  const trimmed = slug?.trim();
  if (!trimmed) return null;
  const game = await prisma.game.findUnique({ where: { slug: trimmed }, select: GAME_SELECT });
  return game ? toGame(game) : null;
}

/** Every game, for `generateStaticParams` and the nav switcher. */
export async function listGames(): Promise<GameSummary[]> {
  const games = await prisma.game.findMany({ select: GAME_SELECT, orderBy: { name: 'asc' } });
  return games.map(toGame);
}

/** Every game family, for the nav switcher and family hubs. */
export async function listFamilies(): Promise<FamilySummary[]> {
  return prisma.gameFamily.findMany({
    select: { id: true, slug: true, name: true, logoUrl: true },
    orderBy: { name: 'asc' },
  });
}

/** The games sharing a family — the set `/compare` may pair across. */
export async function gamesInFamily(familyId: string): Promise<GameSummary[]> {
  const games = await prisma.game.findMany({
    where: { familyId },
    select: GAME_SELECT,
    orderBy: { name: 'asc' },
  });
  return games.map(toGame);
}

export interface FamilyWithGames extends FamilySummary {
  games: GameSummary[];
}

/** A family by slug, with its games, for a family hub. */
export async function getFamilyBySlug(slug: string): Promise<FamilyWithGames | null> {
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
