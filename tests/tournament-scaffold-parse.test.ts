import test from 'node:test';
import assert from 'node:assert/strict';
import {
  groupPrizeRowsByStage,
  parsePrizeSheet,
  parseQualificationSheet,
  parseRankSlot,
  parseStageSheet,
} from '../lib/tournament-scaffold-parse';

test('parseStageSheet reads a header-named stage sheet', () => {
  const sheet = [
    'Stage\tFormat\tStructure\tStart Date\tEnd Date\tMatches Per Day\tTeams',
    'Group Stage\tBattle Royale Points Table\tGROUPS_WISE\t2026-03-01\t2026-03-05\t6\t64',
    'Grand Finals\tBattle Royale Points Table\tPLAYOFFS\t2026-03-14\t2026-03-16\t5\t16',
  ].join('\n');

  const result = parseStageSheet(sheet);

  assert.equal(result.error, null);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].name, 'Group Stage');
  assert.equal(result.rows[0].startDate, '2026-03-01');
  assert.equal(result.rows[0].matchesPerDay, 6);
  assert.equal(result.rows[0].teamsCount, 64);
  assert.equal(result.rows[1].name, 'Grand Finals');
  assert.equal(result.rows[1].endDate, '2026-03-16');
});

test('parseStageSheet reports the headers it did not recognise', () => {
  const sheet = ['Stage\tWibble\tMatches Per Day', 'Group Stage\tx\t6'].join('\n');

  const result = parseStageSheet(sheet);

  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.unrecognisedHeaders, ['Wibble']);
});

test('parseStageSheet refuses a paste with no recognisable header', () => {
  const result = parseStageSheet('one\ttwo\nthree\tfour');

  assert.equal(result.rows.length, 0);
  assert.match(result.error ?? '', /No stage columns/);
});

test('parseRankSlot reads the shapes a sheet actually uses', () => {
  assert.deepEqual(parseRankSlot('1'), { from: 1, to: undefined });
  assert.deepEqual(parseRankSlot('1-4'), { from: 1, to: 4 });
  assert.deepEqual(parseRankSlot('5th - 8th'), { from: 5, to: 8 });
  assert.deepEqual(parseRankSlot(''), {});
});

test('parsePrizeSheet reads a ladder and keeps the stage name per row', () => {
  const sheet = [
    'Stage\tRank\tAmount\tPercentage\tQualification',
    'Grand Finals\t1\t5,00,000\t40\tPMGC 2025; EWC 2025',
    'Grand Finals\t2 - 4\t2,00,000\t20\t',
    'Semis\t1\t50,000\t\t',
  ].join('\n');

  const result = parsePrizeSheet(sheet);

  assert.equal(result.error, null);
  assert.equal(result.rows.length, 3);
  assert.equal(result.rows[0].stageName, 'Grand Finals');
  assert.equal(result.rows[0].prize, 500000);
  assert.equal(result.rows[0].percentage, 40);
  assert.deepEqual(result.rows[0].qualifications, ['PMGC 2025', 'EWC 2025']);
  assert.equal(result.rows[1].from, 2);
  assert.equal(result.rows[1].to, 4);
  assert.equal(result.rows[1].rank, '2 - 4');
  assert.equal(result.rows[2].stageName, 'Semis');
  assert.equal(result.rows[2].qualifications, undefined);
});

test('groupPrizeRowsByStage nests the rows the way the editor stores them', () => {
  const sheet = ['Stage\tRank\tAmount', 'GF\t1\t100', 'Semis\t1\t10', 'GF\t2\t50'].join('\n');

  const grouped = groupPrizeRowsByStage(parsePrizeSheet(sheet).rows);

  assert.deepEqual(grouped.map((stage) => stage.stageName), ['GF', 'Semis']);
  assert.equal(grouped[0].ranks.length, 2);
  assert.equal(grouped[1].ranks.length, 1);
});

test('parseQualificationSheet derives the range from a label when there are no columns for it', () => {
  const sheet = ['Label\tTargets', '5th - 8th\tPMGC 2025, EWC 2025', 'Tied last\t'].join('\n');

  const result = parseQualificationSheet(sheet);

  // The second row has no range and no target, so it says nothing and is dropped.
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].from, 5);
  assert.equal(result.rows[0].to, 8);
  assert.deepEqual(result.rows[0].targets, [{ name: 'PMGC 2025' }, { name: 'EWC 2025' }]);
});

test('parseQualificationSheet keeps an explicit range and a note', () => {
  const sheet = ['From\tTo\tTargets\tNote', '1\t4\tGrand Finals\tTop four advance'].join('\n');

  const result = parseQualificationSheet(sheet);

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].from, 1);
  assert.equal(result.rows[0].to, 4);
  assert.equal(result.rows[0].note, 'Top four advance');
  assert.deepEqual(result.rows[0].targets, [{ name: 'Grand Finals' }]);
});
