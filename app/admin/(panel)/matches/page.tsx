import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Pencil, Trash2, Plus, Swords, Crosshair, Trophy, Shield, Users, Flame, Sparkles, Save, Radio, Globe, MapPin, Tv } from 'lucide-react';
import { Combobox } from '@/components/admin/combobox';
import prisma from '@/lib/prisma';
import { revalidateTournamentPages } from '@/lib/revalidate-tournament';
import { isAdmin } from '@/lib/admin-auth';
import { fStr, fOpt, fDate, fNum, fMatchStatus, fUrl, sanitizeUrl } from '@/lib/admin-forms';
import {
  STAGE_TYPES,
  BGMI_PUBGM_MAPS,
  EVENT_TYPES,
  getPlacementPoints,
  computeUtilitiesTotal,
  computeTotalDistance,
  computeTotalPoints,
  readKillMultiplier,
} from '@/lib/tournament-math';
import { MatchInfoInputs } from '@/components/admin/match-info-inputs';
import { MatchBatchImporter } from '@/components/admin/match-batch-importer';
import { MatchGroupedList } from '@/components/admin/match-grouped-list';
import { MatchInlineScorecardEditor } from '@/components/admin/match-inline-scorecard-editor';

export const dynamic = 'force-dynamic';

const inputCls =
  'w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-(--ed-blue)';
const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1';

const MATCH_STATUSES = ['SCHEDULED', 'LIVE', 'COMPLETED', 'POSTPONED'];

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  LIVE: 'bg-rose-500 text-white animate-pulse',
  COMPLETED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  POSTPONED: 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
};

// ---------------------------------------------------------------- server actions

async function duplicateMatch(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (!id) redirect('/admin/matches');

  const source = await prisma.match.findUnique({
    where: { id },
    include: {
      games: { select: { duration: true } },
    },
  });

  if (!source) redirect('/admin/matches');

  const nextMatchNum = (source.matchNumber ?? 1) + 1;
  const nextOverallNum = source.overallMatchNumber ? source.overallMatchNumber + 1 : null;
  const stageName = source.format ? source.format.split(' · ')[1]?.split(' (')[0] : '';
  const newFormat = `Match ${nextMatchNum} (${source.mapName})${stageName ? ` · ${stageName}` : ''}${
    nextOverallNum ? ` · Overall #${nextOverallNum}` : ''
  }${source.groupName ? ` (${source.groupName})` : ''}`;

  const createdMatch = await prisma.match.create({
    data: {
      tournamentId: source.tournamentId,
      gameId: source.gameId,
      matchNumber: nextMatchNum,
      overallMatchNumber: nextOverallNum,
      stageId: source.stageId,
      groupId: source.groupId,
      stageType: source.stageType,
      groupName: source.groupName,
      mapName: source.mapName,
      matchType: source.matchType,
      format: newFormat,
      status: 'SCHEDULED',
      scheduledAt: source.scheduledAt,
      matchTime: source.matchTime,
      streamUrl: source.streamUrl,
      vods: source.vods ?? undefined,
    },
  });

  // Create initial clean MatchGame without pre-populating results, ensuring tournament standings are untouched
  await prisma.matchGame.create({
    data: {
      matchId: createdMatch.id,
      sequence: 1,
      mapName: source.mapName,
      duration: source.games[0]?.duration ?? 1680,
    },
  });

  revalidatePath('/admin/matches');
  revalidateTournamentPages();
  const query = [
    `edit=${createdMatch.id}`,
    `tournamentId=${createdMatch.tournamentId}`,
    createdMatch.stageId ? `stageId=${createdMatch.stageId}` : '',
  ]
    .filter(Boolean)
    .join('&');
  redirect(`/admin/matches?${query}#match-editor`);
}

async function updateMatchStatus(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  const status = fMatchStatus(formData, 'status');
  if (id && status) {
    await prisma.match.update({
      where: { id },
      data: { status },
    });
    revalidatePath('/admin/matches');
    revalidateTournamentPages();
  }
}

