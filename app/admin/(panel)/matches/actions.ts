'use server';

import prisma from '@/lib/prisma';
import { revalidateTournamentPages } from '@/lib/revalidate-tournament';
import { isAdmin } from '@/lib/admin-auth';
import { revalidatePath } from 'next/cache';

/**
 * Detail (telemetry) fields are `number | null` on the way in: a blank editor
 * input means "not recorded" and must stay NULL. `undefined` means the caller
 * did not send the field at all, so the stored value is left untouched.
 */
export interface InlineTeamResultUpdateInput {
  id: string;
  teamId?: string;
  rank: number;
  wwcd?: boolean;
  placePoints: number;
  elimsPoints: number;
  bonusPoints?: number;
  damage?: number | null;
  smokesUsed?: number | null;
  rescues?: number | null;
  shortCode?: string | null;
}

export interface InlinePlayerStatUpdateInput {
  id: string;
  playerId?: string;
  teamId?: string | null;
  playerElims: number;
  damage?: number | null;
  survivalTime?: number | null;
  healing?: number | null;
  damageReceived?: number | null;
  knockouts?: number | null;
  assists?: number | null;
  vehicleElims?: number | null;
  grenadeElims?: number | null;
  isMvp?: boolean | null;
  role?: string | null;
}

/** `null` clears the field, `undefined` leaves it as stored. */
function detail<T>(value: T | null | undefined): T | null | undefined {
  return value === undefined ? undefined : value;
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
      damage: detail(input.damage),
      smokesUsed: detail(input.smokesUsed),
      rescues: detail(input.rescues),
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
          damage: detail(input.damage),
          smokesUsed: detail(input.smokesUsed),
          rescues: detail(input.rescues),
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
      damage: detail(input.damage),
      survivalTime: detail(input.survivalTime),
      healing: detail(input.healing),
      damageReceived: detail(input.damageReceived),
      knockouts: detail(input.knockouts),
      assists: detail(input.assists),
      vehicleElims: detail(input.vehicleElims),
      grenadeElims: detail(input.grenadeElims),
      isMvp: detail(input.isMvp),
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
          damage: detail(input.damage),
          survivalTime: detail(input.survivalTime),
          healing: detail(input.healing),
          damageReceived: detail(input.damageReceived),
          knockouts: detail(input.knockouts),
          assists: detail(input.assists),
          vehicleElims: detail(input.vehicleElims),
          grenadeElims: detail(input.grenadeElims),
          isMvp: detail(input.isMvp),
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

