/**
 * Nulls out detail stats that were never tracked, per (tournament, field).
 *
 * Background: the write paths used to coerce absent input to `0`, so "not
 * recorded" and "genuine zero" are indistinguishable in the current data.
 * Tracking, however, is per FIELD per EVENT, not per game — measured:
 *
 *   BGMS 2026 : playerPowerplay tracked (2,420 non-zero), damage never tracked
 *   BMPS 2026 : damage/survival/distances tracked, playerPowerplay never tracked
 *
 * A per-game rule would either destroy BGMS's real powerplay values or detect
 * nothing at all, so the rule below is applied per (tournament, detail field):
 *
 *   • zero non-zero values in the event  -> the field was never tracked there,
 *     so every `0` is fabricated and becomes NULL.
 *   • any non-zero value in the event    -> the field WAS tracked, so every
 *     value is left alone, genuine zeros included.
 *
 * Dry run by default. `--apply` is required to write.
 *   npx tsx scripts/migrate-untracked-stats.ts
 *   npx tsx scripts/migrate-untracked-stats.ts --apply
 *
 * `--repair-provenance` runs only the one-time provenance repair described below
 * (dry run by default, `--apply` to write).
 */
import prisma from '../lib/prisma';
import {
  BOOLEAN_DETAIL_FIELDS,
  PLAYER_DETAIL_FIELDS,
  SCORING_FIELDS,
  TEAM_DETAIL_FIELDS,
} from '../lib/match-stat-fields';

const APPLY = process.argv.includes('--apply');
const REPAIR_PROVENANCE = process.argv.includes('--repair-provenance');
const MIGRATION_NAME = 'nullable_detail_stats';
const BATCH_SIZE = 2000;
const SAMPLE_ROWS = 3;

/** The measured sanity checks this run must reproduce. */
const EXPECTED_BGMS_POWERPLAY_NONZERO = 2420;
const EXPECTED_BMPS_TRACKED: readonly string[] = [
  'damage',
  'survivalTime',
  'distDrove',
  'distWalk',
  'totalDist',
];

type ModelName = 'MatchTeamResult' | 'MatchPlayerStat';
type ChangeKind = 'numeric' | 'boolean';

interface Target {
  model: ModelName;
  table: string;
  /** Table that carries the tournament link, joined through MatchGame -> Match. */
  field: string;
  kind: ChangeKind;
}

interface FieldStats {
  nonNullBefore: number;
  zeroBefore: number;
  nonZeroBefore: number;
  tracked: boolean;
  rowsToChange: number;
  nonNullAfter: number;
  nonZeroAfter: number;
}

interface PlannedChange {
  tournamentId: string;
  tournamentName: string;
  model: ModelName;
  table: string;
  field: string;
  kind: ChangeKind;
  stats: FieldStats;
}

const TARGETS: Target[] = [
  ...TEAM_DETAIL_FIELDS.map((field) => ({
    model: 'MatchTeamResult' as const,
    table: 'MatchTeamResult',
    field,
    kind: (BOOLEAN_DETAIL_FIELDS.includes(field) ? 'boolean' : 'numeric') as ChangeKind,
  })),
  ...PLAYER_DETAIL_FIELDS.map((field) => ({
    model: 'MatchPlayerStat' as const,
    table: 'MatchPlayerStat',
    field,
    kind: (BOOLEAN_DETAIL_FIELDS.includes(field) ? 'boolean' : 'numeric') as ChangeKind,
  })),
];

/** The fabricated value for a never-tracked field: `0` for numbers, `false` for booleans. */
function fabricatedLiteral(kind: ChangeKind): string {
  return kind === 'boolean' ? 'false' : '0';
}

/** The "was actually recorded" predicate for a never-tracked check. */
function recordedPredicate(column: string, kind: ChangeKind): string {
  return kind === 'boolean' ? `t.${column} = true` : `t.${column} <> 0`;
}

function fabricatedPredicate(column: string, kind: ChangeKind): string {
  return kind === 'boolean' ? `t.${column} = false` : `t.${column} = 0`;
}

/**
 * Assertion 2: the migration may only ever touch nullable detail fields. If a
 * scoring field could be reached, a real point total could be nulled out.
 */