async function saveMatch(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  const tournamentId = fStr(formData, 'tournamentId');
  const gameId = fStr(formData, 'gameId');
  const scheduledAt = fDate(formData, 'scheduledAt');
  const matchNumber = fNum(formData, 'matchNumber') ?? 1;
  const overallMatchNumber = fNum(formData, 'overallMatchNumber');
  const mapName = fStr(formData, 'mapName') || 'Erangel';
  const stageName = fStr(formData, 'stageName') || 'Grand Finals';
  const stageType = fOpt(formData, 'stageType');
  const groupName = fOpt(formData, 'groupName');
  const matchType = fStr(formData, 'matchType') || 'LAN';
  const matchTime = fStr(formData, 'matchTime') || '17:30 IST';

  if (!tournamentId || !gameId || !scheduledAt) {
    redirect(`/admin/matches?error=required${id ? `&edit=${id}` : ''}`);
  }

  // VOD links JSON — a malformed payload aborts the save with a visible error
  // instead of silently dropping the admin's data.
  let vods: any = null;
  const vodsRaw = fStr(formData, 'vodsJson');
  if (vodsRaw) {
    try {
      vods = JSON.parse(vodsRaw);
    } catch {
      redirect(`/admin/matches?error=json&field=vods${id ? `&edit=${id}` : ''}`);
    }
  }

  // Determine primary streamUrl & sanitize vods
  let streamUrl = fUrl(formData, 'streamUrl');
  if (Array.isArray(vods)) {
    vods = vods.map((v: any) => ({
      ...v,
      url: sanitizeUrl(v?.url) || '',
    }));
  }
  if (!streamUrl && Array.isArray(vods) && vods.length > 0) {
    const mainVod = vods.find((v: any) => v.type === 'MAIN') || vods[0];
    if (mainVod?.url) streamUrl = sanitizeUrl(mainVod.url);
  }

  const format = `Match ${matchNumber} (${mapName})${stageName ? ` · ${stageName}` : ''}${
    overallMatchNumber ? ` · Overall #${overallMatchNumber}` : ''
  }${groupName ? ` (${groupName})` : ''}`;

  // Link the match to the tournament's stage/group records when the typed
  // names match an existing stage/group (mirrors the bulk importers' matching)
  const linkedStage = await prisma.tournamentStage.findFirst({
    where: { tournamentId, name: { equals: stageName.trim(), mode: 'insensitive' } },
    select: { id: true },
  });
  let linkedGroupId: string | null = null;
  if (linkedStage && groupName?.trim()) {
    const linkedGroup = await prisma.tournamentGroup.findFirst({
      where: { stageId: linkedStage.id, name: { equals: groupName.trim(), mode: 'insensitive' } },
      select: { id: true },
    });
    linkedGroupId = linkedGroup?.id ?? null;
  }

  let matchId = id;

  const baseData: Record<string, any> = {
    matchNumber,
    overallMatchNumber: overallMatchNumber ?? null,
    stageType: stageType || null,
    groupName: groupName || null,
    mapName,
    matchType,
    format,
    status: fMatchStatus(formData, 'status', 'SCHEDULED'),
    scheduledAt,
    matchTime,
    streamUrl: streamUrl || null,
  };

  // Only include vods if we have a parsed value (avoid sending undefined for Json? field)
  if (vods !== null) {
    baseData.vods = vods;
  }

  try {
    if (id) {
      // Prisma .update() requires relational nested writes for FK fields
      await prisma.match.update({
        where: { id },
        data: {
          ...baseData,
          tournament: { connect: { id: tournamentId } },
          game: { connect: { id: gameId } },
          stage: linkedStage ? { connect: { id: linkedStage.id } } : { disconnect: true },
          group: linkedGroupId ? { connect: { id: linkedGroupId } } : { disconnect: true },
        },
      });
    } else {
      // Prisma .create() accepts scalar FK IDs directly
      const created = await prisma.match.create({
        data: {
          ...baseData,
          tournamentId,
          gameId,
          stageId: linkedStage?.id ?? null,
          groupId: linkedGroupId,
        } as any,
      });
      matchId = created.id;

      // Auto-create initial MatchGame sequence 1
      await prisma.matchGame.create({
        data: {
          matchId: created.id,
          sequence: 1,
          mapName,
          duration: 1680,
        },
      });
    }
  } catch (err: any) {
    console.error('[saveMatch] Prisma error:', err?.message || err);
    console.error('[saveMatch] Data payload:', JSON.stringify(baseData, null, 2));
    throw err;
  }

  revalidatePath('/admin/matches');
  revalidateTournamentPages();
  const stageParam = linkedStage?.id ? `&stageId=${linkedStage.id}` : '';
  redirect(`/admin/matches?edit=${matchId}&tournamentId=${tournamentId}${stageParam}#match-editor`);
}

async function deleteMatch(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  const tournamentId = fStr(formData, 'tournamentId');
  const stageId = fStr(formData, 'stageId');
  if (id) {
    await prisma.matchPlayerStat.deleteMany({
      where: { matchGame: { matchId: id } },
    });
    await prisma.matchTeamResult.deleteMany({
      where: { matchGame: { matchId: id } },
    });
    await prisma.matchGame.deleteMany({ where: { matchId: id } });
    try {
      await prisma.match.delete({ where: { id } });
    } catch {
      redirect('/admin/matches?error=delete-failed');
    }
  }
  revalidatePath('/admin/matches');
  const query = [
    tournamentId ? `tournamentId=${tournamentId}` : '',
    stageId && stageId !== 'ALL' ? `stageId=${stageId}` : '',
  ]
    .filter(Boolean)
    .join('&');
  redirect(query ? `/admin/matches?${query}` : '/admin/matches');
}

async function bulkDeleteMatches(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const idsRaw = fStr(formData, 'matchIds');
  const tournamentId = fStr(formData, 'tournamentId');
  const stageId = fStr(formData, 'stageId');
  if (idsRaw) {
    let matchIds: string[] = [];
    try {
      matchIds = JSON.parse(idsRaw);
    } catch {
      matchIds = idsRaw.split(',').map((s) => s.trim()).filter(Boolean);
    }
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
  }
  revalidatePath('/admin/matches');
  revalidateTournamentPages();
  const query = [
    tournamentId ? `tournamentId=${tournamentId}` : '',
    stageId && stageId !== 'ALL' ? `stageId=${stageId}` : '',
  ]
    .filter(Boolean)
    .join('&');
  redirect(query ? `/admin/matches?${query}` : '/admin/matches');
}

