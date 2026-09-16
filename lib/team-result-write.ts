/**
 * "May this player paste write this MatchTeamResult, and with which values?"
 *
 * `bulkUniversalPlayerMatchImportAction` ingests player rows, but every player
 * row also cascades into the team result of its team. The cascade used to write
 * a full team payload on every row: `bonusPoints: 0` hard-coded, and
 * `teamDetailPayload(row)` resolving every telemetry column the paste did not
 * carry to NULL. Replaying a player sheet therefore zeroed real bonus points and
 * erased recorded team telemetry for teams the paste says nothing about — a
 * player sheet has no team-level columns at all, so *every* row did this.
 *
 * The rule implemented here:
 *
 *   - a team result the DB already has, and the paste supplies no team-level
 *     column for, is left completely alone (scoring and detail alike);
 *   - a team result the paste does supply team columns for is written, but with
 *     `bonusPoints` and any other team value the row stayed silent about
 *     inherited from the stored row instead of being reset;
 *   - a team result the DB does not have yet is authored as before, so a player
 *     paste can still create a missing team row.
 *
 * "Team-level column" means only the `team_*` scoring fields this importer has
 * always read (`team_rank`/`teamRank`, `team_wwcd`/`teamWwcd`/`wwcd`,
 * `team_place`/`teamPlace`, `team_elims`/`teamElims`, `team_total`/`teamTotal`)
 * and any bonus column. Detection and value reading share one alias table, so a
 * column can never count as supplied without also being read, or be read without
 * counting as supplied.
 *
 * A generic telemetry column (`TEAM_DETAIL_FIELDS` — damage, survival time,
 * healing, …) is deliberately NOT team-level data here. `playerDetailPayload` is
 * `teamDetailPayload` plus the player-only fields, so a player sheet's `damage`
 * column *is* the player's damage. Reading it as the team's is what let a BMPS
 * player paste overwrite every team's recorded telemetry with one player's
 * numbers — the last row processed for that team. Team telemetry is owned by the
 * team-scorecard path (`bulkUniversalMatchImportAction`), which writes
 * `teamDetailPayload` itself and never calls this module.
 *
 * `bulkUniversalMatchImportAction` (the team-scorecard path) deliberately keeps
 * its old behaviour — it owns the rows it writes — so it uses
 * `teamDetailPayload` directly and never calls this module.
 */
import { TEAM_DETAIL_FIELDS, collectSuppliedFields, isSupplied } from './match-stat-fields';
import { computeTotalPoints, parseWwcd } from './tournament-math';

/**
 * The scoring fields an inbound row can override on a team result. Everything
 * absent is inherited from the stored row (or authored, when there is none).
 */
export interface TeamResultScoring {
  rank: number;
  wwcd: boolean;
  placePoints: number;
  elimsPoints: number;
  bonusPoints: number;
  totalPoints: number;
}

/**
 * Alternate spellings per canonical scoring key. Snake case is what the paste
 * mapper emits, camelCase is what a JSON paste shaped like the Prisma models
 * carries; both name the same column.
 *
 * `teamElimsPoints` is deliberately absent: on this model it is already
 * multiplied points, while the accepted `team_elims` column is a raw count this
 * importer multiplies itself. Accepting both names for one slot would silently
 * apply the multiplier twice.
 */
const SCORING_ROW_KEYS: Record<keyof TeamResultScoring, readonly string[]> = {
  rank: ['team_rank', 'teamRank'],
  wwcd: ['team_wwcd', 'teamWwcd', 'wwcd'],
  placePoints: ['team_place', 'teamPlace'],
  elimsPoints: ['team_elims', 'teamElims'],
  bonusPoints: ['bonusPoints', 'bonus_points', 'bonus', 'teamBonusPoints', 'team_bonus_points'],
  totalPoints: ['team_total', 'teamTotal'],
};

/** Canonical scoring key → the alias that supplied it, if the row carried one. */
export type TeamResultRowKey = 'rank' | 'wwcd' | 'placePoints' | 'elims' | 'bonusPoints' | 'totalPoints';

export interface TeamResultRowValues {
  /** Canonical keys of {@link TeamResultScoring} the row actually carried. */
  supplied: TeamResultRowKey[];
  rank: number | null;
  /** Raw value for `parseWwcd` — `undefined` when the row has no WWCD column. */
  wwcdRaw: unknown;
  placePoints: number | null;
  /** Raw elimination COUNT (pre-multiplier), never points. */
  elimsCount: number | null;
  bonusPoints: number | null;
  totalPoints: number | null;
}

