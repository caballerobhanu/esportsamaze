import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bonusRuleForSource,
  computeStageBonus,
  groupBonusPeriods,
  headstartFor,
} from '../lib/stage-bonus';
import { normalizeBonusRules, type StandingsMatchLite, type StageBonusRule } from '../lib/standings-config';

let seq = 0;
function match(
  stageName: string,
  day: string,
  results: { teamId: string; points: number }[]
): StandingsMatchLite {
  return {
    id: `m${seq++}`,
    stageName,
    day,
    mapName: 'Erangel',
    groupName: null,
    status: 'COMPLETED',
    scheduledAt: '2026-08-01T00:00:00.000Z',
    // Callers pass points best-first; calculateTournamentStandings ranks by total anyway.
    results: results.map((r, i) => ({
      teamId: r.teamId,
      rank: i + 1,
      wwcd: i === 0,
      placePoints: 0,
      elimsPoints: 0,
      totalPoints: r.points,
    })),
  };
}

const dayResults = (first: string, second: string) => [
  { teamId: first, points: 100 },
  { teamId: second, points: 90 },
  { teamId: 'C', points: 80 },
  { teamId: 'D', points: 70 },
];

const rule = (over: Partial<StageBonusRule> = {}): StageBonusRule => ({
  id: 'r1',
  label: 'Circuit Day Bonus',
  sourceStages: ['Circuit Stage'],
  period: 'DAY',
  awards: [3, 2, 1],
  targetStages: ['Grand Finals'],
  ...over,
});

/* ── periods ────────────────────────────────────────────────────────────── */

test('DAY period awards each day’s top 3 and accumulates', () => {
  const matches = [
    match('Circuit Stage', '1', dayResults('A', 'B')),
    match('Circuit Stage', '2', dayResults('B', 'A')),
  ];
  const out = computeStageBonus(rule(), matches);

  assert.equal(out.periods.length, 2);
  assert.equal(out.periods[0].label, 'Day 1');
  assert.equal(out.periods[1].label, 'Day 2');
  assert.deepEqual(out.byTeam, { A: 5, B: 5, C: 2 });
  assert.deepEqual(out.byTeamPeriod.A, { d1: 3, d2: 2 });
  assert.deepEqual(out.byTeamPeriod.B, { d1: 2, d2: 3 });
  assert.equal(out.byTeamPeriod.D, undefined);
});

test('a stage with a rest day labels periods by ordinal, not calendar offset', () => {
  const matches = [
    match('Circuit Stage', '1', dayResults('A', 'B')),
    match('Circuit Stage', '2', dayResults('B', 'A')),
    match('Circuit Stage', '7', dayResults('A', 'B')),
  ];
  const out = computeStageBonus(rule(), matches);

  assert.deepEqual(out.periods.map((p) => p.label), ['Day 1', 'Day 2', 'Day 3']);
  // The raw offset still keys each period, so the day picker keeps working.
  assert.deepEqual(out.periods.map((p) => p.key), ['d1', 'd2', 'd7']);
  assert.deepEqual(out.byTeamPeriod.A, { d1: 3, d2: 2, d7: 3 });
});

test('a day picker keeps each period labelled by its real tournament day', () => {
  const matches = [
    match('Circuit Stage', '1', dayResults('A', 'B')),
    match('Circuit Stage', '2', dayResults('C', 'D')),
    match('Circuit Stage', '3', dayResults('A', 'B')),
  ];
  const out = computeStageBonus(rule({ days: [1, 3] }), matches);
  assert.deepEqual(out.periods.map((p) => p.label), ['Day 1', 'Day 3']);
});

test('DAY_WINDOW chunks consecutive days and ranks the whole window', () => {
  const matches = [
    match('Circuit Stage', '1', dayResults('A', 'B')),
    match('Circuit Stage', '2', dayResults('A', 'B')),
    match('Circuit Stage', '3', dayResults('B', 'A')),
  ];
  const out = computeStageBonus(rule({ period: 'DAY_WINDOW', windowDays: 2 }), matches);

  // Days 1–2 in one window, day 3 alone in the next.
  assert.equal(out.periods.length, 2);
  assert.equal(out.periods[0].key, 'w1');
  assert.equal(out.periods[1].key, 'w2');
  // Window 1 combined: A=200, B=180, C=160 -> 3/2/1. Window 2 (day 3): B,A,C.
  assert.equal(out.byTeam.A, 3 + 2);
  assert.equal(out.byTeam.B, 2 + 3);
  assert.equal(out.byTeam.C, 1 + 1);
});

