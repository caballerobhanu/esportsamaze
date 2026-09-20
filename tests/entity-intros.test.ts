import test from 'node:test';
import assert from 'node:assert/strict';

import {
  playerHonoursIntro,
  playerResultsIntro,
  playerStatsIntro,
  teamRosterIntro,
  teamStatsIntro,
  teamTitlesIntro,
} from '../lib/entity-intros';

/*
 * The rule that matters: a tab with no real data gets null (nothing rendered),
 * and a tab with data gets a sentence built from its own numbers — so no two
 * tabs read the same.
 */

test('every builder returns null when there is nothing real to say', () => {
  assert.equal(teamStatsIntro({ name: 'X', matches: 0, wins: 0, topFive: 0, events: 0 }), null);
  assert.equal(teamTitlesIntro({ name: 'X', titles: 0, runnerUps: 0, awards: 0 }), null);
  assert.equal(teamRosterIntro({ name: 'X', players: 0, staff: 0, events: 0 }), null);
  assert.equal(playerStatsIntro({ ign: 'X', matches: 0, elims: 0, events: 0 }), null);
  assert.equal(playerResultsIntro({ ign: 'X', events: 0, reported: 0 }), null);
  assert.equal(playerHonoursIntro({ ign: 'X', entries: 0, events: 0 }), null);
});

test('the numbers actually appear in the sentence', () => {
  const stats = teamStatsIntro({ name: 'Godlike', matches: 42, wins: 3, topFive: 20, events: 2 });
  assert.ok(stats && stats.includes('42') && stats.includes('3') && stats.includes('20'));

  const player = playerStatsIntro({ ign: 'JONATHAN', matches: 7, elims: 61, events: 2 });
  assert.ok(player && player.includes('7') && player.includes('61'));
});

test('singular and plural read correctly', () => {
  const one = teamStatsIntro({ name: 'X', matches: 1, wins: 1, topFive: 1, events: 1 });
  assert.ok(one && one.includes('1 recorded match ') && one.includes('1 event'));
  assert.ok(one && !one.includes('matches'));

  const many = teamTitlesIntro({ name: 'X', titles: 2, runnerUps: 1, awards: 0 });
  assert.ok(many && many.includes('2 titles') && many.includes('1 runner-up finish'));
});

test('results intro names the reported-total share only when there is one', () => {
  const withReported = playerResultsIntro({ ign: 'X', events: 5, reported: 2 });
  assert.ok(withReported && withReported.includes('2 of them'));
  const without = playerResultsIntro({ ign: 'X', events: 5, reported: 0 });
  assert.ok(without && !without.includes('of them'));
});

test('two different tabs never produce the same sentence', () => {
  const stats = playerStatsIntro({ ign: 'A', matches: 10, elims: 40, events: 3 });
  const results = playerResultsIntro({ ign: 'A', events: 3, reported: 0 });
  assert.notEqual(stats, results);
});
