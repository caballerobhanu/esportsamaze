/**
 * Internal href builders for entity pages.
 *
 * Entity pages are game-scoped now (`/<game>/teams/<key>`), so every link carries
 * the game segment. The game is read from the entity itself when it has one
 * (`entity.game.slug`), falling back to the default game — which is what keeps a
 * null-`gameId` row on a single canonical URL.
 *
 * The public `[slug]` routes are deliberately legacy-friendly: a team resolves
 * by slug, tag, name, displayName or id (`TEAM_LOOKUP`, lib/team-data.ts), and a
 * player by slug, IGN or id (…/players/[slug]/player-data.ts). A link must
 * therefore carry one of those keys.
 *
 * A slug synthesised from the name — `name.toLowerCase().replace(/\s+/g, '-')` —
 * matches none of them ("Godlike Esports" becomes "godlike-esports" while the
 * lookup expects the name verbatim), so it lands on a 404. These helpers pick a
 * key the route actually resolves, preferring the canonical slug.
 */
import { gameHref, gameSlugOf, type GameNaming } from '@/lib/games';

function join(base: string, key: string | null | undefined): string {
  return key ? `${base}/${encodeURIComponent(key)}` : base;
}

export function teamHref(
  team: GameNaming & {
    slug?: string | null;
    tag?: string | null;
    name?: string | null;
    id?: string | null;
  }
): string {
  return join(gameHref(gameSlugOf(team), 'teams'), team.slug || team.tag || team.name || team.id);
}

export function playerHref(
  player: GameNaming & {
    slug?: string | null;
    ign?: string | null;
    id?: string | null;
  }
): string {
  return join(gameHref(gameSlugOf(player), 'players'), player.slug || player.ign || player.id);
}

/** A tournament's page, optionally at a tab segment (overview is the base route). */
export function tournamentHref(
  tournament: GameNaming & { slug?: string | null; id?: string | null },
  tab?: string | null
): string {
  const base = join(gameHref(gameSlugOf(tournament), 'tournaments'), tournament.slug || tournament.id);
  return tab && tab !== 'overview' ? `${base}/${tab}` : base;
}
