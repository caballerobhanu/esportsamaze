import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  decideTeamResultWrite,
  readTeamResultRow,
  type TeamResultScoring,
  type TeamResultWriteInput,
} from '../lib/team-result-write';
import { parsePaste } from '../lib/paste-table-parse';

/**
 * The rule these tests pin down: a player paste may only write a team result it
 * brought team-level data for. A stored row the paste says nothing about keeps
 * its scoring (bonus points above all) and its telemetry untouched.
 */

/** A stored BGMS-style team result: real bonus, real detail. */
const stored: TeamResultScoring = {
  rank: 4,
  wwcd: false,
  placePoints: 8,
  elimsPoints: 14,
  bonusPoints: 5,
  totalPoints: 27,
};

/** Placement matrix stub: rank 1 is worth 10, everything else 6. */
const placePointsForRank = (rank: number) => (rank === 1 ? 10 : 6);

function decide(overrides: Partial<TeamResultWriteInput> & { row: object }): ReturnType<typeof decideTeamResultWrite> {
  return decideTeamResultWrite({
    hasDbRow: true,
    existing: stored,
    placePointsForRank,
    // What the action resolves for a DB-backed team: the stored count, inherited.
    elimsCount: 14,
    killMultiplier: 1,
    ...overrides,
  });
}

describe('readTeamResultRow', () => {
  it('accepts the snake_case and camelCase spellings of a team column', () => {
    assert.deepEqual(readTeamResultRow({ team_rank: 3 }).supplied, ['rank']);
    assert.deepEqual(readTeamResultRow({ teamRank: 3 }).supplied, ['rank']);
    assert.deepEqual(readTeamResultRow({ team_wwcd: 'yes' }).supplied, ['wwcd']);
    assert.deepEqual(readTeamResultRow({ teamWwcd: true }).supplied, ['wwcd']);
    assert.deepEqual(readTeamResultRow({ wwcd: true }).supplied, ['wwcd']);
    assert.deepEqual(readTeamResultRow({ team_place: 8 }).supplied, ['placePoints']);
    assert.deepEqual(readTeamResultRow({ team_elims: 9 }).supplied, ['elims']);
    assert.deepEqual(readTeamResultRow({ team_total: 22 }).supplied, ['totalPoints']);
    assert.deepEqual(readTeamResultRow({ bonusPoints: 5 }).supplied, ['bonusPoints']);
  });

  it('leaves a column blank or absent out of the supplied list', () => {
    const values = readTeamResultRow({ team_rank: '', team_place: null, damage: 900, playerPowerplay: 2 });

    assert.deepEqual(values.supplied, []);
    assert.equal(values.rank, null);
    assert.equal(values.placePoints, null);
  });

  it('never reads teamElimsPoints as a raw elim count', () => {
    // It is already-multiplied points; the accepted `team_elims` column is a
    // raw count. Reading both names would apply the multiplier twice.
    assert.deepEqual(readTeamResultRow({ teamElimsPoints: 14 }).supplied, []);
    assert.equal(readTeamResultRow({ team_elims: 7 }).elimsCount, 7);
  });
});

