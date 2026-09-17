/**
 * Merges one duplicated team row into another.
 *
 * Background: the match import mints a team whenever a pasted name does not match an
 * existing one exactly (`app/admin/(panel)/matches/matrix/actions.ts:584-633`). A sponsor
 * rename in the spreadsheet therefore produces a second Team row for the same org, which
 * then reads as two teams in the teams list, the standings and every team-aggregated
 * ranking. Measured on this database: BMPS stored the org as "Myth Official" and BGMS as
 * "Iris Myth", one org across two ids.
 *
 * The event name is NOT part of the merge — it belongs on the seat. `TournamentTeam`
 * already carries `displayName` / `shortName` / logo overrides, and every tournament tab
 * prefers them over the team's own name (`tournament-data.ts:459`, `:1435`,
 * `estatic-standings-panel.tsx:1062`, `estatic-progression-panel.tsx:529`). So pass
 * `--event-name` and the event that used the other name keeps showing it while the org
 * stays one team.
 *
 * Repasting is not an alternative: the import upserts on `(matchGameId, teamId)`, so
 * pasting the canonical name while the old rows still exist writes a second team's results
 * into the same match.
 *
 * Dry run by default. `--apply` is required to write, and `--delete-source` — a separate
 * flag, because it is the one step repointing cannot undo — drops the emptied row.
 *
 *   npx tsx scripts/merge-teams.ts --from iris-myth --to myth-official
 *   npx tsx scripts/merge-teams.ts --from iris-myth --to myth-official \
 *       --apply --event-name "Iris Myth" --event-short-name iMYTH
 *   npx tsx scripts/merge-teams.ts --from iris-myth --to myth-official --apply --delete-source
 */
import prisma from '../lib/prisma';

const APPLY = process.argv.includes('--apply');
const DELETE_SOURCE = process.argv.includes('--delete-source');

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

const FROM = arg('from');
const TO = arg('to');
const EVENT_NAME = arg('event-name');
const EVENT_SHORT_NAME = arg('event-short-name');

/**
 * Every column that can point at a team, as an allowlist. Table and column names are
 * interpolated into SQL, so they must never come from an argument — only the ids are
 * parameters.
 */
const REFERENCES: ReadonlyArray<{ table: string; column: string }> = [
  { table: 'MatchTeamResult', column: 'teamId' },
  { table: 'MatchPlayerStat', column: 'teamId' },
  { table: 'Player', column: 'currentTeamId' },
  { table: 'TournamentTeam', column: 'teamId' },
  { table: 'TournamentTeamTotals', column: 'teamId' },
  { table: 'TournamentPlayerTotals', column: 'teamId' },
  { table: 'Transfer', column: 'teamId' },
  { table: 'Transfer', column: 'fromTeamId' },
  { table: 'KraftonEntry', column: 'teamId' },
  { table: 'KraftonTransfer', column: 'fromTeamId' },
  { table: 'KraftonTransfer', column: 'toTeamId' },
  { table: 'Article', column: 'teamId' },
  { table: 'Tournament', column: 'winnerTeamId' },
  { table: 'Tournament', column: 'runnerUpTeamId' },
];

type Db = Pick<typeof prisma, '$queryRawUnsafe' | '$executeRawUnsafe'>;

