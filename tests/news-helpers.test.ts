import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCategoryHierarchy,
  formatCategoryDisplay,
  getCategoryMeta,
  categorySlug,
  categoryCrumbs,
  categoryPillLabel,
  rankedCategoryPills,
  resolveCategoryParam,
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

describe('Category slugs and nesting', () => {
  const KNOWN = ['TOURNAMENTS', 'ROSTERS', 'BGMI', 'BGMI > Rosters', 'BGMI > Tournaments'];

  it('slugs a category for the URL and keeps the predefined six stable', () => {
    assert.equal(categorySlug('TOURNAMENTS'), 'tournaments');
    assert.equal(categorySlug('BGMI > Rosters'), 'bgmi-rosters');
    assert.equal(categorySlug('Rosters & Transfers'), 'rosters-transfers');
    assert.equal(categorySlug('  BGMI  '), 'bgmi');
  });

  it('gives each crumb its cumulative slug, so a child is not read as a top-level name', () => {
    assert.deepEqual(categoryCrumbs('BGMI > Rosters'), [
      { name: 'BGMI', slug: 'bgmi' },
      { name: 'Rosters', slug: 'bgmi-rosters' },
    ]);
    assert.deepEqual(categoryCrumbs('GENERAL'), [{ name: 'GENERAL', slug: 'general' }]);
  });

  it('resolves a predefined category to itself', () => {
    const resolved = resolveCategoryParam('tournaments', KNOWN);
    assert.equal(resolved?.label, 'Tournaments & Matches');
    assert.deepEqual(resolved?.matches, ['TOURNAMENTS']);
  });

  it('resolves a nested child to that child alone', () => {
    const resolved = resolveCategoryParam('bgmi-rosters', KNOWN);
    assert.equal(resolved?.label, 'BGMI › Rosters');
    assert.deepEqual(resolved?.matches, ['BGMI > Rosters']);
  });

  it('rolls a parent up over its children, whether or not the parent holds articles itself', () => {
    const withParent = resolveCategoryParam('bgmi', KNOWN);
    assert.equal(withParent?.label, 'BGMI');
    assert.deepEqual(withParent?.matches, ['BGMI', 'BGMI > Rosters', 'BGMI > Tournaments']);

    // Nothing sits in a bare "BGMI" category here, but the parent page still exists.
    const parentOnly = resolveCategoryParam('bgmi', ['BGMI > Rosters']);
    assert.equal(parentOnly?.label, 'BGMI');
    assert.deepEqual(parentOnly?.matches, ['BGMI > Rosters']);
  });

  it('does not answer a nested part with a same-named top-level category', () => {
    // The old behaviour linked "Rosters" inside "BGMI > Rosters" at the
    // predefined ROSTERS category, which is a different set of articles.
    const resolved = resolveCategoryParam('rosters', ['ROSTERS', 'BGMI > Rosters']);
    assert.deepEqual(resolved?.matches, ['ROSTERS']);
  });

  it('is insensitive to case, spacing and which separator was typed', () => {
    assert.deepEqual(resolveCategoryParam('BGMI>Rosters', KNOWN)?.matches, ['BGMI > Rosters']);
    assert.deepEqual(resolveCategoryParam('  bgmi - rosters ', KNOWN)?.matches, ['BGMI > Rosters']);
  });

  it('returns null for a category the site has never used', () => {
    assert.equal(resolveCategoryParam('valorant', KNOWN), null);
    assert.equal(resolveCategoryParam('', KNOWN), null);
  });
});

describe('Category pills', () => {
  it('shortens the canonical six but keeps a custom name whole', () => {
    assert.equal(categoryPillLabel('TOURNAMENTS'), 'Tournaments');
    assert.equal(categoryPillLabel('ROSTERS'), 'Rosters');
    assert.equal(categoryPillLabel('tournaments'), 'Tournaments');
    assert.equal(categoryPillLabel('Esports'), 'Esports');

    // The active-pill fallback has a resolved label, not a stored value.
    assert.equal(categoryPillLabel('Community & Culture'), 'Community');

    // A nested child must not collapse onto its parent, or the two pills collide.
    assert.equal(categoryPillLabel('BGMI > Rosters'), 'BGMI › Rosters');
  });

  it('ranks by how much is published, custom categories alongside the canonical six', () => {
    const counts = new Map([
      ['TOURNAMENTS', 1],
      ['ANALYSIS', 4],
      ['Esports', 2],
    ]);

    assert.deepEqual(rankedCategoryPills(counts), [
      { label: 'Analysis', slug: 'analysis', count: 4 },
      { label: 'Esports', slug: 'esports', count: 2 },
      { label: 'Tournaments', slug: 'tournaments', count: 1 },
    ]);
  });

  it('breaks a tie on label, so the rail cannot reshuffle between renders', () => {
    const counts = new Map([
      ['ROSTERS', 2],
      ['ANALYSIS', 2],
    ]);

    assert.deepEqual(
      rankedCategoryPills(counts).map((pill) => pill.slug),
      ['analysis', 'rosters']
    );
  });

  it('caps the rail at the requested length', () => {
    const counts = new Map([
      ['A', 5],
      ['B', 4],
      ['C', 3],
    ]);

    assert.equal(rankedCategoryPills(counts, 2).length, 2);
  });
});