describe('team result write decision', () => {
  it('(a) leaves a stored row alone when the paste brings no team column', () => {
    const decision = decide({ row: { team: 'Team Soul', player: 'Nyrox', role: 'IGL', map: 'Erangel', elims: 4 } });

    assert.equal(decision.shouldWrite, false);
    assert.equal(decision.skippedExistingRow, true);
    assert.deepEqual(decision.scoring, stored);
  });

  it('(a) ignores the player-only telemetry columns of a player sheet', () => {
    // playerPowerplay is a MatchPlayerStat field, not a team detail field, so a
    // player sheet carrying it still leaves the team result alone.
    const decision = decide({ row: { player: 'Nyrox', team: 'Team Soul', elims: 4, playerPowerplay: 2 } });

    assert.equal(decision.shouldWrite, false);
    assert.deepEqual(decision.suppliedDetailFields, []);
  });

  it('(b) writes supplied team columns and inherits the stored bonus', () => {
    const decision = decide({ row: { team_rank: 7, team_elims: 9 }, elimsCount: 9 });

    assert.equal(decision.shouldWrite, true);
    assert.deepEqual(decision.suppliedScoringFields, ['rank', 'elims']);
    assert.equal(decision.scoring.rank, 7);
    // Silent on place points and bonus: both inherited, never reset to 0.
    assert.equal(decision.scoring.placePoints, stored.placePoints);
    assert.equal(decision.scoring.bonusPoints, stored.bonusPoints);
    assert.equal(decision.scoring.elimsPoints, 9);
    assert.equal(
      decision.scoring.totalPoints,
      decision.scoring.placePoints + decision.scoring.elimsPoints + decision.scoring.bonusPoints,
    );
  });

  it('(b) honours an explicitly supplied bonus and total', () => {
    const withBonus = decide({ row: { team_rank: 2, bonusPoints: 3 } });
    assert.equal(withBonus.scoring.bonusPoints, 3);
    assert.equal(withBonus.scoring.totalPoints, stored.placePoints + 14 + 3);

    const withTotal = decide({ row: { team_rank: 2, team_total: 26 } });
    // An explicit total is taken as given, exactly as it always was.
    assert.equal(withTotal.scoring.totalPoints, 26);
    assert.equal(withTotal.scoring.bonusPoints, stored.bonusPoints);
  });

  it('(b) applies the kill multiplier to a supplied elim count once', () => {
    const decision = decide({
      row: { team_elims: 4 },
      elimsCount: 4,
      killMultiplier: 2,
    });

    assert.equal(decision.scoring.elimsPoints, 8);
    assert.equal(decision.scoring.totalPoints, stored.placePoints + 8 + stored.bonusPoints);
  });

  it('does not treat a player sheet telemetry column as team-level data', () => {
    // The BMPS player paste carried damage, survival and the rest. On a player
    // sheet those columns are the player's, so the stored team row must be left
    // completely alone. Reading them as team telemetry is what replaced every
    // team's recorded figures with the last player row of the game.
    const decision = decide({
      row: { player: 'Nyrox', team: 'Team Soul', elims: 4, damage: 1200, survivalTime: 1400, healing: 300 },
    });

    assert.equal(decision.shouldWrite, false);
    assert.equal(decision.skippedExistingRow, true);
    assert.deepEqual(decision.scoring, stored);
    // Still reported as carried, but only informationally.
    assert.ok(decision.suppliedDetailFields.includes('damage'));
  });

  it('still writes when the row brings an explicit team column', () => {
    const decision = decide({ row: { player: 'Nyrox', team: 'Team Soul', damage: 1200, team_total: 26 } });

    assert.equal(decision.shouldWrite, true);
    assert.equal(decision.scoring.totalPoints, 26);
  });

  it('(c) authors a team row the DB does not have yet', () => {
    const decision = decide({ row: { team: 'New Squad', elims: 3 }, hasDbRow: false, existing: null, elimsCount: 3 });

    assert.equal(decision.shouldWrite, true);
    assert.equal(decision.skippedExistingRow, false);
    assert.deepEqual(decision.scoring, {
      rank: 1,
      wwcd: true,
      placePoints: 10,
      elimsPoints: 3,
      bonusPoints: 0,
      totalPoints: 13,
    });
  });

  it('(c) keeps a supplied bonus when authoring a new row', () => {
    const decision = decide({
      row: { team: 'New Squad', bonusPoints: 2 },
      hasDbRow: false,
      existing: null,
      elimsCount: 5,
    });

    assert.equal(decision.scoring.bonusPoints, 2);
    assert.equal(decision.scoring.totalPoints, 10 + 5 + 2);
  });

  it('falls back to the stored rank for a rank the row cannot supply', () => {
    // `Number(row.team_rank) || fallback` semantics: 0 is not a rank.
    assert.equal(decide({ row: { team_rank: 0 } }).scoring.rank, stored.rank);
    assert.equal(decide({ row: { team_rank: 'not a rank' } }).scoring.rank, stored.rank);
    assert.equal(decide({ row: { team_rank: 12 } }).scoring.rank, 12);
  });

  it('inherits the stored WWCD rather than re-deriving it from a silent column', () => {
    const wwcd: TeamResultScoring = { ...stored, rank: 1, wwcd: false };
    const silent = decide({ row: { team_rank: 1 }, existing: wwcd });

    // Rank 1 with no WWCD column derives WWCD, exactly as the cascade always did.
    assert.equal(silent.scoring.wwcd, true);
    assert.equal(decide({ row: { team_wwcd: 'no', team_rank: 1 } }).scoring.wwcd, false);
  });
});

describe('a real BGMS player paste', () => {
  // The sheet a user re-imports: player columns only, no team scorecard.
  const paste = [
    'Tournament\tStage\tDate\tTimeFormat\tTime\tOverallMatch\tStageMatch\tMap\tGroup\tType\tplayer\tteam\trole\telims\tplayerPowerplay',
    'BGMS 2026\tGrand Finals\t2026-09-13\tIST\t20:30\t12\t3\tErangel\tA\tOnline\tNyrox\tTeam Soul\tAssaulter\t4\t1',
  ].join('\n');

  it('is skipped for a team whose result the DB already holds', () => {
    const [row] = parsePaste(paste, 'excel', 'players').rows;
    const decision = decide({ row });

    assert.equal(decision.shouldWrite, false);
    assert.equal(decision.scoring.bonusPoints, 5);
    assert.equal(decision.scoring.totalPoints, 27);
  });

  it('still authors the team row when the DB has none', () => {
    const [row] = parsePaste(paste, 'excel', 'players').rows;

    assert.equal(decide({ row, hasDbRow: false, existing: null }).shouldWrite, true);
  });
});

describe('a player paste that carries telemetry columns', () => {
  // The BMPS 2026 shape: a player sheet with damage / survival / healing on it.
  // Before the fix these columns made every row look like it brought team-level
  // data, so each player wrote its own figures onto the team result and the last
  // row of the game won.
  const paste = [
    'Tournament\tStage\tMap\tplayer\tteam\trole\telims\tdamage\tsurvivalTime\thealing',
    'BMPS 2026\tGrand Finals\tErangel\tNyrox\tTeam Soul\tAssaulter\t4\t1200\t1400\t300',
  ].join('\n');

  it('never writes the stored team result', () => {
    const [row] = parsePaste(paste, 'excel', 'players').rows;
    const decision = decide({ row });

    assert.equal(decision.shouldWrite, false);
    assert.deepEqual(decision.scoring, stored);
  });

  it('still authors a missing team row, without telemetry', () => {
    const [row] = parsePaste(paste, 'excel', 'players').rows;

    assert.equal(decide({ row, hasDbRow: false, existing: null }).shouldWrite, true);
  });
});
