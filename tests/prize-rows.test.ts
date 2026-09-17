import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyPrizeRow,
  isPlacementLabel,
  parseRankRange,
  prizeRowRange,
  rankLabel,
} from '../lib/prize-rows';

describe('parseRankRange', () => {
  it('reads every shape the free-text rank field has held', () => {
    assert.deepEqual(parseRankRange('3'), { from: 3, to: 3 });
    assert.deepEqual(parseRankRange('1st'), { from: 1, to: 1 });
    assert.deepEqual(parseRankRange('21th Place'), { from: 21, to: 21 });
    assert.deepEqual(parseRankRange('Rank 4'), { from: 4, to: 4 });
    assert.deepEqual(parseRankRange('2nd position'), { from: 2, to: 2 });
    assert.deepEqual(parseRankRange('#5'), { from: 5, to: 5 });
    assert.deepEqual(parseRankRange(7), { from: 7, to: 7 });
  });

  it('reads a shared band as a range', () => {
    assert.deepEqual(parseRankRange('5th - 8th Place'), { from: 5, to: 8 });
    assert.deepEqual(parseRankRange('1st - 2nd'), { from: 1, to: 2 });
    assert.deepEqual(parseRankRange('1st to 2nd'), { from: 1, to: 2 });
    assert.deepEqual(parseRankRange('Top 4'), { from: 1, to: 4 });
    assert.deepEqual(parseRankRange('top 5-8'), { from: 5, to: 8 });
  });

  it('reads the wording the live data actually contains', () => {
    // Both of these are stored on real events and broke the stricter anchors.
    assert.deepEqual(parseRankRange('1st Place (Champion)'), { from: 1, to: 1 });
    assert.deepEqual(parseRankRange('Top 6 teams'), { from: 1, to: 6 });
  });

  it('does not read a leading year as a rank', () => {
    // Allowing trailing wording must not let "2026 Season" become rank 2026: an
    // ordinal or the word place/position has to be present.
    assert.equal(parseRankRange('2026 Season'), null);
    assert.equal(parseRankRange('Best 3'), null);
  });

  it('returns nothing for an honour, a blank, or nonsense', () => {
    for (const value of ['Best IGL', 'Tournament MVP', 'The Eliminator', '', '   ', null, undefined, {}]) {
      assert.equal(parseRankRange(value), null, `${String(value)} is not a finishing position`);
    }
  });

  it('rejects an impossible band rather than reversing it', () => {
    assert.equal(parseRankRange('8th - 5th'), null);
    assert.equal(parseRankRange('0'), null);
  });
});

describe('isPlacementLabel', () => {
  it('recognises the prize ladder, not the honours', () => {
    for (const label of ['1st Place', '21th Place', '3', 'Rank 4', '2nd position', '']) {
      assert.equal(isPlacementLabel(label), true, `${label} should read as a placement`);
    }
    for (const label of [
      'Best IGL',
      'MVP Event',
      'The Eliminator',
      'TVS Most Wicked Player',
      "Fan's Favourite Team",
    ]) {
      assert.equal(isPlacementLabel(label), false, `${label} should read as an award`);
    }
  });

  it('recognises a band as a placement — these used to leak into the awards cabinet', () => {
    assert.equal(isPlacementLabel('Top 4'), true);
    assert.equal(isPlacementLabel('5th - 8th'), true);
    assert.equal(isPlacementLabel('1st - 2nd'), true);
  });
});

describe('classifyPrizeRow', () => {
  it('lets the stored kind win over the label', () => {
    // An award may carry a numeric-looking label; the stored kind is the truth.
    assert.equal(classifyPrizeRow({ kind: 'AWARD', rank: '1' }), 'AWARD');
    assert.equal(classifyPrizeRow({ kind: 'PLACEMENT', rank: 'Best IGL' }), 'PLACEMENT');
  });

  it('treats an explicit from as a placement', () => {
    assert.equal(classifyPrizeRow({ from: 3 }), 'PLACEMENT');
    assert.equal(classifyPrizeRow({ rank: 'Prizes', from: 3, to: 8 }), 'PLACEMENT');
  });

  it('falls back to the label for rows written before kind existed', () => {
    assert.equal(classifyPrizeRow({ rank: '1st Place' }), 'PLACEMENT');
    assert.equal(classifyPrizeRow({ rank: 'Top 4' }), 'PLACEMENT');
    assert.equal(classifyPrizeRow({ rank: 'Best IGL' }), 'AWARD');
  });
});

describe('prizeRowRange', () => {
  it('is null for an award', () => {
    assert.equal(prizeRowRange({ kind: 'AWARD', rank: 'Best IGL' }), null);
  });

  it('prefers the numeric fields over the label', () => {
    assert.deepEqual(prizeRowRange({ from: 5, to: 8, rank: 'anything' }), { from: 5, to: 8 });
    // A missing or inverted `to` collapses to the single rank rather than a bad band.
    assert.deepEqual(prizeRowRange({ from: 5 }), { from: 5, to: 5 });
    assert.deepEqual(prizeRowRange({ from: 5, to: 2 }), { from: 5, to: 5 });
  });

  it('reads the range off the label when there are no numeric fields', () => {
    assert.deepEqual(prizeRowRange({ rank: '5th - 8th' }), { from: 5, to: 8 });
  });
});

describe('rankLabel', () => {
  it('writes a single rank, and a band when one is given', () => {
    assert.equal(rankLabel(1), '1st');
    assert.equal(rankLabel(2), '2nd');
    assert.equal(rankLabel(3), '3rd');
    assert.equal(rankLabel(11), '11th');
    assert.equal(rankLabel(21), '21st');
    assert.equal(rankLabel(5, 8), '5th - 8th');
    // A band equal to the single rank is just the single rank.
    assert.equal(rankLabel(5, 5), '5th');
  });
});
