import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTeamBasePoints,
  getTeamDecay,
  getPlayerDecay,
  getPlayerBasePoints,
  mergeTransferRules,
  computeTeamRankings,
} from '../lib/krafton-rankings';

test('team base points follow the tier tables', () => {
  assert.equal(getTeamBasePoints('Publisher', 1), 1000);
  assert.equal(getTeamBasePoints('Tier 1', 1), 800);
  assert.equal(getTeamBasePoints('tier 1', 5), 400);
  assert.equal(getTeamBasePoints('Tier 2', 7), 200);
  assert.equal(getTeamBasePoints('Tier 1', 7), 300);
  assert.equal(getTeamBasePoints('Tier 3', 40), 25);
  assert.equal(getTeamBasePoints('Unknown Tier', 1), 0);
  assert.equal(getTeamBasePoints('Tier 1', 49), 0);
});

test('decay curves drop with age and vanish past three years', () => {
  assert.equal(getTeamDecay(30), 1);
  assert.equal(getTeamDecay(180), 1);
  assert.equal(getTeamDecay(200), 0.75);
  assert.equal(getTeamDecay(365), 0.5);
  assert.equal(getTeamDecay(400), 0.1);
  assert.equal(getTeamDecay(1100), 0);
  assert.equal(getPlayerDecay(200), 0.75);
  assert.equal(getPlayerDecay(320), 0.25);
  assert.equal(getPlayerDecay(1100), 0);
});

test('player points multiply finishes by tier and add award bonuses', () => {
  assert.equal(getPlayerBasePoints(10, 'Tier 2', {}), 10);
  assert.equal(getPlayerBasePoints(10, 'Tier 1', {}), 15);
  assert.equal(getPlayerBasePoints(10, 'Publisher', {}), 20);
  assert.equal(getPlayerBasePoints(10, 'Tier 2', { mvpTourney: true, emerging: true }), 35);
  assert.equal(getPlayerBasePoints(0, 'Tier 1', { mvpFinals: true, igl: true, survivor: true }), 30);
});

test('DB transfer rules layer over the (empty) built-in base', () => {
  assert.deepEqual(mergeTransferRules(), {});
  assert.deepEqual(mergeTransferRules({ 'team a': [{ new: 'Team B', before: '2026-01-01' }] }), {
    'team a': [{ new: 'Team B', before: '2026-01-01' }],
  });
});

test('computeTeamRankings sums decayed points, skips future events', () => {
  const asOf = new Date('2026-06-01T12:00:00Z');
  const teams = computeTeamRankings(
    [
      { tournament: 'BGIS 2026', tier: 'Tier 1', endDate: '2026-05-01', team: 'Team A', rank: 1 },
      { tournament: 'BMPS 2025', tier: 'Tier 1', endDate: '2025-06-15', team: 'Team A', rank: 1 },
      { tournament: 'BGIS 2026', tier: 'Tier 1', endDate: '2026-05-01', team: 'Team B', rank: 2 },
      { tournament: 'Future Event', tier: 'Tier 1', endDate: '2027-01-01', team: 'Team C', rank: 1 },
    ],
    asOf
  );
  const a = teams.find((t) => t.name === 'Team A');
  const b = teams.find((t) => t.name === 'Team B');
  assert.ok(a && b);
  assert.equal(a.events, 2);
  // 31-day-old win decays fully; the year-old win decays to 0.5
  assert.equal(a.points, 800 + 800 * 0.5);
  assert.equal(b.points, 700);
  assert.equal(teams.some((t) => t.name === 'Team C'), false);
});
