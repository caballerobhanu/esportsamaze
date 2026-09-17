/* Server data layer for the team profile tab routes.
   One cached context per team; each tab route derives only what its panel
   consumes. Team routes are `force-dynamic`, so every payload returned here is
   kept to plain JSON primitives (ISO strings and epoch millis, never Date
   objects) — `unstable_cache` round-trips values through serialization, and
   anything bulkier is cheaper to recompute than to ship.

   Every cache entry carries TEAM_PROFILE_CACHE_TAG, which
   `revalidateTournamentPages()` purges whenever a scorecard is saved. */

import { unstable_cache } from 'next/cache';
import type { Metadata } from 'next';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { parseRoster } from '@/lib/team-roster';
import { absoluteUrl, canonical, SITE_NAME } from '@/lib/seo';
import {
  TEAM_TAB_SEGMENT,
  teamTabDescription,
  teamTabTitle,
  type TeamTabId,
} from '@/lib/seo-titles';
import { deriveMoves, type Appearance } from '@/lib/player-moves';
import { resolveEventTotals } from '@/lib/tournament-totals';
import { placementTotalsByTeam } from '@/lib/tournament-prizes';
import {
  DETAIL_METRIC_SPECS,
  TEAM_BASIC_KEYS,
  TEAM_METRIC_COLUMNS,
  aggregateMetricsByEvent,
  mergeEventMetrics,
  type EventMetricRow,
} from '@/lib/event-metrics';
import {
  TEAM_PROFILE_CACHE_TAG,
  binPlacements,
  summarisePlayerElims,
  summariseTeamMatches,
  type PlacementBin,
  type PlayerElimMetrics,
  type TeamMatchSummary,
} from '@/lib/team-stats';

const REVALIDATE = 900;
const TAGS = [TEAM_PROFILE_CACHE_TAG];

/**
 * The one match ordering every team-page query uses.
 *
 * `scheduledAt` is NOT unique — a whole matchday can share one timestamp (BGMS
 * 2026: 162 matches over 37 distinct `scheduledAt` values, up to 6 sharing one),
 * and `MatchGame.sequence` is always 1 with one game per match, so it can never
 * break a tie. Without the second key the database is free to return rows in any
 * order, which is what made the history read #157, #159, #158, #160.
 *
 * `overallMatchNumber` is the unambiguous per-event run order, so it is the
 * tiebreaker; `sequence` stays as the last resort for multi-game matches.
 * NULLs sort last: an event with no overall numbers yet keeps its date order
 * instead of having its unknown-numbered games jump to the top of a matchday.
 */
const MATCH_ORDER: Prisma.MatchTeamResultOrderByWithRelationInput[] = [
  { matchGame: { match: { scheduledAt: 'desc' } } },
  { matchGame: { match: { overallMatchNumber: { sort: 'desc', nulls: 'last' } } } },
  { matchGame: { sequence: 'desc' } },
];

/** Same keys as MATCH_ORDER, for the raw-SQL paths (`m`/`g` aliases). */
const MATCH_ORDER_SQL = Prisma.sql`m."scheduledAt" DESC, m."overallMatchNumber" DESC NULLS LAST, g."sequence" DESC`;

/* ── Team context (identity, roster, events, transfers) ────────────────── */

export interface TeamContextPlayer {
  id: string;
  ign: string;
  slug: string | null;
  avatarUrl: string | null;
  role: string | null;
  staffRole: string | null;
  isPlayer: boolean;
}

export interface TeamContextTournament {
  id: string;
  tournamentId: string;
  name: string;
  /** Admin-entered short label, shown in place of `name` on mobile. */
  shortName: string | null;
  slug: string;
  currency: string;
  startedAtMs: number | null;
  finalRank: number | null;
  prizeWon: number | null;
  rosterJson: unknown;
  /** Raw stage → rank JSON tree the trophy cabinet mines for awards. */
  prizeDistribution: unknown;
  imageUrl: string | null;
  imageDarkUrl: string | null;
}

/** One side of a transfer: the team a player moved from or to. */
export interface TransferParty {
  id: string;
  name: string;
  slug: string | null;
  tag: string | null;
  logoUrl: string | null;
  imageDarkUrl: string | null;
}

/**
 * Direction of a transfer row relative to the team being viewed.
 *
 * `BOTH` is the defensive case where a row's destination and origin are the
 * same team (a data-entry artefact, not a real move); the UI treats it as an
 * arrival and still shows the counterpart.
 */
export type TransferDirection = 'ARRIVED' | 'DEPARTED' | 'BOTH';

export interface TeamContextTransfer {
  id: string;
  type: string;
  staffRole: string | null;
  dateMs: number;
  player: {
    id: string;
    ign: string;
    slug: string | null;
    avatarUrl: string | null;
    role: string | null;
  };
  direction: TransferDirection;
  /** The team on the other end of this move — null when it has no team. */
  counterpart: TransferParty | null;
}

export interface TeamContext {
  id: string;
  name: string;
  displayName: string | null;
  tag: string | null;
  slug: string | null;
  logoUrl: string | null;
  imageDarkUrl: string | null;
  region: string | null;
  status: string | null;
  foundedYear: number | null;
  sponsors: string | null;
  /** Null follows the site-wide switch for team pages. */
  showViewCount: boolean | null;
  /** Null follows the site-wide window for team pages. */
  viewCountWindow: string | null;
  socials: Record<string, string>;
  gameId: string | null;
  game: { name: string; slug: string } | null;
  players: TeamContextPlayer[];
  tournaments: TeamContextTournament[];
  won: { id: string; name: string; slug: string }[];
  runnerUp: { id: string; name: string; slug: string }[];
  transfers: TeamContextTransfer[];
  prevTeam: { id: string; slug: string | null; tag: string | null; name: string } | null;
  nextTeam: { id: string; slug: string | null; tag: string | null; name: string } | null;
}

/** Legacy-friendly lookup: a team is reachable by slug, tag, name, displayName or id. */
const TEAM_LOOKUP = (slug: string) => ({
  OR: [
    { slug },
    { tag: { equals: slug, mode: 'insensitive' as const } },
    { name: { equals: slug, mode: 'insensitive' as const } },
    { displayName: { equals: slug, mode: 'insensitive' as const } },
    { id: slug },
  ],
});

/** Columns needed to render either end of a transfer as a crest + link. */
const TRANSFER_PARTY_SELECT = {
  id: true,
  name: true,
  slug: true,
  tag: true,
  logoUrl: true,
  imageDarkUrl: true,
} satisfies Prisma.TeamSelect;

