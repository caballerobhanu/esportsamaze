/**
 * Pure roster helpers for the team profile pages.
 *
 * `TournamentTeam.rosterJson` is free-form JSON — a list of IGN strings, or
 * objects carrying a player id, role and captain flag. The ordering contract is
 * captain → players → staff.
 *
 * Pure module: no Prisma, no React.
 */

export interface RosterEntry {
  playerId?: string | null;
  slug?: string | null;
  ign: string;
  role?: string;
  captain?: boolean;
  isStaff?: boolean;
  staffRole?: string | null;
  /**
   * Set on a line-up entry that came from REPORTED totals rather than the squads
   * the event was entered with — there are no match scorecards behind it.
   */
  reported?: boolean;
}

/**
 * Normalizes and sorts a `rosterJson` blob: captain first, staff last, everyone
 * else in their original order (V8's sort is stable).
 */
export function parseRoster(json: unknown): RosterEntry[] {
  if (!Array.isArray(json)) return [];
  const list = json
    .map((entry) =>
      typeof entry === 'string'
        ? { ign: entry }
        : (entry as {
            playerId?: string | null;
            slug?: string | null;
            ign?: string;
            role?: string;
            captain?: boolean;
            isStaff?: boolean;
            staffRole?: string | null;
            reported?: boolean;
          })
    )
    .filter((entry): entry is RosterEntry => Boolean(entry && entry.ign));

  return list.sort((a, b) => {
    const aCapt = Boolean(a.captain);
    const bCapt = Boolean(b.captain);
    const aStaff = Boolean(a.isStaff || a.staffRole);
    const bStaff = Boolean(b.isStaff || b.staffRole);

    if (aCapt && !bCapt) return -1;
    if (!aCapt && bCapt) return 1;
    if (aStaff && !bStaff) return 1;
    if (!aStaff && bStaff) return -1;
    return 0;
  });
}

/** Every distinct player id referenced by a set of event rosters. */
export function collectLineupPlayerIds(rosters: readonly unknown[]): string[] {
  const ids = new Set<string>();
  for (const roster of rosters) {
    for (const entry of parseRoster(roster)) {
      if (typeof entry.playerId === 'string' && entry.playerId.length > 0) {
        ids.add(entry.playerId);
      }
    }
  }
  return [...ids];
}

export interface PlayerSlugSource {
  id: string;
  ign: string;
  slug: string | null;
}

export interface PlayerSlugMaps {
  /** playerId → slug. The only key that may link a line-up entry to a profile. */
  playerIdToSlug: Record<string, string>;
}

/**
 * Builds the lookup the event line-ups use to turn a roster entry into a
 * player-profile link, keyed strictly by player id.
 *
 * There is deliberately no IGN-keyed fallback: look-alike names ("beast" /
 * "beast04" / "beastog") are different people, and a name-keyed map silently
 * pointed all of them at one profile.
 */
export function buildPlayerSlugMaps(
  roster: readonly PlayerSlugSource[],
  transfers: readonly PlayerSlugSource[] = [],
  extra: readonly PlayerSlugSource[] = [],
): PlayerSlugMaps {
  const playerIdToSlug: Record<string, string> = {};
  for (const player of [...roster, ...transfers, ...extra]) {
    if (player.slug) playerIdToSlug[player.id] = player.slug;
  }
  return { playerIdToSlug };
}
