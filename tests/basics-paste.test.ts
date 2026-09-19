import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBasicsSheet } from '../lib/basics-paste';

test('parseBasicsSheet reads field/value pairs separated by a tab', () => {
  const res = parseBasicsSheet('Tournament Name\tBGIS 2026\nTier\tS-Tier\nWebsite\thttps://example.com');

  assert.equal(res.error, null);
  assert.deepEqual(
    res.rows.map((row) => [row.field, row.value]),
    [
      ['name', 'BGIS 2026'],
      ['tier', 'S-Tier'],
      ['website', 'https://example.com'],
    ],
  );
});

test('parseBasicsSheet accepts a colon or equals separator, including for a URL value', () => {
  const res = parseBasicsSheet('Tournament Name: BGIS 2026\nSlug=bgis-2026\nInstagram: https://instagram.com/x');

  assert.deepEqual(
    res.rows.map((row) => [row.field, row.value]),
    [
      ['name', 'BGIS 2026'],
      ['slug', 'bgis-2026'],
      ['instagram', 'https://instagram.com/x'],
    ],
  );
});

test('parseBasicsSheet matches the canonical field name as well as the form label', () => {
  const res = parseBasicsSheet('shortName\tBGIS\ngameId\tBGMI');

  assert.deepEqual(
    res.rows.map((row) => row.field),
    ['shortName', 'gameId'],
  );
});

test('parseBasicsSheet names the columns it did not recognise', () => {
  const res = parseBasicsSheet('Wibble\t1\nnot a pair line\nTier\tS-Tier');

  assert.equal(res.rows.length, 1);
  assert.deepEqual(res.unrecognised, ['Wibble', 'not a pair line']);
});

test('parseBasicsSheet refuses an empty paste', () => {
  assert.match(parseBasicsSheet('   ').error ?? '', /Nothing to read/);
});

test('parseBasicsSheet refuses a paste where no field is known', () => {
  const res = parseBasicsSheet('Wibble\t1');

  assert.equal(res.rows.length, 0);
  assert.match(res.error ?? '', /No known fields/);
});
