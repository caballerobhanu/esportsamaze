import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  preferComputed,
  resolveEventTotals,
  resolveTotalsLadder,
  sliceKey,
  type ReportedTotalsRow,
} from '../lib/tournament-totals';

const row = (over: Partial<ReportedTotalsRow> & { scope: ReportedTotalsRow['scope'] }): ReportedTotalsRow => ({
  stageId: null,
  label: '',
  metrics: {},
  ...over,
});

const find = (rows: ReportedTotalsRow[], scope: string, stageId: string | null = null) =>
  resolveTotalsLadder(rows).find((slice) => slice.scope === scope && slice.stageId === stageId);

describe('sliceKey', () => {
  it('identifies each level without relying on a nullable stage id', () => {
    assert.equal(sliceKey({ scope: 'EVENT', stageId: null, label: '' }), 'EVENT');
    assert.equal(sliceKey({ scope: 'STAGE', stageId: 'st1', label: '' }), 'STAGE:st1');
    assert.equal(sliceKey({ scope: 'DAY', stageId: 'st1', label: 'Day 3' }), 'DAY:st1:day 3');
    assert.equal(sliceKey({ scope: 'DAY', stageId: null, label: 'Day 1' }), 'DAY:-:day 1');
  });
});

describe('resolveTotalsLadder', () => {
  it('sums day rows into their stage and the stages into the event', () => {
    const rows: ReportedTotalsRow[] = [
      row({ scope: 'DAY', stageId: 'st1', label: 'Day 1', metrics: { playerElims: 10, matches: 4 } }),
      row({ scope: 'DAY', stageId: 'st1', label: 'Day 2', metrics: { playerElims: 6, matches: 4 } }),
    ];

    const stage = find(rows, 'STAGE', 'st1');
    assert.equal(stage?.derived, true);
    assert.equal(stage?.metrics.playerElims.value, 16);
    assert.equal(stage?.metrics.playerElims.samples, 2);
    assert.equal(stage?.metrics.playerElims.total, 2);

    const event = find(rows, 'EVENT');
    assert.equal(event?.derived, true);
    assert.equal(event?.metrics.playerElims.value, 16);
    assert.equal(event?.metrics.matches.value, 8);
  });

  it('uses an entered stage row only when that stage has no day rows', () => {
    const rows: ReportedTotalsRow[] = [
      row({ scope: 'STAGE', stageId: 'finals', label: 'Grand Finals', metrics: { playerElims: 22 } }),
    ];
    const stage = find(rows, 'STAGE', 'finals');
    assert.equal(stage?.derived, false);
    assert.equal(stage?.metrics.playerElims.value, 22);
    assert.equal(find(rows, 'EVENT')?.metrics.playerElims.value, 22);
  });

  it('never sums a parent together with its own children', () => {
    // The conflict case: an event total entered alongside its stage rows. The
    // stages win, so the value is the sum of the stages, not stages + event.
    const rows: ReportedTotalsRow[] = [
      row({ scope: 'STAGE', stageId: 'st1', metrics: { playerElims: 10 } }),
      row({ scope: 'STAGE', stageId: 'st2', metrics: { playerElims: 5 } }),
      row({ scope: 'EVENT', metrics: { playerElims: 999 } }),
    ];
    const event = find(rows, 'EVENT');
    assert.equal(event?.derived, true);
    assert.equal(event?.metrics.playerElims.value, 15);
  });

  it('marks a metric partial when only some children recorded it', () => {
    const rows: ReportedTotalsRow[] = [
      row({ scope: 'DAY', stageId: 'st1', label: 'Day 1', metrics: { damage: 5000, playerElims: 8 } }),
      row({ scope: 'DAY', stageId: 'st1', label: 'Day 2', metrics: { damage: null, playerElims: 6 } }),
    ];
    const stage = find(rows, 'STAGE', 'st1');
    assert.equal(stage?.metrics.damage.value, 5000);
    assert.equal(stage?.metrics.damage.samples, 1);
    assert.equal(stage?.metrics.damage.total, 2);
    // The metric every child carried is complete.
    assert.equal(stage?.metrics.playerElims.samples, 2);
  });

  it('rolls stage-less day rows straight into the event', () => {
    const rows: ReportedTotalsRow[] = [
      row({ scope: 'DAY', stageId: null, label: 'Day 1', metrics: { playerElims: 4 } }),
      row({ scope: 'DAY', stageId: null, label: 'Day 2', metrics: { playerElims: 6 } }),
    ];
    assert.equal(find(rows, 'EVENT')?.metrics.playerElims.value, 10);
  });

  it('omits the event entirely when neither stages nor an event row exist', () => {
    assert.deepEqual(resolveTotalsLadder([]), []);
  });

  it('leaves an entered event row as the event when there are no stages', () => {
    const rows: ReportedTotalsRow[] = [row({ scope: 'EVENT', metrics: { playerElims: 42 } })];
    const event = find(rows, 'EVENT');
    assert.equal(event?.derived, false);
    assert.equal(event?.metrics.playerElims.value, 42);
  });
});

describe('resolveEventTotals', () => {
  it('resolves each event separately, keyed by tournament id', () => {
    const resolved = resolveEventTotals([
      { ...row({ scope: 'DAY', stageId: 's1', label: 'Day 1', metrics: { playerElims: 10 } }), tournamentId: 'ev1' },
      { ...row({ scope: 'DAY', stageId: 's1', label: 'Day 2', metrics: { playerElims: 6 } }), tournamentId: 'ev1' },
      { ...row({ scope: 'EVENT', metrics: { playerElims: 40 } }), tournamentId: 'ev2' },
    ]);

    assert.equal(resolved.get('ev1')?.metrics.playerElims.value, 16);
    assert.equal(resolved.get('ev1')?.derived, true);
    assert.equal(resolved.get('ev2')?.metrics.playerElims.value, 40);
    assert.equal(resolved.get('ev2')?.derived, false);
  });

  it('omits an event with no reported rows rather than reporting zero', () => {
    const resolved = resolveEventTotals([
      { ...row({ scope: 'EVENT', metrics: { playerElims: 12 } }), tournamentId: 'ev1' },
    ]);
    assert.equal(resolved.has('ev2'), false);
    assert.equal(resolved.size, 1);
  });
});

describe('preferComputed', () => {
  it('lets computed match data win over a reported total', () => {
    assert.equal(preferComputed(12, 99), 12);
  });

  it('falls back to the reported total when there is no computed value', () => {
    assert.equal(preferComputed(null, 99), 99);
    assert.equal(preferComputed(undefined, 99), 99);
  });

  it('returns null when neither source has a value', () => {
    assert.equal(preferComputed(null, null), null);
  });
});
