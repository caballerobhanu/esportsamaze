import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMatchPoint } from '../lib/match-point';
import {
  normalizeMatchPointRule,
  type MatchPointRule,
  type StandingsMatchLite,
} from '../lib/standings-config';

let seq = 0;
function match(
  stageName: string,
  day: number,
  overall: number,
  results: { teamId: string; rank: number; points: number }[],
  status = 'COMPLETED'
): StandingsMatchLite {
  return {
    id: `m${seq++}`,
    stageName,
    day: String(day),
    matchNumber: overall,
    overallMatchNumber: overall,
    mapName: 'Erangel',
    groupName: null,
    status,
    scheduledAt: `2026-08-0${day}T00:00:00.000Z`,
    results: results.map((r) => ({
      teamId: r.teamId,
      rank: r.rank,
      wwcd: r.rank === 1,
      placePoints: 0,
      elimsPoints: 0,
      totalPoints: r.points,
    })),
  };
}

const rule = (over: Partial<MatchPointRule> = {}): MatchPointRule => ({
  enabled: true,
  label: 'Smash Rule',
  thresholdLabel: 'Smash Point',
  stage: 'Grand Finals',
  thresholdMode: 'LEADER_PLUS',
  leaderOffset: 10,
  checkpointDay: 2,
  ...over,
});

/* ── leader + offset ────────────────────────────────────────────────────── */

test('a team at/above the threshold that then wins is champion ("not the same match")', () => {
  const matches = [
    match('Grand Finals', 1, 1, [{ teamId: 'A', rank: 1, points: 30 }, { teamId: 'B', rank: 2, points: 20 }, { teamId: 'C', rank: 3, points: 10 }]),
    match('Grand Finals', 1, 2, [{ teamId: 'A', rank: 1, points: 30 }, { teamId: 'B', rank: 2, points: 20 }, { teamId: 'C', rank: 3, points: 10 }]),
    match('Grand Finals', 2, 3, [{ teamId: 'B', rank: 1, points: 30 }, { teamId: 'A', rank: 2, points: 20 }, { teamId: 'C', rank: 3, points: 10 }]),
    match('Grand Finals', 2, 4, [{ teamId: 'A', rank: 1, points: 30 }, { teamId: 'B', rank: 2, points: 20 }, { teamId: 'C', rank: 3, points: 10 }]),
    // Day 3: A is on 110; the threshold is 120. Winning match 5 only *crosses* it — not enough.
    match('Grand Finals', 3, 5, [{ teamId: 'A', rank: 1, points: 20 }, { teamId: 'B', rank: 2, points: 15 }, { teamId: 'C', rank: 3, points: 10 }]),
    // Match 6: A starts on 130 >= 120 and wins -> champion.
    match('Grand Finals', 3, 6, [{ teamId: 'A', rank: 1, points: 10 }, { teamId: 'B', rank: 2, points: 15 }, { teamId: 'C', rank: 3, points: 10 }]),
  ];

  const res = computeMatchPoint(rule(), matches);
  assert.equal(res.applies, true);
  assert.equal(res.threshold, 120);
  assert.equal(res.leaderTeamId, 'A');
  assert.equal(res.leaderPoints, 110);
  assert.equal(res.eligibleFromDay, 3);
  assert.equal(res.championTeamId, 'A');
  assert.equal(res.championVia, 'SMASH');
  assert.equal(res.decisiveMatchNumber, 6);
  // A crossed the threshold in match 5 and won it in match 6 — different matches.
  assert.equal(res.reachedMatchByTeam.A?.matchNumber, 5);
});

