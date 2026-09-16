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
  computeBoardWithRankChanges,
  generateHistoricalSnapshotDates,
  computeNextDecay,
  computeUnifiedNextUpdate,
  computeEntityRankMilestones,
  computeRankOneReigns,
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
  eventShortName: null,
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

test('chained same-day transfers resolve without mess using time/preference sequence', () => {
  const asOf = d('2026-09-12');
  // Team A played Event 1 (800 base)
  const evA = entry({ id: 'e1', eventId: 'ev1', entityId: 'team-a', entityName: 'Team A', rank: 1, eventEndDate: d('2026-01-01') });
  // Team B played Event 2 (700 base)
  const evB = entry({ id: 'e2', eventId: 'ev2', entityId: 'team-b', entityName: 'Team B', rank: 2, eventEndDate: d('2026-02-01') });
  // Team C played Event 3 (600 base)
  const evC = entry({ id: 'e3', eventId: 'ev3', entityId: 'team-c', entityName: 'Team C', rank: 3, eventEndDate: d('2026-03-01') });

  // On the same day 2026-06-01:
  // Transfer 1 (10:00, pref 1): Team B transfers its points to Team C
  // Transfer 2 (14:00, pref 2): Team A transfers its points to Team B
  // Notice passed in REVERSE order in the array to test automatic sorting by cutoff/preference
  const board = computeBoard(
    [evA, evB, evC],
    [
      {
        id: 't2',
        fromTeamId: 'team-a',
        fromName: 'Team A',
        toTeamId: 'team-b',
        toName: 'Team B',
        cutoff: new Date('2026-06-01T14:00:02Z'),
        preference: 2,
        mode: 'add',
        amount: null,
      },
      {
        id: 't1',
        fromTeamId: 'team-b',
        fromName: 'Team B',
        toTeamId: 'team-c',
        toName: 'Team C',
        cutoff: new Date('2026-06-01T10:00:01Z'),
        preference: 1,
        mode: 'add',
        amount: null,
      },
    ],
    asOf
  );

  const a = board.find((x) => x.entityId === 'team-a')!;
  const b = board.find((x) => x.entityId === 'team-b')!;
  const c = board.find((x) => x.entityId === 'team-c')!;

  // Team A transferred its Event 1 out, so it has 0 events remaining
  assert.equal(a.events, 0);
  assert.equal(a.totalPoints, 0);

  // Team B transferred its own Event 2 to Team C FIRST, then received Event 1 from Team A SECOND
  // Thus Team B should have ONLY Event 1 (from Team A), NOT 0 points!
  assert.equal(b.events, 1);
  assert.equal(b.contributions[0].transferredFrom, 'Team A');
  assert.equal(b.contributions[0].eventId, 'ev1');

  // Team C received Event 2 from Team B + keeps its own Event 3
  assert.equal(c.events, 2);
  assert.ok(c.contributions.some((item) => item.eventId === 'ev2' && item.transferredFrom === 'Team B'));
  assert.ok(c.contributions.some((item) => item.eventId === 'ev3' && !item.transferredFrom));
  // Team C should NOT have Event 1 from Team A!
  assert.ok(!c.contributions.some((item) => item.eventId === 'ev1'));
});

test('transfer mode own_only preserves previously acquired points in source team', () => {
  const asOf = d('2026-09-12');
  const evA = entry({ id: 'e1', eventId: 'ev1', entityId: 'team-a', entityName: 'Team A', rank: 1, eventEndDate: d('2026-01-01') });
  const evB = entry({ id: 'e2', eventId: 'ev2', entityId: 'team-b', entityName: 'Team B', rank: 2, eventEndDate: d('2026-02-01') });

  // 1) A transfers to B
  // 2) B transfers to C with 'own_only' mode
  const board = computeBoard(
    [evA, evB],
    [
      {
        id: 't1',
        fromTeamId: 'team-a',
        fromName: 'Team A',
        toTeamId: 'team-b',
        toName: 'Team B',
        cutoff: new Date('2026-05-01T00:00:01Z'),
        preference: 1,
        mode: 'add',
        amount: null,
      },
      {
        id: 't2',
        fromTeamId: 'team-b',
        fromName: 'Team B',
        toTeamId: 'team-c',
        toName: 'Team C',
        cutoff: new Date('2026-06-01T00:00:02Z'),
        preference: 2,
        mode: 'own_only',
        amount: null,
      },
    ],
    asOf
  );

  const b = board.find((x) => x.entityId === 'team-b')!;
  const c = board.find((x) => x.entityId === 'team-c')!;

  // Team B retains Event 1 (transferred from Team A) because mode was 'own_only'!
  assert.equal(b.events, 1);
  assert.equal(b.contributions[0].eventId, 'ev1');

  // Team C receives only Team B's own Event 2
  assert.equal(c.events, 1);
  assert.equal(c.contributions[0].eventId, 'ev2');
  assert.equal(c.contributions[0].transferredFrom, 'Team B');
});

