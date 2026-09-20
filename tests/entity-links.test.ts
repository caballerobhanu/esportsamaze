import test from 'node:test';
import assert from 'node:assert/strict';

import { playerHref, teamHref } from '../lib/entity-links';

/*
 * A team resolves by slug, tag, name, displayName or id (TEAM_LOOKUP in
 * lib/team-data.ts); a player by slug, IGN or id (app/(public)/players/[slug]).
 * These cases pin the rule the helpers enforce: never build a key the route
 * cannot resolve — a name lowercased and hyphenated matches none of them and
 * lands on a 404.
 */

test('teamHref prefers the stored slug so look-alike URLs consolidate', () => {
  assert.equal(
    teamHref({ slug: 'godlike', tag: 'GOD', name: 'Godlike Esports', id: 'c1' }),
    '/teams/godlike'
  );
});

test('teamHref falls back to keys the route actually resolves', () => {
  assert.equal(teamHref({ tag: 'GOD', name: 'Godlike Esports', id: 'c1' }), '/teams/GOD');
  assert.equal(teamHref({ name: 'Godlike Esports', id: 'c1' }), '/teams/Godlike%20Esports');
  assert.equal(teamHref({ id: 'c1' }), '/teams/c1');
});

test('teamHref never synthesises a hyphenated slug from the name', () => {
  assert.notEqual(teamHref({ name: 'Godlike Esports', id: 'c1' }), '/teams/godlike-esports');
});

test('teamHref degrades to the directory when nothing identifies the team', () => {
  assert.equal(teamHref({}), '/teams');
});

test('playerHref prefers the slug, then the IGN, then the id', () => {
  assert.equal(playerHref({ slug: 'john', ign: 'JOHN', id: 'p1' }), '/players/john');
  assert.equal(playerHref({ ign: 'JOHN', id: 'p1' }), '/players/JOHN');
  assert.equal(playerHref({ id: 'p1' }), '/players/p1');
  assert.equal(playerHref({}), '/players');
});
