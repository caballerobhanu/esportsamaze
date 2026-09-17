import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  groupRankingKey,
  pendingSeatKey,
  pendingSeatLabel,
  resolvePendingTeamId,
} from '../lib/stage-groups';

const WEEK_ONE_GROUPS: Record<string, string[]> = {
  [groupRankingKey('Super Weekend 1', 'Group A')]: ['soul', 'godlike', 'team-x'],
  [groupRankingKey('Super Weekend 1', 'Group C')]: ['orangutan', 'nebula'],
  // A single-lobby source stage keys on an empty group.
  [groupRankingKey('Super Weekend 1', null)]: ['soul', 'orangutan'],
};

test('the label names the group and the finishing position', () => {
  assert.equal(pendingSeatLabel({ stage: 'Super Weekend 1', group: 'Group A', rank: 1 }), 'Group A #1');
  assert.equal(pendingSeatLabel({ stage: 'Super Weekend 1', group: 'Group C', rank: 2 }), 'Group C #2');
});

test('a single-lobby source names the stage instead of a group', () => {
  assert.equal(pendingSeatLabel({ stage: 'Super Weekend 1', group: null, rank: 3 }), 'Super Weekend 1 #3');
  assert.equal(pendingSeatLabel({ stage: 'Super Weekend 1', group: '  ', rank: 3 }), 'Super Weekend 1 #3');
});

test('an unfinished slot says Pending rather than an empty label', () => {
  assert.equal(pendingSeatLabel({ stage: '', group: null, rank: 1 }), 'Pending');
});

test('the ranking key ignores case and padding, so names need not match exactly', () => {
  assert.equal(groupRankingKey('Super Weekend 1', 'Group A'), groupRankingKey('  super weekend 1 ', 'group a'));
  assert.equal(groupRankingKey('Week 1'), groupRankingKey('week 1', null));
  assert.equal(groupRankingKey('Week 1'), groupRankingKey('week 1', ''));
});

test('a source key is stable and distinguishes each dimension', () => {
  const base = pendingSeatKey({ stage: 'Week 1', group: 'Group A', rank: 1 });
  assert.equal(base, pendingSeatKey({ stage: ' week 1 ', group: 'group a', rank: 1 }));
  assert.notEqual(base, pendingSeatKey({ stage: 'Week 1', group: 'Group A', rank: 2 }));
  assert.notEqual(base, pendingSeatKey({ stage: 'Week 1', group: 'Group B', rank: 1 }));
  assert.notEqual(base, pendingSeatKey({ stage: 'Week 2', group: 'Group A', rank: 1 }));
});

test('a slot resolves to the team that finished in that position', () => {
  assert.equal(
    resolvePendingTeamId({ stage: 'Super Weekend 1', group: 'Group A', rank: 1 }, WEEK_ONE_GROUPS),
    'soul'
  );
  assert.equal(
    resolvePendingTeamId({ stage: 'Super Weekend 1', group: 'Group A', rank: 3 }, WEEK_ONE_GROUPS),
    'team-x'
  );
  assert.equal(
    resolvePendingTeamId({ stage: 'Super Weekend 1', group: 'Group C', rank: 2 }, WEEK_ONE_GROUPS),
    'nebula'
  );
});

test('a slot whose stage has no results stays unresolved', () => {
  assert.equal(
    resolvePendingTeamId({ stage: 'Super Weekend 2', group: 'Group A', rank: 1 }, WEEK_ONE_GROUPS),
    null
  );
});

test('a rank past the end of the table resolves to nothing rather than a wrong team', () => {
  assert.equal(
    resolvePendingTeamId({ stage: 'Super Weekend 1', group: 'Group C', rank: 9 }, WEEK_ONE_GROUPS),
    null
  );
});

test('a rank below 1 is never treated as a position', () => {
  // Guards a half-filled form: "#0" must not silently become the winner.
  assert.equal(resolvePendingTeamId({ stage: 'Super Weekend 1', group: 'Group A', rank: 0 }, WEEK_ONE_GROUPS), null);
  assert.equal(resolvePendingTeamId({ stage: 'Super Weekend 1', group: 'Group A', rank: -1 }, WEEK_ONE_GROUPS), null);
  assert.equal(resolvePendingTeamId({ stage: 'Super Weekend 1', group: 'Group A', rank: NaN }, WEEK_ONE_GROUPS), null);
});

test('a missing source resolves to nothing', () => {
  assert.equal(resolvePendingTeamId(null, WEEK_ONE_GROUPS), null);
  assert.equal(resolvePendingTeamId(undefined, WEEK_ONE_GROUPS), null);
});

test('resolution tolerates a differently-cased stage and group name', () => {
  assert.equal(
    resolvePendingTeamId({ stage: 'super weekend 1', group: 'GROUP A', rank: 2 }, WEEK_ONE_GROUPS),
    'godlike'
  );
});