test('computeBoardWithRankChanges compares current rank with prior snapshot', () => {
  const ev1 = entry({ id: '1', eventName: 'Event 1', eventEndDate: d('2024-01-01'), entityName: 'Team A', rank: 2 });
  const ev2 = entry({ id: '2', eventName: 'Event 1', eventEndDate: d('2024-01-01'), entityName: 'Team B', rank: 1 });
  const ev3 = entry({ id: '3', eventName: 'Event 2', eventEndDate: d('2024-02-01'), entityName: 'Team A', rank: 1 });

  // On 2024-01-15: Team B is #1 (800), Team A is #2 (700)
  // On 2024-02-15: Team A has 700 + 800 = 1500 (#1), Team B has 800 (#2)
  const ranked = computeBoardWithRankChanges(
    [ev1, ev2, ev3],
    [],
    d('2024-02-15'),
    d('2024-01-15')
  );

  assert.equal(ranked[0].entityName, 'Team A');
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[0].previousRank, 2);
  assert.equal(ranked[0].rankChange, 1); // moved up from #2 to #1 (+1)

  assert.equal(ranked[1].entityName, 'Team B');
  assert.equal(ranked[1].rank, 2);
  assert.equal(ranked[1].previousRank, 1);
  assert.equal(ranked[1].rankChange, -1); // dropped from #1 to #2 (-1)
});

test('generateHistoricalSnapshotDates returns sorted unique ISO date strings', () => {
  const dates = generateHistoricalSnapshotDates(
    [
      entry({ eventEndDate: d('2024-01-10') }),
      entry({ eventEndDate: d('2024-05-20') }),
    ],
    d('2024-06-01')
  );
  assert.equal(dates[0], '2024-05-20');
  assert.ok(dates.includes('2024-01-10'));
  assert.ok(dates.includes('2024-05-20'));
  // Does not generate redundant 2024-06-01 when no event/decay occurred on that date
  assert.ok(!dates.includes('2024-06-01'));
});

test('computeNextDecay calculates upcoming milestone and point loss', () => {
  // Event ended 2024-01-01. As of 2024-06-01 (152 days in), it's at 100%.
  // 181st day is 2024-06-30 when it drops to 75%.
  const ev = entry({ eventEndDate: d('2024-01-01'), rank: 1 }); // 800 pts
  const board = computeBoard([ev], [], d('2024-06-01'));
  const nextDecay = computeNextDecay(board[0].contributions, d('2024-06-01'));

  assert.ok(nextDecay);
  assert.equal(nextDecay.fromMultiplier, 1);
  assert.equal(nextDecay.toMultiplier, 0.75);
  assert.equal(nextDecay.estimatedPointLoss, 200); // 800 * 0.25 = 200
  assert.ok(nextDecay.daysRemaining > 0);
});

