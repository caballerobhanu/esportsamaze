import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currencyLocale, formatMoney, formatCurrencyNumber, formatPrizePool } from '../lib/utils';

test('rupees group by lakh/crore, every other currency groups in threes', () => {
  assert.equal(currencyLocale('INR'), 'en-IN');
  assert.equal(currencyLocale('inr'), 'en-IN');
  assert.equal(currencyLocale('USD'), 'en-US');
  assert.equal(currencyLocale('EUR'), 'en-US');
  assert.equal(currencyLocale(null), 'en-US');
  assert.equal(currencyLocale(undefined), 'en-US');
});

test('three million dollars reads as $3,000,000, never $30,00,000', () => {
  assert.equal(formatMoney(3_000_000, 'USD'), '$3,000,000');
  assert.equal(formatMoney(3_000_000, 'EUR'), '€3,000,000');
});

test('the same number in rupees keeps the Indian grouping', () => {
  assert.equal(formatMoney(3_000_000, 'INR'), '₹30,00,000');
  assert.equal(formatCurrencyNumber(3_000_000, 'INR'), '30,00,000');
  assert.equal(formatCurrencyNumber(3_000_000, 'USD'), '3,000,000');
});

test('a prize pool follows its own currency', () => {
  assert.equal(formatPrizePool(3_000_000, 'USD'), '$3,000,000');
  assert.equal(formatPrizePool(3_000_000, 'INR', 0.012, false), '₹30,00,000');
  assert.equal(formatPrizePool(0, 'USD'), 'TBA');
});

test('an unknown currency code falls back to the code with western grouping', () => {
  assert.equal(formatMoney(3_000_000, 'XYZ'), 'XYZ 3,000,000');
});
