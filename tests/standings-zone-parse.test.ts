import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStandingsZoneSheet, planZoneFiling } from '../lib/standings-zone-parse';

const SHEET = [
  'Stage\tGroup\tRank\tLabel\tColour\tTarget Stage',
  'Group Stage\tGroup A\t1-4\tAdvance to Semis\tGreen\tSemi Finals',
  '\tGroup B\t1-4\tAdvance to Semis\tGreen\tSemi Finals',
  'Semi Finals\t\t1-4\tTo Grand Finals\tBlue\tGrand Finals',
  '\t\t13-16\tEliminated\tRed\t',
].join('\n');

test('parseStandingsZoneSheet carries the stage down and resets the group on a new stage', () => {
  const result = parseStandingsZoneSheet(SHEET);

  assert.equal(result.error, null);
  assert.deepEqual(
    result.rows.map((row) => [row.stage, row.group]),
    [
      ['Group Stage', 'Group A'],
      ['Group Stage', 'Group B'],
      ['Semi Finals', ''],
      ['Semi Finals', ''],
    ],
  );
});

test('parseStandingsZoneSheet reads the range, label, colour and target', () => {
  const [first, , third] = parseStandingsZoneSheet(SHEET).rows;

  assert.equal(first.from, 1);
  assert.equal(first.to, 4);
  assert.equal(first.label, 'Advance to Semis');
  assert.equal(first.color, 'green');
  assert.equal(first.targetStageName, 'Semi Finals');

  assert.equal(third.label, 'To Grand Finals');
  assert.equal(third.color, 'blue');
  assert.equal(third.from, 1);
  assert.equal(third.to, 4);
});

test('parseStandingsZoneSheet accepts explicit From/To columns instead of a rank', () => {
  const sheet = ['Stage\tFrom\tTo\tLabel', 'Grand Finals\t1\t3\tPodium'].join('\n');

  const [row] = parseStandingsZoneSheet(sheet).rows;

  assert.equal(row.from, 1);
  assert.equal(row.to, 3);
  assert.equal(row.label, 'Podium');
});

test('parseStandingsZoneSheet keeps an unrecognised colour rather than inventing one', () => {
  const sheet = ['Stage\tRank\tLabel\tColour', 'Grand Finals\t1\tWin\tchartreuse'].join('\n');

  assert.equal(parseStandingsZoneSheet(sheet).rows[0].color, 'chartreuse');
});

test('parseStandingsZoneSheet drops a row with neither a range nor a label', () => {
  const sheet = ['Stage\tRank\tLabel', 'Grand Finals\t\t', 'Grand Finals\t1-3\tPodium'].join('\n');

  assert.equal(parseStandingsZoneSheet(sheet).rows.length, 1);
});

test('parseStandingsZoneSheet reports headers it did not recognise', () => {
  const sheet = ['Stage\tRank\tLabel\tWibble', 'Grand Finals\t1\tWin\tx'].join('\n');

  assert.deepEqual(parseStandingsZoneSheet(sheet).unrecognisedHeaders, ['Wibble']);
});

test('parseStandingsZoneSheet refuses a paste with no usable columns', () => {
  assert.match(parseStandingsZoneSheet('one\ttwo\nthree\tfour').error ?? '', /No zone columns/);
});

test('planZoneFiling sends each row to the level its context names', () => {
  const rows = parseStandingsZoneSheet(SHEET).rows;

  const plan = planZoneFiling(rows, {
    tabStageNames: ['Group Stage', 'Semi Finals'],
    tabGroupNames: { 'Group Stage': ['Group A', 'Group B'] },
    configStageNames: [],
  });

  assert.equal(plan.defaultRows.length, 0);
  assert.equal(plan.unmatched.length, 0);

  const groupStage = plan.tabTargets.find((target) => target.stageName === 'Group Stage');
  assert.equal(groupStage?.rows.length, 0);
  assert.deepEqual(groupStage?.groups.map((group) => [group.groupName, group.rows.length]), [
    ['Group A', 1],
    ['Group B', 1],
  ]);

  const semiFinals = plan.tabTargets.find((target) => target.stageName === 'Semi Finals');
  assert.equal(semiFinals?.rows.length, 2);
  assert.equal(semiFinals?.groups.length, 0);
});

test('planZoneFiling sends a blank stage to the default list', () => {
  const sheet = ['Stage\tRank\tLabel', '\t1\tChampion', '\t2-3\tPodium'].join('\n');

  const plan = planZoneFiling(parseStandingsZoneSheet(sheet).rows, {
    tabStageNames: [],
    tabGroupNames: {},
    configStageNames: [],
  });

  assert.equal(plan.defaultRows.length, 2);
});

test('planZoneFiling falls back to the flat per-stage config when a stage has no tab', () => {
  const sheet = ['Stage\tRank\tLabel', 'Grand Finals\t1\tChampion'].join('\n');

  const plan = planZoneFiling(parseStandingsZoneSheet(sheet).rows, {
    tabStageNames: [],
    tabGroupNames: {},
    configStageNames: ['Grand Finals'],
  });

  assert.deepEqual(plan.stageConfigTargets.map((target) => target.stageName), ['Grand Finals']);
  assert.equal(plan.unmatched.length, 0);
});

test('planZoneFiling reports a group the tab does not have rather than inventing it', () => {
  const sheet = ['Stage\tGroup\tRank\tLabel', 'Group Stage\tGroup Q\t1\tTypo'].join('\n');

  const plan = planZoneFiling(parseStandingsZoneSheet(sheet).rows, {
    tabStageNames: ['Group Stage'],
    tabGroupNames: { 'Group Stage': ['Group A', 'Group B'] },
    configStageNames: [],
  });

  assert.equal(plan.unmatched.length, 1);
  assert.equal(plan.tabTargets[0].groups.length, 0);
});