function assertTargetsAreDetailFieldsOnly(): void {
  const detail = new Set<string>([...TEAM_DETAIL_FIELDS, ...PLAYER_DETAIL_FIELDS]);
  const scoring = new Set<string>(SCORING_FIELDS);

  for (const target of TARGETS) {
    if (scoring.has(target.field)) {
      throw new Error(`ABORT: "${target.field}" is a scoring field and must never be migrated.`);
    }
    if (!detail.has(target.field)) {
      throw new Error(`ABORT: "${target.field}" is not in the nullable detail-field allowlist.`);
    }
    // Belt and braces: the field name is interpolated into SQL, so it must be a
    // plain identifier that came out of our own allowlist.
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(target.field)) {
      throw new Error(`ABORT: refusing to interpolate suspicious field name "${target.field}".`);
    }
  }
}

async function readFieldStats(tournamentId: string, target: Target): Promise<FieldStats> {
  const [row] = await prisma.$queryRawUnsafe<
    { non_null: bigint; zero_count: bigint; non_zero: bigint }[]
  >(
    `SELECT
       count(*) FILTER (WHERE t."${target.field}" IS NOT NULL) AS non_null,
       count(*) FILTER (WHERE ${fabricatedPredicate(`"${target.field}"`, target.kind)}) AS zero_count,
       count(*) FILTER (WHERE ${recordedPredicate(`"${target.field}"`, target.kind)}) AS non_zero
     FROM "${target.table}" t
     JOIN "MatchGame" g ON g.id = t."matchGameId"
     JOIN "Match" m ON m.id = g."matchId"
     WHERE m."tournamentId" = $1`,
    tournamentId
  );

  const nonNullBefore = Number(row?.non_null ?? 0);
  const zeroBefore = Number(row?.zero_count ?? 0);
  const nonZeroBefore = Number(row?.non_zero ?? 0);
  const tracked = nonZeroBefore > 0;
  const rowsToChange = tracked ? 0 : zeroBefore;

  return {
    nonNullBefore,
    zeroBefore,
    nonZeroBefore,
    tracked,
    rowsToChange,
    nonNullAfter: nonNullBefore - rowsToChange,
    nonZeroAfter: nonZeroBefore,
  };
}

async function sampleRows(tournamentId: string, target: Target) {
  const idColumn = target.model === 'MatchTeamResult' ? 'teamId' : 'playerId';
  return prisma.$queryRawUnsafe<
    { id: string; owner_id: string; match_game_id: string; value: number | boolean | null }[]
  >(
    `SELECT t.id, t."${idColumn}" AS owner_id, t."matchGameId" AS match_game_id,
            t."${target.field}" AS value
     FROM "${target.table}" t
     JOIN "MatchGame" g ON g.id = t."matchGameId"
     JOIN "Match" m ON m.id = g."matchId"
     WHERE m."tournamentId" = $1 AND ${fabricatedPredicate(`"${target.field}"`, target.kind)}
     ORDER BY t.id
     LIMIT ${SAMPLE_ROWS}`,
    tournamentId
  );
}

/**
 * The stamp appended on apply, as a single shared sub-expression.
 *
 * `$2`/`$3` MUST carry an explicit `::text` cast. `jsonb_build_object` is declared
 * `VARIADIC "any"`, so Postgres has no signature to infer a bare bind's type from
 * and rejects the whole statement at plan time with
 *
 *   42P18: could not determine data type of parameter $2
 *
 * before a single row is touched (measured: 336 games / 5,376 team rows / 21,480
 * player rows unchanged, rawData stamped on 0 rows). Note this is about the
 * *provenance* binds only: the SET clause already writes a literal `NULL`, not a
 * bind, so the detail values themselves were never the problem. `$1` and `$4` need
 * no cast — `m."tournamentId" = $1` and `LIMIT $4` give Postgres the context.
 */
const PROVENANCE_STAMP = `jsonb_build_object('migration', $2::text, 'migratedAt', $3::text)`;

/** The row's existing `provenance` value, or JSON `null` when it has none. */
const PROVENANCE_DOC = `coalesce(nullif(t."rawData", 'null'::jsonb), '{}'::jsonb) -> 'provenance'`;

