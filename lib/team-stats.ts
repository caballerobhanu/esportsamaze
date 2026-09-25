/**
 * Pure helpers for the team profile pages.
 *
 * The detail-stat columns on `MatchTeamResult` (`damage`, `survivalTime`, …) are
 * NULLABLE and carry no default: an event that never recorded a stat stores
 * NULL, and a genuine zero is stored as `0`. So the unit of a detail average is
 * the FIELD, not the game:
 *
 *   - a field's average is its sum over the rows that recorded it, divided by
 *     the count of exactly those rows;
 *   - a genuine `0` is recorded data and stays in the denominator;
 *   - a NULL ("never recorded") is excluded from both the sum and the count, so
 *     it can neither inflate nor deflate the average.
 *
 * Each field therefore has its own sample size, which is also what the UI
 * reports ("412 dmg · from 82 scorecards"). `hasDetailStats()` and
 * `detailStatSqlPredicate()` are the row-level and SQL-level twins of that rule,
 * and `tests/team-stats.test.ts` pins the semantics down.
 *
 * Pure module: no Prisma, no React, no IO.
 */

/** Detail-stat columns on `MatchTeamResult` that go blank for a whole event. */
export const DETAIL_STAT_FIELDS = [
  'damage',
  'survivalTime',
  'healing',
  'damageReceived',
  'headshots',
  'assists',
  'knockouts',
  'utilitiesTotal',
  'totalDist',
  'rescues',
] as const;

export type DetailStatField = (typeof DETAIL_STAT_FIELDS)[number];

/** Fewer underlying games than this and a computed average renders as "—". */
export const MIN_AVERAGE_SAMPLES = 5;

/**
 * Cache tag for every team-profile aggregate. Lives in this Prisma-free module
 * so `lib/revalidate-tournament.ts` can import it without pulling the database
 * client into a script context.
 */
export const TEAM_PROFILE_CACHE_TAG = 'team-profile';

export type DetailStatRow = { matchGameId: string } & Partial<Record<DetailStatField, number | null>>;

/**
 * True when the row recorded any detail stat. A genuine `0` IS recorded data;
 * only a NULL/undefined field means "never recorded".
 */
export function hasDetailStats(row: DetailStatRow): boolean {
  return DETAIL_STAT_FIELDS.some((field) => {
    const value = row[field];
    return typeof value === 'number' && Number.isFinite(value);
  });
}

export interface DetailStatAverage {
  /** Sum of the field over the rows that recorded it. */
  sum: number;
  /** Rows that recorded this field — the sample size, genuine zeros included. */
  samples: number;
  /** `sum / samples`, or `null` when the field was never recorded. */
  average: number | null;
}

/**
 * Average one detail stat over the rows that recorded it.
 *
 * The denominator is per-field: rows where THIS field is NULL are "not
 * recorded" and drop out entirely, while a row that genuinely recorded `0`
 * stays in. Two fields can therefore report two different sample sizes.
 */
export function averageDetailStat(
  rows: readonly DetailStatRow[],
  field: DetailStatField,
): DetailStatAverage {
  let sum = 0;
  let samples = 0;

  for (const row of rows) {
    const value = row[field];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    sum += value;
    samples += 1;
  }

  return { sum, samples, average: samples > 0 ? sum / samples : null };
}

/**
 * SQL fragment mirroring `hasDetailStats()` for a `MatchTeamResult` alias: a
 * row "has" a detail stat when the field is recorded, i.e. non-NULL.
 * `alias` must be a literal identifier from a call site — never user input.
 */
export function detailStatSqlPredicate(alias: string): string {
  return DETAIL_STAT_FIELDS.map((field) => `${alias}."${field}" IS NOT NULL`).join(' OR ');
}

/* ── Match summary ─────────────────────────────────────────────────────── */

export interface RankGroup {
  rank: number;
  games: number;
  /** Summed `totalPoints` for this rank bucket. */
  points: number;
  /** Summed `placePoints` for this rank bucket. */
  placePoints: number;
  /** Summed `elimsPoints` for this rank bucket (defaults to 0). */
  elimsPoints?: number;
}

