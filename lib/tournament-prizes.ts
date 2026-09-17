/* Per-team prize results: who finished where, what they won, and what they
   qualified into. The prizepool page renders this; the ranked distribution a
   tournament is *paid* by lives separately in Tournament.prizeDistribution. */

import { flattenPrizeRanks } from '@/lib/standings-config';
import { classifyPrizeRow } from '@/lib/prize-rows';

/**
 * An event a team qualified into. Mirrors `SeedEventItem` in the admin
 * qualifications input, so a berth entered there renders the same way here:
 * a link when the admin picked a tournament in the DB, plain text when the
 * target event does not exist yet.
 *
 * Declared as a type alias rather than an interface deliberately: this value is
 * written straight into a Prisma Json column, and only anonymous object types
 * get the implicit string index signature that accepts.
 */
export type PrizeBerth = {
  name: string;
  tournamentId?: string | null;
  tournamentSlug?: string | null;
};

export interface PrizeResultRow {
  teamId: string;
  rank: number | null;
  name: string;
  tag: string | null;
  slug: string | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  prizeWon: number | null;
  berths: PrizeBerth[];
}

/** The subset of a TournamentTeam row (with its Team) a result row needs. */
export interface PrizeResultSource {
  teamId: string | null;
  finalRank: number | null;
  prizeWon: number | null;
  berths?: unknown;
  displayName?: string | null;
  shortName?: string | null;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  /** Null for an unfilled seat, which is not a result and is skipped. */
  team: {
    id?: string;
    name: string;
    displayName?: string | null;
    tag?: string | null;
    slug?: string | null;
    logoUrl?: string | null;
    imageDarkUrl?: string | null;
  } | null;
}

/**
 * Berths are stored as JSON, so anything could be in there — legacy string
 * entries, partial rows from an older shape, or null. Anything without a name
 * is dropped rather than rendered as a blank chip.
 */
export function parseBerths(value: unknown): PrizeBerth[] {
  if (!Array.isArray(value)) return [];

  const berths: PrizeBerth[] = [];
  for (const entry of value) {
    if (typeof entry === 'string') {
      const name = entry.trim();
      if (name) berths.push({ name, tournamentId: null, tournamentSlug: null });
      continue;
    }
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as { name?: unknown; tournamentId?: unknown; tournamentSlug?: unknown };
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    if (!name) continue;
    berths.push({
      name,
      tournamentId: typeof row.tournamentId === 'string' ? row.tournamentId : null,
      tournamentSlug: typeof row.tournamentSlug === 'string' ? row.tournamentSlug : null,
    });
  }
  return berths;
}

/**
 * Placement money per team, summed across every stage. Awards are excluded —
 * an honour is not a rank-wise payout, which is the whole point of `kind`.
 *
 * This is the authority for a team's prize money on an event: the stored
 * `TournamentTeam.prizeWon` is only rewritten when the admin recalculates, so a
 * page that reads it drifts from the ladder as soon as a stage is edited.
 */
export function placementTotalsByTeam(distribution: unknown): Map<string, number> {
  const totals = new Map<string, number>();

  for (const row of flattenPrizeRanks(distribution)) {
    if (classifyPrizeRow(row) === 'AWARD') continue;

    const teamId = typeof row.teamId === 'string' && row.teamId ? row.teamId : null;
    if (!teamId) continue;

    const amount = Number(row.prize) || 0;
    if (amount <= 0) continue;

    totals.set(teamId, (totals.get(teamId) ?? 0) + amount);
  }

  return totals;
}

/**
 * A squad with neither a final rank nor a prize has no result to report, so it
 * is left out rather than printed as an unplaced row. Ranked rows come first,
 * ordered by rank; anything ranked-less (a prize with no placement recorded)
 * falls in behind them alphabetically.
 *
 * `prizeWon` is the fallback, not the source: a team with placement rows on the
 * ladder is paid exactly what those rows say, however stale the column is.
 */
export function buildPrizeResults(
  teams: PrizeResultSource[],
  placementTotals?: Map<string, number>
): PrizeResultRow[] {
  return teams
    .flatMap((entry) => {
      // A seat with no team is not a result — it is a place in the field that
      // nobody has taken yet, so it can carry no rank and no money.
      const team = entry.team;
      if (!team) return [];
      if (entry.finalRank == null && entry.prizeWon == null) return [];

      return [
        {
          teamId: entry.teamId ?? team.id ?? team.name,
          rank: entry.finalRank,
          name: entry.displayName || team.displayName || team.name,
          tag: entry.shortName || team.tag || null,
          slug: team.slug || null,
          logoUrl: entry.logoUrl || team.logoUrl || null,
          logoDarkUrl: entry.logoDarkUrl || team.imageDarkUrl || null,
          prizeWon: placementTotals?.get(entry.teamId ?? '') ?? entry.prizeWon,
          berths: parseBerths(entry.berths),
        },
      ];
    })
    .sort(
      (a, b) =>
        (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) ||
        a.name.localeCompare(b.name)
    );
}
