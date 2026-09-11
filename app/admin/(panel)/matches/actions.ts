'use server';

import prisma from '@/lib/prisma';
import { revalidateTournamentPages } from '@/lib/revalidate-tournament';
import { isAdmin } from '@/lib/admin-auth';
import { revalidatePath } from 'next/cache';

export interface InlineTeamResultUpdateInput {
  id: string;
  teamId?: string;
  rank: number;
  wwcd?: boolean;
  placePoints: number;
  elimsPoints: number;
  bonusPoints?: number;
  damage?: number;
  smokesUsed?: number;
  rescues?: number;
  shortCode?: string | null;
}

export interface InlinePlayerStatUpdateInput {
  id: string;
  playerId?: string;
  teamId?: string | null;
  playerElims: number;
  damage?: number;
  survivalTime?: number;
  healing?: number;
  damageReceived?: number;
  knockouts?: number;
  assists?: number;
  vehicleElims?: number;
  grenadeElims?: number;
  isMvp?: boolean;
  role?: string | null;
}

export async function updateInlineTeamResultAction(input: InlineTeamResultUpdateInput) {
  if (!(await isAdmin())) {
    throw new Error('Unauthorized');
  }

  const bonusPoints = input.bonusPoints ?? 0;
  const placePoints = input.placePoints ?? 0;
  const elimsPoints = input.elimsPoints ?? 0;
  const totalPoints = placePoints + elimsPoints + bonusPoints;
  const isWwcd = input.wwcd !== undefined ? input.wwcd : input.rank === 1;

  const updated = await prisma.matchTeamResult.update({
    where: { id: input.id },
    data: {
      rank: input.rank,
      wwcd: isWwcd,
      placePoints,
      elimsPoints,
      bonusPoints,
      totalPoints,
      damage: input.damage ?? 0,
      smokesUsed: input.smokesUsed ?? 0,
      rescues: input.rescues ?? 0,
      shortCode: input.shortCode ?? undefined,
      teamId: input.teamId ?? undefined,
    },
    include: {
      team: { select: { id: true, name: true, tag: true, logoUrl: true } },
    },
  });

  revalidatePath('/admin/matches');
  revalidateTournamentPages();
  return { success: true, updated };
}

export async function batchUpdateTeamResultsAction(inputs: InlineTeamResultUpdateInput[]) {
  if (!(await isAdmin())) {
    throw new Error('Unauthorized');
  }

  await prisma.$transaction(
    inputs.map((input) => {
      const bonusPoints = input.bonusPoints ?? 0;
      const placePoints = input.placePoints ?? 0;
      const elimsPoints = input.elimsPoints ?? 0;
      const totalPoints = placePoints + elimsPoints + bonusPoints;
      const isWwcd = input.wwcd !== undefined ? input.wwcd : input.rank === 1;

      return prisma.matchTeamResult.update({
        where: { id: input.id },
        data: {
          rank: input.rank,
          wwcd: isWwcd,
          placePoints,
          elimsPoints,
          bonusPoints,
          totalPoints,
          damage: input.damage ?? 0,
          smokesUsed: input.smokesUsed ?? 0,
          rescues: input.rescues ?? 0,
          shortCode: input.shortCode ?? undefined,
          teamId: input.teamId ?? undefined,
        },
      });
    })
  );

  revalidatePath('/admin/matches');
  revalidateTournamentPages();
  return { success: true, count: inputs.length };
}

export async function updateInlinePlayerStatAction(input: InlinePlayerStatUpdateInput) {
  if (!(await isAdmin())) {
    throw new Error('Unauthorized');
  }

  const updated = await prisma.matchPlayerStat.update({
    where: { id: input.id },
    data: {
      playerElims: input.playerElims,
      damage: input.damage ?? 0,
      survivalTime: input.survivalTime ?? 0,
      healing: input.healing ?? 0,
      damageReceived: input.damageReceived ?? 0,
      knockouts: input.knockouts ?? 0,
      assists: input.assists ?? 0,
      vehicleElims: input.vehicleElims ?? 0,
      grenadeElims: input.grenadeElims ?? 0,
      isMvp: !!input.isMvp,
      role: input.role ?? undefined,
      playerId: input.playerId ?? undefined,
      teamId: input.teamId ?? undefined,
    },
    include: {
      player: { select: { id: true, ign: true, avatarUrl: true } },
      team: { select: { id: true, name: true, tag: true } },
    },
  });

  revalidatePath('/admin/matches');
  revalidateTournamentPages();
  return { success: true, updated };
}

export async function batchUpdatePlayerStatsAction(inputs: InlinePlayerStatUpdateInput[]) {
  if (!(await isAdmin())) {
    throw new Error('Unauthorized');
  }

  await prisma.$transaction(
    inputs.map((input) =>
      prisma.matchPlayerStat.update({
        where: { id: input.id },
        data: {
          playerElims: input.playerElims,
          damage: input.damage ?? 0,
          survivalTime: input.survivalTime ?? 0,
          healing: input.healing ?? 0,
          damageReceived: input.damageReceived ?? 0,
          knockouts: input.knockouts ?? 0,
          assists: input.assists ?? 0,
          vehicleElims: input.vehicleElims ?? 0,
          grenadeElims: input.grenadeElims ?? 0,
          isMvp: !!input.isMvp,
          role: input.role ?? undefined,
          playerId: input.playerId ?? undefined,
          teamId: input.teamId ?? undefined,
        },
      })
    )
  );

  revalidatePath('/admin/matches');
  revalidateTournamentPages();
  return { success: true, count: inputs.length };
}

export async function deleteInlineTeamResultAction(id: string) {
  if (!(await isAdmin())) {
    throw new Error('Unauthorized');
  }

  await prisma.matchTeamResult.delete({
    where: { id },
  });

  revalidatePath('/admin/matches');
  revalidateTournamentPages();
  return { success: true };
}

export async function deleteInlinePlayerStatAction(id: string) {
  if (!(await isAdmin())) {
    throw new Error('Unauthorized');
  }

  await prisma.matchPlayerStat.delete({
    where: { id },
  });

  revalidatePath('/admin/matches');
  revalidateTournamentPages();
  return { success: true };
}

export async function purgeTournamentMatchesAction(tournamentId: string, stageId?: string | null) {
  if (!(await isAdmin())) {
    throw new Error('Unauthorized');
  }

  if (!tournamentId) {
    return { success: false, message: 'Tournament ID is required' };
  }

  try {
    const whereClause: any = { tournamentId };
    if (stageId && stageId !== 'ALL') {
      whereClause.OR = [
        { stageId: stageId },
        { stage: { name: stageId } },
      ];
    }

    const matches = await prisma.match.findMany({
      where: whereClause,
      select: { id: true },
    });

    const matchIds = matches.map((m) => m.id);

    if (matchIds.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.matchPlayerStat.deleteMany({
          where: { matchGame: { matchId: { in: matchIds } } },
        });
        await tx.matchTeamResult.deleteMany({
          where: { matchGame: { matchId: { in: matchIds } } },
        });
        await tx.matchGame.deleteMany({
          where: { matchId: { in: matchIds } },
        });
        await tx.match.deleteMany({
          where: { id: { in: matchIds } },
        });
      });
    }

    revalidatePath('/admin/matches');
    revalidateTournamentPages();
    return { success: true, count: matchIds.length };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to purge matches' };
  }
}

