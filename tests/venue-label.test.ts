import { test } from 'node:test';
import assert from 'node:assert/strict';
import { venueLabel, venueLine, venueLevel } from '../lib/venues';

test('a named stadium leads with its name, and keeps the city beneath it', () => {
  assert.deepEqual(venueLabel({ name: 'Yashobhoomi', city: 'New Delhi', country: 'India' }), {
    title: 'Yashobhoomi',
    subtitle: 'New Delhi',
  });
});

test('a city-only entry leads with the city, and its country beneath', () => {
  assert.deepEqual(venueLabel({ name: '', city: 'New Delhi', country: 'India' }), {
    title: 'New Delhi',
    subtitle: 'India',
  });
});

test('a country-only entry is the country, with nothing left below it', () => {
  assert.deepEqual(venueLabel({ name: '', city: '', country: 'India' }), {
    title: 'India',
    subtitle: null,
  });
});

test('nothing recorded reads as TBA, and a stadium with no city still names itself', () => {
  assert.deepEqual(venueLabel(null), { title: 'TBA', subtitle: null });
  assert.deepEqual(venueLabel({ name: 'Somewhere' }), { title: 'Somewhere', subtitle: null });
});

test('the level is read back from the fields, so an edit reopens where it was entered', () => {
  assert.equal(venueLevel({ name: 'Stadium' }), 'VENUE');
  assert.equal(venueLevel({ name: '', city: 'Delhi' }), 'CITY');
  assert.equal(venueLevel({ name: '', city: '', country: 'India' }), 'COUNTRY');
  assert.equal(venueLevel(null), 'NONE');
});

test('the masthead line takes the name and city, falling back to whichever exists', () => {
  assert.equal(venueLine({ name: 'Stadium', city: 'Delhi', country: 'India' }), 'Stadium, Delhi');
  assert.equal(venueLine({ name: '', city: 'Delhi', country: 'India' }), 'Delhi');
  assert.equal(venueLine({ name: '', city: '', country: 'India' }), 'India');
  assert.equal(venueLine(null), null);
});
