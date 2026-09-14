/**
 * Read-only check of the player-paste team-result rule.
 *
 * A player-only paste carries no `team_*` scoring column and no team telemetry,
 * so it must leave a team result the DB already holds exactly as it is —
 * `bonusPoints` above all, which the cascade used to hard-code to `0` (dropping
 * the bonus out of the team's total and out of every player-stat snapshot).
 *
 * This script replays that paste for real stored rows and prints the decision
 * `decideTeamResultWrite` returns, with the before/after it implies. It writes
 * nothing — reads only, plus the pure decision function — so it is safe to run
 * against a live database.
 *
 *   npx tsx scripts/verify-team-result-skip.ts
 *   npx tsx scripts/verify-team-result-skip.ts battlegrounds-mobile-india-pro-series-2026 3
 */
import prisma from '../lib/prisma';
import { parsePaste } from '../lib/paste-table-parse';
import { TEAM_DETAIL_FIELDS, teamDetailPayload } from '../lib/match-stat-fields';
import { decideTeamResultWrite, readTeamResultRow, type TeamResultScoring } from '../lib/team-result-write';
import { getPlacementPoints, readKillMultiplier } from '../lib/tournament-math';

/** The player-sheet columns this check reads back off a parsed row. */
interface SheetRow {
  player?: string;
  role?: string;
  elims?: number;
  playerPowerplay?: number;
}

/** The exact header the incoming BGMS player sheet has. */
const PLAYER_SHEET_HEADER = [
  'Tournament',
  'Stage',
  'Date',
  'TimeFormat',
  'Time',
  'OverallMatch',
  'StageMatch',
  'Map',
  'Group',
  'Type',
  'player',
  'team',
  'role',
  'elims',
  'playerPowerplay',
].join('\t');

// A bare number is the sample count, anything else is the tournament slug.
const args = process.argv.slice(2);
const slug = args.find((arg) => !/^\d+$/.test(arg)) ?? 'bgms-2026';
const sampleCount = Number(args.find((arg) => /^\d+$/.test(arg)) ?? 5);

function format(scoring: TeamResultScoring): string {
  return `rank ${scoring.rank} · place ${scoring.placePoints} · elims ${scoring.elimsPoints} · bonus ${scoring.bonusPoints} · total ${scoring.totalPoints}`;
}

/** The payload the old cascade wrote for a player-only row: bonus forced to 0. */
function oldCascadeScoring(scoring: TeamResultScoring): TeamResultScoring {
  return { ...scoring, bonusPoints: 0, totalPoints: scoring.placePoints + scoring.elimsPoints };
}

const SAMPLE_SELECT = {
  matchGameId: true,
  teamId: true,
  rank: true,
  wwcd: true,
  placePoints: true,
  elimsPoints: true,
  bonusPoints: true,
  totalPoints: true,
  team: { select: { name: true, tag: true } },
  matchGame: {
    select: {
      mapName: true,
      sequence: true,
      match: { select: { matchNumber: true, overallMatchNumber: true } },
    },
  },
} as const;

/** Real stored team results, the bonus-carrying ones first when any exist. */
function sampleTeamResults(tournamentId: string, take: number, withBonusOnly: boolean) {
  return prisma.matchTeamResult.findMany({
    where: {
      matchGame: { match: { tournamentId } },
      ...(withBonusOnly ? { bonusPoints: { not: 0 } } : {}),
    },
    orderBy: [{ bonusPoints: 'desc' }, { matchGameId: 'asc' }, { teamId: 'asc' }],
    take,
    select: SAMPLE_SELECT,
  });
}

