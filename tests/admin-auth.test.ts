import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, verifySessionToken, verifyPassword, resolveDevSecret } from '../lib/admin-auth';

/** Long enough to be treated as a real dev secret rather than a flag. */
const DEV_SECRET = 'local-dev-secret-0123456789';

test('createSessionToken and verifySessionToken authenticate valid sessions', () => {
  const secret = 'super-secret-key-1234567890';
  const now = Math.floor(Date.now() / 1000);
  const token = createSessionToken(secret, now);

  assert.equal(verifySessionToken(token, secret, now), true);
  assert.equal(verifySessionToken(token, secret, now + 3600), true); // 1 hour later
});

test('verifySessionToken rejects tampered signature', () => {
  const secret = 'super-secret-key-1234567890';
  const now = Math.floor(Date.now() / 1000);
  const token = createSessionToken(secret, now);
  const tampered = token.slice(0, -4) + 'abcd';

  assert.equal(verifySessionToken(tampered, secret, now), false);
});

test('verifySessionToken rejects expired tokens', () => {
  const secret = 'super-secret-key-1234567890';
  const past = Math.floor(Date.now() / 1000) - 8 * 24 * 3600; // 8 days ago
  const token = createSessionToken(secret, past);
  const now = Math.floor(Date.now() / 1000);

  assert.equal(verifySessionToken(token, secret, now), false);
});

test('verifyPassword validates against environment variable', () => {
  process.env.ADMIN_PASSWORD = 'test-secret-password';

  assert.equal(verifyPassword('test-secret-password'), true);
  assert.equal(verifyPassword('wrong-password'), false);
  assert.equal(verifyPassword(''), false);
});

test('verifyPassword fails closed when ADMIN_PASSWORD is unset', () => {
  delete process.env.ADMIN_PASSWORD;
  delete process.env.ALLOW_DEV_AUTH;
  const env = process.env as Record<string, string | undefined>;
  const originalEnv = env.NODE_ENV;
  env.NODE_ENV = 'development';

  // Fails closed by default even in development
  assert.equal(verifyPassword('changeme'), false);
  assert.equal(verifyPassword('any'), false);

  // The dev secret must be supplied explicitly, and it IS the password — no
  // literal lives in the source for anyone to read off the repository.
  process.env.ALLOW_DEV_AUTH = DEV_SECRET;
  assert.equal(verifyPassword(DEV_SECRET), true);
  assert.equal(verifyPassword('changeme'), false);
  assert.equal(verifyPassword('other'), false);

  // A placeholder flag is refused rather than honoured as a known secret
  process.env.ALLOW_DEV_AUTH = '1';
  assert.equal(verifyPassword('1'), false);
  assert.equal(verifyPassword('changeme'), false);

  // Never succeeds in production, whatever the value
  env.NODE_ENV = 'production';
  process.env.ALLOW_DEV_AUTH = DEV_SECRET;
  assert.equal(verifyPassword(DEV_SECRET), false);

  env.NODE_ENV = originalEnv;
  delete process.env.ALLOW_DEV_AUTH;
});

test('resolveDevSecret refuses placeholders, short values and production', () => {
  const env = process.env as Record<string, string | undefined>;
  const originalEnv = env.NODE_ENV;
  env.NODE_ENV = 'development';

  delete process.env.ALLOW_DEV_AUTH;
  assert.equal(resolveDevSecret(), null);

  // The old "ALLOW_DEV_AUTH=1" flag is no longer a usable secret
  process.env.ALLOW_DEV_AUTH = '1';
  assert.equal(resolveDevSecret(), null);

  process.env.ALLOW_DEV_AUTH = 'changeme';
  assert.equal(resolveDevSecret(), null);

  process.env.ALLOW_DEV_AUTH = `   ${DEV_SECRET}   `;
  assert.equal(resolveDevSecret(), DEV_SECRET, 'surrounding whitespace is trimmed');

  env.NODE_ENV = 'production';
  assert.equal(resolveDevSecret(), null);

  env.NODE_ENV = originalEnv;
  delete process.env.ALLOW_DEV_AUTH;
});
