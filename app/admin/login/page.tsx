import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogIn, AlertCircle } from 'lucide-react';
import {
  grantAdminSession,
  verifyPassword,
  clientIp,
  isLoginBlocked,
  recordFailedLogin,
  clearFailedLogins,
} from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

async function login(formData: FormData) {
  'use server';
  const ip = await clientIp();
  if (isLoginBlocked(ip)) {
    redirect('/admin/login?error=rate-limited');
  }
  const password = String(formData.get('password') || '');
  if (!verifyPassword(password)) {
    recordFailedLogin(ip);
    redirect('/admin/login?error=1');
  }
  clearFailedLogins(ip);
  await grantAdminSession();
  redirect('/admin');
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const usingDefaultPassword = !process.env.ADMIN_PASSWORD;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#07090e] px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-md p-6 space-y-4">
        <h1 className="text-lg font-black uppercase tracking-wider">Admin Login</h1>

        {error && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-3.5 h-3.5" />{' '}
            {error === 'rate-limited'
              ? 'Too many failed attempts — try again in about 15 minutes.'
              : 'Incorrect password.'}
          </p>
        )}
        {usingDefaultPassword && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-snug">
            ADMIN_PASSWORD is not set in .env — using the default
            <code className="mx-1 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">
              changeme
            </code>
            . Set it before deploying.
          </p>
        )}

        <form action={login} className="space-y-3">
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5FC4]"
          />
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#0A5FC4] hover:bg-[#0850a3] text-white text-sm font-bold transition-colors"
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