type TransferPartyRow =
  | {
      id: string;
      name: string;
      slug: string | null;
      tag: string | null;
      logoUrl: string | null;
      imageDarkUrl: string | null;
    }
  | null;

function toTransferParty(row: TransferPartyRow): TransferParty | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    tag: row.tag,
    logoUrl: row.logoUrl,
    imageDarkUrl: row.imageDarkUrl,
  };
}

export const loadTeamContext = unstable_cache(
  async (slug: string): Promise<TeamContext | null> => {
    const team = await prisma.team.findFirst({
      where: TEAM_LOOKUP(slug),
      include: {
        game: { select: { id: true, name: true, slug: true } },
        players: { orderBy: { ign: 'asc' } },
        tournamentRosters: {
          include: {
            tournament: {
              select: {
                id: true,
                name: true,
                shortName: true,
                slug: true,
                currency: true,
                startDate: true,
                prizeDistribution: true,
                imageUrl: true,
                imageDarkUrl: true,
              },
            },
          },
        },
        tournamentsWon: { select: { id: true, name: true, slug: true } },
        tournamentsRunnerUp: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!team) return null;

    // Movements come from event participation, not from the transfer ledger: a
    // player has moved only when they appear for a different team in a LATER
    // event. Missing from an event is not a departure, and a first appearance is
    // not an arrival. The ledger is layered on top for what rosters cannot prove.
    const linkedPlayerIds = new Set<string>();
    for (const roster of team.tournamentRosters) {
      for (const entry of parseRoster(roster.rosterJson)) {
        if (entry.playerId) linkedPlayerIds.add(entry.playerId);
      }
    }
    const involvedIds = [...linkedPlayerIds];

    const [historySquads, adminTransfers, prevCandidate, nextCandidate] = await Promise.all([
      involvedIds.length > 0
        ? prisma.tournamentTeam.findMany({
            where: {
              OR: involvedIds.map((id) => ({ rosterJson: { array_contains: [{ playerId: id }] } })),
            },
            select: {
              teamId: true,
              rosterJson: true,
              team: { select: TRANSFER_PARTY_SELECT },
              tournament: { select: { startDate: true } },
            },
          })
        : Promise.resolve([]),
      prisma.transfer.findMany({
        where: { OR: [{ teamId: team.id }, { fromTeamId: team.id }] },
        orderBy: { date: 'desc' },
        include: {
          player: {
            select: { id: true, ign: true, slug: true, avatarUrl: true, role: true },
          },
          // Both ends of the move: `team` is the destination, `fromTeam` the
          // origin. Which one is "the counterpart" depends on this team's side.
          team: { select: TRANSFER_PARTY_SELECT },
          fromTeam: { select: TRANSFER_PARTY_SELECT },
        },
      }),
      prisma.team.findFirst({
        where: { name: { lt: team.name } },
        orderBy: { name: 'desc' },
        select: { id: true, slug: true, tag: true, name: true },
      }),
      prisma.team.findFirst({
        where: { name: { gt: team.name } },
        orderBy: { name: 'asc' },
        select: { id: true, slug: true, tag: true, name: true },
      }),
    ]);

    // Wrap-around so the pager is never dead on the first/last team alphabetically.
    const [prevTeam, nextTeam] = await Promise.all([
      prevCandidate ??
        prisma.team.findFirst({
          where: { id: { not: team.id } },
          orderBy: { name: 'desc' },
          select: { id: true, slug: true, tag: true, name: true },
        }),
      nextCandidate ??
        prisma.team.findFirst({
          where: { id: { not: team.id } },
          orderBy: { name: 'asc' },
          select: { id: true, slug: true, tag: true, name: true },
        }),
    ]);

    /* ── Movements, derived then topped up with admin records ── */

    // Every team a linked player turned out for, so a player's whole event
    // timeline is visible from either end of a move.
    // A seat carries no roster, so it can never contribute an appearance or a
    // move — but the column is nullable, so it is skipped explicitly.
    const partyByTeamId = new Map<string, TransferParty>();
    for (const squad of historySquads) {
      if (squad.teamId === null || squad.team === null) continue;
      const party = toTransferParty(squad.team);
      if (party) partyByTeamId.set(squad.teamId, party);
    }

    const appearances: Appearance[] = [];
    const staffRoleByPlayerTeam = new Map<string, string | null>();
    for (const squad of historySquads) {
      if (squad.teamId === null) continue;
      for (const entry of parseRoster(squad.rosterJson)) {
        if (!entry.playerId || !linkedPlayerIds.has(entry.playerId)) continue;
        appearances.push({
          playerId: entry.playerId,
          teamId: squad.teamId,
          date: squad.tournament.startDate,
        });
        staffRoleByPlayerTeam.set(`${entry.playerId}|${squad.teamId}`, entry.staffRole ?? null);
      }
    }

    const moves = deriveMoves(appearances).filter(
      (move) => move.fromTeamId === team.id || move.toTeamId === team.id,
    );

    const movePlayerIds = [
      ...new Set([...moves.map((move) => move.playerId), ...adminTransfers.map((t) => t.player.id)]),
    ];
    const movePlayers = movePlayerIds.length
      ? await prisma.player.findMany({
          where: { id: { in: movePlayerIds } },
          select: { id: true, ign: true, slug: true, avatarUrl: true, role: true },
        })
      : [];
    const playerById = new Map(movePlayers.map((player) => [player.id, player]));

    const moveRows: TeamContextTransfer[] = [];
    for (const move of moves) {
      const player = playerById.get(move.playerId);
      if (!player) continue;
      const arrived = move.toTeamId === team.id;
      moveRows.push({
        id: `move:${move.playerId}:${move.fromTeamId}:${move.toTeamId}`,
        type: arrived ? 'JOINED' : 'LEFT',
        staffRole:
          staffRoleByPlayerTeam.get(
            `${move.playerId}|${arrived ? move.toTeamId : move.fromTeamId}`,
          ) ?? null,
        dateMs: move.date.getTime(),
        player: {
          id: player.id,
          ign: player.ign,
          slug: player.slug,
          avatarUrl: player.avatarUrl,
          role: player.role,
        },
        direction: arrived ? 'ARRIVED' : 'DEPARTED',
        counterpart: partyByTeamId.get(arrived ? move.fromTeamId : move.toTeamId) ?? null,
      });
    }

    /* ── Event line-ups, entered rosters plus reported-only players ── */

    // Reported (match-free) totals can name a player for this team at an event
    // that has no squads or scorecards at all. Entered rosters always win, so a
    // reported row only fills what the squad list does not already cover.
    const reportedLineups = await prisma.tournamentPlayerTotals.findMany({
      where: { teamId: team.id },
      select: {
        playerId: true,
        tournamentId: true,
        player: { select: { id: true, ign: true } },
        tournament: {
          select: {
            id: true,
            name: true,
            shortName: true,
            slug: true,
            currency: true,
            startDate: true,
            prizeDistribution: true,
            imageUrl: true,
            imageDarkUrl: true,
          },
        },
      },
    });

    const reportedByEvent = new Map<
      string,
      { tournament: (typeof reportedLineups)[number]['tournament']; players: { playerId: string; ign: string }[] }
    >();
    for (const row of reportedLineups) {
      const entry = reportedByEvent.get(row.tournamentId) ?? { tournament: row.tournament, players: [] };
      if (!entry.players.some((player) => player.playerId === row.playerId)) {
        entry.players.push({ playerId: row.playerId, ign: row.player.ign });
      }
      reportedByEvent.set(row.tournamentId, entry);
    }

    const reportedEntry = (player: { playerId: string; ign: string }) => ({
      playerId: player.playerId,
      ign: player.ign,
      role: null,
      captain: false,
      isStaff: false,
      staffRole: null,
      statusTag: null,
      reported: true,
    });

    const enteredRosters = team.tournamentRosters.filter((tt) => Boolean(tt?.tournament));

    // Prize money is summed from the event's own ladder, exactly as the prizepool
    // tab does. The stored column is only the fallback for a team with no ladder
    // rows, so editing a stage can no longer leave these pages stale or
    // overstated. Memoised per event: the ladder is read once, not per row.
    const placementTotalsByEvent = new Map<string, Map<string, number>>();
    const prizeMoneyFor = (
      tournamentId: string,
      distribution: unknown,
      stored: number | null,
    ): number | null => {
      let totals = placementTotalsByEvent.get(tournamentId);
      if (!totals) {
        totals = placementTotalsByTeam(distribution);
        placementTotalsByEvent.set(tournamentId, totals);
      }
      return totals.get(team.id) ?? stored;
    };

    const tournaments = enteredRosters.map((tt) => {
      const reported = reportedByEvent.get(tt.tournamentId);
      let rosterJson = tt.rosterJson;

      if (reported) {
        const linked = new Set(
          (Array.isArray(rosterJson) ? rosterJson : [])
            .map((entry) => (entry && typeof entry === 'object' ? (entry as { playerId?: string | null }).playerId : null))
            .filter((id): id is string => Boolean(id)),
        );
        const additions = reported.players.filter((player) => !linked.has(player.playerId));
        if (additions.length > 0) {
          rosterJson = [...(Array.isArray(rosterJson) ? rosterJson : []), ...additions.map(reportedEntry)];
        }
      }

      return {
        id: tt.id,
        tournamentId: tt.tournament.id,
        name: tt.tournament.name,
        shortName: tt.tournament.shortName?.trim() || null,
        slug: tt.tournament.slug,
        currency: tt.tournament.currency,
        startedAtMs: tt.tournament.startDate ? tt.tournament.startDate.getTime() : null,
        finalRank: tt.finalRank,
        prizeWon: prizeMoneyFor(tt.tournamentId, tt.tournament.prizeDistribution, tt.prizeWon),
        rosterJson,
        prizeDistribution: tt.tournament.prizeDistribution,
        imageUrl: tt.tournament.imageUrl,
        imageDarkUrl: tt.tournament.imageDarkUrl,
      };
    });

    // Events this team appears in ONLY as reported totals — no squads, no
    // scorecards — so they have no TournamentTeam row to map from.
    const enteredTournamentIds = new Set(enteredRosters.map((tt) => tt.tournamentId));
    for (const [tournamentId, entry] of reportedByEvent) {
      if (enteredTournamentIds.has(tournamentId)) continue;
      tournaments.push({
        id: `reported:${tournamentId}`,
        tournamentId,
        name: entry.tournament.name,
        shortName: entry.tournament.shortName?.trim() || null,
        slug: entry.tournament.slug,
        currency: entry.tournament.currency,
        startedAtMs: entry.tournament.startDate ? entry.tournament.startDate.getTime() : null,
        finalRank: null,
        prizeWon: null,
        rosterJson: entry.players.map(reportedEntry),
        prizeDistribution: entry.tournament.prizeDistribution,
        imageUrl: entry.tournament.imageUrl,
        imageDarkUrl: entry.tournament.imageDarkUrl,
      });
    }

    // The reported-only events are appended out of order, so re-sort the whole set.
    tournaments.sort((a, b) => (b.startedAtMs ?? 0) - (a.startedAtMs ?? 0));

    const socials = (team.socialLinks ?? {}) as Record<string, unknown>;

    return {
      id: team.id,
      name: team.name,
      displayName: team.displayName,
      tag: team.tag,
      slug: team.slug,
      logoUrl: team.logoUrl,
      imageDarkUrl: team.imageDarkUrl,
      region: team.region,
      status: team.status,
      foundedYear: team.founded ? new Date(team.founded).getUTCFullYear() : null,
      sponsors: team.sponsors,
      showViewCount: team.showViewCount,
      viewCountWindow: team.viewCountWindow,
      socials: Object.fromEntries(
        Object.entries(socials)
          .filter(([, value]) => typeof value === 'string' && value.length > 0)
          .map(([key, value]) => [key, String(value)]),
      ),
      gameId: team.gameId,
      game: team.game ? { name: team.game.name, slug: team.game.slug } : null,
      players: team.players.map((player) => ({
        id: player.id,
        ign: player.ign,
        slug: player.slug,
        avatarUrl: player.avatarUrl,
        role: player.role,
        staffRole: player.staffRole,
        isPlayer: player.isPlayer,
      })),
      tournaments,
      won: team.tournamentsWon.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
      runnerUp: team.tournamentsRunnerUp.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
      transfers: [
        ...moveRows,
        // Admin-recorded moves that the rosters do not already imply.
        ...adminTransfers
          .filter(
            (transfer) =>
              !moves.some(
                (move) =>
                  move.playerId === transfer.player.id &&
                  move.fromTeamId ===
                    (transfer.type === 'LEFT' ? transfer.teamId : transfer.fromTeamId) &&
                  move.toTeamId === (transfer.type === 'LEFT' ? '' : transfer.teamId),
              ),
          )
          .map((transfer) => {
            // A LEFT row names the team the player LEFT in `teamId` (and carries
            // no origin), so it can only ever be a departure — the generic branch
            // below would read it as an arrival.
            let direction: TransferDirection;
            let otherRow: TransferPartyRow;
            if (transfer.type === 'LEFT') {
              direction = 'DEPARTED';
              otherRow = null;
            } else {
              // Every other type names its DESTINATION in `teamId`, so it reads
              // as an arrival here and as a departure from the origin's side.
              const arrived = transfer.teamId === team.id;
              const departed = transfer.fromTeamId === team.id;
              direction = arrived && departed ? 'BOTH' : arrived ? 'ARRIVED' : 'DEPARTED';

              // The counterpart is whichever end is NOT this team.
              otherRow = arrived ? transfer.fromTeam : transfer.team;
            }

            return {
              id: transfer.id,
              type: transfer.type,
              staffRole: transfer.staffRole,
              dateMs: transfer.date.getTime(),
              player: {
                id: transfer.player.id,
                ign: transfer.player.ign,
                slug: transfer.player.slug,
                avatarUrl: transfer.player.avatarUrl,
                role: transfer.player.role,
              },
              direction,
              counterpart: toTransferParty(otherRow?.id === team.id ? null : otherRow),
            };
          }),
      ].sort((a, b) => b.dateMs - a.dateMs),
      prevTeam: prevTeam
        ? { id: prevTeam.id, slug: prevTeam.slug, tag: prevTeam.tag, name: prevTeam.name }
        : null,
      nextTeam: nextTeam
        ? { id: nextTeam.id, slug: nextTeam.slug, tag: nextTeam.tag, name: nextTeam.name }
        : null,
    };
  },
  ['team-context'],
  { tags: TAGS, revalidate: REVALIDATE },
);

/* ── Match summary + placement distribution ────────────────────────────── */

export interface TeamMatchSummaryPayload {
  summary: TeamMatchSummary;
  bins: PlacementBin[];
  /** Present only when the team has played at least one game. */
  hasMatchData: boolean;
}

export const loadTeamMatchSummary = unstable_cache(
  async (teamId: string): Promise<TeamMatchSummaryPayload> => {
    // A single rank grouping feeds the stat band, the win rate and the
    // histogram, so those numbers cannot disagree with one another.
    const groups = await prisma.matchTeamResult.groupBy({
      by: ['rank'],
      where: { teamId },
      _count: { _all: true },
      _sum: { totalPoints: true, placePoints: true, elimsPoints: true },
    });

    const rankGroups = groups
      .map((group) => ({
        rank: group.rank,
        games: group._count._all,
        points: group._sum.totalPoints ?? 0,
        placePoints: group._sum.placePoints ?? 0,
        elimsPoints: group._sum.elimsPoints ?? 0,
      }))
      .sort((a, b) => a.rank - b.rank);

    const summary = summariseTeamMatches(rankGroups);

    return {
      summary,
      bins: binPlacements(rankGroups),
      hasMatchData: summary.matches > 0,
    };
  },
  ['team-match-summary'],
  { tags: TAGS, revalidate: REVALIDATE },
);

/* ── Recent form (points, last N games) ────────────────────────────────── */

export interface TeamFormPoint {
  matchGameId: string;
  mapName: string | null;
  rank: number;
  wwcd: boolean;
  totalPoints: number;
  scheduledAtMs: number;
  tournamentName: string;
  tournamentSlug: string;
}

/** Oldest → newest, so the strip reads left to right. */
export const loadTeamRecentForm = unstable_cache(
  async (teamId: string, limit = 10): Promise<TeamFormPoint[]> => {
    const rows = await prisma.matchTeamResult.findMany({
      where: { teamId },
      orderBy: MATCH_ORDER,
      take: limit,
      select: {
        matchGameId: true,
        rank: true,
        wwcd: true,
        totalPoints: true,
        matchGame: {
          select: {
            mapName: true,
            match: {
              select: {
                scheduledAt: true,
                tournament: { select: { name: true, slug: true } },
              },
            },
          },
        },
      },
    });

    return rows
      .map((row) => ({
        matchGameId: row.matchGameId,
        mapName: row.matchGame.mapName,
        rank: row.rank,
        wwcd: row.wwcd,
        totalPoints: row.totalPoints,
        scheduledAtMs: row.matchGame.match.scheduledAt.getTime(),
        tournamentName: row.matchGame.match.tournament?.name ?? 'Match',
        tournamentSlug: row.matchGame.match.tournament?.slug ?? '',
      }))
      .reverse();
  },
  ['team-recent-form'],
  { tags: TAGS, revalidate: REVALIDATE },
);

/* ── Per-player elim metrics (this team's scorecards only) ─────────────── */

export const loadTeamRosterMetrics = unstable_cache(
  async (teamId: string): Promise<Record<string, PlayerElimMetrics>> => {
    const groups = await prisma.matchPlayerStat.groupBy({
      by: ['playerId', 'playerElims'],
      where: { teamId },
      _count: { _all: true },
    });

    const metrics = summarisePlayerElims(
      groups.map((group) => ({
        playerId: group.playerId,
        playerElims: group.playerElims,
        games: group._count._all,
      })),
    );

    return Object.fromEntries(metrics);
  },
  ['team-roster-metrics'],
  { tags: TAGS, revalidate: REVALIDATE },
);

/* ── Per-tournament table ──────────────────────────────────────────────── */

export interface TeamTournamentRow {
  tournamentId: string;
  name: string;
  /** Admin-entered short label, shown in place of `name` on mobile. */
  shortName: string | null;
  slug: string;
  currency: string;
  matches: number;
  wins: number;
  /** Games finished in the top five — the numerator of `topFiveRate`. */
  topFive: number;
  /** 0–1, or `null` with no games. */
  topFiveRate: number | null;
  /** Mean placement points per game, or `null` with no games. */
  avgPlacePoints: number | null;
  points: number;
  /** Mean total points per game, or `null` with no games. */
  avgTotalPoints: number | null;
  /** Mean elimination points per game, or `null` with no games. */
  avgElimsPoints: number | null;
  finalRank: number | null;
  prizeWon: number | null;
}

export const loadTeamTournamentStats = unstable_cache(
  async (
    teamId: string,
    grandFinalsOnly = false,
  ): Promise<TeamTournamentRow[]> => {
    // Prisma groupBy cannot group by a relation field, so this aggregates in SQL.
    // Rank is only used as a THRESHOLD (top-5 count), never averaged: a mean
    // rank over a battle-royale placement spread is an ordinal average.
    const rows = await prisma.$queryRaw<
      {
        tournament_id: string;
        name: string;
        short_name: string | null;
        slug: string;
        currency: string;
        matches: number;
        wins: number;
        top_five: number;
        place_points: number;
        points: number;
        elims_points: number;
      }[]
    >(Prisma.sql`
      SELECT m."tournamentId" AS tournament_id, t.name, t."shortName" AS short_name, t.slug, t.currency,
             COUNT(*)::int AS matches,
             SUM(CASE WHEN r."wwcd" THEN 1 ELSE 0 END)::int AS wins,
             SUM(CASE WHEN r."rank" BETWEEN 1 AND 5 THEN 1 ELSE 0 END)::int AS top_five,
             SUM(r."placePoints")::int AS place_points,
             SUM(r."totalPoints")::int AS points,
             SUM(r."elimsPoints")::int AS elims_points
      FROM "MatchTeamResult" r
      JOIN "MatchGame" g ON g.id = r."matchGameId"
      JOIN "Match" m ON m.id = g."matchId"
      JOIN "Tournament" t ON t.id = m."tournamentId"
      LEFT JOIN "TournamentStage" s ON s.id = m."stageId"
      WHERE r."teamId" = ${teamId}
        ${grandFinalsOnly
          ? Prisma.sql`AND (
              LOWER(COALESCE(m."stageType", '')) LIKE '%grand final%'
              OR LOWER(COALESCE(s.name, '')) LIKE '%grand final%'
              OR LOWER(COALESCE(s.name, '')) = 'gf'
            )`
          : Prisma.empty}
      GROUP BY m."tournamentId", t.name, t."shortName", t.slug, t.currency
      ORDER BY matches DESC, name ASC
    `);

    const entries = await prisma.tournamentTeam.findMany({
      where: { teamId, tournamentId: { in: rows.map((row) => row.tournament_id) } },
      select: {
        tournamentId: true,
        finalRank: true,
        prizeWon: true,
        tournament: { select: { prizeDistribution: true } },
      },
    });
    const entryById = new Map(entries.map((entry) => [entry.tournamentId, entry]));

    // Same rule as the career table: the ladder decides, the column is only the
    // fallback for a team with no ladder rows on that event.
    const prizeByTournament = new Map<string, number>();
    for (const entry of entries) {
      const derived = placementTotalsByTeam(entry.tournament.prizeDistribution).get(teamId);
      if (derived != null) prizeByTournament.set(entry.tournamentId, derived);
    }

    return rows.map((row) => ({
      tournamentId: row.tournament_id,
      name: row.name,
      shortName: row.short_name?.trim() || null,
      slug: row.slug,
      currency: row.currency,
      matches: row.matches,
      wins: row.wins,
      topFive: row.top_five,
      topFiveRate: row.matches > 0 ? row.top_five / row.matches : null,
      avgPlacePoints: row.matches > 0 ? row.place_points / row.matches : null,
      points: row.points,
      avgTotalPoints: row.matches > 0 ? row.points / row.matches : null,
      avgElimsPoints: row.matches > 0 ? row.elims_points / row.matches : null,
      finalRank: entryById.get(row.tournament_id)?.finalRank ?? null,
      prizeWon: prizeByTournament.get(row.tournament_id) ?? entryById.get(row.tournament_id)?.prizeWon ?? null,
    }));
  },
  ['team-tournament-stats'],
  { tags: TAGS, revalidate: REVALIDATE },
);

/* ── Per-map table (with stat-bearing detail averages) ─────────────────── */

export interface TeamMapRow {
  mapName: string;
  matches: number;
  wins: number;
  /** Games finished in the top five — the numerator of `topFiveRate`. */
  topFive: number;
  /** 0–1, or `null` with no games. */
  topFiveRate: number | null;
  /** Mean placement points per game, or `null` with no games. */
  avgPlacePoints: number | null;
  points: number;
  /** Rows that recorded damage — the denominator for the damage average. */
  damageSamples: number;
  avgDamage: number | null;
  /** Rows that recorded survival time — its own denominator, per field. */
  survivalSamples: number;
  avgSurvival: number | null;
}

export const loadTeamMapStats = unstable_cache(
  async (teamId: string): Promise<TeamMapRow[]> => {
    // Detail averages are per FIELD: `COUNT(col)` counts the rows that recorded
    // it (NULLs drop out) and `SUM(col)` ignores the same NULLs, so numerator
    // and denominator cover exactly the same rows. A genuine 0 is recorded data
    // and stays in both.
    const rows = await prisma.$queryRaw<
      {
        map_name: string;
        matches: number;
        wins: number;
        top_five: number;
        place_points: number;
        points: number;
        damage_samples: number;
        damage_sum: number;
        survival_samples: number;
        survival_sum: number;
      }[]
    >(Prisma.sql`
      SELECT COALESCE(g."mapName", 'Unknown') AS map_name,
             COUNT(*)::int AS matches,
             SUM(CASE WHEN r."wwcd" THEN 1 ELSE 0 END)::int AS wins,
             SUM(CASE WHEN r."rank" BETWEEN 1 AND 5 THEN 1 ELSE 0 END)::int AS top_five,
             SUM(r."placePoints")::int AS place_points,
             SUM(r."totalPoints")::int AS points,
             COUNT(r."damage")::int AS damage_samples,
             COALESCE(SUM(r."damage"), 0)::float8 AS damage_sum,
             COUNT(r."survivalTime")::int AS survival_samples,
             COALESCE(SUM(r."survivalTime"), 0)::float8 AS survival_sum
      FROM "MatchTeamResult" r
      JOIN "MatchGame" g ON g.id = r."matchGameId"
      WHERE r."teamId" = ${teamId}
      GROUP BY 1
      ORDER BY matches DESC, map_name ASC
    `);

    return rows.map((row) => ({
      mapName: row.map_name,
      matches: row.matches,
      wins: row.wins,
      topFive: row.top_five,
      topFiveRate: row.matches > 0 ? row.top_five / row.matches : null,
      avgPlacePoints: row.matches > 0 ? row.place_points / row.matches : null,
      points: row.points,
      damageSamples: row.damage_samples,
      // Each metric is divided by the rows that recorded THAT metric.
      avgDamage: row.damage_samples > 0 ? row.damage_sum / row.damage_samples : null,
      survivalSamples: row.survival_samples,
      avgSurvival: row.survival_samples > 0 ? row.survival_sum / row.survival_samples : null,
    }));
  },
  ['team-map-stats'],
  { tags: TAGS, revalidate: REVALIDATE },
);

/* ── Head-to-head board ────────────────────────────────────────────────── */

export interface HeadToHeadRow {
  opponentId: string;
  name: string;
  tag: string | null;
  slug: string | null;
  logoUrl: string | null;
  imageDarkUrl: string | null;
  faced: number;
  /**
   * Games finished AHEAD of this opponent. Rank-based, NOT a WWCD count: a
   * shared placement is neither a win nor a loss, so W + L + T === faced.
   */
  wins: number;
  losses: number;
  ties: number;
  /** This team's own average points in those shared games. */
  myAvgPoints: number;
  /** The opponent's average points in those shared games. */
  oppAvgPoints: number;
  lastMeetingMs: number;
  /** Placements in the most recent shared game. */
  lastMyRank: number;
  lastOppRank: number;
}

/**
 * Opponents share a `matchGameId`, and every game carries all 16 teams, so this
 * board is a complete record rather than a sampled one.
 *
 * A shared placement (same rank) counts as neither a win nor a loss; the tie
 * count is surfaced separately so W + L + T === faced.
 *
 * Rank appears only as a comparison (ahead / behind) and as the last meeting's
 * placements — never averaged, because a mean rank over a placement spread is
 * an ordinal average. "Last meeting" is resolved with the same
 * `scheduledAt → overallMatchNumber → sequence` ordering the history uses.
 */
export const loadTeamHeadToHead = unstable_cache(
  async (teamId: string): Promise<HeadToHeadRow[]> => {
    const rows = await prisma.$queryRaw<
      {
        opponent_id: string;
        name: string;
        tag: string | null;
        slug: string | null;
        logo_url: string | null;
        image_dark_url: string | null;
        faced: number;
        wins: number;
        losses: number;
        ties: number;
        my_avg_points: number;
        opp_avg_points: number;
        last_meeting_ms: number;
        last_my_rank: number;
        last_opp_rank: number;
      }[]
    >(Prisma.sql`
      WITH shared AS (
        SELECT o."teamId" AS opponent_id,
               o."rank" AS opp_rank,
               o."totalPoints" AS opp_points,
               me."rank" AS my_rank,
               me."totalPoints" AS my_points,
               m."scheduledAt" AS scheduled_at,
               m."overallMatchNumber" AS overall_match_number,
               g."sequence" AS sequence
        FROM "MatchTeamResult" me
        JOIN "MatchTeamResult" o
          ON o."matchGameId" = me."matchGameId" AND o."teamId" <> me."teamId"
        JOIN "MatchGame" g ON g.id = me."matchGameId"
        JOIN "Match" m ON m.id = g."matchId"
        WHERE me."teamId" = ${teamId}
      ),
      last_meet AS (
        -- One row per opponent: the most recent shared game. Same tiebreakers
        -- as MATCH_ORDER (scheduledAt is not unique, sequence is always 1).
        SELECT DISTINCT ON (s.opponent_id) s.opponent_id, s.my_rank, s.opp_rank
        FROM shared s
        ORDER BY s.opponent_id,
                 s.scheduled_at DESC,
                 s.overall_match_number DESC NULLS LAST,
                 s.sequence DESC
      )
      SELECT s.opponent_id, t.name, t.tag, t.slug, t."logoUrl" AS logo_url, t."imageDarkUrl" AS image_dark_url,
             COUNT(*)::int AS faced,
             SUM(CASE WHEN s.my_rank < s.opp_rank THEN 1 ELSE 0 END)::int AS wins,
             SUM(CASE WHEN s.my_rank > s.opp_rank THEN 1 ELSE 0 END)::int AS losses,
             SUM(CASE WHEN s.my_rank = s.opp_rank THEN 1 ELSE 0 END)::int AS ties,
             AVG(s.my_points)::float8 AS my_avg_points,
             AVG(s.opp_points)::float8 AS opp_avg_points,
             (EXTRACT(EPOCH FROM MAX(s.scheduled_at)) * 1000)::float8 AS last_meeting_ms,
             MAX(lm.my_rank)::int AS last_my_rank,
             MAX(lm.opp_rank)::int AS last_opp_rank
      FROM shared s
      JOIN "Team" t ON t.id = s.opponent_id
      LEFT JOIN last_meet lm ON lm.opponent_id = s.opponent_id
      GROUP BY s.opponent_id, t.name, t.tag, t.slug, t."logoUrl", t."imageDarkUrl"
      ORDER BY faced DESC, wins DESC, t.name ASC
    `);

    return rows.map((row) => ({
      opponentId: row.opponent_id,
      name: row.name,
      tag: row.tag,
      slug: row.slug,
      logoUrl: row.logo_url,
      imageDarkUrl: row.image_dark_url,
      faced: row.faced,
      wins: row.wins,
      losses: row.losses,
      ties: row.ties,
      myAvgPoints: row.my_avg_points,
      oppAvgPoints: row.opp_avg_points,
      lastMeetingMs: row.last_meeting_ms,
      lastMyRank: row.last_my_rank,
      lastOppRank: row.last_opp_rank,
    }));
  },
  ['team-head-to-head'],
  { tags: TAGS, revalidate: REVALIDATE },
);

/* ── Related teams ─────────────────────────────────────────────────────── */

export interface RelatedTeamFormEntry {
  rank: number;
  wwcd: boolean;
}

export interface RelatedTeamRow {
  id: string;
  name: string;
  tag: string | null;
  slug: string | null;
  logoUrl: string | null;
  imageDarkUrl: string | null;
  sharedTournaments: number;
  sharedGames: number;
  /** Last five results, newest first — empty for teams with no match data. */
  form: RelatedTeamFormEntry[];
}

/**
 * Same game + same region, excluding self, ranked by shared tournaments then
 * match count. `IS NOT DISTINCT FROM` keeps null regions matching each other
 * instead of silently dropping every team that has no region recorded.
 */
export const loadRelatedTeams = unstable_cache(
  async (
    teamId: string,
    gameId: string | null,
    region: string | null,
    limit = 12,
  ): Promise<RelatedTeamRow[]> => {
    if (!gameId) return [];

    const rows = await prisma.$queryRaw<
      {
        id: string;
        name: string;
        tag: string | null;
        slug: string | null;
        logo_url: string | null;
        image_dark_url: string | null;
        shared_tournaments: number;
        shared_games: number;
      }[]
    >(Prisma.sql`
      WITH mine AS (
        SELECT "tournamentId" AS tid FROM "TournamentTeam" WHERE "teamId" = ${teamId}
      ),
      shared_t AS (
        SELECT tt."teamId" AS rid, COUNT(*)::int AS shared_tournaments
        FROM "TournamentTeam" tt
        WHERE tt."tournamentId" IN (SELECT tid FROM mine) AND tt."teamId" <> ${teamId}
        GROUP BY 1
      ),
      shared_g AS (
        SELECT o."teamId" AS rid, COUNT(*)::int AS shared_games
        FROM "MatchTeamResult" me
        JOIN "MatchTeamResult" o
          ON o."matchGameId" = me."matchGameId" AND o."teamId" <> me."teamId"
        WHERE me."teamId" = ${teamId}
        GROUP BY 1
      )
      SELECT t.id, t.name, t.tag, t.slug, t."logoUrl" AS logo_url, t."imageDarkUrl" AS image_dark_url,
             COALESCE(st.shared_tournaments, 0)::int AS shared_tournaments,
             COALESCE(sg.shared_games, 0)::int AS shared_games
      FROM "Team" t
      LEFT JOIN shared_t st ON st.rid = t.id
      LEFT JOIN shared_g sg ON sg.rid = t.id
      WHERE t.id <> ${teamId}
        AND t."gameId" = ${gameId}
        AND t."region" IS NOT DISTINCT FROM ${region}
      ORDER BY shared_tournaments DESC, shared_games DESC, t.name ASC
      LIMIT ${limit}
    `);

    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);
    const formRows = await prisma.$queryRaw<
      { team_id: string; rank: number; wwcd: boolean }[]
    >(Prisma.sql`
      SELECT x."teamId" AS team_id, x.rank, x.wwcd
      FROM (
        SELECT r."teamId" AS "teamId", r."rank" AS rank, r."wwcd" AS wwcd,
               ROW_NUMBER() OVER (
                 PARTITION BY r."teamId"
                 ORDER BY ${MATCH_ORDER_SQL}
               ) AS rn
        FROM "MatchTeamResult" r
        JOIN "MatchGame" g ON g.id = r."matchGameId"
        JOIN "Match" m ON m.id = g."matchId"
        WHERE r."teamId" IN (${Prisma.join(ids)})
      ) x
      WHERE x.rn <= 5
      ORDER BY x."teamId", x.rn
    `);

    const formByTeam = new Map<string, RelatedTeamFormEntry[]>();
    for (const row of formRows) {
      const list = formByTeam.get(row.team_id) ?? [];
      list.push({ rank: row.rank, wwcd: row.wwcd });
      formByTeam.set(row.team_id, list);
    }

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      tag: row.tag,
      slug: row.slug,
      logoUrl: row.logo_url,
      imageDarkUrl: row.image_dark_url,
      sharedTournaments: row.shared_tournaments,
      sharedGames: row.shared_games,
      // Only teams that actually have results get form dots.
      form: formByTeam.get(row.id) ?? [],
    }));
  },
  ['team-related'],
  { tags: TAGS, revalidate: REVALIDATE },
);

