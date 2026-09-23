/**
 * Game-scoped routing helpers — pure, so both server and client components can
 * import them without pulling in Prisma.
 *
 * The `[game]` URL segment is a game's `slug` (e.g. "bgmi"). An entity whose own
 * game is unknown (a null `gameId` team/player) falls back to the default game,
 * which is what keeps it on exactly one canonical URL; the DB side lives in
 * `lib/game-queries.ts`.
 */

/** The game whose content answers the un-prefixed/legacy URLs and the bare nav links. */
export const DEFAULT_GAME_SLUG = process.env.NEXT_PUBLIC_DEFAULT_GAME_SLUG?.trim() || 'bgmi';

/**
 * The rankings board (KRAFTON) has no `gameId` of its own, so it is pinned to
 * one game: `/<game>/rankings` only exists for this slug and 404s for any other,
 * rather than rendering the same board under a game that does not own it.
 */
export const RANKINGS_GAME_SLUG = 'bgmi';

/** Anything that names, or points at, the game an entity belongs to. */
export interface GameNaming {
  game?: { slug?: string | null } | null;
  gameSlug?: string | null;
}

/**
 * The game slug a link to this entity must carry. Falls back to the default game,
 * so a null-`gameId` row resolves under one path rather than any game's.
 */
export function gameSlugOf(entity?: GameNaming | null): string {
  return entity?.game?.slug || entity?.gameSlug || DEFAULT_GAME_SLUG;
}

/**
 * Prefixes `path` (which may be `''` or start with `/`) with the game segment.
 * `gameHref('bgmi')` → `/bgmi`; `gameHref('bgmi', '/teams/soul')` → `/bgmi/teams/soul`.
 */
export function gameHref(slug: string, path = ''): string {
  const rest = path.replace(/^\/+/, '');
  return rest ? `/${slug}/${rest}` : `/${slug}`;
}
