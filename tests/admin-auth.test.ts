import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, verifySessionToken, verifyPassword } from '../lib/admin-auth';

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

  // Only succeeds in dev if explicit ALLOW_DEV_AUTH=1
  process.env.ALLOW_DEV_AUTH = '1';
  assert.equal(verifyPassword('changeme'), true);
  assert.equal(verifyPassword('other'), false);

  // Never succeeds in production
  env.NODE_ENV = 'production';
  assert.equal(verifyPassword('changeme'), false);

  env.NODE_ENV = originalEnv;
});
