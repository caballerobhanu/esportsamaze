import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  teamBasePoints,
  playerBasePoints,
  playerTierMultiplier,
  teamDecay,
  playerDecay,
  decayMilestones,
  computeBoard,
  parseTeamPaste,
  parsePlayerPaste,
  type EntryRow,
} from '../lib/krafton-standings';

const day = 86_400_000;
const d = (iso: string) => new Date(iso);
const entry = (over: Partial<EntryRow>): EntryRow => ({
  id: 'e1',
  eventId: 'ev1',
  eventName: 'Test Event',
  eventEndDate: d('2024-06-30'),
  tier: 'Tier 1',
  board: 'TEAM',
  entityId: null,
  entityName: 'Team A',
  teamName: null,
  teamId: null,
  rank: 1,
  finishes: 0,
  mvp: 0,
  finalsMvp: 0,
  igl: 0,
  survivor: 0,
  emerging: 0,
  ...over,
});

test('team base points match the KRAFTON tier tables', () => {
  assert.equal(teamBasePoints('Publisher', 1), 1000);
  assert.equal(teamBasePoints('Publisher', 5), 500);
  assert.equal(teamBasePoints('Tier 1', 3), 600);
  assert.equal(teamBasePoints('Tier 1', 8), 300);
  assert.equal(teamBasePoints('Tier 2', 25), 75);
  assert.equal(teamBasePoints('Tier 3', 40), 25);
  assert.equal(teamBasePoints('Tier 3', 50), 0); // beyond 48
});

test('player base points: finishes × tier multiplier + award bonuses', () => {
  assert.equal(playerTierMultiplier('Publisher'), 2);
  assert.equal(playerTierMultiplier('Tier 1'), 1.5);
  assert.equal(playerTierMultiplier('Tier 2'), 1);
  // 30 finishes at tier 1 = 45, + MVP 20 + IGL 10
  assert.equal(playerBasePoints(30, 'Tier 1', { mvp: 1, finalsMvp: 0, igl: 1, survivor: 0, emerging: 0 }), 75);
  assert.equal(playerBasePoints(10, 'Publisher', { mvp: 0, finalsMvp: 2, igl: 0, survivor: 1, emerging: 1 }), 20 + 20 + 10 + 5);
});

test('decay brackets step at 181/271/366 (team) and 181/241/301/366 (player)', () => {
  assert.equal(teamDecay(0), 1);
  assert.equal(teamDecay(180), 1);
  assert.equal(teamDecay(181), 0.75);
  assert.equal(teamDecay(271), 0.5);
  assert.equal(teamDecay(366), 0.1);
  assert.equal(teamDecay(1096), 0);
  assert.equal(playerDecay(240), 0.75);
  assert.equal(playerDecay(301), 0.25);
  assert.equal(playerDecay(366), 0.1);
});

test('decay milestones land on endDate + days', () => {
  const ms = decayMilestones('TEAM', d('2024-06-30'));
  assert.deepEqual(
    ms.map((m) => [m.days, m.date.toISOString().slice(0, 10), m.multiplier]),
    [
      [181, '2024-12-28', 0.75],
      [271, '2025-03-28', 0.5],
      [366, '2025-07-01', 0.1],
      [1096, '2027-07-01', 0],
    ]
  );
});

test('computeBoard aggregates, decays live, and ranks', () => {
  const asOf = d('2024-09-28'); // 90 days after the event → full points
  const board = computeBoard(
    [
      entry({ entityName: 'Team A', rank: 1 }), // Tier 1, 1st = 800
      entry({ entityName: 'Team B', rank: 2 }), // 700
      entry({ id: 'e2', eventId: 'ev2', eventName: 'Old Event', eventEndDate: d('2023-01-01'), entityName: 'Team B', rank: 1 }),
    ],
    [],
    asOf
  );
  // Team B: 700 (fresh) + 800 × 0.1 (≈619 days old) = 780 → ranks above Team A's 800? 780 < 800.
  assert.equal(board.length, 2);
  assert.equal(board[0].entityName, 'Team A');
  assert.equal(board[0].totalPoints, 800);
  assert.equal(board[1].entityName, 'Team B');
  assert.equal(board[1].totalPoints, 780);
  assert.equal(board[1].contributions.length, 2);
});

