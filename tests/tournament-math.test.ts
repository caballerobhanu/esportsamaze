import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTotalPoints,
  computeUtilitiesTotal,
  computeTotalDistance,
  getPlacementPoints,
  compareTeamStandings,
  compareFraggerStandings,
  calculateTournamentStandings,
  calculateTournamentFraggers,
  parseSurvivalSeconds,
  parseWwcd,
} from '../lib/tournament-math';

test('computeTotalPoints sums place, elims and bonus', () => {
  assert.equal(computeTotalPoints({ placePoints: 10, elimsPoints: 8, bonusPoints: 2 }), 20);
  assert.equal(computeTotalPoints({}), 0);
});

test('computeUtilitiesTotal and computeTotalDistance', () => {
  assert.equal(computeUtilitiesTotal({ smokesUsed: 2, grenadesUsed: 1, molotovsUsed: 1, flashUsed: 4 }), 8);
  assert.equal(computeTotalDistance({ distDrove: 1200.45, distWalk: 300.25 }), 1500.7);
});

test('default placement matrix matches the official 10-point table', () => {
  assert.equal(getPlacementPoints(1), 10);
  assert.equal(getPlacementPoints(2), 6);
  assert.equal(getPlacementPoints(8), 1);
  assert.equal(getPlacementPoints(9), 0);
  assert.equal(getPlacementPoints(3, { 3: 7 }), 7);
  assert.equal(getPlacementPoints(2, [15, 12]), 12);
});

test('standings tie-break: points → wwcd → place → elims → last match → damage', () => {
  const base = { totalPoints: 0, wwcd: 0, placementPoints: 0, eliminationPoints: 0, lastMatchRank: null, totalDamage: 0 };
  assert.ok(compareTeamStandings({ ...base, totalPoints: 50 }, base) < 0);
  assert.ok(compareTeamStandings(base, { ...base, totalPoints: 50 }) > 0);
  assert.ok(compareTeamStandings({ ...base, wwcd: 2 }, { ...base, wwcd: 1 }) < 0);
  assert.ok(compareTeamStandings({ ...base, placementPoints: 5 }, { ...base, placementPoints: 6 }) > 0);
  assert.ok(compareTeamStandings({ ...base, eliminationPoints: 9 }, { ...base, eliminationPoints: 4 }) < 0);
  assert.ok(compareTeamStandings({ ...base, lastMatchRank: 3 }, { ...base, lastMatchRank: 1 }) > 0);
  assert.ok(compareTeamStandings({ ...base, totalDamage: 100 }, { ...base, totalDamage: 200 }) > 0);
  assert.equal(compareTeamStandings(base, base), 0);
});

test('fraggers sort: elims → damage → headshots', () => {
  const a = { elims: 5, damage: 1000, headshots: 3 };
  assert.ok(compareFraggerStandings({ elims: 6, damage: 0, headshots: 0 }, a) < 0);
  assert.ok(compareFraggerStandings({ elims: 5, damage: 1100, headshots: 0 }, a) < 0);
  assert.ok(compareFraggerStandings({ elims: 5, damage: 1000, headshots: 4 }, a) < 0);
  assert.equal(compareFraggerStandings(a, a), 0);
});

test('calculateTournamentStandings aggregates and ranks rows', () => {
  const rows = [
    { teamId: 'a', team: { id: 'a', name: 'Team A' }, rank: 1, wwcd: true, placePoints: 10, elimsPoints: 5, totalPoints: 15, damage: 900 },
    { teamId: 'b', team: { id: 'b', name: 'Team B' }, rank: 2, wwcd: false, placePoints: 6, elimsPoints: 4, totalPoints: 10, damage: 800 },
    { teamId: 'a', team: { id: 'a', name: 'Team A' }, rank: 3, wwcd: false, placePoints: 5, elimsPoints: 6, totalPoints: 11, damage: 700 },
  ];
  const standings = calculateTournamentStandings(rows);
  assert.equal(standings[0].teamId, 'a');
  assert.equal(standings[0].matchesPlayed, 2);
  assert.equal(standings[0].wwcd, 1);
  assert.equal(standings[0].totalPoints, 26);
  assert.equal(standings[0].rank, 1);
  assert.equal(standings[1].teamId, 'b');
  assert.equal(standings[1].rank, 2);
});

