import test from 'node:test';
import assert from 'node:assert/strict';

import { playerHref, teamHref, tournamentHref } from '../lib/entity-links';

/*
 * A team resolves by slug, tag, name, displayName or id (TEAM_LOOKUP in
 * lib/team-data.ts); a player by slug, IGN or id (app/(public)/[game]/players/[slug]).
 * These cases pin the rules the helpers enforce: never build a key the route
 * cannot resolve — a name lowercased and hyphenated matches none of them and
 * lands on a 404 — and always carry the game segment the route now requires,
 * reading it from the entity when it has one and falling back to the default
 * game otherwise.
 */

test('teamHref prefers the stored slug so look-alike URLs consolidate', () => {
  assert.equal(
    teamHref({ slug: 'godlike', tag: 'GOD', name: 'Godlike Esports', id: 'c1' }),
    '/bgmi/teams/godlike'
  );
});

test('teamHref falls back to keys the route actually resolves', () => {
  assert.equal(teamHref({ tag: 'GOD', name: 'Godlike Esports', id: 'c1' }), '/bgmi/teams/GOD');
  assert.equal(teamHref({ name: 'Godlike Esports', id: 'c1' }), '/bgmi/teams/Godlike%20Esports');
  assert.equal(teamHref({ id: 'c1' }), '/bgmi/teams/c1');
});

test('teamHref never synthesises a hyphenated slug from the name', () => {
  assert.notEqual(teamHref({ name: 'Godlike Esports', id: 'c1' }), '/bgmi/teams/godlike-esports');
});

test('teamHref degrades to the directory when nothing identifies the team', () => {
  assert.equal(teamHref({}), '/bgmi/teams');
});

test('a link carries the entity’s own game, not the default', () => {
  assert.equal(
    teamHref({ slug: 'sentinels', game: { slug: 'valorant' } }),
    '/valorant/teams/sentinels'
  );
  assert.equal(
    playerHref({ slug: 'tenz', game: { slug: 'valorant' } }),
    '/valorant/players/tenz'
  );
});

test('playerHref prefers the slug, then the IGN, then the id', () => {
  assert.equal(playerHref({ slug: 'john', ign: 'JOHN', id: 'p1' }), '/bgmi/players/john');
  assert.equal(playerHref({ ign: 'JOHN', id: 'p1' }), '/bgmi/players/JOHN');
  assert.equal(playerHref({ id: 'p1' }), '/bgmi/players/p1');
  assert.equal(playerHref({}), '/bgmi/players');
});

test('tournamentHref appends a non-overview tab segment', () => {
  assert.equal(tournamentHref({ slug: 'bgis-2026' }), '/bgmi/tournaments/bgis-2026');
  assert.equal(
    tournamentHref({ slug: 'bgis-2026' }, 'standings'),
    '/bgmi/tournaments/bgis-2026/standings'
  );
  assert.equal(
    tournamentHref({ slug: 'bgis-2026' }, 'overview'),
    '/bgmi/tournaments/bgis-2026'
  );
});