async function saveTeamResult(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const matchGameId = fStr(formData, 'matchGameId');
  const teamId = fStr(formData, 'teamId');
  if (!matchGameId || !teamId) redirect('/admin/matches');

  const rank = fNum(formData, 'rank') ?? 1;
  const isWwcd = formData.get('wwcd') === 'on' || rank === 1;

  let tournamentPointsMatrix: any = null;
  const matchGame = await prisma.matchGame.findUnique({
    where: { id: matchGameId },
    select: { match: { select: { tournament: { select: { formatDetails: true } } } } },
  });
  if (matchGame?.match?.tournament?.formatDetails && typeof matchGame.match.tournament.formatDetails === 'object') {
    tournamentPointsMatrix = (matchGame.match.tournament.formatDetails as any).placementPoints;
  }

  const placePoints = fNum(formData, 'placePoints') ?? getPlacementPoints(rank, tournamentPointsMatrix);
  const elimsPoints = fNum(formData, 'elimsPoints') ?? 0;
  const bonusPoints = fNum(formData, 'bonusPoints') ?? 0;
  const totalPoints = computeTotalPoints({ placePoints, elimsPoints, bonusPoints });

  const smokesUsed = fNum(formData, 'smokesUsed') ?? 0;
  const grenadesUsed = fNum(formData, 'grenadesUsed') ?? 0;
  const molotovsUsed = fNum(formData, 'molotovsUsed') ?? 0;
  const flashUsed = fNum(formData, 'flashUsed') ?? 0;
  const utilitiesTotal = computeUtilitiesTotal({ smokesUsed, grenadesUsed, molotovsUsed, flashUsed });

  const distDrove = fNum(formData, 'distDrove') ?? 0;
  const distWalk = fNum(formData, 'distWalk') ?? 0;
  const totalDist = computeTotalDistance({ distDrove, distWalk });

  const payload = {
    shortCode: fOpt(formData, 'shortCode'),
    mp: fNum(formData, 'mp') ?? 1,
    rank,
    wwcd: isWwcd,
    placePoints,
    elimsPoints,
    bonusPoints,
    totalPoints,
    damage: fNum(formData, 'damage') ?? 0,
    survivalTime: fNum(formData, 'survivalTime') ?? 0,
    healing: fNum(formData, 'healing') ?? 0,
    damageReceived: fNum(formData, 'damageReceived') ?? 0,
    headshots: fNum(formData, 'headshots') ?? 0,
    assists: fNum(formData, 'assists') ?? 0,
    knockouts: fNum(formData, 'knockouts') ?? 0,
    longestElim: fNum(formData, 'longestElim') ?? 0,
    vehicleElims: fNum(formData, 'vehicleElims') ?? 0,
    grenadeElims: fNum(formData, 'grenadeElims') ?? 0,
    smokesUsed,
    grenadesUsed,
    molotovsUsed,
    flashUsed,
    utilitiesTotal,
    airdrops: fNum(formData, 'airdrops') ?? 0,
    rescues: fNum(formData, 'rescues') ?? 0,
    distDrove,
    distWalk,
    totalDist,
    won: isWwcd,
    score: totalPoints,
  };

  await prisma.matchTeamResult.upsert({
    where: {
      matchGameId_teamId: { matchGameId, teamId },
    },
    update: payload,
    create: { matchGameId, teamId, ...payload },
  });

  const mg = await prisma.matchGame.findUnique({
    where: { id: matchGameId },
    select: { matchId: true },
  });

  if (mg?.matchId) {
    await prisma.match.update({
      where: { id: mg.matchId },
      data: { status: 'COMPLETED' },
    }).catch(() => null);
  }

  revalidatePath('/admin/matches');
  revalidateTournamentPages();
  redirect(mg ? `/admin/matches?edit=${mg.matchId}#team-results` : '/admin/matches');
}

async function deleteTeamResult(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  const matchId = fStr(formData, 'matchId');
  if (id) {
    try {
      await prisma.matchTeamResult.delete({ where: { id } });
    } catch (err) {
      if ((err as { code?: string })?.code !== 'P2025') redirect(matchId ? `/admin/matches?edit=${matchId}&error=delete-failed` : '/admin/matches?error=delete-failed');
    }
  }
  revalidatePath('/admin/matches');
  redirect(matchId ? `/admin/matches?edit=${matchId}` : '/admin/matches');
}