function read(row: object, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

/** First supplied alias value for a canonical key, or `undefined`. */
function firstSupplied(row: object, aliases: readonly string[]): unknown {
  for (const alias of aliases) {
    const value = read(row, alias);
    if (isSupplied(value)) return value;
  }
  return undefined;
}

function toNumber(value: unknown): number | null {
  if (value === undefined) return null;
  const n = Number(value as number);
  return Number.isFinite(n) ? n : null;
}

/** Which team-level scoring columns the row carried, and their raw values. */
export function readTeamResultRow(row: object): TeamResultRowValues {
  const supplied: TeamResultRowKey[] = [];
  const take = (key: keyof TeamResultScoring, alias: TeamResultRowKey) => {
    const raw = firstSupplied(row, SCORING_ROW_KEYS[key]);
    if (raw !== undefined) supplied.push(alias);
    return raw;
  };

  // Read in canonical key order so `supplied` reads as a stable list.
  const rank = take('rank', 'rank');
  const wwcdRaw = take('wwcd', 'wwcd');
  const placePoints = take('placePoints', 'placePoints');
  const elimsCount = take('elimsPoints', 'elims');
  const bonusPoints = take('bonusPoints', 'bonusPoints');
  const totalPoints = take('totalPoints', 'totalPoints');

  return {
    supplied,
    rank: toNumber(rank),
    wwcdRaw,
    placePoints: toNumber(placePoints),
    elimsCount: toNumber(elimsCount),
    bonusPoints: toNumber(bonusPoints),
    totalPoints: toNumber(totalPoints),
  };
}

export interface TeamResultWriteInput {
  /** The inbound paste row. */
  row: object;
  /** A MatchTeamResult already exists for this (matchGameId, teamId) in the DB. */
  hasDbRow: boolean;
  /** The stored row's scoring when `hasDbRow`, else `null`. */
  existing: TeamResultScoring | null;
  /** Placement points for a rank that has no stored row to inherit from. */
  placePointsForRank: (rank: number) => number;
  /**
   * Raw team elimination count the caller resolved: the row's explicit column,
   * the inherited stored figure, or the running sum of the team's player rows.
   */
  elimsCount: number;
  killMultiplier: number;
}

export interface TeamResultWriteDecision {
  /**
   * False → leave the stored row, scoring and detail alike, exactly as it is.
   * The `scoring` below is then simply the stored row's scoring, for callers
   * that need a team snapshot (e.g. MatchPlayerStat.team* fields).
   */
  shouldWrite: boolean;
  /** Effective scoring: what the write would store, or the stored values. */
  scoring: TeamResultScoring;
  /** Canonical team-level scoring keys the row carried. */
  suppliedScoringFields: TeamResultRowKey[];
  /**
   * Telemetry columns the row carried, per `TEAM_DETAIL_FIELDS`. Informational
   * only: on a player sheet these are the player's figures, and they never reach
   * the team result.
   */
  suppliedDetailFields: string[];
  /** True when a stored row exists and the paste brought nothing for it. */
  skippedExistingRow: boolean;
}

/**
 * Decide whether the row's team result may be written, and with which values.
 *
 * Pure: every input that needs the DB or the paste's running state (the stored
 * row, the placement matrix, the accumulated elim count) is passed in.
 */
export function decideTeamResultWrite(input: TeamResultWriteInput): TeamResultWriteDecision {
  const rowValues = readTeamResultRow(input.row);
  const suppliedDetailFields = collectSuppliedFields(input.row, TEAM_DETAIL_FIELDS);
  const existing = input.hasDbRow ? input.existing : null;

  // Only the explicit team_* scoring columns count. A generic telemetry column
  // belongs to the player on a player sheet, so it cannot speak for the team.
  const pastesTeamLevelData = rowValues.supplied.length > 0;

  if (existing && !pastesTeamLevelData) {
    // The paste says nothing about this team: its stored scoring and telemetry
    // stay authoritative. Writing here is what zeroed bonus points and nulled
    // recorded team detail on every player-only re-import.
    return {
      shouldWrite: false,
      scoring: existing,
      suppliedScoringFields: [],
      suppliedDetailFields,
      skippedExistingRow: true,
    };
  }

  // `|| fallback` semantics kept from the original cascade: a rank of 0 (or an
  // unparseable one) is not a rank, so it falls through to the stored rank.
  const rank =
    rowValues.rank !== null && rowValues.rank > 0
      ? rowValues.rank
      : existing
      ? existing.rank
      : 1;

  const placePoints =
    rowValues.placePoints ?? (existing ? existing.placePoints : input.placePointsForRank(rank));
  const elimsPoints = input.elimsCount * input.killMultiplier;
  // Never a hard-coded 0: an existing bonus survives a row that does not
  // mention bonus at all, and it stays part of the total.
  const bonusPoints = rowValues.bonusPoints ?? (existing ? existing.bonusPoints : 0);
  const totalPoints =
    rowValues.totalPoints ??
    computeTotalPoints({ placePoints, elimsPoints, bonusPoints });

  return {
    shouldWrite: true,
    scoring: {
      rank,
      wwcd: parseWwcd(rowValues.wwcdRaw, rank),
      placePoints,
      elimsPoints,
      bonusPoints,
      totalPoints,
    },
    suppliedScoringFields: rowValues.supplied,
    suppliedDetailFields,
    skippedExistingRow: false,
  };
}