test('computeUnifiedNextUpdate picks earlier of decay or future event end date', () => {
  const decayInfo = {
    daysRemaining: 15,
    date: new Date(Date.now() + 15 * 86_400_000),
    eventName: 'BGIS 2024',
    toMultiplier: 0.75,
    estimatedPointLoss: 150,
  };

  const futureEventCloser = [
    { name: 'BMPS 2026', endDate: new Date(Date.now() + 5 * 86_400_000) },
  ];

  // Event in 5 days is sooner than decay in 15 days
  const update1 = computeUnifiedNextUpdate(decayInfo, futureEventCloser);
  assert.ok(update1);
  assert.equal(update1.type, 'event');
  assert.equal(update1.title, 'BMPS 2026 Conclusion');

  const futureEventFurther = [
    { name: 'BMPS 2026', endDate: new Date(Date.now() + 30 * 86_400_000) },
  ];

  // Decay in 15 days is sooner than event in 30 days
  const update2 = computeUnifiedNextUpdate(decayInfo, futureEventFurther);
  assert.ok(update2);
  assert.equal(update2.type, 'decay');
  assert.equal(update2.title, 'BGIS 2024 Decay Step-down');
});

test('computeEntityRankMilestones calculates peak rank, days at peak, and days in top 5', () => {
  // Event 1 ends on 2024-01-01: Team A rank 1 (1000 pts), Team B rank 2 (800 pts)
  // Event 2 ends on 2024-01-11 (10 days later): Team B rank 1 (1000 pts -> 1800 pts total), Team A rank 3 (700 pts -> 1700 pts total)
  // Current time: 2024-01-31 (20 days after Event 2)
  const entries: EntryRow[] = [
    entry({
      id: 'e1',
      eventId: 'ev1',
      eventName: 'Event 1',
      eventEndDate: d('2024-01-01T00:00:00Z'),
      tier: 'Publisher',
      board: 'TEAM',
      entityId: 'team-a',
      entityName: 'Team A',
      rank: 1,
    }),
    entry({
      id: 'e2',
      eventId: 'ev1',
      eventName: 'Event 1',
      eventEndDate: d('2024-01-01T00:00:00Z'),
      tier: 'Publisher',
      board: 'TEAM',
      entityId: 'team-b',
      entityName: 'Team B',
      rank: 2,
    }),
    entry({
      id: 'e3',
      eventId: 'ev2',
      eventName: 'Event 2',
      eventEndDate: d('2024-01-11T00:00:00Z'),
      tier: 'Publisher',
      board: 'TEAM',
      entityId: 'team-b',
      entityName: 'Team B',
      rank: 1,
    }),
    entry({
      id: 'e4',
      eventId: 'ev2',
      eventName: 'Event 2',
      eventEndDate: d('2024-01-11T00:00:00Z'),
      tier: 'Publisher',
      board: 'TEAM',
      entityId: 'team-a',
      entityName: 'Team A',
      rank: 3,
    }),
  ];

  const asOf = d('2024-01-31T00:00:00Z');

  // Team A: #1 for 10 days (from Jan 1 to Jan 11), then dropped to #2 on Jan 11.
  const aMilestones = computeEntityRankMilestones('team-a', 'TEAM', entries, [], asOf);
  assert.equal(aMilestones.highestRank, 1);
  assert.equal(aMilestones.daysAtHighest, 10);
  assert.equal(aMilestones.isCurrentlyAtHighest, false);
  // Team A was in top 5 for entire duration (10 + 20 + 1 day = 31 days)
  assert.equal(aMilestones.daysInTop5, 31);
  assert.equal(aMilestones.isCurrentlyInTop5, true);

  // Team B: #2 for 10 days, then #1 from Jan 11 to Jan 31 (20 days + 1 today = 21 days)
  const bMilestones = computeEntityRankMilestones('team-b', 'TEAM', entries, [], asOf);
  assert.equal(bMilestones.highestRank, 1);
  assert.equal(bMilestones.daysAtHighest, 21);
  assert.equal(bMilestones.isCurrentlyAtHighest, true);
  assert.equal(bMilestones.daysInTop5, 31);
  assert.equal(bMilestones.isCurrentlyInTop5, true);
});