async function savePlayerStat(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const matchGameId = fStr(formData, 'matchGameId');
  const playerId = fStr(formData, 'playerId');
  if (!matchGameId || !playerId) redirect('/admin/matches');

  const smokesUsed = fNum(formData, 'smokesUsed') ?? 0;
  const grenadesUsed = fNum(formData, 'grenadesUsed') ?? 0;
  const molotovsUsed = fNum(formData, 'molotovsUsed') ?? 0;
  const flashUsed = fNum(formData, 'flashUsed') ?? 0;
  const utilitiesTotal = computeUtilitiesTotal({ smokesUsed, grenadesUsed, molotovsUsed, flashUsed });

  const distDrove = fNum(formData, 'distDrove') ?? 0;
  const distWalk = fNum(formData, 'distWalk') ?? 0;
  const totalDist = computeTotalDistance({ distDrove, distWalk });

  const playerElims = fNum(formData, 'playerElims') ?? 0;

  const payload = {
    teamId: fOpt(formData, 'teamId'),
    shortCode: fOpt(formData, 'shortCode'),
    role: fOpt(formData, 'role'),
    mp: fNum(formData, 'mp') ?? 1,
    playerElims,
    teamRank: fNum(formData, 'teamRank') ?? 0,
    teamWwcd: formData.get('teamWwcd') === 'on',
    teamPlacePoints: fNum(formData, 'teamPlacePoints') ?? 0,
    teamElimsPoints: fNum(formData, 'teamElimsPoints') ?? 0,
    teamBonusPoints: fNum(formData, 'teamBonusPoints') ?? 0,
    teamTotalPoints: fNum(formData, 'teamTotalPoints') ?? 0,
    damage: fNum(formData, 'damage') ?? 0,
    survivalTime: fNum(formData, 'survivalTime') ?? 0,
    healing: fNum(formData, 'healing') ?? 0,
    damageReceived: fNum(formData, 'damageReceived') ?? 0,
    headshots: fNum(formData, 'headshots') ?? 0,
    assists: fNum(formData, 'assists') ?? 0,
    knockouts: fNum(formData, 'knockouts') ?? 0,
    longestElim: fNum(formData, 'longestElim') ?? 0,
    vehicleElims: fNum(formData, 'vehicleElims') ?? 0,
    grenadeElims: fNum(formData, 'grenadeElims') ?? 0,
    smokesUsed,
    grenadesUsed,
    molotovsUsed,
    flashUsed,
    utilitiesTotal,
    airdrops: fNum(formData, 'airdrops') ?? 0,
    rescues: fNum(formData, 'rescues') ?? 0,
    distDrove,
    distWalk,
    totalDist,
    isMvp: formData.get('isMvp') === 'on',
    playerPowerplay: fNum(formData, 'playerPowerplay') ?? 0,
    kills: playerElims,
  };

  await prisma.matchPlayerStat.upsert({
    where: {
      matchGameId_playerId: { matchGameId, playerId },
    },
    update: payload,
    create: { matchGameId, playerId, ...payload },
  });

  const mg = await prisma.matchGame.findUnique({
    where: { id: matchGameId },
    select: { matchId: true },
  });

  revalidatePath('/admin/matches');
  redirect(mg ? `/admin/matches?edit=${mg.matchId}#player-stats` : '/admin/matches');
}

async function deletePlayerStat(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  const matchId = fStr(formData, 'matchId');
  if (id) {
    try {
      await prisma.matchPlayerStat.delete({ where: { id } });
    } catch (err) {
      if ((err as { code?: string })?.code !== 'P2025') redirect(matchId ? `/admin/matches?edit=${matchId}&error=delete-failed` : '/admin/matches?error=delete-failed');
    }
  }
  revalidatePath('/admin/matches');
  redirect(matchId ? `/admin/matches?edit=${matchId}` : '/admin/matches');
}