/** Does the existing provenance already carry this migration's stamp? */
const PROVENANCE_PRESENT = `(
  (jsonb_typeof(${PROVENANCE_DOC}) = 'object'
    AND ${PROVENANCE_DOC} @> jsonb_build_object('migration', $2::text))
  OR (jsonb_typeof(${PROVENANCE_DOC}) = 'array'
    AND ${PROVENANCE_DOC} @> jsonb_build_array(jsonb_build_object('migration', $2::text)))
)`;

/**
 * Appends a provenance stamp into rawData without discarding whatever is already
 * there — `rawData` is `jsonb` and currently holds JSON `null` on every row.
 *
 * A row is touched once per (event, field) that gets nulled, so the append must
 * short-circuit when this migration is already stamped. Without that guard a row
 * with 20 nulled fields collected 20 identical entries (measured: 24,072 rows,
 * up to 22 entries each); `--repair-provenance` cleans up what the earlier run
 * left behind.
 */
const PROVENANCE_SET = `(
  CASE
    WHEN ${PROVENANCE_DOC} IS NULL
      THEN ${PROVENANCE_STAMP}
    WHEN ${PROVENANCE_PRESENT}
      THEN ${PROVENANCE_DOC}
    WHEN jsonb_typeof(${PROVENANCE_DOC}) = 'array'
      THEN ${PROVENANCE_DOC} || jsonb_build_array(${PROVENANCE_STAMP})
    ELSE jsonb_build_array(${PROVENANCE_DOC}, ${PROVENANCE_STAMP})
  END
)`;

/**
 * One batch of `0 -> NULL` for a single (tournament, field). The predicate
 * `field = <fabricated>` is what guarantees every change is `0 -> NULL`: a
 * non-zero value can never match it, and a NULL can never match it either.
 * Returns the number of rows updated.
 */
async function applyBatch(change: PlannedChange, migratedAt: string, limit: number): Promise<number> {
  const sql = `
    WITH target AS (
      SELECT t.id
      FROM "${change.table}" t
      JOIN "MatchGame" g ON g.id = t."matchGameId"
      JOIN "Match" m ON m.id = g."matchId"
      WHERE m."tournamentId" = $1 AND ${fabricatedPredicate(`"${change.field}"`, change.kind)}
      ORDER BY t.id
      LIMIT $4
    )
    UPDATE "${change.table}" t
    SET "${change.field}" = NULL,
        "rawData" = coalesce(nullif(t."rawData", 'null'::jsonb), '{}'::jsonb)
                    || jsonb_build_object('provenance', ${PROVENANCE_SET})
    WHERE t.id IN (SELECT id FROM target)`;

  return prisma.$executeRawUnsafe(sql, change.tournamentId, MIGRATION_NAME, migratedAt, limit);
}

async function countRemaining(change: PlannedChange): Promise<number> {
  const [row] = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT count(*) AS count
     FROM "${change.table}" t
     JOIN "MatchGame" g ON g.id = t."matchGameId"
     JOIN "Match" m ON m.id = g."matchId"
     WHERE m."tournamentId" = $1 AND ${fabricatedPredicate(`"${change.field}"`, change.kind)}`,
    change.tournamentId
  );
  return Number(row?.count ?? 0);
}

/* ── One-time provenance repair ─────────────────────────────────────────── */

/**
 * The row's provenance as a jsonb ARRAY, or an empty array.
 *
 * `jsonb_array_elements` / `jsonb_array_length` raise 22023 ("cannot get array
 * length of a non-array") on an object, and Postgres is free to evaluate an
 * SRF or the length call before the `jsonb_typeof(...) = 'array'` guard beside
 * it. Every array access therefore goes through this CASE.
 */
const PROVENANCE_ARRAY = `(CASE
  WHEN jsonb_typeof(${PROVENANCE_DOC}) = 'array' THEN ${PROVENANCE_DOC}
  ELSE '[]'::jsonb
END)`;

/**
 * Rows left carrying a provenance ARRAY made up exclusively of this migration's
 * stamps — one entry per (event, field) the run nulled, up to 22 of them.
 *
 * A row is only a candidate when EVERY element is one of our stamps, so a row
 * that also holds some other provenance entry is skipped rather than silently
 * collapsed. The predicate reads `t."rawData"` via PROVENANCE_DOC.
 */
const DUPLICATE_PROVENANCE_PREDICATE = `(
  jsonb_typeof(${PROVENANCE_DOC}) = 'array'
  AND jsonb_array_length(${PROVENANCE_ARRAY}) > 0
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(${PROVENANCE_ARRAY}) e
    WHERE e ->> 'migration' IS DISTINCT FROM $1::text
  )
)`;

/** Arrays mixing our stamp with foreign entries — reported, never rewritten. */
const MIXED_PROVENANCE_PREDICATE = `(
  jsonb_typeof(${PROVENANCE_DOC}) = 'array'
  AND ${PROVENANCE_DOC} @> jsonb_build_array(jsonb_build_object('migration', $1::text))
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(${PROVENANCE_ARRAY}) e
    WHERE e ->> 'migration' IS DISTINCT FROM $1::text
  )
)`;

const REPAIR_TABLES: readonly ModelName[] = ['MatchTeamResult', 'MatchPlayerStat'];

/** Measured on 2026-09-14: 2,592 + 10,350 + 11,130 duplicate rows. */
const EXPECTED_DUPLICATE_ROWS = 24072;

async function countWhere(
  table: ModelName,
  predicate: string,
  params: readonly unknown[] = [MIGRATION_NAME],
): Promise<number> {
  const [row] = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT count(*) AS count FROM "${table}" t WHERE ${predicate}`,
    ...params
  );
  return Number(row?.count ?? 0);
}

