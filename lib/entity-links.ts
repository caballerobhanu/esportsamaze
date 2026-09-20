/**
 * Internal href builders for entity pages.
 *
 * The public `[slug]` routes are deliberately legacy-friendly: a team resolves
 * by slug, tag, name, displayName or id (`TEAM_LOOKUP`, lib/team-data.ts), and a
 * player by slug, IGN or id (app/(public)/players/[slug]/player-data.ts). A link
 * must therefore carry one of those keys.
 *
 * A slug synthesised from the name — `name.toLowerCase().replace(/\s+/g, '-')` —
 * matches none of them ("Godlike Esports" becomes "godlike-esports" while the
 * lookup expects the name verbatim), so it lands on a 404. These helpers pick a
 * key the route actually resolves, preferring the canonical slug.
 */

function join(base: string, key: string | null | undefined): string {
  return key ? `${base}/${encodeURIComponent(key)}` : base;
}

export function teamHref(team: {
  slug?: string | null;
  tag?: string | null;
  name?: string | null;
  id?: string | null;
}): string {
  return join('/teams', team.slug || team.tag || team.name || team.id);
}

export function playerHref(player: {
  slug?: string | null;
  ign?: string | null;
  id?: string | null;
}): string {
  return join('/players', player.slug || player.ign || player.id);
}
