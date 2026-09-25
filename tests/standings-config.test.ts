import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SURFACE_LOGO_MODE,
  latestPlayedStageName,
  logoModesFromConfig,
  navEntryForStage,
} from '../lib/standings-config';

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

/* ── which tab opens ── */

/** Matches in schedule order, the way the standings tab receives them. */
const played = (stageName: string) => ({ stageName, results: [{}] });
const unplayed = (stageName: string) => ({ stageName, results: [] as unknown[] });

test('the surface opens on the latest stage that has actually been played', () => {
  // The bug this guards: opening on the last stage on the schedule (or the first
  // configured tab) meant the standings tab could land on a stage with nothing in
  // it while the matches tab was already sitting on the stage being played.
  assert.equal(
    latestPlayedStageName([played('Week 1'), played('Week 2'), unplayed('Grand Finals')]),
    'Week 2'
  );
});

test('nothing played yields no anchor, rather than the last stage on the schedule', () => {
  assert.equal(latestPlayedStageName([unplayed('Week 1'), unplayed('Week 2')]), null);
  assert.equal(latestPlayedStageName([]), null);
});

test('the played stage is found in its own group, not in the first one', () => {
  const config = {
    tabGroups: [
      {
        id: 'g1',
        name: 'League Weeks',
        items: [{ id: 'i1', type: 'STAGE' as const, label: 'Week 1', stageName: 'Week 1' }],
      },
      {
        id: 'g2',
        name: 'Weekends',
        items: [{ id: 'i2', type: 'STAGE' as const, label: 'Week 2', stageName: 'Week 2' }],
      },
    ],
  };
  assert.deepEqual(navEntryForStage(config, 'Week 2'), { groupId: 'g2', itemId: 'i2' });
});

test('an item with no stageName still names its stage by its label', () => {
  const config = {
    tabGroups: [
      { id: 'g1', name: 'Weeks', items: [{ id: 'i1', type: 'STAGE' as const, label: 'Week 1' }] },
    ],
  };
  assert.deepEqual(navEntryForStage(config, 'Week 1'), { groupId: 'g1', itemId: 'i1' });
});

test('a custom tab counts when it covers the stage', () => {
  const inGroup = {
    tabGroups: [
      {
        id: 'g1',
        name: 'Playoffs',
        items: [
          {
            id: 'i1',
            type: 'CUSTOM_TAB' as const,
            label: 'Finals',
            includeStages: ['Semi Finals', 'Grand Finals'],
          },
        ],
      },
    ],
  };
  assert.deepEqual(navEntryForStage(inGroup, 'Grand Finals'), { groupId: 'g1', itemId: 'i1' });

  const standalone = {
    customTabs: [{ id: 't1', label: 'Finals', includeStages: ['Grand Finals'] }],
  };
  assert.deepEqual(navEntryForStage(standalone, 'Grand Finals'), { groupId: null, itemId: 't1' });
});

test('an overall tab is never taken for the stage it happens to be named after', () => {
  const config = {
    tabGroups: [
      {
        id: 'g1',
        name: 'Weeks',
        items: [{ id: 'i1', type: 'OVERALL' as const, label: 'Week 1', stageName: 'Week 1' }],
      },
    ],
  };
  assert.equal(navEntryForStage(config, 'Week 1'), null);
});

test('a stage the config never mentions resolves to nothing, so the caller keeps its own default', () => {
  assert.equal(navEntryForStage({}, 'Week 3'), null);
  assert.equal(navEntryForStage({ tabGroups: [], customTabs: [] }, 'Week 3'), null);
});
