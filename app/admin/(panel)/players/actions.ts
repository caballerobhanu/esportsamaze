'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';

export async function bulkDeletePlayersAction(playerIds: string[], cascade: boolean = false) {
  if (!(await isAdmin())) {
    throw new Error('Unauthorized');
  }

  if (!Array.isArray(playerIds) || playerIds.length === 0) {
    return { success: false, message: 'No players selected' };
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (cascade) {
        // Cascade delete attached records
        await tx.matchPlayerStat.deleteMany({
          where: { playerId: { in: playerIds } },
        });
        await tx.transfer.deleteMany({
          where: { playerId: { in: playerIds } },
        });
      }

      await tx.player.deleteMany({
        where: { id: { in: playerIds } },
      });
    });

    revalidatePath('/admin/players');
    revalidatePath('/players');
    return { success: true, count: playerIds.length };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to bulk delete players' };
  }
}

export async function mergePlayersAction(sourcePlayerId: string, targetPlayerId: string) {
  if (!(await isAdmin())) {
    throw new Error('Unauthorized');
  }

  if (!sourcePlayerId || !targetPlayerId || sourcePlayerId === targetPlayerId) {
    return { success: false, message: 'Invalid source or target player' };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const source = await tx.player.findUnique({ where: { id: sourcePlayerId } });
      const target = await tx.player.findUnique({ where: { id: targetPlayerId } });
      if (!source || !target) {
        throw new Error('Source or target player not found');
      }

      // 1. Relink MatchPlayerStat (handling potential matchGameId uniqueness collisions)
      const sourceStats = await tx.matchPlayerStat.findMany({
        where: { playerId: sourcePlayerId },
      });

      for (const stat of sourceStats) {
        const existingTargetStat = await tx.matchPlayerStat.findUnique({
          where: {
            matchGameId_playerId: {
              matchGameId: stat.matchGameId,
              playerId: targetPlayerId,
            },
          },
        });

        if (existingTargetStat) {
          // Both had stats in this game: remove the duplicate source stat
          await tx.matchPlayerStat.delete({ where: { id: stat.id } });
        } else {
          // Reassign to target player
          await tx.matchPlayerStat.update({
            where: { id: stat.id },
            data: { playerId: targetPlayerId },
          });
        }
      }

      // 2. Relink Transfer records
      await tx.transfer.updateMany({
        where: { playerId: sourcePlayerId },
        data: { playerId: targetPlayerId },
      });

      // 4. Update TournamentTeam rosters where sourcePlayerId is stored
      const tourneyTeams = await tx.tournamentTeam.findMany({
        where: {
          rosterJson: {
            array_contains: [{ playerId: sourcePlayerId }],
          },
        },
      });

      for (const tt of tourneyTeams) {
        if (Array.isArray(tt.rosterJson)) {
          const updated = (tt.rosterJson as any[]).map((entry) => {
            if (entry && entry.playerId === sourcePlayerId) {
              return { ...entry, playerId: targetPlayerId, ign: target.ign };
            }
            return entry;
          });
          await tx.tournamentTeam.update({
            where: { id: tt.id },
            data: { rosterJson: updated },
          });
        }
      }

      // 5. Safely delete the source player
      await tx.player.delete({ where: { id: sourcePlayerId } });
    });

    revalidatePath('/admin/players');
    revalidatePath('/players');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to merge players' };
  }
}

export async function togglePlayerVerificationAction(playerId: string, isVerified: boolean) {
  if (!(await isAdmin())) {
    throw new Error('Unauthorized');
  }

  try {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return { success: false, message: 'Player not found' };

    let newSlug = player.slug;
    if (isVerified && player.slug && /-\d{4}$/.test(player.slug)) {
      // Clean up timestamped slug if canonical slug is available
      const cleanSlug = player.slug.replace(/-\d{4}$/, '');
      const clash = await prisma.player.findFirst({
        where: { slug: cleanSlug, id: { not: playerId } },
      });
      if (!clash) {
        newSlug = cleanSlug;
      }
    }

    await prisma.player.update({
      where: { id: playerId },
      data: {
        isVerified,
        status: isVerified ? 'ACTIVE' : 'UNVERIFIED',
        slug: newSlug,
      },
    });

    revalidatePath('/admin/players');
    revalidatePath('/players');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to update player verification' };
  }
}

export async function batchVerifyPlayersAction(playerIds: string[]) {
  if (!(await isAdmin())) {
    throw new Error('Unauthorized');
  }

  try {
    await prisma.player.updateMany({
      where: { id: { in: playerIds } },
      data: { isVerified: true, status: 'ACTIVE' },
    });

    revalidatePath('/admin/players');
    revalidatePath('/players');
    return { success: true, count: playerIds.length };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to batch verify players' };
  }
}