export interface TeamMatchSummary {
  matches: number;
  wins: number;
  /** 0–1, or `null` with no games. */
  winRate: number | null;
  /** 0–1, or `null` with no games. */
  topFiveRate: number | null;
  /** 0–1, or `null` with no games. */
  topTenRate: number | null;
  totalPoints: number;
  /**
   * Mean placement POINTS per game (`placePoints / games`) — the scoring
   * currency, not the ordinal.
   *
   * Deliberately not a mean rank: battle royale placement is an ordinal on a
   * heavily non-normal distribution (one 1st place and fifteen 16ths), so a
   * mean rank averages an ordinal and hides the distribution that the
   * placement histogram exists to show.
   */
  avgPlacePoints: number | null;
  /** Mean total points per game (`totalPoints / games`). */
  avgTotalPoints: number | null;
  /** Mean elimination points per game (`elimsPoints / games`). */
  avgElimsPoints: number | null;
}

/**
 * Derives the whole stat band from one `rank → games` grouping, so the tiles
 * and the placement histogram can never disagree.
 */
export function summariseTeamMatches(entries: readonly RankGroup[]): TeamMatchSummary {
  let matches = 0;
  let wins = 0;
  let topFive = 0;
  let topTen = 0;
  let totalPoints = 0;
  let placePoints = 0;
  let elimsPoints = 0;

  for (const entry of entries) {
    if (entry.games <= 0) continue;
    matches += entry.games;
    if (entry.rank === 1) wins += entry.games;
    if (entry.rank >= 1 && entry.rank <= 5) topFive += entry.games;
    if (entry.rank >= 1 && entry.rank <= 10) topTen += entry.games;
    totalPoints += entry.points;
    placePoints += entry.placePoints;
    elimsPoints += entry.elimsPoints ?? 0;
  }

  return {
    matches,
    wins,
    winRate: matches > 0 ? wins / matches : null,
    topFiveRate: matches > 0 ? topFive / matches : null,
    topTenRate: matches > 0 ? topTen / matches : null,
    totalPoints,
    avgPlacePoints: matches > 0 ? placePoints / matches : null,
    avgTotalPoints: matches > 0 ? totalPoints / matches : null,
    avgElimsPoints: matches > 0 ? elimsPoints / matches : null,
  };
}

export interface PlacementBin {
  id: string;
  label: string;
  min: number;
  max: number;
  games: number;
}

const PLACEMENT_BIN_DEFS = [
  { id: 'first', label: '1st', min: 1, max: 1 },
  { id: 'second-third', label: '2–3', min: 2, max: 3 },
  { id: 'fourth-tenth', label: '4–10', min: 4, max: 10 },
  { id: 'eleventh-sixteenth', label: '11–16', min: 11, max: Number.POSITIVE_INFINITY },
] as const;

/** Buckets a `rank → games` distribution into the Stats-tab histogram bins. */
export function binPlacements(entries: readonly RankGroup[]): PlacementBin[] {
  return PLACEMENT_BIN_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    min: def.min,
    max: def.max,
    games: entries.reduce(
      (total, entry) => (entry.rank >= def.min && entry.rank <= def.max ? total + entry.games : total),
      0,
    ),
  }));
}

/* ── Match-history grouping ────────────────────────────────────────────── */

/** The minimum a row needs to be bucketed into an event block. */
export interface EventGroupable {
  tournamentId: string;
  scheduledAtMs: number;
}

export interface EventGroup<T> {
  tournamentId: string;
  /** The event's rows, in the order they arrived (the query's own ordering). */
  rows: T[];
}

/**
 * Buckets match rows into one block per event.
 *
 * Two events can run on the same dates, so a naive "split on change" would
 * fragment an event into several runs. Instead every row of an event lands in
 * one block; blocks are ordered by their most recent match, and rows keep the
 * order the query returned them in (`scheduledAt` desc, `overallMatchNumber`
 * desc) — which is what makes a page read #162, #161, #160 rather than #160,
 * #157, #161. Ties between blocks keep first-seen order (Map + stable sort).
 */
export function groupRowsByEvent<T extends EventGroupable>(
  rows: readonly T[],
): EventGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const list = groups.get(row.tournamentId);
    if (list) list.push(row);
    else groups.set(row.tournamentId, [row]);
  }

  return [...groups.entries()]
    .map(([tournamentId, groupRows]) => ({
      tournamentId,
      rows: groupRows,
      latest: groupRows.reduce(
        (max, row) => (row.scheduledAtMs > max ? row.scheduledAtMs : max),
        Number.NEGATIVE_INFINITY,
      ),
    }))
    .sort((a, b) => b.latest - a.latest)
    .map(({ tournamentId, rows: groupRows }) => ({ tournamentId, rows: groupRows }));
}

