import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { isForeignReferer, isSameOrigin } from '../lib/anti-scrape';

test('isForeignReferer allows direct access when referer is empty', () => {
  const req = new Request('http://esportsamaze.com/api/media/banner.png', {
    headers: { host: 'esportsamaze.com' },
  });
  assert.equal(isForeignReferer(req), false);
});

test('isForeignReferer allows requests with same-origin referer', () => {
  const req = new Request('http://esportsamaze.com/api/media/banner.png', {
    headers: {
      host: 'esportsamaze.com',
      referer: 'https://esportsamaze.com/tournaments/bgmi-championship',
    },
  });
  assert.equal(isForeignReferer(req), false);
});

test('isForeignReferer blocks requests with foreign referer (hotlinking)', () => {
  const req = new Request('http://esportsamaze.com/api/media/banner.png', {
    headers: {
      host: 'esportsamaze.com',
      referer: 'https://competitor-esports.com/news/leaked-banner',
    },
  });
  assert.equal(isForeignReferer(req), true);
});

test('isForeignReferer blocks requests with sec-fetch-site: cross-site even if referer is hidden', () => {
  const req = new Request('http://esportsamaze.com/api/media/banner.png', {
    headers: {
      host: 'esportsamaze.com',
      'sec-fetch-site': 'cross-site',
    },
  });
  assert.equal(isForeignReferer(req), true);
});

test('isForeignReferer blocks malformed referer URLs', () => {
  const req = new Request('http://esportsamaze.com/api/media/banner.png', {
    headers: {
      host: 'esportsamaze.com',
      referer: 'invalid-url:////',
    },
  });
  assert.equal(isForeignReferer(req), true);
});

test('isSameOrigin stops browsers with cross-site sec-fetch-site', () => {
  const req = new NextRequest('http://esportsamaze.com/api/search?q=test', {
    headers: {
      host: 'esportsamaze.com',
      'sec-fetch-site': 'cross-site',
    },
  });
  assert.equal(isSameOrigin(req), false);
});

test('isSameOrigin allows scripts with no browser headers (handled by rate limits)', () => {
  // Curl/Python send no sec-fetch-site, no origin, no referer
  const req = new NextRequest('http://esportsamaze.com/api/search?q=test', {
    headers: {
      host: 'esportsamaze.com',
    },
  });
  assert.equal(isSameOrigin(req), true);
});
