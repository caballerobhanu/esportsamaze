/**
 * Detail (telemetry) fields on MatchTeamResult / MatchPlayerStat, and the
 * provenance stamp written alongside them.
 *
 * These fields are nullable because a tournament may simply never have recorded
 * them. The write paths used to coerce absent input to `0`, which made
 * "not recorded" indistinguishable from a genuine zero. Scoring fields are
 * deliberately NOT in these lists — they stay non-nullable with a zero fallback.
 *
 * Tracking is per (tournament, field), measured from the data: BGMS tracked
 * playerPowerplay but never damage, BMPS the other way round. A per-game rule
 * would have destroyed real values, so `scripts/migrate-untracked-stats.ts`
 * decides field-by-field per event using these lists.
 */
import type { Prisma } from '@prisma/client';
import { computeTotalDistance, computeUtilitiesTotal } from './tournament-math';

/** Detail fields present on both models. */
export const TEAM_DETAIL_FIELDS: readonly string[] = [
  'damage',
  'survivalTime',
  'healing',
  'damageReceived',
  'headshots',
  'assists',
  'knockouts',
  'longestElim',
  'vehicleElims',
  'grenadeElims',
  'smokesUsed',
  'grenadesUsed',
  'molotovsUsed',
  'flashUsed',
  'utilitiesTotal',
  'airdrops',
  'rescues',
  'distDrove',
  'distWalk',
  'totalDist',
];

/** Team detail fields plus the player-only ones. */
export const PLAYER_DETAIL_FIELDS: readonly string[] = [
  ...TEAM_DETAIL_FIELDS,
  'playerPowerplay',
  'deaths',
  'isMvp',
];

/**
 * Detail fields stored as booleans. Their "was never recorded" value is `false`,
 * so migration predicates must test `= false` / `= true` rather than `= 0`.
 */
export const BOOLEAN_DETAIL_FIELDS: readonly string[] = ['isMvp'];

/**
 * Fields that must stay non-nullable. The migration script asserts its target
 * set can never intersect this list — a scoring zero must never become NULL.
 */
export const SCORING_FIELDS: readonly string[] = [
  'id',
  'matchGameId',
  'teamId',
  'playerId',
  'shortCode',
  'score',
  'rawData',
  'mp',
  'rank',
  'wwcd',
  'won',
  'placePoints',
  'elimsPoints',
  'bonusPoints',
  'totalPoints',
  'playerElims',
  'kills',
  'teamRank',
  'teamWwcd',
  'teamPlacePoints',
  'teamElimsPoints',
  'teamBonusPoints',
  'teamTotalPoints',
];

/**
 * Alternate inbound keys per canonical field. Imports arrive as hand-made
 * spreadsheets, so `total_dist`, `dist_drove` and friends all show up.
 */
export const DETAIL_FIELD_ALIASES: Record<string, readonly string[]> = {
  damage: ['damage'],
  survivalTime: ['survivalTime', 'survival_time', 'survival'],
  healing: ['healing'],
  damageReceived: ['damageReceived', 'damage_received'],
  headshots: ['headshots'],
  assists: ['assists'],
  knockouts: ['knockouts'],
  longestElim: ['longestElim', 'longest_elim'],
  vehicleElims: ['vehicleElims', 'vehicle_elims'],
  grenadeElims: ['grenadeElims', 'grenade_elims'],
  smokesUsed: ['smokesUsed', 'smokes_used'],
  grenadesUsed: ['grenadesUsed', 'grenades_used'],
  molotovsUsed: ['molotovsUsed', 'molotovs_used'],
  flashUsed: ['flashUsed', 'flash_used'],
  utilitiesTotal: ['utilitiesTotal', 'utilities', 'utilities_total'],
  airdrops: ['airdrops'],
  rescues: ['rescues'],
  distDrove: ['distDrove', 'dist_drove'],
  distWalk: ['distWalk', 'dist_walk'],
  totalDist: ['totalDist', 'total_dist'],
  playerPowerplay: ['playerPowerplay', 'player_powerplay', 'powerplay'],
  deaths: ['deaths'],
  isMvp: ['isMvp', 'is_mvp', 'mvp'],
};

export function detailFieldAliases(field: string): readonly string[] {
  return DETAIL_FIELD_ALIASES[field] ?? [field];
}

