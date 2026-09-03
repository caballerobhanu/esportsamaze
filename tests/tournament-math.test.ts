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

test('calculateTournamentFraggers ranks by elims then damage then headshots', () => {
  const fraggers = calculateTournamentFraggers([
    { playerId: 'p1', player: { id: 'p1', ign: 'P1' }, playerElims: 5, damage: 1000, headshots: 2 },
    { playerId: 'p2', player: { id: 'p2', ign: 'P2' }, playerElims: 5, damage: 1200, headshots: 1 },
    { playerId: 'p3', player: { id: 'p3', ign: 'P3' }, playerElims: 6, damage: 500, headshots: 0 },
  ]);
  assert.deepEqual(fraggers.map((f) => f.playerId), ['p3', 'p2', 'p1']);
});