/** The target shape: one provenance OBJECT carrying this migration's stamp. */
const SINGLE_STAMP_PREDICATE = `(
  jsonb_typeof(${PROVENANCE_DOC}) = 'object'
  AND ${PROVENANCE_DOC} ->> 'migration' = $1::text
)`;

const ARRAY_PROVENANCE_PREDICATE = `jsonb_typeof(${PROVENANCE_DOC}) = 'array'`;
const NO_PROVENANCE_PREDICATE = `${PROVENANCE_DOC} IS NULL`;

async function sampleDuplicateProvenance(table: ModelName) {
  return prisma.$queryRawUnsafe<{ id: string; entries: number; stamp: unknown }[]>(
    `SELECT t.id,
            jsonb_array_length(${PROVENANCE_ARRAY})::int AS entries,
            ${PROVENANCE_ARRAY} -> 0 AS stamp
     FROM "${table}" t
     WHERE ${DUPLICATE_PROVENANCE_PREDICATE}
     ORDER BY t.id
     LIMIT ${SAMPLE_ROWS}`,
    MIGRATION_NAME
  );
}

/**
 * Collapses one batch of duplicate arrays down to their single stamp object.
 * The stamp is copied verbatim from the first matching element, and `||` merges
 * into rawData so no other key is disturbed.
 */
async function repairProvenanceBatch(table: ModelName, limit: number): Promise<number> {
  const sql = `
    WITH candidates AS (
      SELECT t.id
      FROM "${table}" t
      WHERE ${DUPLICATE_PROVENANCE_PREDICATE}
      ORDER BY t.id
      LIMIT $2
    ),
    collapsed AS (
      SELECT t.id,
             (SELECT e FROM jsonb_array_elements(${PROVENANCE_ARRAY}) e
              WHERE e ->> 'migration' = $1::text
              LIMIT 1) AS stamp
      FROM "${table}" t
      JOIN candidates c ON c.id = t.id
    )
    UPDATE "${table}" t
    SET "rawData" = coalesce(nullif(t."rawData", 'null'::jsonb), '{}'::jsonb)
                    || jsonb_build_object('provenance', d.stamp)
    FROM collapsed d
    WHERE t.id = d.id AND d.stamp IS NOT NULL`;

  return prisma.$executeRawUnsafe(sql, MIGRATION_NAME, limit);
}

