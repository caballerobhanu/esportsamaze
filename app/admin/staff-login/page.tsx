import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogIn, AlertCircle } from 'lucide-react';

import prisma from '@/lib/prisma';
import { ADMIN_ROLES, type AdminRole } from '@/lib/admin-permissions';
import { DUMMY_PASSWORD_HASH, verifyPasswordHash } from '@/lib/admin-password';
import {
  clearFailedLogins,
  clientIp,
  grantAdminSession,
  isLoginBlocked,
  recordFailedLogin,
} from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/*
 * The contributor sign-in. Reached only via the hidden staff slug
 * (`/desk/login` by default, `STAFF_PATH` to change it), which proxy.ts
 * rewrites here. Kept out of the index without naming the secret path in
 * robots.txt (which is world-readable and would publish it).
 */
export const metadata: Metadata = {
  title: 'Sign In',
  robots: { index: false, follow: false },
};

const STAFF_PATH = process.env.STAFF_PATH || 'desk';

async function login(formData: FormData) {
  'use server';
  const ip = await clientIp();
  if (isLoginBlocked(ip)) {
    redirect(`/${STAFF_PATH}/login?error=rate-limited`);
  }

  const username = String(formData.get('username') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');

  const user = username
    ? await prisma.adminUser.findUnique({ where: { username } })
    : null;

  // Compare even for an unknown account, so a missing username costs the same
  // time as a wrong password (no user-enumeration oracle).
  const passwordOk = verifyPasswordHash(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  const roles = (user?.roles ?? []).filter((role): role is AdminRole =>
    (ADMIN_ROLES as string[]).includes(role) && role !== 'OWNER'
  );

  if (!user || !user.active || !passwordOk || roles.length === 0) {
    recordFailedLogin(ip);
    redirect(`/${STAFF_PATH}/login?error=1`);
  }

  clearFailedLogins(ip);
  await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await grantAdminSession(roles, user.id);
  redirect('/admin');
}

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#07090e] px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-md p-6 space-y-4">
        <h1 className="text-lg font-black uppercase tracking-wider">Staff Sign In</h1>

        {error && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-3.5 h-3.5" />{' '}
            {error === 'rate-limited'
              ? 'Too many failed attempts — try again in about 15 minutes.'
              : 'Incorrect username or password.'}
          </p>
        )}

        <form action={login} className="space-y-3">
          <input
            type="text"
            name="username"
            placeholder="Username"
            required
            autoFocus
            autoComplete="username"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            autoComplete="current-password"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
          />
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-sm font-bold transition-colors"
          >
            <LogIn className="w-4 h-4" /> Sign in
          </button>
        </form>

        <Link
          href="/"
          className="block text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          ← Back to site
        </Link>
      </div>
    </div>
  );
}
