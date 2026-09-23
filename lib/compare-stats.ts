/* Cached data layer for the /compare page.
   The page reads searchParams so it must render dynamically, but its heavy
   queries are wrapped in unstable_cache: one warm read serves every visitor.
   Tagged 'compare-stats' — revalidateTournamentPages() purges it the moment
   a scorecard/tournament save lands, with a 15-minute TTL as the fallback.

   The picker default lists ("most compared") are tracked anonymously in the
   ComparePick table and recomputed at most once per day (revalidate: 86400). */

import { unstable_cache } from 'next/cache';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { resolveEventTotals } from '@/lib/tournament-totals';
import {
  DETAIL_METRIC_SPECS,
  PLAYER_BASIC_KEYS,
  PLAYER_METRIC_COLUMNS,
  TEAM_BASIC_KEYS,
  TEAM_METRIC_COLUMNS,
  aggregateMetricsByEvent,
  mergeEventMetrics,
  type EventMetricRow,
  type MetricColumn,
} from '@/lib/event-metrics';

const TAGS = ['compare-stats'];
const REVALIDATE = 900;

/**
 * Game ordering for every match-level query here.
 *
 * `scheduledAt` is NOT unique — a whole matchday shares one timestamp (BGMS 2026
 * ran 162 matches over 37 distinct values, up to 6 sharing one) — so on its own
 * the database is free to return a matchday in any order. That silently scrambles
 * the "last ten" form lane into #157, #159, #158, #160. `overallMatchNumber` is
 * the per-event run order; `sequence` is the last resort for a multi-game match.
 * Same keys as `MATCH_ORDER` in lib/team-data.ts.
 */
const TEAM_MATCH_ORDER: Prisma.MatchTeamResultOrderByWithRelationInput[] = [
  { matchGame: { match: { scheduledAt: 'desc' } } },
  { matchGame: { match: { overallMatchNumber: { sort: 'desc', nulls: 'last' } } } },
  { matchGame: { sequence: 'desc' } },
];

const PLAYER_MATCH_ORDER: Prisma.MatchPlayerStatOrderByWithRelationInput[] = [
  { matchGame: { match: { scheduledAt: 'desc' } } },
  { matchGame: { match: { overallMatchNumber: { sort: 'desc', nulls: 'last' } } } },
  { matchGame: { sequence: 'desc' } },
];

/** Window both sides are compared over. Stated on the page — never implied career. */
export const COMPARE_GAME_WINDOW = 1000;

/** How much history the whole sheet covers. */
export type CompareRange = 'lifetime' | '6m';

/**
 * Cut-off for the recent view, or null for lifetime. Six months is counted back
 * from today rather than from the newest game, so the window means the same
 * thing for a side that played last week and one that stopped a year ago.
 */
export function rangeStart(range: CompareRange): Date | null {
  if (range !== '6m') return null;
  const since = new Date();
  since.setMonth(since.getMonth() - 6);
  return since;
}

/** Prisma filter fragment for a range, or an empty object for lifetime. */
function rangeFilter(range: CompareRange, path: (since: Date) => object): object {
  const since = rangeStart(range);
  return since ? path(since) : {};
}

export type ComparePickType = 'TEAM' | 'PLAYER';

/** Record the two sides of an explicit compare view. Never throws. */
export async function recordComparePicks(type: ComparePickType, entityIds: string[]): Promise<void> {
  try {
    await Promise.all(
      entityIds
        .filter(Boolean)
        .map((entityId) =>
          prisma.comparePick.upsert({
            where: { entityType_entityId: { entityType: type, entityId } },
            create: { entityType: type, entityId, picks: 1 },
            update: { picks: { increment: 1 } },
          })
        )
    );
  } catch {
    // Pick tracking is best-effort — never break the page over it.
  }
}

export interface CompareOption {
  value: string;
  label: string;
  subtitle?: string | null;
  imageUrl?: string | null;
}