test('computeBoard links by entityId when present, name otherwise', () => {
  const board = computeBoard(
    [
      entry({ entityId: 'team-1', entityName: 'Team A', rank: 2 }),
      entry({ eventId: 'ev2', entityId: 'team-1', entityName: 'Team A (alt spelling)', rank: 3 }),
      entry({ entityName: 'Team A', rank: 5 }), // unlinked namesake — separate entity
    ],
    [],
    d('2024-07-10')
  );
  assert.equal(board.length, 2);
  const linked = board.find((b) => b.entityId === 'team-1');
  assert.equal(linked!.events, 2);
  const unlinked = board.find((b) => !b.entityId);
  assert.equal(unlinked!.events, 1);
});

test('paste parsers read TSV rows and skip junk', () => {
  const teams = parseTeamPaste('Name\tRank\nTeam SouL\t1\nGodLike\t2\n\nbad line');
  assert.deepEqual(teams, [
    { entityName: 'Team SouL', rank: 1 },
    { entityName: 'GodLike', rank: 2 },
  ]);

  const players = parsePlayerPaste('IGN\tTeam\tFinishes\tMVP\tFinalsMVP\tIGL\tSurvivor\tEmerging\nJonathan\tGodLike\t30\t1\t0\t1\t0\t0');
  assert.equal(players.length, 1);
  assert.deepEqual(players[0], {
    entityName: 'Jonathan',
    teamName: 'GodLike',
    finishes: 30,
    mvp: 1,
    finalsMvp: 0,
    igl: 1,
    survivor: 0,
    emerging: 0,
  });
});

test('point transfers: move, wipe, and fixed-amount modes', () => {
  const asOf = d('2026-09-12');
  const evA = entry({ entityId: 'team-a', entityName: 'Team A', rank: 1, eventEndDate: d('2024-06-30') }); // 800, decayed ×0.1 = 80
  const evA2 = entry({ id: 'e3', eventId: 'ev3', entityId: 'team-a', entityName: 'Team A', rank: 2, eventEndDate: d('2026-03-01') }); // 700 ×1
  const evB = entry({ entityId: 'team-b', entityName: 'Team B', rank: 3, eventEndDate: d('2024-06-30') }); // 600 ×0.1 = 60

  // move: A's BGIS 2024 points go to B; A keeps only post-cutoff points
  const board = computeBoard(
    [evA, evA2, evB],
    [{ id: 't1', fromTeamId: 'team-a', fromName: 'Team A', toTeamId: 'team-b', toName: 'Team B', cutoff: d('2026-01-01'), mode: 'add', amount: null }],
    asOf
  );
  const bEntity = board.find((b) => b.entityId === 'team-b')!;
  const aEntity = board.find((b) => b.entityId === 'team-a')!;
  // B: own 60 (decayed) + A's 80 moved = 140
  assert.equal(Math.round(bEntity.totalPoints), 140);
  assert.equal(bEntity.transferredInFrom, 'Team A');
  // A keeps only the 2026 event (700)
  assert.equal(aEntity.totalPoints, 525); // 700 × 0.75 decay (2026-03-01 → 2026-09-12)
  assert.equal(aEntity.transferredOutTo, 'Team B');
  // the moved contribution is marked
  assert.ok(bEntity.contributions.some((c) => c.transferredFrom === 'Team A' && c.eventName === 'Test Event'));

  // wipe: B's own pre-cutoff points erased, replaced by A's transferred
  const board2 = computeBoard(
    [evA, evB],
    [{ id: 't2', fromTeamId: 'team-a', fromName: 'Team A', toTeamId: 'team-b', toName: 'Team B', cutoff: d('2026-01-01'), mode: 'wipe', amount: null }],
    asOf
  );
  const b2 = board2.find((b) => b.entityId === 'team-b')!;
  assert.equal(Math.round(b2.totalPoints), 80); // only A's transferred points

  // fixed amount: B receives exactly 500 (decayed from cutoff), A starts from 0
  const board3 = computeBoard(
    [evA, evA2],
    [{ id: 't3', fromTeamId: 'team-a', fromName: 'Team A', toTeamId: 'team-b', toName: 'Team B', cutoff: d('2026-01-01'), mode: 'add', amount: 500 }],
    asOf
  );
  const b3 = board3.find((b) => b.entityId === 'team-b')!;
  assert.equal(b3!.contributions.some((c) => c.eventName === 'Point transfer from Team A'), true);
  const transferEntry = b3.contributions.find((c) => c.eventName === 'Point transfer from Team A')!;
  assert.equal(transferEntry.basePoints, 500);
  // ~8.5 months of decay on 500 → 500 × 1 (within 180d of 2026-01-01 at 2026-09-12 is >180 → ×0.75)
  assert.equal(transferEntry.points, Math.round(500 * teamDecay(Math.floor((asOf.getTime() - d('2026-01-01').getTime()) / day)) * 100) / 100);
});
