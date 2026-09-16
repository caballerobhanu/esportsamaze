import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  averageRecorded,
  countFlagged,
  eliminations,
  maxRecorded,
  metricCoverage,
  shareRecorded,
  sumRecorded,
} from '../lib/player-stats';

/** A match-wise row; telemetry left null unless the test records it. */
interface TestRow {
  id?: string;
  playerElims: number;
  kills: number;
  damage: number | null;
  headshots: number | null;
  isMvp: boolean | null;
}

const row = (over: Partial<TestRow> = {}): TestRow => ({
  playerElims: 0,
  kills: 0,
  damage: null,
  headshots: null,
  isMvp: null,
  ...over,
});

describe('eliminations', () => {
  it('prefers whichever of playerElims or the legacy kills alias is larger', () => {
    assert.equal(eliminations({ playerElims: 5, kills: 0 }), 5);
    assert.equal(eliminations({ playerElims: 0, kills: 7 }), 7);
    assert.equal(eliminations({ playerElims: 3, kills: 3 }), 3);
  });

  it('handles nulls as zero', () => {
    assert.equal(eliminations({ playerElims: null, kills: null }), 0);
    assert.equal(eliminations({ playerElims: null, kills: 4 }), 4);
  });
});

describe('per-metric denominators', () => {
  it('averages only the rows that recorded the metric', () => {
    // The real case: BMPS records damage on every row, BGMS on none.
    const rows = [
      row({ damage: 400 }),
      row({ damage: 600 }),
      row({ damage: null }),
      row({ damage: null }),
    ];
    const average = averageRecorded(rows, (r) => r.damage);
    assert.equal(average.value, 500);
    assert.equal(average.samples, 2);
    assert.equal(average.total, 4);
  });

  it('reports null rather than zero when nothing recorded the metric', () => {
    const rows = [row({ damage: null }), row({ damage: null })];
    const average = averageRecorded(rows, (r) => r.damage);
    assert.equal(average.value, null);
    assert.equal(average.samples, 0);
  });

  it('keeps a genuine zero in the average and the denominator', () => {
    const rows = [row({ damage: 0 }), row({ damage: 100 })];
    const average = averageRecorded(rows, (r) => r.damage);
    assert.equal(average.value, 50);
    assert.equal(average.samples, 2);
  });

  it('sums only recorded values', () => {
    const rows = [row({ damage: 250 }), row({ damage: null }), row({ damage: 150 })];
    const total = sumRecorded(rows, (r) => r.damage);
    assert.equal(total.value, 400);
    assert.equal(total.samples, 2);
  });

  it('returns the row behind a career best', () => {
    const best = maxRecorded([row({ id: 'a', damage: 300 }), row({ id: 'b', damage: 900 })], (r) => r.damage);
    assert.equal(best.value, 900);
    assert.equal(best.row?.id, 'b');
    assert.equal(best.samples, 2);
  });

  it('counts a flagged metric only where the flag was recorded', () => {
    const rows = [row({ isMvp: true }), row({ isMvp: false }), row({ isMvp: null })];
    const mvps = countFlagged(rows, (r) => r.isMvp);
    assert.equal(mvps.value, 1);
    assert.equal(mvps.samples, 2);
  });

  it('measures a share over recorded rows only', () => {
    const rows = [row({ playerElims: 0 }), row({ playerElims: 4 }), row({ playerElims: 0 }), row({ playerElims: 9 })];
    const eggless = shareRecorded(rows, (r) => r.playerElims, (v) => v === 0);
    assert.equal(eggless.value, 0.5);
    assert.equal(eggless.samples, 4);
  });
});

describe('coverage reporting', () => {
  it('names which metrics an event actually recorded', () => {
    const rows = [
      row({ damage: 100, headshots: 1 }),
      row({ damage: 200, headshots: null }),
    ];
    const coverage = metricCoverage(rows, [
      { key: 'damage', label: 'Damage', pick: (r) => r.damage },
      { key: 'headshots', label: 'Headshots', pick: (r) => r.headshots },
    ]);
    assert.deepEqual(coverage, [
      { key: 'damage', label: 'Damage', samples: 2, total: 2 },
      { key: 'headshots', label: 'Headshots', samples: 1, total: 2 },
    ]);
  });
});
