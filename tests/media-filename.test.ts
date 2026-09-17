import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mediaFilename } from '../lib/media-filename';

const HASH = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

test('keeps the uploaded name so the library is searchable', () => {
  assert.equal(
    mediaFilename('team-logo', 'SOUL Esports.png', 'webp', HASH),
    'team-logo-soul-esports-a1b2c3d4e5f6.webp'
  );
});

test('falls back to the prefix when the upload name says nothing', () => {
  // Nobody searches for "image", so the field prefix is the only useful signal left.
  for (const name of ['image.png', 'Untitled.png', 'download', 'asset.jpg', 'logo.svg']) {
    assert.equal(mediaFilename('team-logo', name, 'webp', HASH), 'team-logo-a1b2c3d4e5f6.webp');
  }
});

test('a generic name with extra words keeps those words, which are still searchable', () => {
  // "screenshot-2026-09-17" is not worth the cleverness of a partial match — it is ugly,
  // but it is searchable, and the prefix still says which field it belongs to.
  assert.equal(
    mediaFilename('team-logo', 'Screenshot 2026-09-17.png', 'webp', HASH),
    'team-logo-screenshot-2026-09-17-a1b2c3d4e5f6.webp'
  );
});

test('falls back to the prefix when nothing survives slugging', () => {
  assert.equal(mediaFilename('news', 'क्राफ्टन.png', 'webp', HASH), 'news-a1b2c3d4e5f6.webp');
  assert.equal(mediaFilename('news', '.png', 'webp', HASH), 'news-a1b2c3d4e5f6.webp');
  assert.equal(mediaFilename('news', null, 'webp', HASH), 'news-a1b2c3d4e5f6.webp');
});

test('a two-character name is too short to be worth keeping', () => {
  assert.equal(mediaFilename('news', 'ab.png', 'webp', HASH), 'news-a1b2c3d4e5f6.webp');
  assert.equal(mediaFilename('news', 'bgmi.png', 'webp', HASH), 'news-bgmi-a1b2c3d4e5f6.webp');
});

test('strips accents and punctuation rather than dropping the name', () => {
  assert.equal(mediaFilename('game', 'Café Münster!.png', 'webp', HASH), 'game-cafe-munster-a1b2c3d4e5f6.webp');
  assert.equal(mediaFilename('game', 'A/B\\C.png', 'webp', HASH), 'game-a-b-c-a1b2c3d4e5f6.webp');
});

test('the name is bounded, so a long upload name cannot produce an unusable path', () => {
  const long = mediaFilename('tournament-banner', `${'x'.repeat(200)}.png`, 'webp', HASH);
  assert.equal(long, `tournament-banner-${'x'.repeat(40)}-a1b2c3d4e5f6.webp`);
  assert.ok(long.length < 80);
});

test('sanitises the prefix, so an odd caller cannot escape the uploads directory', () => {
  assert.equal(mediaFilename('../../etc', 'logo.png', 'webp', HASH), 'etc-a1b2c3d4e5f6.webp');
  assert.equal(mediaFilename('', 'logo.png', 'webp', HASH), 'upload-a1b2c3d4e5f6.webp');
});

test('the content hash makes the name deterministic and cache-safe', () => {
  // Same bytes must always land on the same name — the URLs are served immutable for a year.
  assert.equal(
    mediaFilename('team-logo', 'SOUL.png', 'webp', HASH),
    mediaFilename('team-logo', 'SOUL.png', 'webp', HASH)
  );
  // Different bytes must never reuse a name.
  const other = 'ffffffffffff00000000000000000000';
  assert.notEqual(
    mediaFilename('team-logo', 'SOUL.png', 'webp', HASH),
    mediaFilename('team-logo', 'SOUL.png', 'webp', other)
  );
});

test('the prefix still separates the light and dark variants of one upload', () => {
  assert.notEqual(
    mediaFilename('team-logo', 'SOUL.png', 'webp', HASH),
    mediaFilename('team-logo-dark', 'SOUL.png', 'webp', HASH)
  );
});
