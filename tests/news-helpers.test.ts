import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCategoryHierarchy,
  formatCategoryDisplay,
  getCategoryMeta,
  computeReadTimeMinutes,
  computeWordCount,
} from '../lib/news';

describe('News Feature Helpers', () => {
  it('parses nested categories with > and / delimiters', () => {
    assert.deepEqual(parseCategoryHierarchy('BGMI > Rosters > Transfers'), ['BGMI', 'Rosters', 'Transfers']);
    assert.deepEqual(parseCategoryHierarchy('Tournaments / International'), ['Tournaments', 'International']);
    assert.deepEqual(parseCategoryHierarchy('SingleCategory'), ['SingleCategory']);
  });

  it('formats category display cleanly', () => {
    assert.equal(formatCategoryDisplay('BGMI > Rosters'), 'BGMI › Rosters');
    assert.equal(formatCategoryDisplay('Tournaments / International'), 'Tournaments › International');
    assert.equal(formatCategoryDisplay('GENERAL'), 'GENERAL');
  });

  it('returns consistent category metadata and color palette', () => {
    const meta = getCategoryMeta('BGMI > Rosters');
    assert.equal(meta.label, 'BGMI › Rosters');
    assert.equal(meta.parts.length, 2);
    assert.ok(meta.color.includes('text-'));
  });

  it('computes realistic reading time and word counts', () => {
    const text200 = 'word '.repeat(200);
    assert.equal(computeWordCount(text200), 200);
    assert.equal(computeReadTimeMinutes(text200), 1);

    const text1000 = 'word '.repeat(1000);
    assert.equal(computeWordCount(text1000), 1000);
    assert.equal(computeReadTimeMinutes(text1000), 5);
  });
});