test('DAY_WINDOW labels a window by day ordinal, not calendar offset', () => {
  const matches = [
    match('Circuit Stage', '1', dayResults('A', 'B')),
    match('Circuit Stage', '2', dayResults('A', 'B')),
    match('Circuit Stage', '9', dayResults('B', 'A')),
  ];
  const out = computeStageBonus(rule({ period: 'DAY_WINDOW', windowDays: 2 }), matches);
  assert.deepEqual(out.periods.map((p) => p.label), ['Days 1–2', 'Day 3']);
});

test('a day picker restricts which days form periods', () => {
  const matches = [
    match('Circuit Stage', '1', dayResults('A', 'B')),
    match('Circuit Stage', '2', [
      { teamId: 'C', points: 100 },
      { teamId: 'D', points: 90 },
    ]),
    match('Circuit Stage', '3', dayResults('A', 'B')),
  ];
  const out = computeStageBonus(rule({ days: [1, 3] }), matches);
  assert.deepEqual(out.periods.map((p) => p.key), ['d1', 'd3']);
  // Day 2 is excluded, so its teams never appear.
  assert.deepEqual(out.byTeam, { A: 6, B: 4, C: 2 });
});

test('STAGE period ranks the whole source stage once', () => {
  const matches = [
    match('Circuit Stage', '1', dayResults('A', 'B')),
    match('Circuit Stage', '2', dayResults('A', 'B')),
  ];
  const out = computeStageBonus(rule({ period: 'STAGE' }), matches);

  assert.equal(out.periods.length, 1);
  assert.equal(out.periods[0].key, 'stage');
  assert.deepEqual(out.byTeam, { A: 3, B: 2, C: 1 });
});

test('a period with fewer teams than awards only pays the places that exist', () => {
  const matches = [
    match('Circuit Stage', '1', [
      { teamId: 'A', points: 50 },
      { teamId: 'B', points: 40 },
    ]),
  ];
  const out = computeStageBonus(rule(), matches);
  assert.deepEqual(out.byTeam, { A: 3, B: 2 });
});

test('matches from other stages never contribute', () => {
  const matches = [match('Grand Finals', '1', dayResults('A', 'B'))];
  const out = computeStageBonus(rule(), matches);
  assert.deepEqual(out.periods, []);
  assert.deepEqual(out.byTeam, {});
});

test('source stage matching tolerates extra wording and case', () => {
  const matches = [match('Circuit Stage 2026', '1', dayResults('A', 'B'))];
  const groups = groupBonusPeriods(rule({ sourceStages: ['circuit stage'] }), matches);
  assert.equal(groups.length, 1);
});

/* ── carry ──────────────────────────────────────────────────────────────── */

test('headstartFor resolves the rule that targets the stage and totals the carry', () => {
  const matches = [
    match('Circuit Stage', '1', dayResults('A', 'B')),
    match('Circuit Stage', '2', dayResults('B', 'A')),
  ];
  const target = headstartFor([rule()], matches, 'Grand Finals');
  assert.deepEqual(target.byTeam, { A: 5, B: 5, C: 2 });
  assert.equal(target.rule?.id, 'r1');

  // A stage that is not a target carries nothing.
  const none = headstartFor([rule()], matches, 'Circuit Stage');
  assert.equal(none.rule, null);
  assert.deepEqual(none.byTeam, {});
});

test('bonusRuleForSource finds the rule covering the source stage', () => {
  assert.equal(bonusRuleForSource([rule()], 'Circuit Stage')?.id, 'r1');
  assert.equal(bonusRuleForSource([rule()], 'Grand Finals'), null);
});

/* ── normalization ──────────────────────────────────────────────────────── */

