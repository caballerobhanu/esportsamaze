import { cookies } from 'next/headers';
import crypto from 'crypto';

const COOKIE_NAME = 'ea_admin';
const SECRET_SOURCE = process.env.ADMIN_PASSWORD || 'changeme';

function tokenFor(password: string): string {
  return crypto
    .createHash('sha256')
    .update(`${password}::esportsamaze-admin`)
    .digest('hex');
}

export function verifyPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || 'changeme';
  if (!input || input.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(input), Buffer.from(expected));
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === tokenFor(SECRET_SOURCE);
}

export async function grantAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, tokenFor(SECRET_SOURCE), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function revokeAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
