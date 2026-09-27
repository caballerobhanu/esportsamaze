import { redirect } from 'next/navigation';
import { AlertCircle, CheckCircle2, UserCog } from 'lucide-react';

import prisma from '@/lib/prisma';
import { hasCapability } from '@/lib/admin-auth';
import { CONTRIBUTOR_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/admin-permissions';
import { MIN_PASSWORD_LENGTH } from '@/lib/admin-password';
import { ConfirmSubmit } from '@/components/admin/confirm-submit';
import { createAdminUser, deleteAdminUser, resetAdminUserPassword, updateAdminUser } from './actions';

export const dynamic = 'force-dynamic';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-[#070b14]';

function Notice({ error, created, updated, deleted }: Record<string, string | undefined>) {
  const ok = created ? 'Account created.' : updated ? 'Account updated.' : deleted ? 'Account removed.' : null;
  if (error) {
    return (
      <p className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400">
        <AlertCircle className="h-3.5 w-3.5" />
        {error === 'taken'
          ? 'That username is already taken.'
          : error === 'invalid'
            ? `Check the username (3–32 of a-z 0-9 . _ -), the password (min ${MIN_PASSWORD_LENGTH}) and at least one role.`
            : 'Something was wrong with that request.'}
      </p>
    );
  }
  if (ok) {
    return (
      <p className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" /> {ok}
      </p>
    );
  }
  return null;
}

function RoleCheckboxes({ selected }: { selected?: string[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {CONTRIBUTOR_ROLES.map((role) => (
        <label key={role} className="flex items-center gap-2 text-xs font-bold">
          <input
            type="checkbox"
            name="roles"
            value={role}
            defaultChecked={selected?.includes(role)}
            className="h-4 w-4 rounded border-slate-300 text-[#0A5FC4] focus:ring-[#0A5FC4]"
          />
          {ROLE_LABELS[role]}
        </label>
      ))}
    </div>
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; updated?: string; deleted?: string }>;
}) {
  if (!(await hasCapability('users'))) redirect('/admin');

  const params = await searchParams;
  const users = await prisma.adminUser.findMany({ orderBy: { username: 'asc' } });

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A5FC4]/10 text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
          <UserCog className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Users</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Contributor accounts. {ROLE_DESCRIPTIONS.EDITOR} {ROLE_DESCRIPTIONS.DATA} You sign in
            separately with your own password and keep full access.
          </p>
        </div>
      </div>

      <Notice {...params} />

      {/* Create */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0b1220]">
        <h2 className="text-sm font-black uppercase tracking-tight">New account</h2>
        <form action={createAdminUser} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Username</span>
            <input name="username" required placeholder="e.g. priya" className={inputCls} />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Display name</span>
            <input name="displayName" placeholder="e.g. Priya Sharma" className={inputCls} />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Password (min {MIN_PASSWORD_LENGTH})
            </span>
            <input name="password" required className={inputCls} />
          </label>
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Roles</span>
            <RoleCheckboxes />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="cursor-pointer rounded-lg bg-[#0A5FC4] px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-blue-600"
            >
              Create account
            </button>
          </div>
        </form>
      </section>

      {/* Existing */}
      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-tight">
          {users.length} {users.length === 1 ? 'account' : 'accounts'}
        </h2>

        {users.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400 dark:border-white/10">
            No contributor accounts yet.
          </p>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0b1220]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-black">
                  {user.displayName}{' '}
                  <span className="text-xs font-bold text-slate-400">@{user.username}</span>
                </p>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {user.active ? 'Active' : 'Disabled'} · last login{' '}
                  {user.lastLoginAt ? user.lastLoginAt.toISOString().slice(0, 10) : 'never'}
                </p>
              </div>

              <form action={updateAdminUser} className="mt-3 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={user.id} />
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Display name</span>
                  <input name="displayName" defaultValue={user.displayName} className={inputCls} />
                </label>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Roles</span>
                  <RoleCheckboxes selected={user.roles} />
                </div>
                <label className="flex items-center gap-2 text-xs font-bold">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={user.active}
                    className="h-4 w-4 rounded border-slate-300 text-[#0A5FC4] focus:ring-[#0A5FC4]"
                  />
                  Active (untick to sign them out everywhere)
                </label>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10"
                  >
                    Save
                  </button>
                </div>
              </form>

              <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-4 dark:border-white/5">
                <form action={resetAdminUserPassword} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={user.id} />
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      New password (min {MIN_PASSWORD_LENGTH})
                    </span>
                    <input name="password" required className={inputCls} />
                  </label>
                  <button
                    type="submit"
                    className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-colors hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10"
                  >
                    Reset password
                  </button>
                </form>

                <form action={deleteAdminUser}>
                  <input type="hidden" name="id" value={user.id} />
                  <ConfirmSubmit
                    message={`Delete ${user.displayName} (@${user.username})?\n\nThey lose access immediately and the account cannot be restored.`}
                    className="cursor-pointer rounded-md border border-rose-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-600 transition-colors hover:border-rose-400 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-950/30"
                  >
                    Delete account
                  </ConfirmSubmit>
                </form>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
