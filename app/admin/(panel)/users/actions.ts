'use server';

import { redirect } from 'next/navigation';

import prisma from '@/lib/prisma';
import { fStr } from '@/lib/admin-forms';
import { hasCapability } from '@/lib/admin-auth';
import { hashPassword, isAcceptablePassword } from '@/lib/admin-password';
import { CONTRIBUTOR_ROLES, isValidUsername, type AdminRole } from '@/lib/admin-permissions';

/** The submitted roles, limited to what a contributor account may hold. */
function readRoles(formData: FormData): AdminRole[] {
  return formData
    .getAll('roles')
    .map((value) => String(value))
    .filter((role): role is AdminRole => (CONTRIBUTOR_ROLES as string[]).includes(role));
}

export async function createAdminUser(formData: FormData): Promise<void> {
  if (!(await hasCapability('users'))) redirect('/admin/login');

  const username = fStr(formData, 'username').toLowerCase();
  const displayName = fStr(formData, 'displayName') || username;
  const password = String(formData.get('password') || '');
  const roles = readRoles(formData);

  if (!isValidUsername(username) || !isAcceptablePassword(password) || roles.length === 0) {
    redirect('/admin/users?error=invalid');
  }

  const existing = await prisma.adminUser.findUnique({ where: { username }, select: { id: true } });
  if (existing) redirect('/admin/users?error=taken');

  await prisma.adminUser.create({
    data: { username, displayName, roles, passwordHash: hashPassword(password) },
  });
  redirect('/admin/users?created=1');
}

export async function updateAdminUser(formData: FormData): Promise<void> {
  if (!(await hasCapability('users'))) redirect('/admin/login');

  const id = fStr(formData, 'id');
  const displayName = fStr(formData, 'displayName');
  const roles = readRoles(formData);
  const active = formData.get('active') === 'on';
  if (!id || !displayName || roles.length === 0) redirect('/admin/users?error=invalid');

  await prisma.adminUser.update({ where: { id }, data: { displayName, roles, active } });
  redirect('/admin/users?updated=1');
}

export async function resetAdminUserPassword(formData: FormData): Promise<void> {
  if (!(await hasCapability('users'))) redirect('/admin/login');

  const id = fStr(formData, 'id');
  const password = String(formData.get('password') || '');
  if (!id || !isAcceptablePassword(password)) redirect('/admin/users?error=invalid');

  await prisma.adminUser.update({ where: { id }, data: { passwordHash: hashPassword(password) } });
  redirect('/admin/users?updated=1');
}

export async function deleteAdminUser(formData: FormData): Promise<void> {
  if (!(await hasCapability('users'))) redirect('/admin/login');

  const id = fStr(formData, 'id');
  if (!id) redirect('/admin/users');

  await prisma.adminUser.delete({ where: { id } });
  redirect('/admin/users?deleted=1');
}
