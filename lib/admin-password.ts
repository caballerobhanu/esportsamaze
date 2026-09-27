import crypto from 'crypto';

/**
 * Contributor password hashing. Node's scrypt, so no new dependency — the owner
 * account keeps its env-password scheme untouched.
 *
 * Stored form is `saltHex:hashHex`; the salt is per-user and random, so two
 * accounts with the same password hash differently.
 */
const KEY_LENGTH = 64;

export const MIN_PASSWORD_LENGTH = 10;

export function isAcceptablePassword(password: string): boolean {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  if (!password || !stored) return false;

  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, 'hex');
    expected = Buffer.from(hashHex, 'hex');
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  const derived = crypto.scryptSync(password, salt, expected.length);
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

/**
 * A throwaway hash compared against when the username is unknown, so a missing
 * account costs the same time as a wrong password (no user-enumeration oracle).
 * Computed once at module load.
 */
export const DUMMY_PASSWORD_HASH = hashPassword(crypto.randomBytes(24).toString('hex'));