test('calculateTournamentStandings annotates tiebreaker reason when teams are tied on points', () => {
  const rows = [
    // Team X and Team Y tied at 30 points, Team X has WWCD
    { teamId: 'x', team: { id: 'x', name: 'Team X' }, rank: 1, wwcd: true, placePoints: 15, elimsPoints: 15, totalPoints: 30, damage: 1500 },
    { teamId: 'y', team: { id: 'y', name: 'Team Y' }, rank: 2, wwcd: false, placePoints: 10, elimsPoints: 20, totalPoints: 30, damage: 2000 },
  ];
  const standings = calculateTournamentStandings(rows);
  assert.equal(standings[0].teamId, 'x');
  assert.equal(standings[0].rank, 1);
  assert.ok(standings[0].tiebreaker);
  assert.equal(standings[0].tiebreaker.isTied, true);
  assert.equal(standings[0].tiebreaker.won, true);
  assert.equal(standings[0].tiebreaker.type, 'WWCD');
  assert.ok(standings[0].tiebreaker.shortBadge.includes('WWCD'));

  assert.equal(standings[1].teamId, 'y');
  assert.equal(standings[1].rank, 2);
  assert.ok(standings[1].tiebreaker);
  assert.equal(standings[1].tiebreaker.isTied, true);
  assert.equal(standings[1].tiebreaker.won, false);
});

test('calculateTournamentFraggers ranks by elims then damage then headshots', () => {
  const fraggers = calculateTournamentFraggers([
    { playerId: 'p1', player: { id: 'p1', ign: 'P1' }, playerElims: 5, damage: 1000, headshots: 2 },
    { playerId: 'p2', player: { id: 'p2', ign: 'P2' }, playerElims: 5, damage: 1200, headshots: 1 },
    { playerId: 'p3', player: { id: 'p3', ign: 'P3' }, playerElims: 6, damage: 500, headshots: 0 },
  ]);
  assert.deepEqual(fraggers.map((f) => f.playerId), ['p3', 'p2', 'p1']);
});

test('parseSurvivalSeconds correctly parses seconds, MM:SS, and HH:MM:SS formats', () => {
  assert.equal(parseSurvivalSeconds(120), 120);
  assert.equal(parseSurvivalSeconds('120'), 120);
  assert.equal(parseSurvivalSeconds('24:15'), 1455);
  assert.equal(parseSurvivalSeconds('00:24:15'), 1455);
  assert.equal(parseSurvivalSeconds('01:10:05'), 4205);
  assert.equal(parseSurvivalSeconds(null, 1680), 1680);
});

test('parseWwcd accurately parses 1, "1", 0, "0", boolean, and fallback rank', () => {
  assert.equal(parseWwcd(1, 2), true);
  assert.equal(parseWwcd('1', 2), true);
  assert.equal(parseWwcd(true, 2), true);
  assert.equal(parseWwcd('true', 2), true);
  assert.equal(parseWwcd('yes', 2), true);
  assert.equal(parseWwcd('wwcd', 2), true);
  assert.equal(parseWwcd(0, 1), false);
  assert.equal(parseWwcd('0', 1), false);
  assert.equal(parseWwcd(false, 1), false);
  assert.equal(parseWwcd('false', 1), false);
  assert.equal(parseWwcd('no', 1), false);
  assert.equal(parseWwcd(undefined, 1), true);
  assert.equal(parseWwcd(undefined, 2), false);
  assert.equal(parseWwcd('', 1), true);
  assert.equal(parseWwcd('', 2), false);
});

test('normalizeStandingsConfig preserves group-wise qualification zones and target groups', async () => {
  const { normalizeStandingsConfig } = await import('../lib/standings-config');

  const raw = {
    tabGroups: [
      {
        id: 'group-1',
        name: 'Qualifiers',
        items: [
          {
            id: 'item-1',
            type: 'STAGE_TAB',
            label: 'Round 1',
            stageName: 'Round 1',
            enableGroupSubTabs: true,
            showOverallInGroupTabs: true,
            groups: ['Group A', 'Group B', 'Group C', 'Group D'],
            zones: [
              { from: 1, to: 16, label: 'Top 16 to Round 2', targetStageName: 'Round 2', color: 'green' },
            ],
            groupZones: {
              'Group A': [
                { from: 1, to: 12, label: 'Top 12 to Round 2 (Group A)', targetStageName: 'Round 2', targetGroupName: 'Group A', color: 'green' },
                { from: 13, to: 16, label: 'Bottom 4 to Round 2 (Group B)', targetStageName: 'Round 2', targetGroupName: 'Group B', color: 'blue' },
              ],
              'Group B': [
                { from: 1, to: 4, label: 'Top 4 to Round 2 (Group A)', targetStageName: 'Round 2', targetGroupName: 'Group A', color: 'green' },
                { from: 5, to: 12, label: 'Next 8 to Round 2 (Group B)', targetStageName: 'Round 2', targetGroupName: 'Group B', color: 'blue' },
                { from: 13, to: 16, label: 'Bottom 4 to Round 2 (Group C)', targetStageName: 'Round 2', targetGroupName: 'Group C', color: 'yellow' },
              ],
            },
          },
        ],
      },
    ],
  };

  const normalized = normalizeStandingsConfig(raw);
  assert.equal(normalized.tabGroups?.length, 1);
  const item = normalized.tabGroups?.[0].items[0];
  assert.equal(item?.enableGroupSubTabs, true);
  assert.equal(item?.showOverallInGroupTabs, true);
  assert.deepEqual(item?.groups, ['Group A', 'Group B', 'Group C', 'Group D']);
  assert.equal(item?.zones?.length, 1);
  assert.equal(item?.groupZones?.['Group A']?.length, 2);
  assert.equal(item?.groupZones?.['Group A']?.[0].targetGroupName, 'Group A');
  assert.equal(item?.groupZones?.['Group A']?.[1].targetGroupName, 'Group B');
  assert.equal(item?.groupZones?.['Group B']?.length, 3);
  assert.equal(item?.groupZones?.['Group B']?.[2].targetGroupName, 'Group C');
});