test('match limit reached with no smash crowns the points leader', () => {
  const matches = [
    match('Grand Finals', 1, 1, [{ teamId: 'A', rank: 1, points: 30 }, { teamId: 'B', rank: 2, points: 20 }, { teamId: 'C', rank: 3, points: 10 }]),
    match('Grand Finals', 1, 2, [{ teamId: 'A', rank: 1, points: 30 }, { teamId: 'B', rank: 2, points: 20 }, { teamId: 'C', rank: 3, points: 10 }]),
    // Day 2 (eligible): B and C win, so nobody at/above the threshold wins.
    match('Grand Finals', 2, 3, [{ teamId: 'B', rank: 1, points: 30 }, { teamId: 'C', rank: 2, points: 20 }, { teamId: 'A', rank: 3, points: 5 }]),
    match('Grand Finals', 2, 4, [{ teamId: 'C', rank: 1, points: 30 }, { teamId: 'B', rank: 2, points: 5 }, { teamId: 'A', rank: 3, points: 5 }]),
  ];
  // Threshold = 70 (leader A on 60 after day 1, +10). Limit 4 = all matches.
  const res = computeMatchPoint(rule({ checkpointDay: 1, matchLimit: 4 }), matches);
  assert.equal(res.threshold, 70);
  assert.equal(res.championVia, 'POINTS');
  assert.equal(res.championTeamId, 'B'); // 40 + 30 + 5 = 75
  assert.equal(res.complete, true);
});

test('an unlimited event with no winner yet has no champion', () => {
  const matches = [match('Grand Finals', 1, 1, [{ teamId: 'A', rank: 1, points: 60 }], 'LIVE')];
  const res = computeMatchPoint(rule({ thresholdMode: 'FIXED', fixedThreshold: 100, eligibleFromDay: 1 }), matches);
  assert.equal(res.applies, true);
  assert.equal(res.threshold, 100);
  assert.equal(res.championTeamId, null);
  assert.equal(res.complete, false);
  // A is on 60 < 100.
  assert.deepEqual(res.onMatchPointTeamIds, []);
});

/* ── fixed threshold ────────────────────────────────────────────────────── */

test('a fixed threshold applies from its own start day', () => {
  const matches = [
    // Day 1 is not eligible (eligibleFromDay = 2); A crossing 50 by winning does not count.
    match('Grand Finals', 1, 1, [{ teamId: 'A', rank: 1, points: 60 }, { teamId: 'B', rank: 2, points: 40 }]),
    // Day 2: A starts on 60 >= 50 and wins -> champion.
    match('Grand Finals', 2, 2, [{ teamId: 'A', rank: 1, points: 10 }, { teamId: 'B', rank: 2, points: 40 }]),
  ];
  const res = computeMatchPoint(
    rule({ thresholdMode: 'FIXED', fixedThreshold: 50, eligibleFromDay: 2, checkpointDay: undefined }),
    matches
  );
  assert.equal(res.threshold, 50);
  assert.equal(res.eligibleFromDay, 2);
  assert.equal(res.championTeamId, 'A');
  assert.equal(res.decisiveMatchNumber, 2);
});

test('headstart base points seed both the threshold and eligibility', () => {
  const matches = [
    match('Grand Finals', 1, 1, [{ teamId: 'A', rank: 1, points: 5 }, { teamId: 'B', rank: 2, points: 5 }]),
  ];
  // A carries 55 headstart + wins match 1 -> already at/above the 50 fixed threshold.
  const res = computeMatchPoint(
    rule({ thresholdMode: 'FIXED', fixedThreshold: 50, eligibleFromDay: 1, checkpointDay: undefined }),
    matches,
    { basePoints: { A: 55 } }
  );
  assert.equal(res.championTeamId, 'A');
  assert.equal(res.championVia, 'SMASH');
});

/* ── guards ─────────────────────────────────────────────────────────────── */

test('a leader+offset rule with no checkpoint day does not apply', () => {
  const matches = [match('Grand Finals', 1, 1, [{ teamId: 'A', rank: 1, points: 30 }])];
  assert.equal(computeMatchPoint(rule({ checkpointDay: undefined }), matches).applies, false);
});

test('matches from other stages are ignored', () => {
  const matches = [match('Semifinals', 1, 1, [{ teamId: 'A', rank: 1, points: 30 }])];
  assert.equal(computeMatchPoint(rule(), matches).applies, false);
});

test('normalizeMatchPointRule requires enabled and a stage, and defaults', () => {
  assert.equal(normalizeMatchPointRule({ enabled: false, stage: 'X' }), undefined);
  assert.equal(normalizeMatchPointRule({ enabled: true }), undefined);
  const r = normalizeMatchPointRule({ enabled: true, stage: 'Grand Finals' });
  assert.equal(r?.thresholdMode, 'LEADER_PLUS');
  assert.equal(r?.label, 'Match Point');
  assert.equal(r?.matchLimit, null);
});
