import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  eventMetricValue,
  mergeEventMetrics,
  PLAYER_METRIC_COLUMNS,
  TEAM_METRIC_COLUMNS,
  type EventMetricIdentity,
  type EventMetricRow,
  type MetricColumn,
} from '../lib/event-metrics';
import { resolveEventTotals } from '../lib/tournament-totals';

const damageColumn: MetricColumn = { key: 'damage', label: 'Damage', perGame: true };
const totalColumn: MetricColumn = { key: 'totalPoints', label: 'Total' };

const row = (over: Partial<EventMetricRow>): EventMetricRow => ({
  tournamentId: 't1',
  tournamentName: 'Event',
  tournamentShortName: null,
  tournamentSeries: null,
  tournamentSeason: null,
  tournamentSlug: 'event',
  startDateMs: null,
  level: 'MATCH',
  derived: false,
  partial: false,
  metrics: {},
  sources: {},
  coverage: {},
  ...over,
});

describe('eventMetricValue', () => {
  it('leaves a scoring column as the plain total', () => {
    const r = row({ metrics: { totalPoints: 1200 } });
    assert.equal(eventMetricValue(r, totalColumn), 1200);
  });

  it('averages a scorecard metric over the games that recorded it', () => {
    const r = row({
      metrics: { damage: 1200 },
      sources: { damage: 'MATCH' },
      coverage: { damage: { samples: 4, total: 6 } },
    });
    assert.equal(eventMetricValue(r, damageColumn), 300);
  });

  it('returns nothing when a scorecard metric was recorded in no games', () => {
    const r = row({
      metrics: { damage: 1200 },
      sources: { damage: 'MATCH' },
      coverage: { damage: { samples: 0, total: 6 } },
    });
    assert.equal(eventMetricValue(r, damageColumn), null);
  });

  it('averages a reported metric over the reported match count', () => {
    const r = row({
      metrics: { damage: 1200 },
      sources: { damage: 'DAY' },
      reportedMatches: 3,
      level: 'DAY',
    });
    assert.equal(eventMetricValue(r, damageColumn), 400);
  });

  it('falls back to the row’s own match count for a reported metric', () => {
    const r = row({
      metrics: { damage: 1200, matches: 3 },
      sources: { damage: 'EVENT' },
      level: 'EVENT',
    });
    assert.equal(eventMetricValue(r, damageColumn), 400);
  });

  it('returns nothing for a reported metric with no match count to divide by', () => {
    const r = row({ metrics: { damage: 1200 }, sources: { damage: 'EVENT' }, level: 'EVENT' });
    assert.equal(eventMetricValue(r, damageColumn), null);
  });

  it('returns nothing when the metric was never recorded', () => {
    const r = row({ metrics: { damage: null }, sources: { damage: 'MATCH' } });
    assert.equal(eventMetricValue(r, damageColumn), null);
  });
});

describe('metric column lists', () => {
  const perGameKeys = (columns: readonly MetricColumn[]) =>
    columns.filter((column) => column.perGame).map((column) => column.key).sort();

  const TELEMETRY = ['assists', 'damage', 'grenadeElims', 'knockouts', 'survivalTime', 'utilitiesTotal'];

  it('marks the six telemetry columns per game on the player table', () => {
    assert.deepEqual(perGameKeys(PLAYER_METRIC_COLUMNS), TELEMETRY);
  });

  it('marks the six telemetry columns per game on the team table', () => {
    assert.deepEqual(perGameKeys(TEAM_METRIC_COLUMNS), TELEMETRY);
  });

  it('leaves scoring as totals on the team table', () => {
    for (const key of ['placement', 'matches', 'wwcd', 'placePoints', 'elimsPoints', 'bonusPoints', 'totalPoints']) {
      const column = TEAM_METRIC_COLUMNS.find((c) => c.key === key);
      assert.equal(column?.perGame ?? false, false, `${key} should stay a total`);
    }
  });
});

describe('mergeEventMetrics reported matches', () => {
  it('exposes the reported match count so a reported-only row can be averaged', () => {
    const ladder = resolveEventTotals([
      { tournamentId: 't1', scope: 'EVENT', stageId: null, label: '', metrics: { matches: 4, damage: 1600 } },
    ]);
    const identity: EventMetricIdentity = {
      tournamentId: 't1',
      tournamentName: 'Event',
      tournamentShortName: null,
      tournamentSeries: null,
      tournamentSeason: null,
      tournamentSlug: 'event',
      startDateMs: null,
    };

    const rows = mergeEventMetrics({
      matchAggregates: new Map(),
      ladder,
      identityFor: () => identity,
      basicKeys: [],
      columns: TEAM_METRIC_COLUMNS,
    });

    assert.equal(rows.length, 1);
    assert.equal(rows[0].reportedMatches, 4);
    assert.equal(eventMetricValue(rows[0], damageColumn), 400);
  });
});