test('normalizeBonusRules keeps valid rules and defaults the period', () => {
  const rules = normalizeBonusRules([
    { sourceStages: ['Circuit Stage'], awards: [3, 2, 1], targetStages: ['Grand Finals'] },
  ]);
  assert.equal(rules.length, 1);
  assert.equal(rules[0].period, 'DAY');
  assert.equal(rules[0].label, 'Circuit Stage bonus');
});

test('normalizeBonusRules parses, de-dupes and sorts the day picker', () => {
  const rules = normalizeBonusRules([
    { sourceStages: ['X'], awards: [1], days: [3, 1, 3, 0, '2', -5] },
  ]);
  assert.deepEqual(rules[0].days, [1, 2, 3]);
});

test('normalizeBonusRules drops rules that cannot award anything', () => {
  assert.deepEqual(normalizeBonusRules([{ awards: [3] }]), []); // no source
  assert.deepEqual(normalizeBonusRules([{ sourceStages: ['X'] }]), []); // no awards
  assert.deepEqual(normalizeBonusRules(null), []);
});

/* ── manual headstart ───────────────────────────────────────────────────── */

const manualRule = (over: Partial<StageBonusRule> = {}): StageBonusRule => ({
  id: 'm1',
  label: 'Ladder Headstart',
  mode: 'MANUAL',
  sourceStages: [],
  period: 'DAY',
  awards: [],
  manualPeriods: [
    { label: 'Ladder Day 1', entries: [{ teamId: 'A', points: 10 }, { teamId: 'B', points: 8 }] },
    { label: 'Ladder Day 2', entries: [{ teamId: 'B', points: 10 }, { teamId: 'C', points: 8 }] },
    { label: 'Ladder Day 3', entries: [{ teamId: 'A', points: 6 }, { teamId: 'D', points: 0 }] },
  ],
  targetStages: ['Main'],
  ...over,
});

test('a MANUAL rule carries the fixed points without any matches, summed per team', () => {
  const out = computeStageBonus(manualRule(), []);
  // A = 10 + 6 = 16, B = 8 + 10 = 18, C = 8, D's zero-point entry carries nothing.
  assert.deepEqual(out.byTeam, { A: 16, B: 18, C: 8 });
  assert.equal(out.periods.length, 3);
  assert.deepEqual(out.periods.map((p) => p.label), ['Ladder Day 1', 'Ladder Day 2', 'Ladder Day 3']);
  // The grid keeps each ladder day as its own column.
  assert.deepEqual(out.byTeamPeriod.A, { p1: 10, p3: 6 });
  assert.deepEqual(out.byTeamPeriod.B, { p1: 8, p2: 10 });
});

test('headstartFor resolves a MANUAL rule and totals the carry', () => {
  const target = headstartFor([manualRule()], [], 'Main');
  assert.deepEqual(target.byTeam, { A: 16, B: 18, C: 8 });
  assert.equal(target.rule?.id, 'm1');

  const none = headstartFor([manualRule()], [], 'Somewhere Else');
  assert.equal(none.rule, null);
  assert.deepEqual(none.byTeam, {});
});

test('normalizeBonusRules keeps a MANUAL rule and de-dupes its entries', () => {
  const rules = normalizeBonusRules([
    {
      mode: 'MANUAL',
      label: 'Ladder',
      targetStages: ['Main'],
      manualPeriods: [
        {
          label: 'Ladder Day 1',
          entries: [
            { teamId: 'A', points: 10 },
            { teamId: 'A', points: 5 },
            { teamId: '', points: 3 },
          ],
        },
        { label: 'Empty day', entries: [] },
      ],
    },
  ]);
  assert.equal(rules.length, 1);
  assert.equal(rules[0].mode, 'MANUAL');
  // The duplicate and blank entries drop, and the empty period drops with them.
  assert.deepEqual(rules[0].manualPeriods, [
    { label: 'Ladder Day 1', entries: [{ teamId: 'A', points: 10 }] },
  ]);
});

test('normalizeBonusRules drops a MANUAL rule with no populated period', () => {
  assert.deepEqual(
    normalizeBonusRules([
      { mode: 'MANUAL', targetStages: ['Main'], manualPeriods: [{ label: 'Empty', entries: [] }] },
    ]),
    [],
  );
});