async function repairProvenance(): Promise<void> {
  console.log(`\n=== provenance repair :: ${APPLY ? 'APPLY' : 'DRY RUN'} ===\n`);

  const planned = new Map<ModelName, number>();
  let total = 0;

  for (const table of REPAIR_TABLES) {
    const duplicates = await countWhere(table, DUPLICATE_PROVENANCE_PREDICATE);
    const mixed = await countWhere(table, MIXED_PROVENANCE_PREDICATE);
    planned.set(table, duplicates);
    total += duplicates;
    console.log(
      `${table}: ${duplicates} row(s) carry duplicate "${MIGRATION_NAME}" entries` +
        (mixed > 0
          ? `\n   ⚠ ${mixed} row(s) mix this stamp with other provenance entries — left untouched`
          : '')
    );
  }

  console.log(
    `\nTotal rows to collapse to one object: ${total}` +
      (total === EXPECTED_DUPLICATE_ROWS
        ? ` (matches the recorded ${EXPECTED_DUPLICATE_ROWS})`
        : ` (recorded expectation: ${EXPECTED_DUPLICATE_ROWS})`)
  );

  for (const table of REPAIR_TABLES) {
    const samples = await sampleDuplicateProvenance(table);
    if (samples.length === 0) continue;
    console.log(`\n── Sample: ${table} (would collapse to a single object)`);
    for (const row of samples) {
      console.log(`   id=${row.id} entries=${row.entries} -> ${JSON.stringify(row.stamp)}`);
    }
  }

  if (!APPLY) {
    console.log(
      `\nDRY RUN — nothing was written. Re-run with --apply --repair-provenance to collapse ${total} row(s).\n`
    );
    return;
  }

  let repaired = 0;
  for (const table of REPAIR_TABLES) {
    let remaining = planned.get(table) ?? 0;
    while (remaining > 0) {
      const affected = await repairProvenanceBatch(table, BATCH_SIZE);
      if (affected <= 0) break;
      repaired += affected;
      remaining -= affected;
    }
    console.log(`   ${table}: ${planned.get(table)} row(s) collapsed`);
  }

  // ── Post-check: every stamped row now holds exactly one entry, as an object ──
  console.log(`\n── Post-check ──`);
  let stillDuplicated = 0;
  let stillMixed = 0;
  for (const table of REPAIR_TABLES) {
    const duplicates = await countWhere(table, DUPLICATE_PROVENANCE_PREDICATE);
    const mixed = await countWhere(table, MIXED_PROVENANCE_PREDICATE);
    const arrays = await countWhere(table, ARRAY_PROVENANCE_PREDICATE, []);
    const stamped = await countWhere(table, SINGLE_STAMP_PREDICATE);
    const none = await countWhere(table, NO_PROVENANCE_PREDICATE, []);
    stillDuplicated += duplicates;
    stillMixed += mixed;
    console.log(
      `${table}: single-stamp object=${stamped} · duplicate arrays=${duplicates} · any array=${arrays} · no provenance=${none}`
    );
  }

  if (repaired !== total) {
    throw new Error(`ABORT: repaired ${repaired} row(s) but the dry run planned ${total}.`);
  }
  if (stillDuplicated !== 0) {
    throw new Error(`ABORT: ${stillDuplicated} row(s) still carry duplicate provenance entries.`);
  }
  if (stillMixed !== 0) {
    console.warn(
      `WARN: ${stillMixed} row(s) still mix this stamp with other provenance entries and were not touched.`
    );
  }

  console.log(
    `\nREPAIRED ${repaired} row(s) — every stamped row now holds exactly one ${MIGRATION_NAME} entry.\n`
  );
}