/* ── Match history (paginated, filtered, never cached) ─────────────────── */

export const TEAM_MATCH_PAGE_SIZE = 30;

export interface TeamMatchRow {
  id: string;
  scheduledAtMs: number;
  /** The event this row belongs to — the grouping key for the history table. */
  tournamentId: string;
  /** Always the full official name — rendered at full width on desktop. */
  tournamentName: string;
  /** Admin-entered short label, or null so the display can derive a fallback. */
  tournamentShortName: string | null;
  tournamentSlug: string;
  stageLabel: string | null;
  mapName: string | null;
  rank: number;
  wwcd: boolean;
  placePoints: number;
  elimsPoints: number;
  totalPoints: number;
}

export interface TeamMatchQuery {
  page: number;
  tournamentId?: string | null;
  mapName?: string | null;
  winsOnly?: boolean;
  sort?: 'date' | 'points';
}

export interface TeamMatchPage {
  rows: TeamMatchRow[];
  total: number;
  page: number;
  totalPages: number;
}

/** Pagination is per-request, so this one deliberately skips the cache. */
export async function loadTeamMatchPage(
  teamId: string,
  query: TeamMatchQuery,
): Promise<TeamMatchPage> {
  const page = Math.max(1, query.page);
  const where: Prisma.MatchTeamResultWhereInput = {
    teamId,
    ...(query.winsOnly ? { wwcd: true } : {}),
    matchGame: {
      ...(query.mapName ? { mapName: query.mapName } : {}),
      ...(query.tournamentId ? { match: { tournamentId: query.tournamentId } } : {}),
    },
  };

  const orderBy: Prisma.MatchTeamResultOrderByWithRelationInput[] =
    query.sort === 'points'
      ? [{ totalPoints: 'desc' }, ...MATCH_ORDER]
      : MATCH_ORDER;

  // Count first so a stale `?page=` beyond the end lands on a real page instead
  // of rendering an empty table.
  const total = await prisma.matchTeamResult.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / TEAM_MATCH_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const rows = await prisma.matchTeamResult.findMany({
    where,
    orderBy,
    skip: (safePage - 1) * TEAM_MATCH_PAGE_SIZE,
    take: TEAM_MATCH_PAGE_SIZE,
    select: {
      id: true,
      rank: true,
      wwcd: true,
      placePoints: true,
      elimsPoints: true,
      totalPoints: true,
      matchGame: {
        select: {
          mapName: true,
          match: {
            select: {
              scheduledAt: true,
              tournament: { select: { id: true, name: true, shortName: true, slug: true } },
              // Only the stage name is rendered; any group suffix was dropped.
              stage: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  return {
    rows: rows.map((row) => {
      const tournament = row.matchGame.match.tournament;
      const fullName = tournament?.name ?? 'Match';
      return {
        id: row.id,
        scheduledAtMs: row.matchGame.match.scheduledAt.getTime(),
        tournamentId: tournament?.id ?? '',
        tournamentName: fullName,
        tournamentShortName: tournament?.shortName?.trim() || null,
        tournamentSlug: tournament?.slug ?? '',
        stageLabel: row.matchGame.match.stage?.name ?? null,
        mapName: row.matchGame.mapName,
        rank: row.rank,
        wwcd: row.wwcd,
        placePoints: row.placePoints,
        elimsPoints: row.elimsPoints,
        totalPoints: row.totalPoints,
      };
    }),
    total,
    page: safePage,
    totalPages,
  };
}

export interface TeamMatchTournamentOption {
  id: string;
  /** `shortName` when set, else the full name. */
  name: string;
  /** Always the full official name — shown at full width on desktop. */
  fullName: string;
  /** Admin-entered short label, or null so the chip can derive a fallback. */
  shortName: string | null;
  slug: string;
}

export interface TeamMatchFilterOptions {
  tournaments: TeamMatchTournamentOption[];
  maps: string[];
}

/** Distinct tournaments/maps this team actually appears in, for the filter chips. */
export const loadTeamMatchFilterOptions = unstable_cache(
  async (teamId: string): Promise<TeamMatchFilterOptions> => {
    const [tournaments, maps] = await Promise.all([
      prisma.$queryRaw<
        { id: string; name: string; shortName: string | null; slug: string }[]
      >(Prisma.sql`
        SELECT DISTINCT t.id, t.name, t."shortName" AS "shortName", t.slug
        FROM "MatchTeamResult" r
        JOIN "MatchGame" g ON g.id = r."matchGameId"
        JOIN "Match" m ON m.id = g."matchId"
        JOIN "Tournament" t ON t.id = m."tournamentId"
        WHERE r."teamId" = ${teamId}
        ORDER BY t.name ASC
      `),
      prisma.matchGame.findMany({
        where: { teamResults: { some: { teamId } }, mapName: { not: null } },
        distinct: ['mapName'],
        select: { mapName: true },
        orderBy: { mapName: 'asc' },
      }),
    ]);

    return {
      tournaments: tournaments.map((row) => ({
        id: row.id,
        name: row.shortName?.trim() || row.name,
        fullName: row.name,
        shortName: row.shortName?.trim() || null,
        slug: row.slug,
      })),
      maps: maps.map((row) => row.mapName).filter((name): name is string => Boolean(name)),
    };
  },
  ['team-match-filter-options'],
  { tags: TAGS, revalidate: REVALIDATE },
);

/* ── Event line-up player resolution ───────────────────────────────────── */

export interface LineupPlayer {
  id: string;
  ign: string;
  slug: string | null;
}

/** Slugs for line-up members who are no longer on the roster or in transfers. */
export const loadLineupPlayers = unstable_cache(
  async (ids: string[]): Promise<LineupPlayer[]> => {
    if (ids.length === 0) return [];
    return prisma.player.findMany({
      where: { id: { in: ids } },
      select: { id: true, ign: true, slug: true },
    });
  },
  ['team-lineup-players'],
  { tags: TAGS, revalidate: REVALIDATE },
);

/* ── Detailed event metrics (match-wise, reported, or both) ────────────── */

const TEAM_METRIC_SELECT = {
  damage: true,
  assists: true,
  knockouts: true,
  survivalTime: true,
  grenadeElims: true,
  utilitiesTotal: true,
  matchGame: { select: { match: { select: { tournamentId: true } } } },
} satisfies Prisma.MatchTeamResultSelect;

/**
 * The team's detailed metrics per event, resolved per metric.
 *
 * Scorecard values win wherever the team has them; an event with no scorecards
 * contributes whatever its reported day / stage / event slices hold instead. An
 * event with neither is absent. Scoring (matches, points, WWCD, placement) stays
 * on the per-tournament record, so it is never shown twice.
 */
export const loadTeamEventMetrics = unstable_cache(
  async (teamId: string): Promise<EventMetricRow[]> => {
    const [matchRows, totals] = await Promise.all([
      prisma.matchTeamResult.findMany({ where: { teamId }, select: TEAM_METRIC_SELECT }),
      prisma.tournamentTeamTotals.findMany({ where: { teamId } }),
    ]);

    const matchAggregates = aggregateMetricsByEvent(
      matchRows,
      (row) => row.matchGame.match.tournamentId,
      DETAIL_METRIC_SPECS,
    );

    const ladder = resolveEventTotals(
      totals.map((row) => ({
        tournamentId: row.tournamentId,
        scope: row.scope,
        stageId: row.stageId,
        label: row.label,
        metrics: {
          placement: row.placement,
          matches: row.matches,
          wwcd: row.wwcd,
          placePoints: row.placePoints,
          elimsPoints: row.elimsPoints,
          bonusPoints: row.bonusPoints,
          totalPoints: row.totalPoints,
        },
      })),
    );

    const tournamentIds = [...new Set([...matchAggregates.keys(), ...ladder.keys()])];
    const tournaments = tournamentIds.length
      ? await prisma.tournament.findMany({
          where: { id: { in: tournamentIds } },
          select: {
            id: true,
            name: true,
            shortName: true,
            series: true,
            season: true,
            slug: true,
            startDate: true,
          },
        })
      : [];
    const identities = new Map(
      tournaments.map((tournament) => [
        tournament.id,
        {
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          tournamentShortName: tournament.shortName,
          tournamentSeries: tournament.series,
          tournamentSeason: tournament.season,
          tournamentSlug: tournament.slug,
          startDateMs: tournament.startDate ? tournament.startDate.getTime() : null,
        },
      ]),
    );

    return mergeEventMetrics({
      matchAggregates,
      ladder,
      identityFor: (tournamentId) => identities.get(tournamentId) ?? null,
      basicKeys: TEAM_BASIC_KEYS,
      columns: TEAM_METRIC_COLUMNS,
    });
  },
  ['team-event-metrics'],
  { tags: TAGS, revalidate: REVALIDATE },
);

/* ── Metadata ──────────────────────────────────────────────────────────── */

/** Shared metadata for the base route and its tab routes. */
export async function teamMetadata(slug: string, tab: TeamTabId = 'overview'): Promise<Metadata> {
  const team = await loadTeamContext(slug);
  if (!team) return { title: `Team Not Found — ${SITE_NAME}` };

  const label = `${team.name}${team.tag ? ` [${team.tag}]` : ''}`;
  const game = team.game?.name || null;
  const segment = TEAM_TAB_SEGMENT[tab];
  // Canonical resolves to the stored slug so tag/name look-alikes consolidate.
  const canonicalSlug = team.slug || slug;
  const path = segment ? `/teams/${canonicalSlug}/${segment}` : `/teams/${canonicalSlug}`;
  // The title carries the name alone — the tag costs ~8 characters that a long
  // team name needs more, and it is kept in the description and the structured
  // data instead.
  const title = teamTabTitle(tab, team.name);
  const description = teamTabDescription(tab, label, game);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      url: absoluteUrl(path),
      ...(team.logoUrl ? { images: [team.logoUrl] } : {}),
    },
    ...canonical(path),
  };
}
