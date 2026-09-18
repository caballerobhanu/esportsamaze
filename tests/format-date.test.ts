import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, formatShortDate } from '../lib/utils';

/** Stored date-only values are UTC midnight, which is what these fixtures mirror. */
const UTC_MIDNIGHT = '2025-05-03T00:00:00.000Z';

test('the short form is month and day, with no year', () => {
  assert.equal(formatShortDate(UTC_MIDNIGHT), 'May 3');
  assert.equal(formatShortDate('2025-12-31T00:00:00.000Z'), 'Dec 31');
  assert.equal(formatShortDate('2025-01-01T00:00:00.000Z'), 'Jan 1');
});

test('it is pinned to UTC, so a UTC-midnight date is not shown as the day before', () => {
  // The reason the pin exists: west of Greenwich this instant is still 2 May.
  const unpinned = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York',
  }).format(new Date(UTC_MIDNIGHT));
  assert.equal(unpinned, 'May 2');

  // The helper must not have that problem, whatever the machine's own zone is.
  assert.equal(formatShortDate(UTC_MIDNIGHT), 'May 3');
  assert.equal(formatDate(UTC_MIDNIGHT), 'May 3, 2025');
});

test('it accepts a Date as well as a string', () => {
  assert.equal(formatShortDate(new Date(UTC_MIDNIGHT)), 'May 3');
});

test('the long form keeps its year, so the two cannot be confused', () => {
  assert.equal(formatDate(UTC_MIDNIGHT), 'May 3, 2025');
  assert.equal(formatShortDate(UTC_MIDNIGHT), 'May 3');
});