async function main() {
  if (REPAIR_PROVENANCE) {
    await repairProvenance();
    return;
  }

  assertTargetsAreDetailFieldsOnly();

  const tournaments = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
    `SELECT id, name FROM "Tournament" ORDER BY name`
  );

  console.log(
    `\n=== ${MIGRATION_NAME} :: ${APPLY ? 'APPLY' : 'DRY RUN'} ===\n` +
      `${tournaments.length} tournament(s), ${TEAM_DETAIL_FIELDS.length} team detail field(s), ` +
      `${PLAYER_DETAIL_FIELDS.length} player detail field(s)\n`
  );

  const planned: PlannedChange[] = [];

  for (const tournament of tournaments) {
    console.log(`── ${tournament.name} (${tournament.id})`);
    for (const target of TARGETS) {
      const stats = await readFieldStats(tournament.id, target);
      const change: PlannedChange = {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        model: target.model,
        table: target.table,
        field: target.field,
        kind: target.kind,
        stats,
      };
      planned.push(change);

      if (stats.rowsToChange > 0) {
        console.log(
          `   ${target.model}.${target.field}: ${stats.rowsToChange} row(s) ` +
            `0 -> NULL  (non-zero in event: ${stats.nonZeroBefore}, non-null: ${stats.nonNullBefore} -> ${stats.nonNullAfter})`
        );
      }
    }
    const trackedFields = planned.filter(
      (c) => c.tournamentId === tournament.id && c.stats.tracked && c.model === 'MatchPlayerStat'
    );
    console.log(
      `   ✔ ${planned.filter((c) => c.tournamentId === tournament.id && c.stats.rowsToChange > 0).length} untracked field(s) will be nulled; ` +
        `${trackedFields.length} player field(s) are tracked and untouched`
    );
  }

  // ── Assertion 1: every change is 0 -> NULL, never a non-zero -> NULL ───────
  const nonZeroTargets = planned.filter((c) => c.stats.rowsToChange > 0 && c.stats.nonZeroBefore > 0);
  if (nonZeroTargets.length > 0) {
    throw new Error(
      `ABORT: ${nonZeroTargets.length} field(s) would null a non-zero value: ` +
        nonZeroTargets.map((c) => `${c.tournamentName}.${c.field}`).join(', ')
    );
  }

  // ── Assertion 3: BGMS playerPowerplay keeps its real values ───────────────
  const bgms = tournaments.find((t) => t.name.includes('Master Series'));
  const bmps = tournaments.find((t) => t.name.includes('Pro Series'));
  if (!bgms) throw new Error('ABORT: could not locate the BGMS 2026 tournament.');

  const bgmsPowerplay = planned.find(
    (c) => c.tournamentId === bgms.id && c.field === 'playerPowerplay' && c.model === 'MatchPlayerStat'
  );
  if (!bgmsPowerplay) throw new Error('ABORT: BGMS playerPowerplay is missing from the plan.');
  if (bgmsPowerplay.stats.nonZeroBefore !== EXPECTED_BGMS_POWERPLAY_NONZERO) {
    throw new Error(
      `ABORT: BGMS playerPowerplay has ${bgmsPowerplay.stats.nonZeroBefore} recorded value(s), ` +
        `expected exactly ${EXPECTED_BGMS_POWERPLAY_NONZERO}. Refusing to migrate on unexpected data.`
    );
  }
  if (bgmsPowerplay.stats.rowsToChange !== 0) {
    throw new Error(
      `ABORT: BGMS playerPowerplay is tracked but the plan would change ${bgmsPowerplay.stats.rowsToChange} row(s).`
    );
  }

  // ── Assertion 4: BMPS tracked fields are untouched ────────────────────────
  if (bmps) {
    for (const field of EXPECTED_BMPS_TRACKED) {
      const change = planned.find(
        (c) => c.tournamentId === bmps.id && c.field === field && c.model === 'MatchPlayerStat'
      );
      if (!change) throw new Error(`ABORT: BMPS player ${field} is missing from the plan.`);
      if (change.stats.nonZeroBefore === 0) {
        throw new Error(`ABORT: BMPS player ${field} unexpectedly has no recorded values.`);
      }
      if (change.stats.rowsToChange !== 0) {
        throw new Error(
          `ABORT: BMPS player ${field} is tracked but the plan would change ${change.stats.rowsToChange} row(s).`
        );
      }
    }
  } else {
    console.warn('WARN: could not locate BMPS 2026 — BMPS assertions were skipped.');
  }

  // ── Assertion 4 (cont.): nothing tracked anywhere is ever modified ────────
  const trackedButChanged = planned.filter((c) => c.stats.tracked && c.stats.rowsToChange > 0);
  if (trackedButChanged.length > 0) {
    throw new Error(
      `ABORT: ${trackedButChanged.length} tracked field(s) would be modified: ` +
        trackedButChanged.map((c) => `${c.tournamentName}.${c.model}.${c.field}`).join(', ')
    );
  }

  const totalRows = planned.reduce((sum, c) => sum + c.stats.rowsToChange, 0);

  // ── Per-event summary, mirroring the expected outcome table ───────────────
  console.log(`\n── Summary ─────────────────────────────────────────────────────`);
  for (const tournament of tournaments) {
    const changes = planned.filter((c) => c.tournamentId === tournament.id && c.stats.rowsToChange > 0);
    const teamChanges = changes.filter((c) => c.model === 'MatchTeamResult');
    const playerChanges = changes.filter((c) => c.model === 'MatchPlayerStat');
    console.log(
      `${tournament.name}:\n` +
        `   MatchTeamResult  : ${teamChanges.length} field(s) -> ${teamChanges.reduce((s, c) => s + c.stats.rowsToChange, 0)} row-updates\n` +
        `   MatchPlayerStat  : ${playerChanges.length} field(s) -> ${playerChanges.reduce((s, c) => s + c.stats.rowsToChange, 0)} row-updates\n` +
        `   fields untouched : ${planned.filter((c) => c.tournamentId === tournament.id && c.stats.rowsToChange === 0).length}`
    );
  }

  // Distinct rows per event, which is what the expected-outcome table lists.
  for (const tournament of tournaments) {
    for (const model of ['MatchTeamResult', 'MatchPlayerStat'] as ModelName[]) {
      const table = model;
      const changes = planned.filter(
        (c) => c.tournamentId === tournament.id && c.model === model && c.stats.rowsToChange > 0
      );
      if (changes.length === 0) {
        console.log(`${tournament.name}: ${model} — 0 rows affected`);
        continue;
      }
      const [row] = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT count(*) AS count FROM "${table}" t
         JOIN "MatchGame" g ON g.id = t."matchGameId"
         JOIN "Match" m ON m.id = g."matchId"
         WHERE m."tournamentId" = $1`,
        tournament.id
      );
      console.log(
        `${tournament.name}: ${model} — ${Number(row?.count ?? 0)} row(s) hold a nulled field ` +
          `(${changes.map((c) => c.field).join(', ')})`
      );
    }
  }

  console.log(`\nTotal row-updates planned: ${totalRows}`);

  if (bgmsPowerplay) {
    console.log(
      `\nBGMS playerPowerplay: ${bgmsPowerplay.stats.nonZeroBefore} real (non-zero) value(s) preserved; ` +
        `non-null ${bgmsPowerplay.stats.nonNullBefore} -> ${bgmsPowerplay.stats.nonNullAfter}; ` +
        `${bgmsPowerplay.stats.rowsToChange} row(s) changed.`
    );
  }

  // ── Samples ──────────────────────────────────────────────────────────────
  const sampleTargets = planned.filter((c) => c.stats.rowsToChange > 0).slice(0, 4);
  for (const change of sampleTargets) {
    const rows = await sampleRows(change.tournamentId, {
      model: change.model,
      table: change.table,
      field: change.field,
      kind: change.kind,
    });
    console.log(`\n── Sample: ${change.tournamentName} / ${change.model}.${change.field} (would change)`);
    for (const row of rows) {
      console.log(
        `   id=${row.id} owner=${row.owner_id} matchGame=${row.match_game_id} ` +
          `value=${String(row.value)} ${fabricatedLiteral(change.kind)} -> NULL`
      );
    }
  }

  if (!APPLY) {
    console.log(
      `\nDRY RUN — nothing was written. Re-run with --apply to execute ${totalRows} row-update(s).\n`
    );
    return;
  }

  // ── Apply ────────────────────────────────────────────────────────────────
  const migratedAt = new Date().toISOString();
  console.log(`\nAPPLYING as ${migratedAt} in batches of ${BATCH_SIZE}...`);

  let appliedTotal = 0;
  for (const change of planned) {
    if (change.stats.rowsToChange === 0) continue;
    let remaining = change.stats.rowsToChange;
    while (remaining > 0) {
      const expected = Math.min(BATCH_SIZE, remaining);
      const affected = await applyBatch(change, migratedAt, expected);
      if (affected <= 0) break;
      appliedTotal += affected;
      remaining -= affected;
    }
    const left = await countRemaining(change);
    if (left !== 0) {
      throw new Error(
        `ABORT: ${change.tournamentName}.${change.field} still has ${left} fabricated value(s) after applying.`
      );
    }
    console.log(`   ${change.tournamentName}.${change.model}.${change.field}: ${change.stats.rowsToChange} row(s) updated`);
  }

  // ── Assertion 5: applied total equals the dry-run total ──────────────────
  if (appliedTotal !== totalRows) {
    throw new Error(`ABORT: applied ${appliedTotal} row(s) but the dry run planned ${totalRows}.`);
  }

  console.log(`\nAPPLIED ${appliedTotal} row-update(s). rawData provenance stamped with ${MIGRATION_NAME}.\n`);
}

main()
  .catch((error) => {
    console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
