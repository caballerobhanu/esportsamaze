'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';

export async function deleteTeamAction(teamId: string, cascade: boolean = true) {
  if (!(await isAdmin())) {
    throw new Error('Unauthorized');
  }
  if (!teamId) return { success: false, message: 'No team ID provided' };

  try {
    await prisma.$transaction(async (tx) => {
      // Deliberate exception to the "ledger owns membership" rule: a LEFT
      // movement cannot reference the team being deleted (FK), so the players
      // are freed directly here. Do NOT resync afterwards — the ledger still
      // holds their older JOINED rows, and a sync would re-attach them to a
      // previous team instead of leaving them as free agents.
      await tx.player.updateMany({
        where: { currentTeamId: teamId },
        data: { currentTeamId: null },
      });

      // 2. Unlink tournament winners / runner-ups
      await tx.tournament.updateMany({
        where: { winnerTeamId: teamId },
        data: { winnerTeamId: null },
      });
      await tx.tournament.updateMany({
        where: { runnerUpTeamId: teamId },
        data: { runnerUpTeamId: null },
      });

      if (cascade) {
        // Cascade remove attached team records
        await tx.matchPlayerStat.deleteMany({ where: { teamId } });
        await tx.matchTeamResult.deleteMany({ where: { teamId } });
        await tx.tournamentTeam.deleteMany({ where: { teamId } });
        await tx.transfer.deleteMany({ where: { OR: [{ teamId }, { fromTeamId: teamId }] } });
        await tx.kraftonEntry.deleteMany({ where: { teamId } });
        await tx.kraftonTransfer.deleteMany({ where: { OR: [{ fromTeamId: teamId }, { toTeamId: teamId }] } });
      }

      await tx.team.delete({ where: { id: teamId } });
    });

    revalidatePath('/admin/teams');
    revalidatePath('/teams');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to delete team' };
  }
}
