import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideSlugRedirect, SLUG_ENTITY_PATH } from '../lib/slug-history';

test('a renamed entity redirects to its current slug', () => {
  // The motivating case: ScarryJod was /players/scarryjod-0000 before the
  // verification pass stripped the timestamp.
  assert.equal(decideSlugRedirect('scarryjod-0000', { slug: 'scarryjod-1214' }), 'scarryjod-1214');
});

test('a deleted entity resolves to null, so a correct 404 stays a 404', () => {
  // The opposite failure this guards against: 301ing a link to nothing.
  assert.equal(decideSlugRedirect('iris-myth', null), null);
});

test('no redirect when the requested slug already matches the live one', () => {
  assert.equal(decideSlugRedirect('myth-official', { slug: 'myth-official' }), null);
});

test('an entity with no slug set does not redirect', () => {
  assert.equal(decideSlugRedirect('ghost', { slug: null }), null);
});

test('each entity type maps to its public path prefix', () => {
  assert.equal(SLUG_ENTITY_PATH.player, '/players');
  assert.equal(SLUG_ENTITY_PATH.team, '/teams');
  assert.equal(SLUG_ENTITY_PATH.tournament, '/tournaments');
});