test('computeRankOneReigns splits the #1 spell at each handover', () => {
  // Same scenario as the milestones test: Team A leads from Jan 1, Team B takes
  // over on Jan 11 and still holds it on Jan 31.
  const entries: EntryRow[] = [
    entry({
      id: 'e1',
      eventId: 'ev1',
      eventName: 'Event 1',
      eventEndDate: d('2024-01-01T00:00:00Z'),
      tier: 'Publisher',
      entityId: 'team-a',
      entityName: 'Team A',
      rank: 1,
    }),
    entry({
      id: 'e2',
      eventId: 'ev1',
      eventName: 'Event 1',
      eventEndDate: d('2024-01-01T00:00:00Z'),
      tier: 'Publisher',
      entityId: 'team-b',
      entityName: 'Team B',
      rank: 2,
    }),
    entry({
      id: 'e3',
      eventId: 'ev2',
      eventName: 'Event 2',
      eventEndDate: d('2024-01-11T00:00:00Z'),
      tier: 'Publisher',
      entityId: 'team-b',
      entityName: 'Team B',
      rank: 1,
    }),
    entry({
      id: 'e4',
      eventId: 'ev2',
      eventName: 'Event 2',
      eventEndDate: d('2024-01-11T00:00:00Z'),
      tier: 'Publisher',
      entityId: 'team-a',
      entityName: 'Team A',
      rank: 3,
    }),
  ];

  const reigns = computeRankOneReigns(entries, [], d('2024-01-31T00:00:00Z'));

  assert.deepEqual(
    reigns.map((r) => [r.entityName, r.startDate, r.endDate, r.days, r.isCurrent]),
    [
      ['Team A', '2024-01-01', '2024-01-11', 10, false],
      ['Team B', '2024-01-11', '2024-01-31', 21, true],
    ],
  );
  // The two spells together cover exactly the same days the per-entity milestone
  // reports (10 + 21), so the two views cannot disagree.
  assert.equal(
    reigns.reduce((sum, r) => sum + r.days, 0),
    31,
  );
});

test('computeRankOneReigns records a team that takes #1 back', () => {
  // Only one team scores in events 2 and 3, which breaks the symmetry a straight
  // rank swap would otherwise produce.
  const entries: EntryRow[] = [
    entry({ id: 'a1', eventId: 'ev1', eventName: 'E1', eventEndDate: d('2024-01-01T00:00:00Z'), tier: 'Publisher', entityId: 'a', entityName: 'A', rank: 1 }),
    entry({ id: 'b1', eventId: 'ev1', eventName: 'E1', eventEndDate: d('2024-01-01T00:00:00Z'), tier: 'Publisher', entityId: 'b', entityName: 'B', rank: 3 }),
    entry({ id: 'b2', eventId: 'ev2', eventName: 'E2', eventEndDate: d('2024-01-11T00:00:00Z'), tier: 'Publisher', entityId: 'b', entityName: 'B', rank: 1 }),
    entry({ id: 'a2', eventId: 'ev3', eventName: 'E3', eventEndDate: d('2024-01-21T00:00:00Z'), tier: 'Publisher', entityId: 'a', entityName: 'A', rank: 1 }),
  ];

  const reigns = computeRankOneReigns(entries, [], d('2024-01-31T00:00:00Z'));

  assert.deepEqual(
    reigns.map((r) => [r.entityName, r.startDate, r.endDate, r.days, r.isCurrent]),
    [
      ['A', '2024-01-01', '2024-01-11', 10, false],
      ['B', '2024-01-11', '2024-01-21', 10, false],
      ['A', '2024-01-21', '2024-01-31', 11, true],
    ],
  );
});

test('computeRankOneReigns keeps one unbroken spell for a single leader', () => {
  const entries: EntryRow[] = [
    entry({ id: 'a1', eventId: 'ev1', eventName: 'E1', eventEndDate: d('2024-01-01T00:00:00Z'), tier: 'Publisher', entityId: 'a', entityName: 'A', rank: 1 }),
  ];

  const reigns = computeRankOneReigns(entries, [], d('2024-01-31T00:00:00Z'));

  assert.equal(reigns.length, 1);
  assert.equal(reigns[0].entityName, 'A');
  assert.equal(reigns[0].entityId, 'a');
  assert.equal(reigns[0].startDate, '2024-01-01');
  assert.equal(reigns[0].endDate, '2024-01-31');
  assert.equal(reigns[0].isCurrent, true);
});

test('computeRankOneReigns returns nothing without entries', () => {
  assert.deepEqual(computeRankOneReigns([], [], d('2024-01-31T00:00:00Z')), []);
});