/* ── Per-player elim metrics ───────────────────────────────────────────── */

export interface PlayerElimGroup {
  playerId: string;
  /** Eliminations recorded on those rows. */
  playerElims: number;
  /** How many `MatchPlayerStat` rows shared that elim count. */
  games: number;
}

export interface PlayerElimMetrics {
  playerId: string;
  /** The player's own scorecards — not the team's game count. */
  matchesPlayed: number;
  totalElims: number;
  avgElims: number | null;
  maxElims: number;
  gamesWithFivePlus: number;
  zeroElimGames: number;
  /** 0–1, or `null` when the player has no scorecards. */
  zeroElimShare: number | null;
}

/** Fold a `groupBy(['playerId','playerElims'])` result into per-player metrics. */
export function summarisePlayerElims(
  entries: readonly PlayerElimGroup[],
): Map<string, PlayerElimMetrics> {
  const out = new Map<string, PlayerElimMetrics>();

  for (const entry of entries) {
    if (entry.games <= 0) continue;
    const current = out.get(entry.playerId) ?? {
      playerId: entry.playerId,
      matchesPlayed: 0,
      totalElims: 0,
      avgElims: null,
      maxElims: 0,
      gamesWithFivePlus: 0,
      zeroElimGames: 0,
      zeroElimShare: null,
    };

    current.matchesPlayed += entry.games;
    current.totalElims += entry.playerElims * entry.games;
    if (entry.playerElims > current.maxElims) current.maxElims = entry.playerElims;
    if (entry.playerElims >= 5) current.gamesWithFivePlus += entry.games;
    if (entry.playerElims === 0) current.zeroElimGames += entry.games;

    out.set(entry.playerId, current);
  }

  for (const metrics of out.values()) {
    metrics.avgElims = metrics.matchesPlayed > 0 ? metrics.totalElims / metrics.matchesPlayed : null;
    metrics.zeroElimShare =
      metrics.matchesPlayed > 0 ? metrics.zeroElimGames / metrics.matchesPlayed : null;
  }

  return out;
}

/* ── Formatting ────────────────────────────────────────────────────────── */

/** "34%", or "—" below the minimum sample. */
export function formatRate(value: number | null, samples: number, decimals = 0): string {
  if (value === null || samples < MIN_AVERAGE_SAMPLES) return '—';
  return `${(value * 100).toFixed(decimals)}%`;
}

/** "5.2", or "—" below the minimum sample. */
export function formatAverage(value: number | null, samples: number, decimals = 1): string {
  if (value === null || samples < MIN_AVERAGE_SAMPLES) return '—';
  return value.toFixed(decimals);
}

/** "412 dmg · from 174 scorecards", or "—" below the minimum sample. */
export function formatDetailAverage(
  avg: DetailStatAverage,
  unit: string,
  decimals = 0,
): string {
  if (avg.average === null || avg.samples < MIN_AVERAGE_SAMPLES) return '—';
  return `${avg.average.toFixed(decimals)} ${unit} · ${scorecardLabel(avg.samples)}`;
}

/** "from 174 scorecards" */
export function scorecardLabel(samples: number): string {
  return `from ${samples} scorecard${samples === 1 ? '' : 's'}`;
}

/** "236 games" */
export function gameLabel(samples: number): string {
  return `${samples} game${samples === 1 ? '' : 's'}`;
}

/** "17:56" for a survival-time average, or "—" below the minimum sample. */
export function formatDuration(seconds: number | null, samples: number): string {
  if (seconds === null || samples < MIN_AVERAGE_SAMPLES) return '—';
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, '0')}`;
}

/** A team's record on one map, as the statistics table accumulates it. */
export interface TeamMapPoints {
  points: number;
  matches: number;
  peak: number;
}

/**
 * A team's points on one map, in whichever measure the table is showing.
 *
 * Shared by the cell and the column's sort, so the order always matches the number
 * on screen — a column that ranks by a different figure from the one it prints is
 * worse than one that cannot be sorted at all. A map the team never played reads as
 * nothing, and a map with no recorded match does not divide by zero.
 */
export function teamMapPoints(
  entry: TeamMapPoints | undefined | null,
  mode: 'sum' | 'avg' | 'max'
): number {
  if (!entry) return 0;
  if (mode === 'avg') return Number((entry.points / (entry.matches || 1)).toFixed(1));
  if (mode === 'max') return entry.peak;
  return entry.points;
}