async function main() {
  const tournament = await prisma.tournament.findFirst({
    where: { slug },
    select: { id: true, name: true, slug: true, formatDetails: true },
  });
  if (!tournament) throw new Error(`No tournament with slug "${slug}".`);

  const fd = (tournament.formatDetails ?? {}) as { pointsMatrix?: unknown; placementPoints?: unknown };
  const pointsMatrix = (fd.pointsMatrix || fd.placementPoints || null) as
    | Record<number, number>
    | number[]
    | null;
  const killMultiplier = readKillMultiplier(fd);

  const samples =
    (await sampleTeamResults(tournament.id, sampleCount, true)).length > 0
      ? await sampleTeamResults(tournament.id, sampleCount, true)
      : await sampleTeamResults(tournament.id, sampleCount, false);

  console.log(`${tournament.name} (${tournament.slug})`);
  console.log(`kill multiplier ${killMultiplier} · sampled ${samples.length} stored team results\n`);

  let wouldWrite = 0;

  for (const sample of samples) {
    const stored: TeamResultScoring = {
      rank: sample.rank,
      wwcd: sample.wwcd,
      placePoints: sample.placePoints,
      elimsPoints: sample.elimsPoints,
      bonusPoints: sample.bonusPoints,
      totalPoints: sample.totalPoints,
    };

    // Real players of that team in that game, so the paste is not hypothetical.
    const players = await prisma.matchPlayerStat.findMany({
      where: { matchGameId: sample.matchGameId, teamId: sample.teamId },
      take: 4,
      select: { playerElims: true, teamBonusPoints: true, teamTotalPoints: true, role: true, player: { select: { ign: true } } },
    });

    const sheetRows = (players.length > 0
      ? players.map((p, i) => [p.player.ign, p.role || 'Assaulter', String(p.playerElims), String(i)])
      : [['SamplePlayer', 'Assaulter', '3', '1']]
    ).map(([ign, role, elims, powerplay]) =>
      [
        tournament.name,
        'Grand Finals',
        '2026-09-13',
        'IST',
        '20:30',
        String(sample.matchGame.match.overallMatchNumber ?? sample.matchGame.match.matchNumber ?? 1),
        String(sample.matchGame.sequence ?? 1),
        sample.matchGame.mapName ?? 'Erangel',
        'A',
        'Online',
        ign,
        sample.team.name,
        role,
        elims,
        powerplay,
      ].join('\t'),
    );

    const parsed = parsePaste([PLAYER_SHEET_HEADER, ...sheetRows].join('\n'), 'excel', 'players');
    const row = parsed.rows[0] as unknown as SheetRow;

    // The action's inputs for a DB-backed team: elims inherited, not accumulated.
    const resolve = (source: object) =>
      decideTeamResultWrite({
        row: source,
        hasDbRow: true,
        existing: stored,
        placePointsForRank: (rank) => getPlacementPoints(rank, pointsMatrix),
        elimsCount: selectedElimsCount(source, stored, killMultiplier),
        killMultiplier,
      });

    const decision = resolve(row);
    // The same sheet plus one team-level column: this one may write, and it
    // still inherits the bonus it does not mention.
    const withTeamElims = parsePaste(
      [`${PLAYER_SHEET_HEADER}\tteam_elims`, ...sheetRows.map((line) => `${line}\t${stored.elimsPoints / killMultiplier}`)].join('\n'),
      'excel',
      'players',
    ).rows[0] as unknown as SheetRow;
    const explicit = resolve(withTeamElims);

    const snapshot = players[0];
    console.log(
      `── ${sample.team.name}${sample.team.tag ? ` (${sample.team.tag})` : ''} · ${sample.matchGameId} · ${
        sample.matchGame.mapName ?? 'unknown map'
      }`,
    );
    console.log(`   stored team result   : ${format(stored)}`);
    console.log(
      `   paste row (player)   : ${row.player} (${row.role}, ${row.elims} elims, powerplay ${row.playerPowerplay})`,
    );
    console.log(`   supplied team columns: ${decision.suppliedScoringFields.length ? decision.suppliedScoringFields.join(', ') : 'none'}`);
    console.log(
      `   supplied team detail : ${
        decision.suppliedDetailFields.length
          ? decision.suppliedDetailFields.join(', ')
          : 'none — stored telemetry stays as it is'
      }`,
    );
    console.log(`   decision             : ${decision.shouldWrite ? 'WRITE' : 'SKIP — stored row untouched'}`);
    console.log(`   expected after       : ${format(decision.scoring)}`);
    console.log(
      `   + team_elims column  : ${explicit.shouldWrite ? 'WRITE' : 'SKIP'} — ${format(explicit.scoring)}${
        explicit.shouldWrite && explicit.scoring.bonusPoints === stored.bonusPoints ? ' (bonus still inherited)' : ''
      }`,
    );
    if (!decision.shouldWrite) {
      const nulled = Object.values(teamDetailPayload(row)).filter((value) => value === null).length;
      if (stored.bonusPoints !== 0) {
        console.log(
          `   old cascade wrote    : ${format(oldCascadeScoring(stored))}   ← ${stored.bonusPoints} bonus points lost`,
        );
      }
      console.log(`   old cascade nulled   : ${nulled} of ${TEAM_DETAIL_FIELDS.length} team detail columns`);
    }
    if (snapshot) {
      console.log(
        `   stored player-stat   : team bonus ${snapshot.teamBonusPoints} · team total ${snapshot.teamTotalPoints} (written by the old cascade)`,
      );
    }
    console.log('');

    if (decision.shouldWrite) wouldWrite++;
    if (decision.scoring.bonusPoints !== stored.bonusPoints) {
      throw new Error(`${sample.team.name}: bonus would change ${stored.bonusPoints} → ${decision.scoring.bonusPoints}`);
    }
  }

  if (wouldWrite > 0) {
    throw new Error(`${wouldWrite} of ${samples.length} player-only rows would still write the team result.`);
  }
  console.log(`✔ none of the ${samples.length} sampled player-only rows would write its team result; every stored bonus stays as-is.`);
}

/**
 * Mirrors the cascade's elim resolution: with no `team_elims` column and a
 * DB-backed team, the stored figure is inherited rather than recomputed.
 */
function selectedElimsCount(row: object, stored: TeamResultScoring, killMultiplier: number): number {
  const explicit = readTeamResultRow(row).elimsCount;
  return explicit !== null ? explicit : stored.elimsPoints / killMultiplier;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
