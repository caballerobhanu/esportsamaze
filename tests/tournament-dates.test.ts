import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTournamentDates } from '../lib/tournament-dates';
import { fMonthStart, fMonthEnd } from '../lib/admin-forms';

test('day precision keeps the exact date range', () => {
  assert.equal(
    formatTournamentDates('2026-11-14T00:00:00.000Z', '2026-12-06T00:00:00.000Z', 'DAY'),
    'Nov 14, 2026 – Dec 6, 2026'
  );
  // Rows written before the column existed carry no precision and must read as exact.
  assert.equal(
    formatTournamentDates('2026-11-14T00:00:00.000Z', '2026-12-06T00:00:00.000Z'),
    'Nov 14, 2026 – Dec 6, 2026'
  );
});

test('month precision reads as month-year, not invented days', () => {
  // How a month-only range is stored: 1st of the start month → last day of the end month.
  assert.equal(
    formatTournamentDates('2026-11-01T00:00:00.000Z', '2026-12-31T00:00:00.000Z', 'MONTH'),
    'Nov – Dec 2026'
  );
});

test('a single-month event collapses to one label', () => {
  assert.equal(
    formatTournamentDates('2026-11-01T00:00:00.000Z', '2026-11-30T00:00:00.000Z', 'MONTH'),
    'Nov 2026'
  );
});

test('a range spanning a year boundary keeps both years', () => {
  assert.equal(
    formatTournamentDates('2026-11-01T00:00:00.000Z', '2027-01-31T00:00:00.000Z', 'MONTH'),
    'Nov 2026 – Jan 2027'
  );
});

test('month fields map to the first and last day of their months', () => {
  const start = new FormData();
  start.set('startMonth', '2026-11');
  assert.equal(fMonthStart(start, 'startMonth')?.toISOString(), '2026-11-01T00:00:00.000Z');

  const end = new FormData();
  end.set('endMonth', '2026-12');
  assert.equal(fMonthEnd(end, 'endMonth')?.toISOString(), '2026-12-31T00:00:00.000Z');

  // A leap February ends on the 29th.
  const leap = new FormData();
  leap.set('endMonth', '2028-02');
  assert.equal(fMonthEnd(leap, 'endMonth')?.toISOString(), '2028-02-29T00:00:00.000Z');
});

test('a malformed month is rejected rather than guessed', () => {
  const bad = new FormData();
  bad.set('startMonth', '2026-13');
  assert.equal(fMonthStart(bad, 'startMonth'), null);

  const empty = new FormData();
  assert.equal(fMonthEnd(empty, 'endMonth'), null);
});
