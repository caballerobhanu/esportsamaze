import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Prisma } from '@prisma/client';
import { buildPublicWhere } from '../lib/news-queries';

const groupsOf = (where: Prisma.ArticleWhereInput) =>
  (where.AND ?? []) as Prisma.ArticleWhereInput[];

describe('buildPublicWhere', () => {
  it('filters nothing when no category is asked for', () => {
    assert.equal(buildPublicWhere({}).AND, undefined);
    assert.equal(buildPublicWhere({ category: 'ALL' }).AND, undefined);
    assert.equal(buildPublicWhere({ category: [] }).AND, undefined);
  });

  it('matches a category as the primary one or as any of the secondaries', () => {
    assert.deepEqual(buildPublicWhere({ category: 'BGMI' }).AND, [
      { OR: [{ category: { in: ['BGMI'] } }, { categories: { hasSome: ['BGMI'] } }] },
    ]);
  });

  it('passes a whole set of categories through, so a parent can be queried in one go', () => {
    assert.deepEqual(buildPublicWhere({ category: ['BGMI', 'BGMI > Rosters'] }).AND, [
      {
        OR: [
          { category: { in: ['BGMI', 'BGMI > Rosters'] } },
          { categories: { hasSome: ['BGMI', 'BGMI > Rosters'] } },
        ],
      },
    ]);
  });

  it('keeps a search filter alongside a category filter instead of overwriting it', () => {
    // Both build an OR group, so they have to be collected under AND. Writing
    // them as sibling keys would silently drop one of the two.
    const groups = groupsOf(buildPublicWhere({ category: 'BGMI', q: 'nebula' }));
    assert.equal(groups.length, 2);
    assert.deepEqual(groups[0], {
      OR: [{ category: { in: ['BGMI'] } }, { categories: { hasSome: ['BGMI'] } }],
    });
    assert.deepEqual(groups[1], {
      OR: [
        { title: { contains: 'nebula', mode: 'insensitive' } },
        { excerpt: { contains: 'nebula', mode: 'insensitive' } },
        { authorName: { contains: 'nebula', mode: 'insensitive' } },
        { tags: { has: 'nebula' } },
      ],
    });
  });

  it('keeps a tag filter beside the category filter', () => {
    const where = buildPublicWhere({ category: 'BGMI', tag: 'bgmi' });
    assert.deepEqual(where.tags, { has: 'bgmi' });
    assert.equal(groupsOf(where).length, 1);
  });

  it('always hides deleted and unpublished articles', () => {
    const where = buildPublicWhere({ category: 'BGMI' });
    assert.equal(where.deletedAt, null);

    const visibility = where.OR as Prisma.ArticleWhereInput[];
    assert.equal(visibility.length, 2);
    assert.equal(visibility[0].status, 'PUBLISHED');
    assert.equal(visibility[1].status, 'SCHEDULED');
    assert.ok(visibility[1].publishedAt, 'a scheduled article is only visible once its time passes');
  });
});