async function countRefs(db: Db, fromId: string): Promise<Array<{ label: string; rows: number }>> {
  const out: Array<{ label: string; rows: number }> = [];
  for (const { table, column } of REFERENCES) {
    const rows = await db.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT count(*)::int AS n FROM "${table}" WHERE "${column}" = $1`,
      fromId
    );
    if (rows[0].n > 0) out.push({ label: `${table}.${column}`, rows: rows[0].n });
  }
  return out;
}

/** Uniqueness the repoint could violate. Returns the reasons to refuse, empty if safe. */
async function collisions(db: Db, fromId: string, toId: string): Promise<string[]> {
  const problems: string[] = [];

  const games = await db.$queryRawUnsafe<Array<{ n: number }>>(
    `SELECT count(*)::int AS n FROM (
       SELECT "matchGameId" FROM "MatchTeamResult"
       WHERE "teamId" IN ($1, $2)
       GROUP BY 1 HAVING count(*) > 1
     ) x`,
    fromId,
    toId
  );
  if (games[0].n > 0) problems.push(`MatchTeamResult(matchGameId, teamId): ${games[0].n} match game(s) hold both teams`);

  const seats = await db.$queryRawUnsafe<Array<{ n: number }>>(
    `SELECT count(*)::int AS n FROM "TournamentTeam" a
       JOIN "TournamentTeam" b ON a."tournamentId" = b."tournamentId"
     WHERE a."teamId" = $1 AND b."teamId" = $2`,
    fromId,
    toId
  );
  if (seats[0].n > 0) problems.push(`TournamentTeam(tournamentId, teamId): both teams hold a seat in ${seats[0].n} tournament(s)`);

  const totals = await db.$queryRawUnsafe<Array<{ n: number }>>(
    `SELECT count(*)::int AS n FROM "TournamentTeamTotals" a
       JOIN "TournamentTeamTotals" b
         ON a."tournamentId" = b."tournamentId" AND a."sliceKey" = b."sliceKey"
     WHERE a."teamId" = $1 AND b."teamId" = $2`,
    fromId,
    toId
  );
  if (totals[0].n > 0) problems.push(`TournamentTeamTotals(tournamentId, sliceKey, teamId): ${totals[0].n} row(s) would collide`);

  return problems;
}

async function findTeam(identifier: string) {
  const team = await prisma.team.findFirst({
    where: { OR: [{ id: identifier }, { slug: identifier }] },
    select: { id: true, name: true, slug: true },
  });
  if (!team) throw new Error(`no team matching id or slug "${identifier}"`);
  return team;
}

function printMap(map: Array<{ label: string; rows: number }>): void {
  if (map.length === 0) {
    console.log('  (nothing references it)');
    return;
  }
  const width = Math.max(...map.map((m) => m.label.length));
  for (const m of map) console.log(`  ${m.label.padEnd(width)}  ${String(m.rows).padStart(6)}`);
}

async function main() {
  if (!FROM || !TO) {
    console.error('usage: --from <id|slug> --to <id|slug> [--apply] [--delete-source] [--event-name "..."] [--event-short-name "..."]');
    process.exit(1);
  }

  const from = await findTeam(FROM);
  const to = await findTeam(TO);
  if (from.id === to.id) throw new Error('--from and --to resolve to the same team');

  console.log(`merge  ${from.name} (${from.slug})`);
  console.log(`   ->  ${to.name} (${to.slug})`);
  console.log(`mode   ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  console.log('');

  const before = await countRefs(prisma, from.id);
  console.log(`rows pointing at ${from.name}:`);
  printMap(before);
  console.log('');

  const problems = await collisions(prisma, from.id, to.id);
  if (problems.length > 0) {
    console.error('refusing to merge — repointing would violate a unique key:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log('no unique-key collision.');
  console.log('');

  const seats = await prisma.tournamentTeam.findMany({
    where: { teamId: from.id },
    select: { id: true, tournament: { select: { slug: true } } },
  });

  if (EVENT_NAME || EVENT_SHORT_NAME) {
    console.log(`event name to set on ${seats.length} seat(s): ${seats.map((s) => s.tournament.slug).join(', ') || '(none)'}`);
  }

  if (!APPLY) {
    console.log('dry run — nothing written. Re-run with --apply.');
    return;
  }

  const repointed = await prisma.$transaction(async (tx) => {
    const moved: Array<{ label: string; rows: number }> = [];

    for (const { table, column } of REFERENCES) {
      const rows = await tx.$executeRawUnsafe(
        `UPDATE "${table}" SET "${column}" = $1 WHERE "${column}" = $2`,
        to.id,
        from.id
      );
      if (rows > 0) moved.push({ label: `${table}.${column}`, rows });
    }

    if (EVENT_NAME || EVENT_SHORT_NAME) {
      for (const seat of seats) {
        await tx.tournamentTeam.update({
          where: { id: seat.id },
          data: {
            ...(EVENT_NAME ? { displayName: EVENT_NAME } : {}),
            ...(EVENT_SHORT_NAME ? { shortName: EVENT_SHORT_NAME } : {}),
          },
        });
      }
    }

    return moved;
  });

  console.log('repointed:');
  printMap(repointed);
  console.log('');

  const after = await countRefs(prisma, from.id);
  if (after.length > 0) {
    console.error(`still referenced after the merge — not deleting ${from.name}:`);
    printMap(after);
    process.exit(1);
  }
  console.log(`${from.name} is now unreferenced.`);

  if (!DELETE_SOURCE) {
    console.log(`Re-run with --apply --delete-source to drop the row.`);
    return;
  }

  await prisma.team.delete({ where: { id: from.id } });
  console.log(`deleted ${from.name} (${from.slug}).`);
}

main().catch((e) => {
  console.error('failed:', e);
  process.exit(1);
});
