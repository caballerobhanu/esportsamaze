import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SURFACE_LOGO_MODE, logoModesFromConfig } from '../lib/standings-config';

/** The shape stored in `Tournament.standingsConfig` — the choice sits one level down. */
const STORED_CONFIG = {
  showOverall: true,
  columns: ['mp', 'wwcd', 'place', 'elims', 'total', 'form'],
  logoModeBySurface: {
    overview: 'BOTH',
    standings: 'COUNTRY',
    matches: 'BOTH',
    teams: 'NONE',
    prizepool: 'TEAM',
    statistics: 'BOTH',
  },
};

test('it reads the per-surface choice out of the whole stored config', () => {
  assert.deepEqual(logoModesFromConfig(STORED_CONFIG), STORED_CONFIG.logoModeBySurface);
});

test('reading the config itself, rather than the nested choice, would report every tab as the default', () => {
  // The bug this guards: the admin form was handed the whole config, found no surface keys at
  // the top level, and so opened every dropdown on "Team logo only" whatever was stored — then
  // wrote those defaults back on the next save.
  const misread = logoModesFromConfig(STORED_CONFIG.logoModeBySurface);
  assert.equal(misread.standings, DEFAULT_SURFACE_LOGO_MODE);
  assert.notEqual(misread.standings, STORED_CONFIG.logoModeBySurface.standings);
});

test('a tournament that has never chosen one gets the default on every tab', () => {
  const modes = logoModesFromConfig({ showOverall: true });
  for (const value of Object.values(modes)) assert.equal(value, DEFAULT_SURFACE_LOGO_MODE);
});

test('a config that is missing, null or the wrong shape still yields a full set of defaults', () => {
  for (const absent of [undefined, null, '', 0, [], 'TEAM']) {
    const modes = logoModesFromConfig(absent);
    assert.deepEqual(Object.values(modes), Array(6).fill(DEFAULT_SURFACE_LOGO_MODE));
  }
});

test('an unrecognised value for one tab falls back without disturbing the others', () => {
  const modes = logoModesFromConfig({
    logoModeBySurface: { standings: 'FLAG', teams: 'BOTH', overview: 'COUNTRY' },
  });
  assert.equal(modes.standings, DEFAULT_SURFACE_LOGO_MODE);
  assert.equal(modes.teams, 'BOTH');
  assert.equal(modes.overview, 'COUNTRY');
});