async function popularTeamOptions(): Promise<CompareOption[]> {
  const top = await prisma.comparePick.findMany({
    where: { entityType: 'TEAM' },
    orderBy: { picks: 'desc' },
    take: 50,
  });
  let ids = top.map((t) => t.entityId);

  // Fallback before any picks exist: teams with the most matches on record.
  if (ids.length === 0) {
    const activity = await prisma.matchTeamResult.groupBy({
      by: ['teamId'],
      _count: { teamId: true },
      orderBy: { _count: { teamId: 'desc' } },
      take: 50,
    });
    ids = activity.map((a) => a.teamId);
  }
  if (ids.length === 0) return [];

  const teams = await prisma.team.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, slug: true, logoUrl: true, tag: true },
  });
  const byId = new Map(teams.map((t) => [t.id, t]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((t) => ({
      value: t!.slug || t!.id,
      label: t!.name,
      subtitle: t!.tag || null,
      imageUrl: t!.logoUrl || null,
    }));
}

async function popularPlayerOptions(): Promise<CompareOption[]> {
  const top = await prisma.comparePick.findMany({
    where: { entityType: 'PLAYER' },
    orderBy: { picks: 'desc' },
    take: 50,
  });
  let ids = top.map((p) => p.entityId);

  if (ids.length === 0) {
    const activity = await prisma.matchPlayerStat.groupBy({
      by: ['playerId'],
      _count: { playerId: true },
      orderBy: { _count: { playerId: 'desc' } },
      take: 50,
    });
    ids = activity.map((a) => a.playerId);
  }
  if (ids.length === 0) return [];

  const players = await prisma.player.findMany({
    where: { id: { in: ids } },
    select: { id: true, ign: true, slug: true, avatarUrl: true, currentTeam: { select: { name: true } } },
  });
  const byId = new Map(players.map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((p) => ({
      value: p!.slug || p!.id,
      label: p!.ign,
      subtitle: p!.currentTeam?.name || null,
      imageUrl: p!.avatarUrl || null,
    }));
}

/**
 * Default picker lists — the 50 most-compared teams/players. Computed at most
 * once per day; every other read is served from the cache. Falls back to
 * match-activity leaders until pick data accumulates.
 */
export const getPopularCompareOptions = (type: 'teams' | 'players') =>
  unstable_cache(
    type === 'teams' ? popularTeamOptions : popularPlayerOptions,
    [`compare-popular-${type}`],
    { tags: ['compare-popular'], revalidate: 86_400 }
  )();

/** Team profile for the header cards (no date fields — cache-serialization safe). */
export const getTeamCompareProfile = unstable_cache(
  async (idOrSlug: string) =>
    prisma.team.findFirst({
      where: { OR: [{ slug: idOrSlug }, { id: idOrSlug }] },
      include: {
        game: { select: { slug: true, name: true } },
        tournamentsWon: true,
        tournamentsRunnerUp: true,
        players: { where: { status: 'ACTIVE' }, select: { id: true, ign: true, slug: true, role: true, avatarUrl: true } },
      },
    }),
  ['compare-team-profile'],
  { tags: TAGS, revalidate: REVALIDATE }
);

/** Most recent games for one team (deterministic order). */
export const getTeamCompareResults = unstable_cache(
  async (teamId: string, range: CompareRange = 'lifetime') =>
    prisma.matchTeamResult.findMany({
      where: { teamId, ...rangeFilter(range, (since) => ({ matchGame: { match: { scheduledAt: { gte: since } } } })) },
      select: {
        matchGameId: true,
        rank: true,
        wwcd: true,
        placePoints: true,
        elimsPoints: true,
        totalPoints: true,
        matchGame: { select: { mapName: true } },
      },
      orderBy: TEAM_MATCH_ORDER,
      take: COMPARE_GAME_WINDOW,
    }),
  ['compare-team-results'],
  { tags: TAGS, revalidate: REVALIDATE }
);

/** Player profile for the header cards. */
export const getPlayerCompareProfile = unstable_cache(
  async (idOrSlug: string) =>
    prisma.player.findFirst({
      where: { OR: [{ slug: idOrSlug }, { ign: { equals: idOrSlug, mode: 'insensitive' } }, { id: idOrSlug }] },
      include: { currentTeam: true, game: true },
    }),
  ['compare-player-profile'],
  { tags: TAGS, revalidate: REVALIDATE }
);

/** Most recent games for one player (deterministic order). */
export const getPlayerCompareResults = unstable_cache(
  async (playerId: string, range: CompareRange = 'lifetime') =>
    prisma.matchPlayerStat.findMany({
      where: { playerId, ...rangeFilter(range, (since) => ({ matchGame: { match: { scheduledAt: { gte: since } } } })) },
      select: {
        matchGameId: true,
        playerElims: true,
        teamWwcd: true,
        matchGame: { select: { mapName: true } },
      },
      orderBy: PLAYER_MATCH_ORDER,
      take: COMPARE_GAME_WINDOW,
    }),
  ['compare-player-results'],
  { tags: TAGS, revalidate: REVALIDATE }
);

/* ── Events each side appeared in ──────────────────────────────────────── */

export interface CompareEventEntry {
  tournamentId: string;
  name: string;
  shortName: string | null;
  series: string | null;
  season: string | null;
  slug: string;
  startDateMs: number | null;
  /** Final rank for that event, or null when none was recorded. */
  rank: number | null;
}

const COMPARE_EVENT_TOURNAMENT_SELECT = {
  id: true,
  name: true,
  shortName: true,
  series: true,
  season: true,
  slug: true,
  startDate: true,
} as const;

/** Every event a team has an entry for, newest first. */
export const getTeamCompareEvents = unstable_cache(
  async (teamId: string, range: CompareRange = 'lifetime'): Promise<CompareEventEntry[]> => {
    const rows = await prisma.tournamentTeam.findMany({
      where: { teamId, ...rangeFilter(range, (since) => ({ tournament: { startDate: { gte: since } } })) },
      select: { finalRank: true, tournament: { select: COMPARE_EVENT_TOURNAMENT_SELECT } },
    });
    return rows
      .map(toEventEntry)
      .filter((entry): entry is CompareEventEntry => entry !== null);
  },
  ['compare-team-events'],
  { tags: TAGS, revalidate: REVALIDATE },
);

/**
 * Every event a player appeared in — roster membership only, matched by player
 * id. A name-only roster entry is not an appearance and never links here.
 */
export const getPlayerCompareEvents = unstable_cache(
  async (playerId: string, range: CompareRange = 'lifetime'): Promise<CompareEventEntry[]> => {
    const rows = await prisma.tournamentTeam.findMany({
      where: {
        rosterJson: { array_contains: [{ playerId }] },
        ...rangeFilter(range, (since) => ({ tournament: { startDate: { gte: since } } })),
      },
      select: { finalRank: true, tournament: { select: COMPARE_EVENT_TOURNAMENT_SELECT } },
    });
    return rows
      .map(toEventEntry)
      .filter((entry): entry is CompareEventEntry => entry !== null);
  },
  ['compare-player-events'],
  { tags: TAGS, revalidate: REVALIDATE },
);

function toEventEntry(row: {
  finalRank: number | null;
  tournament: {
    id: string;
    name: string;
    shortName: string | null;
    series: string | null;
    season: string | null;
    slug: string;
    startDate: Date;
  };
}): CompareEventEntry | null {
  const tournament = row.tournament;
  if (!tournament) return null;
  return {
    tournamentId: tournament.id,
    name: tournament.name,
    shortName: tournament.shortName,
    series: tournament.series,
    season: tournament.season,
    slug: tournament.slug,
    startDateMs: tournament.startDate ? tournament.startDate.getTime() : null,
    rank: row.finalRank,
  };
}

/* ── Per-map breakdown ─────────────────────────────────────────────────── */

export interface CompareMapStats {
  mapName: string;
  matches: number;
  /** Games won on that map — first place, not a points total. */
  wins: number;
  /** Elimination points for a team, eliminations for a player. */
  elims: number;
}

/** Rolls one side's game rows into a bucket per map, most played first. */
export function aggregateByMap<T>(
  rows: readonly T[],
  mapOf: (row: T) => string | null,
  winOf: (row: T) => boolean,
  elimsOf: (row: T) => number,
): CompareMapStats[] {
  const byMap = new Map<string, CompareMapStats>();
  for (const row of rows) {
    const mapName = (mapOf(row) ?? '').trim() || 'Unknown map';
    let entry = byMap.get(mapName);
    if (!entry) {
      entry = { mapName, matches: 0, wins: 0, elims: 0 };
      byMap.set(mapName, entry);
    }
    entry.matches += 1;
    if (winOf(row)) entry.wins += 1;
    entry.elims += elimsOf(row);
  }
  return [...byMap.values()].sort((a, b) => b.matches - a.matches || a.mapName.localeCompare(b.mapName));
}

/* ── Detail metrics for one side of a comparison ───────────────────────── */

export interface CompareMetricValue {
  /** Summed over the window; null when nothing recorded the metric. */
  value: number | null;
  /** Scorecards that recorded it — the denominator for a per-game average. */
  samples: number;
  /** The total also draws on reported day / stage / event slices. */
  includesReported: boolean;
}

export interface CompareMetrics {
  /** Games in the window. */
  games: number;
  metrics: Record<string, CompareMetricValue>;
}

/** Placeholder identity: this path reads a row's metrics, never its event. */
const metricsOnlyIdentity = (tournamentId: string) => ({
  tournamentId,
  tournamentName: '',
  tournamentShortName: null,
  tournamentSeries: null,
  tournamentSeason: null,
  tournamentSlug: tournamentId,
  startDateMs: null,
});

/**
 * Folds per-event metric rows into one figure per metric.
 *
 * Each metric is summed from whatever level every event recorded it at —
 * scorecard values where they exist, reported slice totals otherwise, never
 * both for the same event, because the merge resolves that per metric. The
 * `includesReported` flag survives so a caller can mark a total that is not
 * purely scorecard-derived rather than passing it off as one.
 */
function foldCareerMetrics(
  rows: EventMetricRow[],
  games: number,
  columns: readonly MetricColumn[],
): CompareMetrics {
  const metrics: Record<string, CompareMetricValue> = {};
  for (const column of columns) {
    metrics[column.key] = { value: null, samples: 0, includesReported: false };
  }

  for (const row of rows) {
    for (const column of columns) {
      const value = row.metrics[column.key];
      if (value === null || value === undefined) continue;
      const entry = metrics[column.key];
      entry.value = (entry.value ?? 0) + value;
      entry.samples += row.coverage[column.key]?.samples ?? 0;
      const source = row.sources[column.key];
      if (source && source !== 'MATCH') entry.includesReported = true;
    }
  }

  return { games, metrics };
}

/** Detail metrics for one player across the window. */
export const getPlayerCompareMetrics = unstable_cache(
  async (playerId: string, range: CompareRange = 'lifetime'): Promise<CompareMetrics> => {
    const [rows, reported] = await Promise.all([
      prisma.matchPlayerStat.findMany({
        where: { playerId, ...rangeFilter(range, (since) => ({ matchGame: { match: { scheduledAt: { gte: since } } } })) },
        select: {
          damage: true,
          assists: true,
          knockouts: true,
          survivalTime: true,
          grenadeElims: true,
          utilitiesTotal: true,
          matchGame: { select: { match: { select: { tournamentId: true } } } },
        },
        orderBy: PLAYER_MATCH_ORDER,
        take: COMPARE_GAME_WINDOW,
      }),
      prisma.tournamentPlayerTotals.findMany({
        // Reported slices have no date of their own, so the range is read from
        // the event they belong to.
        where: { playerId, ...rangeFilter(range, (since) => ({ tournament: { startDate: { gte: since } } })) },
        select: {
          tournamentId: true,
          scope: true,
          stageId: true,
          label: true,
          damage: true,
          assists: true,
          knockouts: true,
          survivalTime: true,
        },
      }),
    ]);

    const matchAggregates = aggregateMetricsByEvent(
      rows,
      (row) => row.matchGame.match.tournamentId,
      DETAIL_METRIC_SPECS,
    );

    // The reported ladder carries damage / assists / knockouts / survival, but
    // not grenade eliminations or utility usage — those stay scorecard-only.
    const ladder = resolveEventTotals(
      reported.map((row) => ({
        tournamentId: row.tournamentId,
        scope: row.scope,
        stageId: row.stageId,
        label: row.label,
        metrics: {
          damage: row.damage,
          assists: row.assists,
          knockouts: row.knockouts,
          survivalTime: row.survivalTime,
        },
      })),
    );

    const eventRows = mergeEventMetrics({
      matchAggregates,
      ladder,
      identityFor: metricsOnlyIdentity,
      basicKeys: PLAYER_BASIC_KEYS,
      columns: PLAYER_METRIC_COLUMNS,
    });

    return foldCareerMetrics(eventRows, rows.length, PLAYER_METRIC_COLUMNS);
  },
  ['compare-player-metrics'],
  { tags: TAGS, revalidate: REVALIDATE },
);

/** Detail metrics for one team across the window. */
export const getTeamCompareMetrics = unstable_cache(
  async (teamId: string, range: CompareRange = 'lifetime'): Promise<CompareMetrics> => {
    const rows = await prisma.matchTeamResult.findMany({
      where: { teamId, ...rangeFilter(range, (since) => ({ matchGame: { match: { scheduledAt: { gte: since } } } })) },
      select: {
        damage: true,
        assists: true,
        knockouts: true,
        survivalTime: true,
        grenadeElims: true,
        utilitiesTotal: true,
        matchGame: { select: { match: { select: { tournamentId: true } } } },
      },
      orderBy: TEAM_MATCH_ORDER,
      take: COMPARE_GAME_WINDOW,
    });

    const matchAggregates = aggregateMetricsByEvent(
      rows,
      (row) => row.matchGame.match.tournamentId,
      DETAIL_METRIC_SPECS,
    );

    const eventRows = mergeEventMetrics({
      matchAggregates,
      // A team's reported ladder carries scoring only, never telemetry, so
      // there is nothing here for it to fill in.
      ladder: new Map(),
      identityFor: metricsOnlyIdentity,
      basicKeys: TEAM_BASIC_KEYS,
      columns: TEAM_METRIC_COLUMNS,
    });

    return foldCareerMetrics(eventRows, rows.length, TEAM_METRIC_COLUMNS);
  },
  ['compare-team-metrics'],
  { tags: TAGS, revalidate: REVALIDATE },
);
