'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { hasCapability } from '@/lib/admin-auth';

/**
 * Trashes a team. The old signature kept a `cascade` flag that destroyed
 * attached records; a trash never does — the relations are what make a restore
 * lossless — so the flag is accepted and ignored for callers that still pass it.
 */
export async function deleteTeamAction(teamId: string, _cascade: boolean = true) {
  if (!(await hasCapability('destructive'))) {
    throw new Error('Unauthorized');
  }
  if (!teamId) return { success: false, message: 'No team ID provided' };

  try {
    await prisma.team.update({ where: { id: teamId }, data: { deletedAt: new Date() } });

    revalidatePath('/admin/teams');
    revalidatePath('/teams');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to delete team' };
  }
}