async function importBatchTeamResultsAction(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const matchId = fStr(formData, 'matchId');
  const matchGameId = fStr(formData, 'matchGameId');
  const replaceExisting = fStr(formData, 'replaceExisting') === 'true';
  const rowsJson = fStr(formData, 'rowsJson');

  if (!matchGameId || !rowsJson) redirect(matchId ? `/admin/matches?edit=${matchId}` : '/admin/matches');

  let rows: any[] = [];
  try {
    rows = JSON.parse(rowsJson);
  } catch {
    redirect(`/admin/matches?error=json&field=team-results${matchId ? `&edit=${matchId}` : ''}`);
  }

  if (rows.length > 0) {
    await prisma.$transaction(async (tx) => {
      if (replaceExisting) {
        await tx.matchTeamResult.deleteMany({ where: { matchGameId } });
      }

      for (const r of rows) {
        if (!r.teamId) continue;
        const rank = Number(r.rank || 1);
        const isWwcd = r.wwcd === true || rank === 1;
        const placePoints = Number(r.placePoints || 0);
        const elimsPoints = Number(r.elimsPoints || 0);
        const bonusPoints = Number(r.bonusPoints || 0);
        const totalPoints = Number(r.totalPoints || (placePoints + elimsPoints + bonusPoints));

        const smokesUsed = Number(r.smokesUsed || 0);
        const grenadesUsed = Number(r.grenadesUsed || 0);
        const molotovsUsed = Number(r.molotovsUsed || 0);
        const flashUsed = Number(r.flashUsed || 0);
        const utilitiesTotal = computeUtilitiesTotal({ smokesUsed, grenadesUsed, molotovsUsed, flashUsed });

        const distDrove = Number(r.distDrove || 0);
        const distWalk = Number(r.distWalk || 0);
        const totalDist = computeTotalDistance({ distDrove, distWalk });

        const payload = {
          shortCode: r.shortCode || null,
          mp: Number(r.mp || 1),
          rank,
          wwcd: isWwcd,
          placePoints,
          elimsPoints,
          bonusPoints,
          totalPoints,
          damage: Number(r.damage || 0),
          survivalTime: Number(r.survivalTime || 1680),
          healing: Number(r.healing || 0),
          damageReceived: Number(r.damageReceived || 0),
          headshots: Number(r.headshots || 0),
          assists: Number(r.assists || 0),
          knockouts: Number(r.knockouts || 0),
          longestElim: Number(r.longestElim || 0),
          vehicleElims: Number(r.vehicleElims || 0),
          grenadeElims: Number(r.grenadeElims || 0),
          smokesUsed,
          grenadesUsed,
          molotovsUsed,
          flashUsed,
          utilitiesTotal,
          airdrops: Number(r.airdrops || 0),
          rescues: Number(r.rescues || 0),
          distDrove,
          distWalk,
          totalDist,
          won: isWwcd,
          score: totalPoints,
        };

        if (!replaceExisting) {
          // One result row per (game, team) — DB-enforced, race-safe upsert.
          await tx.matchTeamResult.upsert({
            where: {
              matchGameId_teamId: { matchGameId, teamId: r.teamId },
            },
            update: payload,
            create: {
              matchGameId,
              teamId: r.teamId,
              ...payload,
            },
          });
          continue;
        }

        await tx.matchTeamResult.create({
          data: {
            matchGameId,
            teamId: r.teamId,
            ...payload,
          },
        });
      }
    }, {
      maxWait: 15000,
      timeout: 60000,
    });

    // Automatically set match status to COMPLETED once full team scorecards are saved
    if (matchId) {
      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'COMPLETED' },
      }).catch(() => null);
    }
  }

  revalidatePath('/admin/matches');
  revalidateTournamentPages();
  redirect(matchId ? `/admin/matches?edit=${matchId}#team-results` : '/admin/matches');
}

async function importBatchPlayerStatsAction(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const matchId = fStr(formData, 'matchId');
  const matchGameId = fStr(formData, 'matchGameId');
  const replaceExisting = fStr(formData, 'replaceExisting') === 'true';
  const rowsJson = fStr(formData, 'rowsJson');

  if (!matchGameId || !rowsJson) redirect(matchId ? `/admin/matches?edit=${matchId}` : '/admin/matches');

  let rows: any[] = [];
  try {
    rows = JSON.parse(rowsJson);
  } catch {
    redirect(`/admin/matches?error=json&field=player-stats${matchId ? `&edit=${matchId}` : ''}`);
  }

  if (rows.length > 0) {
    await prisma.$transaction(async (tx) => {
      if (replaceExisting) {
        await tx.matchPlayerStat.deleteMany({ where: { matchGameId } });
      }

      for (const r of rows) {
        if (!r.playerId) continue;
        const playerElims = Number(r.playerElims || r.elims || 0);

        const smokesUsed = Number(r.smokesUsed || 0);
        const grenadesUsed = Number(r.grenadesUsed || 0);
        const molotovsUsed = Number(r.molotovsUsed || 0);
        const flashUsed = Number(r.flashUsed || 0);
        const utilitiesTotal = computeUtilitiesTotal({ smokesUsed, grenadesUsed, molotovsUsed, flashUsed });

        const distDrove = Number(r.distDrove || 0);
        const distWalk = Number(r.distWalk || 0);
        const totalDist = computeTotalDistance({ distDrove, distWalk });

        const payload = {
          teamId: r.teamId || null,
          shortCode: r.shortCode || null,
          role: r.role || null,
          mp: Number(r.mp || 1),
          playerElims,
          teamRank: Number(r.teamRank || 0),
          teamWwcd: r.teamWwcd === true,
          teamPlacePoints: Number(r.teamPlacePoints || 0),
          teamElimsPoints: Number(r.teamElimsPoints || 0),
          teamBonusPoints: Number(r.teamBonusPoints || 0),
          teamTotalPoints: Number(r.teamTotalPoints || 0),
          damage: Number(r.damage || 0),
          survivalTime: Number(r.survivalTime || 0),
          healing: Number(r.healing || 0),
          damageReceived: Number(r.damageReceived || 0),
          headshots: Number(r.headshots || 0),
          assists: Number(r.assists || 0),
          knockouts: Number(r.knockouts || 0),
          longestElim: Number(r.longestElim || 0),
          vehicleElims: Number(r.vehicleElims || 0),
          grenadeElims: Number(r.grenadeElims || 0),
          smokesUsed,
          grenadesUsed,
          molotovsUsed,
          flashUsed,
          utilitiesTotal,
          airdrops: Number(r.airdrops || 0),
          rescues: Number(r.rescues || 0),
          distDrove,
          distWalk,
          totalDist,
          isMvp: r.isMvp === true,
          playerPowerplay: Number(r.playerPowerplay || 0),
          kills: playerElims,
        };

        if (!replaceExisting) {
          // One stat row per (game, player) — DB-enforced, race-safe upsert.
          await tx.matchPlayerStat.upsert({
            where: {
              matchGameId_playerId: { matchGameId, playerId: r.playerId },
            },
            update: payload,
            create: {
              matchGameId,
              playerId: r.playerId,
              ...payload,
            },
          });
          continue;
        }

        await tx.matchPlayerStat.create({
          data: {
            matchGameId,
            playerId: r.playerId,
            ...payload,
          },
        });
      }
    }, {
      maxWait: 15000,
      timeout: 60000,
    });
  }

  revalidatePath('/admin/matches');
  revalidateTournamentPages();
  redirect(matchId ? `/admin/matches?edit=${matchId}#player-stats` : '/admin/matches');
}