/** True when the inbound row actually carried a value (empty string and null do not count). */
export function isSupplied(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

function isTruthyText(value: unknown): boolean {
  const s = String(value).trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === 'y' || s === '1' || s === 'mvp' || s === '⭐';
}

/**
 * Inbound rows reach us as interfaces, type aliases and plain objects, so these
 * helpers accept `object` and index it internally rather than demanding a
 * `Record` index signature at every call site.
 */
function read(row: object, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

/** Parsed detail number when present in the row, otherwise null — never a fabricated 0. */
export function suppliedNumber(row: object, field: string): number | null {
  for (const key of detailFieldAliases(field)) {
    const raw = read(row, key);
    if (!isSupplied(raw)) continue;
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Parsed detail boolean when present in the row, otherwise null. */
export function suppliedBoolean(row: object, field: string): boolean | null {
  for (const key of detailFieldAliases(field)) {
    const raw = read(row, key);
    if (!isSupplied(raw)) continue;
    if (typeof raw === 'boolean') return raw;
    return isTruthyText(raw);
  }
  return null;
}

/** Canonical detail fields the inbound row actually carried — recorded as `provenance.supplied`. */
export function collectSuppliedFields(row: object, fields: readonly string[]): string[] {
  return fields.filter((field) => detailFieldAliases(field).some((key) => isSupplied(read(row, key))));
}

/** Sum of the four utility counters, or null when none of them was recorded. */
export function deriveUtilitiesTotal(values: {
  smokesUsed: number | null;
  grenadesUsed: number | null;
  molotovsUsed: number | null;
  flashUsed: number | null;
}): number | null {
  const anySupplied = Object.values(values).some((v) => v !== null && v !== undefined);
  return anySupplied ? computeUtilitiesTotal(values) : null;
}

/**
 * distDrove + distWalk, or null when neither distance was supplied. The old
 * `0 + 0` fallback fabricated a real-looking zero for untracked events.
 */
export function deriveTotalDistance(values: { distDrove: number | null; distWalk: number | null }): number | null {
  const anySupplied = values.distDrove !== null || values.distWalk !== null;
  return anySupplied ? computeTotalDistance(values) : null;
}

export interface ImportProvenance {
  source: string;
  importedAt: string;
  supplied: string[];
}

/**
 * Merges a provenance stamp into rawData without discarding whatever was
 * already there. A second stamp becomes a list so the original survives.
 */
export function mergeRawDataProvenance(rawData: unknown, provenance: object): Record<string, unknown> {
  const base =
    rawData && typeof rawData === 'object' && !Array.isArray(rawData)
      ? { ...(rawData as Record<string, unknown>) }
      : {};
  const existing = base.provenance;
  base.provenance =
    existing === null || existing === undefined
      ? provenance
      : Array.isArray(existing)
        ? [...existing, provenance]
        : [existing, provenance];
  return base;
}

/** Stamp for the `create` branch of an importer upsert — never written on update. */
export function buildImportProvenance(source: string, supplied: string[]): ImportProvenance {
  return { source, importedAt: new Date().toISOString(), supplied };
}

/**
 * Detail (telemetry) payload for a team result. Anything the inbound row did not
 * carry stays NULL: the old `|| 0` coercion made "not recorded" look like a
 * genuine zero, which is what the nullable-stats migration undoes. Scoring
 * fields keep their zero fallbacks and are built by the caller.
 */
export function teamDetailPayload(row: object) {
  const smokesUsed = suppliedNumber(row, 'smokesUsed');
  const grenadesUsed = suppliedNumber(row, 'grenadesUsed');
  const molotovsUsed = suppliedNumber(row, 'molotovsUsed');
  const flashUsed = suppliedNumber(row, 'flashUsed');
  const distDrove = suppliedNumber(row, 'distDrove');
  const distWalk = suppliedNumber(row, 'distWalk');
  return {
    damage: suppliedNumber(row, 'damage'),
    survivalTime: suppliedNumber(row, 'survivalTime'),
    healing: suppliedNumber(row, 'healing'),
    damageReceived: suppliedNumber(row, 'damageReceived'),
    headshots: suppliedNumber(row, 'headshots'),
    assists: suppliedNumber(row, 'assists'),
    knockouts: suppliedNumber(row, 'knockouts'),
    longestElim: suppliedNumber(row, 'longestElim'),
    vehicleElims: suppliedNumber(row, 'vehicleElims'),
    grenadeElims: suppliedNumber(row, 'grenadeElims'),
    smokesUsed,
    grenadesUsed,
    molotovsUsed,
    flashUsed,
    // An explicitly supplied `utilities` column, else the sum of whatever of the
    // four counters was recorded, else NULL.
    utilitiesTotal:
      suppliedNumber(row, 'utilitiesTotal') ?? deriveUtilitiesTotal({ smokesUsed, grenadesUsed, molotovsUsed, flashUsed }),
    airdrops: suppliedNumber(row, 'airdrops'),
    rescues: suppliedNumber(row, 'rescues'),
    distDrove,
    distWalk,
    totalDist: suppliedNumber(row, 'totalDist') ?? deriveTotalDistance({ distDrove, distWalk }),
  };
}

/**
 * Team detail payload for an upsert that must not touch telemetry the row did
 * not carry. `teamDetailPayload` resolves an absent column to NULL, which is
 * correct for a `create` (the column is unnamed either way) but wrong for an
 * `update`: NULL overwrites a recorded value with "never recorded". Dropping the
 * NULLs leaves Prisma to skip those columns in an update and to fall back to
 * NULL — the same value — in a create.
 *
 * Used by the player paste cascade, whose rows never own team telemetry. The
 * team-scorecard importer keeps `teamDetailPayload`: it owns the rows it writes.
 */
export function requestedTeamDetailPayload(row: object) {
  const payload: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(teamDetailPayload(row))) {
    if (value !== null) payload[field] = value;
  }
  return payload;
}

/** Team detail fields plus the player-only ones. */
export function playerDetailPayload(row: object) {
  return {
    ...teamDetailPayload(row),
    isMvp: suppliedBoolean(row, 'isMvp'),
    playerPowerplay: suppliedNumber(row, 'playerPowerplay'),
    deaths: suppliedNumber(row, 'deaths'),
  };
}

/**
 * Adds a provenance stamp to an upsert's `create` branch only, so the original
 * import stays immutable no matter how many later edits touch the row.
 */
export function withImportProvenance<T extends object>(payload: T, source: string, supplied: string[]) {
  return {
    ...payload,
    rawData: mergeRawDataProvenance(null, buildImportProvenance(source, supplied)) as Prisma.InputJsonValue,
  };
}
