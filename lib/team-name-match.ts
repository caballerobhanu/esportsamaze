/**
 * Look-alike detection for team names, used by the bulk match import.
 *
 * Background: the import reuses an existing team when one name contains the other, so an
 * unmatched name becomes a new team. That leaves one gap, measured on real data — an org
 * stored as "Myth Official" and pasted again from an event where a sponsor had renamed it
 * to "Iris Myth". Neither name contains the other, so nothing matched, a second team was
 * created, and the org read as two teams in every aggregate.
 *
 * Sharing a meaningful word is the signal that was missing. Generic words are ignored,
 * because "Team SouL" and "Team Tamilas" share "team" and are not the same org.
 */

/** Words that say nothing about which org a team is. */
const GENERIC_TOKENS = new Set([
  'the',
  'and',
  'for',
  'team',
  'teams',
  'esports',
  'esport',
  'sports',
  'gaming',
  'game',
  'games',
  'org',
  'official',
  'club',
  'esportsclub',
  'gg',
  'pro',
]);

export const MIN_TOKEN_LENGTH = 3;

export function meaningfulTokens(normalised: string): string[] {
  return normalised
    .split(/\s+/)
    .filter((token) => token.length >= MIN_TOKEN_LENGTH && !GENERIC_TOKENS.has(token));
}

/**
 * The existing team `name` looks like, or null.
 *
 * `normalise` is the caller's own name cleaner, passed in so this cannot drift from the
 * matching rules the caller uses.
 */
export function findLookAlike(
  name: string,
  teams: Array<{ name: string }>,
  normalise: (value: unknown) => string
): string | null {
  const wanted = meaningfulTokens(normalise(name));
  if (wanted.length === 0) return null;

  for (const team of teams) {
    const existing = meaningfulTokens(normalise(team.name));
    if (wanted.some((token) => existing.includes(token))) return team.name;
  }
  return null;
}
