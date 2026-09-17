import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findLookAlike, meaningfulTokens } from '../lib/team-name-match';

/** Stands in for the importer's cleanStr: trimmed, lowercased, dashes to spaces. */
const normalise = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[\-_]/g, ' ');

const TEAMS = [
  { name: 'Myth Official' },
  { name: 'Team SouL' },
  { name: 'Team Tamilas' },
  { name: 'Elite Nova Esports' },
  { name: 'Iris Myth' },
];

test('a renamed org is recognised by the word it kept', () => {
  // The real case: BMPS stored "Myth Official", the next event's sheet said "Iris Myth",
  // and neither name contains the other, so nothing matched and a second team appeared.
  assert.equal(findLookAlike('Iris Myth', [{ name: 'Myth Official' }], normalise), 'Myth Official');
});

test('generic words alone are not a resemblance', () => {
  // "Team SouL" and "Team Tamilas" share "team" and are different orgs.
  assert.equal(findLookAlike('Team SouL', [{ name: 'Team Tamilas' }], normalise), null);
  assert.equal(findLookAlike('Nova Gaming', [{ name: 'Elite Nova Esports' }], normalise), 'Elite Nova Esports');
});

test('a name made only of generic words never matches', () => {
  assert.equal(findLookAlike('Esports Official', [{ name: 'Team SouL' }], normalise), null);
  assert.equal(findLookAlike('the and for', [{ name: 'Team SouL' }], normalise), null);
});

test('short fragments are ignored, so a stray two-letter token cannot match', () => {
  // "GG" as a token is generic anyway; this checks the length floor itself.
  assert.equal(meaningfulTokens('cb gg x').length, 0);
  assert.equal(findLookAlike('cb', [{ name: 'Cb Esports' }], normalise), null);
});

test('the first resembling team wins, and an unrelated name returns null', () => {
  assert.equal(findLookAlike('Iris Myth', TEAMS, normalise), 'Myth Official');
  assert.equal(findLookAlike('Quantum Sparks', TEAMS, normalise), null);
});

test('an empty name or an empty team list returns null rather than throwing', () => {
  assert.equal(findLookAlike('', TEAMS, normalise), null);
  assert.equal(findLookAlike('Myth', [], normalise), null);
});

test('tokens are case- and separator-insensitive', () => {
  assert.equal(findLookAlike('IRIS-MYTH', [{ name: 'MYTH_OFFICIAL' }], normalise), 'MYTH_OFFICIAL');
});
