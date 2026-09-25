import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currencyLocale, formatMoney, formatCurrencyNumber, formatPrizePool, currencyCodeSuffix } from '../lib/utils';
import { secondaryCurrencyFor, formatAmountInCurrency } from '../lib/geo-currency';

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

test('the secondary figure is the visitor\u2019s own currency, or USD when they match', () => {
  // A visitor in India
  assert.equal(secondaryCurrencyFor('INR', 'INR'), 'USD');
  assert.equal(secondaryCurrencyFor('USD', 'INR'), 'INR');
  assert.equal(secondaryCurrencyFor('CNY', 'INR'), 'INR');

  // A visitor in the US: an event already in USD has nothing to compare against
  assert.equal(secondaryCurrencyFor('INR', 'USD'), 'USD');
  assert.equal(secondaryCurrencyFor('USD', 'USD'), null);
  assert.equal(secondaryCurrencyFor('CNY', 'USD'), 'USD');

  // A visitor in Pakistan
  assert.equal(secondaryCurrencyFor('INR', 'PKR'), 'PKR');
  assert.equal(secondaryCurrencyFor('USD', 'PKR'), 'PKR');
  assert.equal(secondaryCurrencyFor('CNY', 'PKR'), 'PKR');

  // A visitor in China
  assert.equal(secondaryCurrencyFor('INR', 'CNY'), 'CNY');
  assert.equal(secondaryCurrencyFor('USD', 'CNY'), 'CNY');
  assert.equal(secondaryCurrencyFor('CNY', 'CNY'), 'USD');
});

test('a converted figure is a symbol and digits, with no trailing code', () => {
  assert.equal(formatAmountInCurrency(104_932, 'USD'), '$104,932');
  assert.equal(formatAmountInCurrency(104_932, 'INR'), '₹91,24,522');
  assert.equal(formatAmountInCurrency(104_932, 'PKR'), 'Rs29,147,778');
});

test('a symbol only earns its code when another currency shares it', () => {
  assert.equal(currencyCodeSuffix('USD'), '');
  assert.equal(currencyCodeSuffix('INR'), '');
  assert.equal(currencyCodeSuffix('CNY'), ' CNY');
  assert.equal(currencyCodeSuffix('JPY'), ' JPY');

  assert.equal(formatMoney(3_000_000, 'USD'), '$3,000,000');
  assert.equal(formatMoney(3_000_000, 'CNY'), '¥3,000,000 CNY');
  assert.equal(formatAmountInCurrency(104_932, 'USD'), '$104,932');
  assert.equal(formatAmountInCurrency(104_932, 'CNY'), '¥760,377 CNY');
});

test('a currency the rate table cannot convert falls back to USD, never a wrong number', () => {
  // LKR is mapped from Asia/Colombo but has no rate, so it converts 1:1 — a lie.
  assert.equal(secondaryCurrencyFor('USD', 'LKR'), null);
  assert.equal(secondaryCurrencyFor('INR', 'LKR'), 'USD');
});