test('calculateTournamentStandings correctly evaluates group-separated lobbies', () => {
  // Simulate 16 teams in Group A and 16 teams in Group B
  const groupAResults = [
    { teamId: 'tA1', rank: 1, wwcd: true, placePoints: 10, elimsPoints: 8, totalPoints: 18 },
    { teamId: 'tA13', rank: 13, wwcd: false, placePoints: 0, elimsPoints: 2, totalPoints: 2 },
  ];
  const groupBResults = [
    { teamId: 'tB1', rank: 1, wwcd: true, placePoints: 10, elimsPoints: 12, totalPoints: 22 },
    { teamId: 'tB2', rank: 2, wwcd: false, placePoints: 6, elimsPoints: 5, totalPoints: 11 },
  ];

  const standingsA = calculateTournamentStandings(groupAResults);
  assert.equal(standingsA[0].teamId, 'tA1');
  assert.equal(standingsA[0].rank, 1);
  assert.equal(standingsA[1].teamId, 'tA13');
  assert.equal(standingsA[1].rank, 2); // Rank 2 within Group A

  const standingsB = calculateTournamentStandings(groupBResults);
  assert.equal(standingsB[0].teamId, 'tB1');
  assert.equal(standingsB[0].rank, 1);
  assert.equal(standingsB[1].teamId, 'tB2');
  assert.equal(standingsB[1].rank, 2);
});

test('partitionRowsIntoBatches splits 30 days of data without splitting matches', async () => {
  const { partitionRowsIntoBatches } = await import('../components/admin/bulk-json-match-importer');

  // Simulate 30 days of tournament matches (6 matches/day, 64 players/match = 384 rows/day)
  const rows: any[] = [];
  for (let day = 1; day <= 30; day++) {
    const dateStr = `2026-08-${String(day).padStart(2, '0')}`;
    for (let match = 1; match <= 6; match++) {
      const overallMatch = (day - 1) * 6 + match;
      for (let player = 1; player <= 64; player++) {
        rows.push({
          Tournament: 'BMPS 2026',
          Stage: 'Grand Finals',
          Date: dateStr,
          OverallMatch: overallMatch,
          StageMatch: match,
          team: `Team ${(player % 16) + 1}`,
          player: `Player ${player}`,
        });
      }
    }
  }

  assert.equal(rows.length, 11520); // 30 * 384 = 11,520 rows

  const batches = partitionRowsIntoBatches(rows, 384);
  assert.equal(batches.length, 30); // Exactly 30 batches for 30 matchdays

  let totalReconstructedRows = 0;
  for (let i = 0; i < batches.length; i++) {
    const b = batches[i];
    assert.equal(b.rows.length, 384); // Each day has complete 384 rows
    totalReconstructedRows += b.rows.length;

    // Verify all 6 matches in this batch belong to the exact same day
    const dayDate = `2026-08-${String(i + 1).padStart(2, '0')}`;
    assert.ok(b.label.includes(dayDate));
    for (const r of b.rows) {
      assert.equal(r.Date, dayDate);
    }
  }

  assert.equal(totalReconstructedRows, 11520);
});

test('partitionRowsIntoBatches keeps 64 players of match together when no dates exist', async () => {
  const { partitionRowsIntoBatches } = await import('../components/admin/bulk-json-match-importer');

  // 12 matches without dates (12 * 64 = 768 rows)
  const rows: any[] = [];
  for (let match = 1; match <= 12; match++) {
    for (let p = 1; p <= 64; p++) {
      rows.push({
        Tournament: 'BGIS 2026',
        Stage: 'Round 4',
        StageMatch: match,
        player: `Player ${p}`,
        team: `Team ${(p % 16) + 1}`,
      });
    }
  }

  const batches = partitionRowsIntoBatches(rows, 384);
  assert.equal(batches.length, 2); // 768 / 384 = 2 batches of 6 matches each
  assert.equal(batches[0].rows.length, 384);
  assert.equal(batches[1].rows.length, 384);

  // Verify match 6 is completely in batch 0 and match 7 is completely in batch 1
  const b0Matches = new Set(batches[0].rows.map((r) => r.StageMatch));
  const b1Matches = new Set(batches[1].rows.map((r) => r.StageMatch));
  assert.deepEqual(Array.from(b0Matches).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(Array.from(b1Matches).sort((a, b) => a - b), [7, 8, 9, 10, 11, 12]);
});