// ---------------------------------------------------------------- page

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string;
    error?: string;
    field?: string;
    tournamentId?: string;
    stage?: string;
    stageId?: string;
    openNew?: string;
  }>;
}) {
  const { edit, error, field, tournamentId, stage, stageId, openNew } = await searchParams;

  const [games, teams, players, editing, preSelectedTourney, allTournamentsLight] = await Promise.all([
    prisma.game.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } }),
    edit
      ? prisma.team.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, tag: true }, take: 1000 })
      : Promise.resolve([]),
    edit
      ? prisma.player.findMany({
          orderBy: { ign: 'asc' },
          select: { id: true, ign: true, role: true, currentTeamId: true, currentTeam: { select: { tag: true } } },
          take: 1000,
        })
      : Promise.resolve([]),
    edit
      ? prisma.match.findUnique({
          where: { id: edit },
          include: {
            tournament: { select: { id: true, name: true, slug: true, gameId: true, prizeDistribution: true, formatDetails: true } },
            game: { select: { id: true, name: true, slug: true } },
            stage: { select: { name: true } },
            group: { select: { name: true } },
            games: {
              orderBy: { sequence: 'asc' },
              include: {
                teamResults: {
                  orderBy: { rank: 'asc' },
                  include: { team: { select: { name: true, tag: true, logoUrl: true } } },
                },
                playerStats: {
                  orderBy: { playerElims: 'desc' },
                  include: { player: { select: { ign: true, avatarUrl: true } }, team: { select: { name: true, tag: true } } },
                },
              },
            },
          },
        })
      : null,
    tournamentId
      ? prisma.tournament.findUnique({
          where: { id: tournamentId },
          select: { id: true, name: true, slug: true, gameId: true },
        })
      : Promise.resolve(null),
    prisma.tournament.findMany({
      // Selector list for the grouped matches view — carries match counts and
      // stages (the on-demand picker needs both), but skips heavy payloads.
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        gameId: true,
        stages: {
          orderBy: { sequence: 'asc' },
          select: { id: true, name: true, _count: { select: { matches: true } } },
        },
        _count: { select: { matches: true } },
      },
      take: 1000,
    }),
  ]);

  // Fetch sibling matches in the same tournament for quick standings reuse / cloning.
  // Only the first game of each match is consumed by the mapping below — take: 1
  // keeps the query from dragging in every game's full stat rows.
  const otherTournamentMatches = editing?.tournamentId
    ? await prisma.match.findMany({
        where: { tournamentId: editing.tournamentId },
        orderBy: { matchNumber: 'asc' },
        select: {
          id: true,
          format: true,
          matchNumber: true,
          mapName: true,
          games: {
            take: 1,
            orderBy: { sequence: 'asc' },
            select: {
              teamResults: { include: { team: { select: { name: true, tag: true } } } },
              playerStats: { include: { player: { select: { ign: true } }, team: { select: { name: true, tag: true } } } },
            },
          },
        },
      }).then((list) =>
        list.map((m) => ({
          id: m.id,
          format: m.format,
          matchNumber: m.matchNumber,
          mapName: m.mapName,
          teamResults: m.games[0]?.teamResults || [],
          playerStats: m.games[0]?.playerStats || [],
        }))
      )
    : [];

  const activeMatchGame = editing?.games[0];

  let tournamentPointsMatrix: any = undefined;
  const editingFormatDetails = editing?.tournament?.formatDetails;
  // Reads every historical kill-multiplier key (killPointsPerElim, killMultiplier,
  // killPoints, killPointsMultiplier) so old tournaments keep scoring correctly.
  const tournamentKillMultiplier = readKillMultiplier(editingFormatDetails);
  if (editingFormatDetails && typeof editingFormatDetails === 'object') {
    const fd = editingFormatDetails as any;
    if (fd.placementPoints) tournamentPointsMatrix = fd.placementPoints;
  }

  // Tournaments of the initially-relevant game feed the editor's cascade
  // (with stages); the grouped-list selector uses the light global list.
  const initialGameId = editing?.gameId || preSelectedTourney?.gameId || games[0]?.id || '';
  const tournaments = initialGameId
    ? await prisma.tournament.findMany({
        where: { gameId: initialGameId },
        orderBy: { startDate: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          gameId: true,
          prizeDistribution: true,
          stages: {
            orderBy: { sequence: 'asc' },
            select: { id: true, name: true, _count: { select: { matches: true } } },
          },
          _count: { select: { matches: true } },
        },
      })
    : [];

  const matchPlayerOptions = players.map((p) => ({
    value: p.id,
    label: p.ign,
    keywords: p.currentTeam?.tag ? `[${p.currentTeam.tag}]` : undefined,
  }));

  const matchTeamOptions = teams.map((t) => ({
    value: t.id,
    label: t.name,
    keywords: t.tag ? `[${t.tag}]` : undefined,
  }));

  const effectiveTournamentId = tournamentId || editing?.tournamentId;
  const effectiveStageId = stageId || (stage ? stage : undefined);
  const selectedTourney = tournaments.find((t) => t.id === effectiveTournamentId);
  const isLargeTourney = (selectedTourney?._count?.matches ?? 0) > 100;
  const hasStages = (selectedTourney?.stages?.length ?? 0) > 0;

  // On-demand matches loading:
  // If no tournament is selected, skip querying matches (near 0ms initial load).
  // If tournament has >100 matches and no stage is selected, prompt stage selection instead of dragging in 150+ matches.
  const shouldSkipMatches =
    !effectiveTournamentId || (isLargeTourney && (!effectiveStageId || effectiveStageId === 'ALL') && hasStages && !edit);

  const allMatchesList = shouldSkipMatches
    ? []
    : await prisma.match.findMany({
        where: {
          tournamentId: effectiveTournamentId,
          ...(effectiveStageId && effectiveStageId !== 'ALL'
            ? {
                OR: [
                  { stageId: effectiveStageId },
                  { stage: { name: effectiveStageId } },
                ],
              }
            : {}),
        },
        orderBy: [{ matchNumber: 'asc' }, { scheduledAt: 'asc' }],
        take: 300,
        include: {
          tournament: { select: { id: true, name: true, slug: true } },
          game: { select: { id: true, name: true, slug: true } },
          stage: { select: { id: true, name: true } },
          games: {
            orderBy: { sequence: 'asc' },
            include: {
              _count: { select: { teamResults: true, playerStats: true } },
            },
          },
        },
      });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Swords className="w-5 h-5 text-(--ed-blue)" /> Match &amp; Scorecard Engine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record match metadata, team placement/finishes, and deep individual player battle royale statistics.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/matches/matrix"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md hover:shadow-indigo-600/25"
          >
            ⚡ Multi-Match Fast Matrix
          </Link>
          {editing && (
            <Link
              href="/admin/matches"
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2"
            >
              + New match instead
            </Link>
          )}
        </div>
      </div>

      {error === 'required' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          Tournament, game and scheduled time are required.
        </p>
      )}
      {error === 'delete-failed' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          The record could not be deleted — it was already removed or is still referenced by another entry.
        </p>
      )}
      {error === 'json' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          An uploaded data payload{field ? ` (${field})` : ''} could not be parsed, so nothing was
          imported. Fix the JSON in the importer and try again.
        </p>
      )}

      {/* Match Form */}
      <details
        id="match-editor"
        key={editing?.id || (openNew ? `open-${openNew}` : 'closed')}
        open={Boolean(editing || openNew)}
        className="group scroll-mt-6"
      >
        <summary className="cursor-pointer select-none inline-flex items-center gap-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          {editing
            ? `Editing: ${editing.format} · ${editing.tournament.name}`
            : preSelectedTourney
            ? `Create Match for ${preSelectedTourney.name}`
            : 'Create New Match'}
        </summary>

        {/* 1. Match Information Form */}
        <form
          key={editing?.id || tournamentId || stage || 'new-form'}
          action={saveMatch}
          className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm p-6 space-y-6"
        >
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <MatchInfoInputs
            allGames={games}
            allTournaments={tournaments as any}
            initialGameId={editing?.gameId || preSelectedTourney?.gameId}
            initialTournamentId={editing?.tournamentId || tournamentId}
            initialStageName={
              editing?.stage?.name ||
              (editing?.format ? editing.format.split(' · ')[1]?.split(' (')[0] : stage || 'Grand Finals')
            }
            initialStageType={editing?.stageType ?? ''}
            initialGroupName={editing?.groupName || ''}
            initialMatchNumber={editing?.matchNumber || 1}
            initialOverallMatchNumber={editing?.overallMatchNumber || undefined}
            initialMapName={editing?.mapName || 'Erangel'}
            initialMatchType={editing?.matchType || 'LAN'}
            initialScheduledAt={editing?.scheduledAt?.toISOString()}
            initialMatchTime={editing?.matchTime || ''}
            initialVods={editing?.vods as any}
            initialStatus={editing?.status || 'SCHEDULED'}
          />

          {/* Floating Sticky Save Dock for Match Info */}
          <div className="sticky bottom-4 z-40 p-3 rounded-2xl bg-white/95 dark:bg-[#0b101c]/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 shadow-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="truncate">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                  {editing ? `Editing Match: ${editing.format}` : 'New Match Draft'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {editing ? 'Save match info or enter team standings below' : 'Click save to initialize scorecard'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {editing && (
                <Link
                  href="/admin/matches"
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </Link>
              )}
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-(--ed-blue) hover:brightness-110 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-(--ed-blue)/25 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{editing ? 'Update Match Info' : 'Create Match & Scorecard'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* 2. Team & Player Match Scorecard Entry (Only for active editing match) */}
        {editing && activeMatchGame && (
          <div className="mt-6 space-y-6">
            {/* Batch Table / Excel / JSON Importer (With Clone / Duplicate Support) */}
            <MatchBatchImporter
              matchId={editing.id}
              matchGameId={activeMatchGame.id}
              allTeams={teams}
              allPlayers={players}
              pointsMatrix={tournamentPointsMatrix}
              killMultiplier={tournamentKillMultiplier}
              importTeamResultsAction={importBatchTeamResultsAction}
              importPlayerStatsAction={importBatchPlayerStatsAction}
              existingTeamResults={activeMatchGame.teamResults}
              existingPlayerStats={activeMatchGame.playerStats}
              otherMatches={otherTournamentMatches}
            />

            {/* 2. Interactive Inline Scorecard Editor for Team Results & Player Stats */}
            <MatchInlineScorecardEditor
              matchId={editing.id}
              matchGameId={activeMatchGame.id}
              initialTeamResults={activeMatchGame.teamResults as any}
              initialPlayerStats={activeMatchGame.playerStats as any}
              pointsMatrix={tournamentPointsMatrix}
              killMultiplier={tournamentKillMultiplier}
            />

            {/* Manual Single Player Performance Form */}
            <details className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-4 shadow-sm group">
              <summary className="text-xs font-black uppercase tracking-wider text-slate-500 hover:text-(--ed-blue) cursor-pointer select-none flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> + Manually Add Individual Player Performance Row
              </summary>
              <form action={savePlayerStat} className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-3 space-y-3">
                <input type="hidden" name="matchGameId" value={activeMatchGame.id} />
                <p className="text-[11px] font-bold uppercase text-slate-400">
                  + Add Single Player Match Performance
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  <div className="col-span-2">
                    <label className={labelCls}>Player *</label>
                    <Combobox
                      name="playerId"
                      options={matchPlayerOptions}
                      searchUrl="/api/admin/search?type=player"
                      placeholder="Type player IGN…"
                      ariaLabel="Player"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Team</label>
                    <Combobox
                      name="teamId"
                      options={matchTeamOptions}
                      searchUrl="/api/admin/search?type=team"
                      emptyOptionLabel="— Select Team —"
                      placeholder="Type team name…"
                      ariaLabel="Team"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Eliminations *</label>
                    <input type="number" name="playerElims" defaultValue={0} min={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Damage</label>
                    <input type="number" name="damage" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>MVP?</label>
                    <label className="flex items-center gap-1.5 mt-2 cursor-pointer text-xs">
                      <input type="checkbox" name="isMvp" className="rounded text-(--ed-blue)" />
                      <span>Best Player ⭐</span>
                    </label>
                  </div>
                  <div>
                    <label className={labelCls}>Powerplay (Zone 1)</label>
                    <input type="number" name="playerPowerplay" defaultValue={0} className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  <div>
                    <label className={labelCls}>Survival Time (s)</label>
                    <input type="number" name="survivalTime" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Healing (HP)</label>
                    <input type="number" name="healing" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Dmg Received</label>
                    <input type="number" name="damageReceived" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Vehicle Elims</label>
                    <input type="number" name="vehicleElims" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Grenade Elims</label>
                    <input type="number" name="grenadeElims" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Headshots</label>
                    <input type="number" name="headshots" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Assists</label>
                    <input type="number" name="assists" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Knockouts</label>
                    <input type="number" name="knockouts" defaultValue={0} className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  <div>
                    <label className={labelCls}>Longest Elim (m)</label>
                    <input type="number" step="any" name="longestElim" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Smokes</label>
                    <input type="number" name="smokesUsed" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Grenades</label>
                    <input type="number" name="grenadesUsed" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Molotovs</label>
                    <input type="number" name="molotovsUsed" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Flash</label>
                    <input type="number" name="flashUsed" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Airdrops</label>
                    <input type="number" name="airdrops" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Rescues</label>
                    <input type="number" name="rescues" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Dist Walk (m)</label>
                    <input type="number" name="distWalk" defaultValue={0} className={inputCls} />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase transition-colors shadow-sm"
                  >
                    Save Player Performance
                  </button>
                </div>
              </form>
            </details>
          </div>
        )}
      </details>

      {/* ═══ CATEGORIZED MATCHES UNDER TOURNAMENTS > STAGES ═══ */}
      <MatchGroupedList
        matches={allMatchesList as any}
        allTournaments={allTournamentsLight as any}
        currentTournamentId={effectiveTournamentId}
        currentStageId={effectiveStageId}
        deleteMatchAction={deleteMatch}
        bulkDeleteMatchesAction={bulkDeleteMatches}
        duplicateMatchAction={duplicateMatch}
        updateMatchStatusAction={updateMatchStatus}
      />
    </div>
  );
}
