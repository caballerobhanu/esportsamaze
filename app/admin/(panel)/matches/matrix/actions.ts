'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import {
  getPlacementPoints,
  computeTotalPoints,
  computeUtilitiesTotal,
  computeTotalDistance,
} from '@/lib/tournament-math';

export interface MatrixCellSavePayload {
  teamId: string;
  rank: number;
  wwcd?: boolean;
  placePoints?: number;
  elimsPoints?: number;
  bonusPoints?: number;
  totalPoints?: number;
  damage?: number;
  survivalTime?: number;
  healing?: number;
  damageReceived?: number;
  headshots?: number;
  assists?: number;
  knockouts?: number;
  longestElim?: number;
  vehicleElims?: number;
  grenadeElims?: number;
  smokesUsed?: number;
  grenadesUsed?: number;
  molotovsUsed?: number;
  flashUsed?: number;
  airdrops?: number;
  rescues?: number;
  distDrove?: number;
  distWalk?: number;
}

export interface MatchMatrixSavePayload {
  matchId: string;
  matchGameId: string;
  status?: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'POSTPONED';
  results: MatrixCellSavePayload[];
}

export interface BulkUniversalRowInput {
  Tournament: string;
  Stage?: string;
  Date?: string;
  TimeFormat?: string;
  Time?: string;
  OverallMatch?: number | string;
  StageMatch?: number | string;
  Map?: string;
  Group?: string;
  team: string;
  rank: number | string;
  wwcd?: boolean | number | string;
  placePoints?: number | string;
  elims?: number | string;
  bonusPoints?: number | string;
  totalPoints?: number | string;
  survivalTime?: number | string;
  damage?: number | string;
  healing?: number | string;
  damageReceived?: number | string;
  headshots?: number | string;
  assists?: number | string;
  knockouts?: number | string;
  longestElim?: number | string;
  vehicleElims?: number | string;
  grenadeElims?: number | string;
  smokesUsed?: number | string;
  grenadesUsed?: number | string;
  molotovsUsed?: number | string;
  flashUsed?: number | string;
  airdrops?: number | string;
  rescues?: number | string;
  distDrove?: number | string;
  distWalk?: number | string;
  [key: string]: any;
}

export interface BulkUniversalImportResult {
  success: boolean;
  message: string;
  insertedCount: number;
  tournamentsCount: number;
  matchesCount: number;
  errors?: string[];
}

// -------------------------------------------------------------
// Universal Date & Time Parser supporting DD-MM-YYYY, YYYY-MM-DD, 12h/24h and Timezones
// -------------------------------------------------------------
function parseUniversalDateAndTime(
  dateStr?: any,
  timeStr?: any,
  timeFormatStr?: any
): { scheduledAt: Date; matchTime: string } {
  let cleanTime = String(timeStr || '').trim();
  const cleanTz = String(timeFormatStr || '').trim().toUpperCase() || 'IST';

  if (!cleanTime) {
    cleanTime = `17:30 ${cleanTz}`;
  } else if (!cleanTime.toUpperCase().includes(cleanTz) && !cleanTime.toUpperCase().includes('UTC')) {
    cleanTime = `${cleanTime} ${cleanTz}`;
  }

  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1; // 1-indexed
  let day = new Date().getDate();

  if (dateStr != null && String(dateStr).trim() !== '') {
    const s = String(dateStr).trim();

    // 1. Check DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
    const ddmmyyyyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (ddmmyyyyMatch) {
      day = parseInt(ddmmyyyyMatch[1], 10);
      month = parseInt(ddmmyyyyMatch[2], 10);
      year = parseInt(ddmmyyyyMatch[3], 10);
    } else {
      // 2. Check YYYY-MM-DD
      const yyyymmddMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
      if (yyyymmddMatch) {
        year = parseInt(yyyymmddMatch[1], 10);
        month = parseInt(yyyymmddMatch[2], 10);
        day = parseInt(yyyymmddMatch[3], 10);
      } else {
        const std = new Date(s);
        if (!isNaN(std.getTime())) {
          year = std.getUTCFullYear();
          month = std.getUTCMonth() + 1;
          day = std.getUTCDate();
        }
      }
    }
  }

  // Parse Hours & Minutes
  let hours = 17;
  let minutes = 30;

  if (timeStr != null && String(timeStr).trim() !== '') {
    const timeMatch = String(timeStr).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[4]?.toLowerCase();
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
    }
  }

  // Timezone offsets in minutes
  const tzOffsets: Record<string, number> = {
    IST: 330, // UTC+5:30
    AST: 180, // UTC+3:00
    GST: 240, // UTC+4:00
    BST: 360, // UTC+6:00
    PKT: 300, // UTC+5:00
    NPT: 345, // UTC+5:45
    SGT: 480, // UTC+8:00
    MYT: 480, // UTC+8:00
    PHT: 480, // UTC+8:00
    ICT: 420, // UTC+7:00
    WIB: 420, // UTC+7:00
    KST: 540, // UTC+9:00
    JST: 540, // UTC+9:00
    CST: 480, // UTC+8:00
    HKT: 480, // UTC+8:00
    GMT: 0,
    UTC: 0,
    CET: 60,
    CEST: 120,
    EST: -300,
    EDT: -240,
    PST: -480,
    PDT: -420,
  };

  const offsetMinutes = tzOffsets[cleanTz] ?? 330;
  const utcTimestamp = Date.UTC(year, month - 1, day, hours, minutes) - offsetMinutes * 60 * 1000;
  const scheduledDate = new Date(utcTimestamp);

  return {
    scheduledAt: scheduledDate,
    matchTime: cleanTime,
  };
}

// -------------------------------------------------------------
// Universal Zero-Select Bulk Importer (Excel TSV & JSON)
// -------------------------------------------------------------
export async function bulkUniversalMatchImportAction(
  rows: BulkUniversalRowInput[]
): Promise<BulkUniversalImportResult> {
  if (!(await isAdmin())) {
    redirect('/admin/login');
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      success: false,
      message: 'No valid data rows provided to import.',
      insertedCount: 0,
      tournamentsCount: 0,
      matchesCount: 0,
    };
  }

  try {
    const [allTournaments, allTeams, defaultGame] = await Promise.all([
      prisma.tournament.findMany({
        include: {
          stages: true,
          matches: {
            include: {
              games: { select: { id: true, sequence: true } },
            },
          },
        },
      }),
      prisma.team.findMany({
        select: { id: true, name: true, tag: true, slug: true },
      }),
      prisma.game.findFirst({
        where: { slug: 'bgmi' },
        select: { id: true },
      }).then(async (bgmi) => bgmi || (await prisma.game.findFirst({ select: { id: true } }))),
    ]);

    if (!defaultGame) {
      return {
        success: false,
        message: 'No game configured in system. Please create a game first.',
        insertedCount: 0,
        tournamentsCount: 0,
        matchesCount: 0,
      };
    }

    const errors: string[] = [];
    const affectedTournaments = new Set<string>();
    const affectedMatches = new Set<string>();
    let totalInsertedResults = 0;

    const cleanStr = (s: any) =>
      String(s || '')
        .trim()
        .toLowerCase()
        .replace(/^\[|\]$/g, '')
        .replace(/[\-_]/g, ' ');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const tourneyRaw = row.Tournament || row.tournament || row.tourney || '';
      const teamRaw = row.team || row.Team || row.teamName || row.tag || '';

      if (!tourneyRaw || !teamRaw) {
        errors.push(`Row ${rowNum}: Missing tournament or team name.`);
        continue;
      }

      // Match tournament
      const cleanTourneyName = cleanStr(tourneyRaw);
      let matchedTourney = allTournaments.find((t) => {
        const n = cleanStr(t.name);
        const sl = cleanStr(t.slug);
        return n === cleanTourneyName || sl === cleanTourneyName || n.includes(cleanTourneyName) || cleanTourneyName.includes(n);
      });

      if (!matchedTourney) {
        errors.push(`Row ${rowNum}: Tournament "${tourneyRaw}" not found in database.`);
        continue;
      }

      affectedTournaments.add(matchedTourney.id);

      // Point rules
      let pointsMatrix: Record<number, number> | undefined = undefined;
      let killMultiplier = 1;
      if (matchedTourney.formatDetails && typeof matchedTourney.formatDetails === 'object') {
        const fd = matchedTourney.formatDetails as any;
        pointsMatrix = fd.pointsMatrix || fd.placementPoints || undefined;
        killMultiplier = Number(fd.killPointsPerElim || fd.killMultiplier) || 1;
      }

      // Match or Create Stage
      const stageRaw = (row.Stage || row.stage || 'Grand Finals').trim();
      let matchedStage = matchedTourney.stages.find(
        (s) => cleanStr(s.name) === cleanStr(stageRaw) || cleanStr(s.name).includes(cleanStr(stageRaw))
      );

      if (!matchedStage) {
        const stageSeq = matchedTourney.stages.length + 1;
        matchedStage = await prisma.tournamentStage.create({
          data: {
            tournamentId: matchedTourney.id,
            name: stageRaw,
            sequence: stageSeq,
            formatType: 'Battle Royale Points Table',
            stageType: 'GROUPS_WISE',
          },
        });
        matchedTourney.stages.push(matchedStage);
      }

      // Match or Create Match
      const matchNum =
        Number(String(row.StageMatch || row.matchNumber || row.stageMatch || 1).replace(/[^\d]/g, '')) || 1;
      const overallMatchNum =
        row.OverallMatch || row.overallMatch
          ? Number(String(row.OverallMatch || row.overallMatch).replace(/[^\d]/g, ''))
          : null;
      const mapName = (row.Map || row.map || row.mapName || 'Erangel').trim();
      const groupName = row.Group || row.group ? String(row.Group || row.group).trim() : null;

      // Robust Date and Time Parsing (handles DD-MM-YYYY, YYYY-MM-DD, 15:40 IST, etc.)
      const { scheduledAt, matchTime } = parseUniversalDateAndTime(
        row.Date || row.date,
        row.Time || row.time,
        row.TimeFormat || row.timeFormat
      );

      let matchedMatch = matchedTourney.matches.find(
        (m) =>
          m.matchNumber === matchNum &&
          (m.stageId === matchedStage!.id || !m.stageId) &&
          (!groupName || m.groupName === groupName)
      );

      let matchGameId: string;

      if (!matchedMatch) {
        const formatTitle = `Match ${matchNum} (${mapName}) · ${stageRaw}${
          overallMatchNum ? ` · Overall #${overallMatchNum}` : ''
        }${groupName ? ` (${groupName})` : ''}`;

        const newMatch = await prisma.match.create({
          data: {
            tournamentId: matchedTourney.id,
            gameId: matchedTourney.gameId || defaultGame.id,
            stageId: matchedStage.id,
            matchNumber: matchNum,
            overallMatchNumber: overallMatchNum,
            stageType: 'GROUPS_WISE',
            groupName: groupName || undefined,
            mapName,
            matchType: 'LAN',
            format: formatTitle,
            status: 'COMPLETED',
            scheduledAt,
            matchTime,
          },
        });

        const newGame = await prisma.matchGame.create({
          data: {
            matchId: newMatch.id,
            sequence: 1,
            mapName,
            duration: Number(row.survivalTime) || 1680,
          },
        });

        matchGameId = newGame.id;
        matchedTourney.matches.push({
          ...newMatch,
          games: [newGame],
        } as any);
      } else {
        matchGameId = matchedMatch.games[0]?.id;
        if (!matchGameId) {
          const newGame = await prisma.matchGame.create({
            data: {
              matchId: matchedMatch.id,
              sequence: 1,
              mapName,
              duration: Number(row.survivalTime) || 1680,
            },
          });
          matchGameId = newGame.id;
        }

        await prisma.match.update({
          where: { id: matchedMatch.id },
          data: {
            status: 'COMPLETED',
            scheduledAt,
            matchTime,
          },
        }).catch(() => null);
      }

      affectedMatches.add(matchGameId);

      // Match Team
      const cleanTeamInput = cleanStr(teamRaw);
      let matchedTeam = allTeams.find((t) => {
        const tn = cleanStr(t.name);
        const tag = cleanStr(t.tag || '');
        return tn === cleanTeamInput || tag === cleanTeamInput || tn.includes(cleanTeamInput) || cleanTeamInput.includes(tn);
      });

      if (!matchedTeam) {
        const autoTag = teamRaw.length <= 5 ? teamRaw.toUpperCase() : teamRaw.slice(0, 3).toUpperCase();
        matchedTeam = await prisma.team.create({
          data: {
            name: teamRaw.trim(),
            tag: autoTag,
            slug: cleanStr(teamRaw).replace(/\s+/g, '-'),
            gameId: defaultGame.id,
          },
        });
        allTeams.push(matchedTeam);
      }

      // Compute Points & Stats
      const rank = Number(row.rank) || 1;
      const isWwcd =
        row.wwcd != null && String(row.wwcd).trim() !== ''
          ? row.wwcd === true || row.wwcd === 1 || String(row.wwcd).toLowerCase() === 'true' || String(row.wwcd).toLowerCase() === 'yes'
          : rank === 1;

      const placePoints =
        row.placePoints != null && String(row.placePoints).trim() !== ''
          ? Number(row.placePoints)
          : getPlacementPoints(rank, pointsMatrix);

      const elimsCount = Number(row.elims || row.kills || 0);
      const elimsPoints = elimsCount * killMultiplier;
      const bonusPoints = Number(row.bonusPoints || 0);
      const totalPoints =
        row.totalPoints != null && String(row.totalPoints).trim() !== ''
          ? Number(row.totalPoints)
          : computeTotalPoints({ placePoints, elimsPoints, bonusPoints });

      const smokesUsed = Number(row.smokesUsed || 0);
      const grenadesUsed = Number(row.grenadesUsed || 0);
      const molotovsUsed = Number(row.molotovsUsed || 0);
      const flashUsed = Number(row.flashUsed || 0);
      const utilitiesTotal = computeUtilitiesTotal({ smokesUsed, grenadesUsed, molotovsUsed, flashUsed });

      const distDrove = Number(row.distDrove || 0);
      const distWalk = Number(row.distWalk || 0);
      const totalDist = computeTotalDistance({ distDrove, distWalk });

      const payload = {
        mp: 1,
        rank,
        wwcd: isWwcd,
        placePoints,
        elimsPoints,
        bonusPoints,
        totalPoints,
        damage: Number(row.damage || 0),
        survivalTime: Number(row.survivalTime || 1680),
        healing: Number(row.healing || 0),
        damageReceived: Number(row.damageReceived || 0),
        headshots: Number(row.headshots || 0),
        assists: Number(row.assists || 0),
        knockouts: Number(row.knockouts || 0),
        longestElim: Number(row.longestElim || 0),
        vehicleElims: Number(row.vehicleElims || 0),
        grenadeElims: Number(row.grenadeElims || 0),
        smokesUsed,
        grenadesUsed,
        molotovsUsed,
        flashUsed,
        utilitiesTotal,
        airdrops: Number(row.airdrops || 0),
        rescues: Number(row.rescues || 0),
        distDrove,
        distWalk,
        totalDist,
        won: isWwcd,
        score: totalPoints,
      };

      const existing = await prisma.matchTeamResult.findFirst({
        where: { matchGameId, teamId: matchedTeam.id },
        select: { id: true },
      });

      if (existing) {
        await prisma.matchTeamResult.update({
          where: { id: existing.id },
          data: payload,
        });
      } else {
        await prisma.matchTeamResult.create({
          data: {
            matchGameId,
            teamId: matchedTeam.id,
            ...payload,
          },
        });
      }

      totalInsertedResults++;
    }

    try {
      revalidatePath('/admin/matches');
      revalidatePath('/admin/matches/matrix');
      revalidatePath('/tournaments');
    } catch {
      // Ignored in script contexts
    }

    return {
      success: true,
      message: `Successfully processed and saved ${totalInsertedResults} team match result(s) across ${affectedMatches.size} match(es) in ${affectedTournaments.size} tournament(s).`,
      insertedCount: totalInsertedResults,
      tournamentsCount: affectedTournaments.size,
      matchesCount: affectedMatches.size,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err: any) {
    console.error('[bulkUniversalMatchImportAction] Error:', err);
    return {
      success: false,
      message: err?.message || 'Failed to execute bulk universal import.',
      insertedCount: 0,
      tournamentsCount: 0,
      matchesCount: 0,
      errors: [err?.message || String(err)],
    };
  }
}

// -------------------------------------------------------------
// Existing Multi-Match Matrix Save
// -------------------------------------------------------------
export async function saveMultiMatchMatrixAction(
  tournamentId: string,
  matchesData: MatchMatrixSavePayload[]
): Promise<{ success: boolean; message: string; updatedMatchesCount: number }> {
  if (!(await isAdmin())) {
    redirect('/admin/login');
  }

  if (!tournamentId || !Array.isArray(matchesData) || matchesData.length === 0) {
    return { success: false, message: 'No match data provided for matrix save.', updatedMatchesCount: 0 };
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { formatDetails: true, slug: true },
    });

    let pointsMatrix: Record<number, number> | undefined = undefined;
    let killMultiplier = 1;

    if (tournament?.formatDetails && typeof tournament.formatDetails === 'object') {
      const fd = tournament.formatDetails as any;
      if (fd.pointsMatrix || fd.placementPoints) {
        pointsMatrix = fd.pointsMatrix || fd.placementPoints;
      }
      if (fd.killPointsPerElim || fd.killMultiplier) {
        killMultiplier = Number(fd.killPointsPerElim || fd.killMultiplier) || 1;
      }
    }

    let totalUpdatedMatches = 0;

    for (const matchItem of matchesData) {
      const { matchId, matchGameId, status = 'COMPLETED', results } = matchItem;
      if (!matchGameId || !Array.isArray(results)) continue;

      for (const res of results) {
        if (!res.teamId) continue;

        const rank = Number(res.rank || 1);
        const isWwcd = res.wwcd === true || rank === 1;
        const placePoints =
          res.placePoints != null ? Number(res.placePoints) : getPlacementPoints(rank, pointsMatrix);
        const elimsPoints = Number(res.elimsPoints || 0) * killMultiplier;
        const bonusPoints = Number(res.bonusPoints || 0);
        const totalPoints =
          res.totalPoints != null
            ? Number(res.totalPoints)
            : computeTotalPoints({ placePoints, elimsPoints, bonusPoints });

        const smokesUsed = Number(res.smokesUsed || 0);
        const grenadesUsed = Number(res.grenadesUsed || 0);
        const molotovsUsed = Number(res.molotovsUsed || 0);
        const flashUsed = Number(res.flashUsed || 0);
        const utilitiesTotal = computeUtilitiesTotal({
          smokesUsed,
          grenadesUsed,
          molotovsUsed,
          flashUsed,
        });

        const distDrove = Number(res.distDrove || 0);
        const distWalk = Number(res.distWalk || 0);
        const totalDist = computeTotalDistance({ distDrove, distWalk });

        const payload = {
          mp: 1,
          rank,
          wwcd: isWwcd,
          placePoints,
          elimsPoints,
          bonusPoints,
          totalPoints,
          damage: Number(res.damage || 0),
          survivalTime: Number(res.survivalTime || 1680),
          healing: Number(res.healing || 0),
          damageReceived: Number(res.damageReceived || 0),
          headshots: Number(res.headshots || 0),
          assists: Number(res.assists || 0),
          knockouts: Number(res.knockouts || 0),
          longestElim: Number(res.longestElim || 0),
          vehicleElims: Number(res.vehicleElims || 0),
          grenadeElims: Number(res.grenadeElims || 0),
          smokesUsed,
          grenadesUsed,
          molotovsUsed,
          flashUsed,
          utilitiesTotal,
          airdrops: Number(res.airdrops || 0),
          rescues: Number(res.rescues || 0),
          distDrove,
          distWalk,
          totalDist,
          won: isWwcd,
          score: totalPoints,
        };

        const existing = await prisma.matchTeamResult.findFirst({
          where: { matchGameId, teamId: res.teamId },
          select: { id: true },
        });

        if (existing) {
          await prisma.matchTeamResult.update({
            where: { id: existing.id },
            data: payload,
          });
        } else {
          await prisma.matchTeamResult.create({
            data: {
              matchGameId,
              teamId: res.teamId,
              ...payload,
            },
          });
        }
      }

      if (results.length > 0) {
        await prisma.match.update({
          where: { id: matchId },
          data: { status },
        }).catch(() => null);
      }

      totalUpdatedMatches++;
    }

    try {
      revalidatePath('/admin/matches');
      revalidatePath('/admin/matches/matrix');
      revalidatePath('/tournaments');
      if (tournament?.slug) {
        revalidatePath(`/tournaments/${tournament.slug}`);
      }
    } catch {
      // Ignored in script contexts
    }

    return {
      success: true,
      message: `Successfully saved scorecard data for ${totalUpdatedMatches} match(es).`,
      updatedMatchesCount: totalUpdatedMatches,
    };
  } catch (error: any) {
    console.error('[saveMultiMatchMatrixAction] Error:', error);
    return {
      success: false,
      message: error?.message || 'Failed to save multi-match matrix.',
      updatedMatchesCount: 0,
    };
  }
}

/* ══════════════════════════════════════════════════════════════════
   Universal Player Match Data Bulk Importer (Non-Destructive Cascading)
   Exact user headers:
   Tournament Stage Date TimeFormat Time OverallMatch StageMatch Map Group
   player team role elims team_rank team_wwcd team_place team_elims team_total
   damage survivalTime healing damageReceived headshots assists knockouts
   longestElim vehicleElims grenadeElims smokesUsed grenadesUsed molotovsUsed
   flashUsed utilities airdrops rescues distDrove distWalk total_dist
   playerPowerplay isMvp
   ══════════════════════════════════════════════════════════════════ */

export interface BulkUniversalPlayerRowInput {
  Tournament?: string;
  tournament?: string;
  tourney?: string;
  Stage?: string;
  stage?: string;
  Date?: string;
  date?: string;
  TimeFormat?: string;
  timeFormat?: string;
  Time?: string;
  time?: string;
  OverallMatch?: number | string;
  overallMatch?: number | string;
  StageMatch?: number | string;
  stageMatch?: number | string;
  matchNumber?: number | string;
  Map?: string;
  map?: string;
  mapName?: string;
  Group?: string;
  group?: string;
  player?: string;
  Player?: string;
  ign?: string;
  team?: string;
  Team?: string;
  teamName?: string;
  tag?: string;
  role?: string;
  elims?: number | string;
  kills?: number | string;
  team_rank?: number | string;
  teamRank?: number | string;
  team_wwcd?: boolean | string | number;
  teamWwcd?: boolean | string | number;
  team_place?: number | string;
  teamPlacePoints?: number | string;
  team_elims?: number | string;
  teamElimsPoints?: number | string;
  team_total?: number | string;
  teamTotalPoints?: number | string;
  damage?: number | string;
  survivalTime?: number | string;
  healing?: number | string;
  damageReceived?: number | string;
  headshots?: number | string;
  assists?: number | string;
  knockouts?: number | string;
  longestElim?: number | string;
  vehicleElims?: number | string;
  grenadeElims?: number | string;
  smokesUsed?: number | string;
  grenadesUsed?: number | string;
  molotovsUsed?: number | string;
  flashUsed?: number | string;
  utilities?: number | string;
  airdrops?: number | string;
  rescues?: number | string;
  distDrove?: number | string;
  distWalk?: number | string;
  total_dist?: number | string;
  totalDist?: number | string;
  playerPowerplay?: number | string;
  isMvp?: boolean | string | number;
  [key: string]: any;
}

export interface BulkUniversalPlayerImportResult {
  success: boolean;
  message: string;
  processedCount: number;
  createdMatchesCount: number;
  updatedMatchesCount: number;
  createdPlayersCount: number;
  insertedPlayerStatsCount: number;
  errors: string[];
}

export async function bulkUniversalPlayerMatchImportAction(
  rows: BulkUniversalPlayerRowInput[]
): Promise<BulkUniversalPlayerImportResult> {
  try {
    if (!rows || rows.length === 0) {
      return {
        success: false,
        message: 'No player match data rows provided.',
        processedCount: 0,
        createdMatchesCount: 0,
        updatedMatchesCount: 0,
        createdPlayersCount: 0,
        insertedPlayerStatsCount: 0,
        errors: ['Empty data payload.'],
      };
    }

    const errors: string[] = [];
    const affectedTournaments = new Set<string>();
    const affectedMatches = new Set<string>();

    const allTournaments = await prisma.tournament.findMany({
      include: {
        stages: true,
        teams: {
          include: {
            team: true,
          },
        },
        matches: {
          include: {
            games: true,
          },
        },
      },
    });

    const allTeams = await prisma.team.findMany();
    const allPlayers = await prisma.player.findMany();

    const defaultGame =
      (await prisma.game.findFirst({ where: { slug: 'bgmi' } })) ||
      (await prisma.game.findFirst()) ||
      (await prisma.game.create({
        data: { name: 'Battlegrounds Mobile India', slug: 'bgmi', genre: 'BATTLE_ROYALE' },
      }));

    let totalCreatedMatches = 0;
    let totalUpdatedMatches = 0;
    let totalCreatedPlayers = 0;
    let totalInsertedPlayerStats = 0;

    const cleanStr = (s: any) =>
      String(s || '')
        .trim()
        .toLowerCase()
        .replace(/^\[|\]$/g, '')
        .replace(/[\-_]/g, ' ');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const tourneyRaw = row.Tournament || row.tournament || row.tourney || '';
      const teamRaw = row.team || row.Team || row.teamName || row.tag || '';
      const playerRaw = row.player || row.Player || row.ign || '';

      if (!tourneyRaw || !teamRaw || !playerRaw) {
        errors.push(`Row ${rowNum}: Missing tournament, team, or player IGN.`);
        continue;
      }

      // 1. Match tournament
      const cleanTourneyName = cleanStr(tourneyRaw);
      let matchedTourney = allTournaments.find((t) => {
        const n = cleanStr(t.name);
        const sl = cleanStr(t.slug);
        return n === cleanTourneyName || sl === cleanTourneyName || n.includes(cleanTourneyName) || cleanTourneyName.includes(n);
      });

      if (!matchedTourney) {
        errors.push(`Row ${rowNum}: Tournament "${tourneyRaw}" not found in database.`);
        continue;
      }

      affectedTournaments.add(matchedTourney.id);

      // Point rules
      let pointsMatrix: Record<number, number> | undefined = undefined;
      let killMultiplier = 1;
      if (matchedTourney.formatDetails && typeof matchedTourney.formatDetails === 'object') {
        const fd = matchedTourney.formatDetails as any;
        pointsMatrix = fd.pointsMatrix || fd.placementPoints || undefined;
        killMultiplier = Number(fd.killPointsPerElim || fd.killMultiplier) || 1;
      }

      // 2. Match or Create Stage
      const stageRaw = (row.Stage || row.stage || 'Grand Finals').trim();
      let matchedStage = matchedTourney.stages.find(
        (s) => cleanStr(s.name) === cleanStr(stageRaw) || cleanStr(s.name).includes(cleanStr(stageRaw))
      );

      if (!matchedStage) {
        const stageSeq = matchedTourney.stages.length + 1;
        matchedStage = await prisma.tournamentStage.create({
          data: {
            tournamentId: matchedTourney.id,
            name: stageRaw,
            sequence: stageSeq,
            formatType: 'Battle Royale Points Table',
            stageType: 'GROUPS_WISE',
          },
        });
        matchedTourney.stages.push(matchedStage);
      }

      // 3. Match or Create Match
      const matchNum =
        Number(String(row.StageMatch || row.matchNumber || row.stageMatch || 1).replace(/[^\d]/g, '')) || 1;
      const overallMatchNum =
        row.OverallMatch || row.overallMatch
          ? Number(String(row.OverallMatch || row.overallMatch).replace(/[^\d]/g, ''))
          : null;
      const mapName = (row.Map || row.map || row.mapName || 'Erangel').trim();
      const groupName = row.Group || row.group ? String(row.Group || row.group).trim() : null;

      const { scheduledAt, matchTime } = parseUniversalDateAndTime(
        row.Date || row.date,
        row.Time || row.time,
        row.TimeFormat || row.timeFormat
      );

      let matchedMatch = matchedTourney.matches.find(
        (m) =>
          m.matchNumber === matchNum &&
          (m.stageId === matchedStage!.id || !m.stageId) &&
          (!groupName || m.groupName === groupName)
      );

      let matchGameId: string;

      if (!matchedMatch) {
        const formatTitle = `Match ${matchNum} (${mapName}) · ${stageRaw}${
          overallMatchNum ? ` · Overall #${overallMatchNum}` : ''
        }${groupName ? ` (${groupName})` : ''}`;

        const newMatch = await prisma.match.create({
          data: {
            tournamentId: matchedTourney.id,
            gameId: matchedTourney.gameId || defaultGame.id,
            stageId: matchedStage.id,
            matchNumber: matchNum,
            overallMatchNumber: overallMatchNum,
            stageType: 'GROUPS_WISE',
            groupName: groupName || undefined,
            mapName,
            matchType: 'LAN',
            format: formatTitle,
            status: 'COMPLETED',
            scheduledAt,
            matchTime,
          },
        });

        const newGame = await prisma.matchGame.create({
          data: {
            matchId: newMatch.id,
            sequence: 1,
            mapName,
            duration: Number(row.survivalTime) || 1680,
          },
        });

        matchGameId = newGame.id;
        matchedTourney.matches.push({
          ...newMatch,
          games: [newGame],
        } as any);
        totalCreatedMatches++;
      } else {
        matchGameId = matchedMatch.games[0]?.id;
        if (!matchGameId) {
          const newGame = await prisma.matchGame.create({
            data: {
              matchId: matchedMatch.id,
              sequence: 1,
              mapName,
              duration: Number(row.survivalTime) || 1680,
            },
          });
          matchGameId = newGame.id;
        }

        await prisma.match
          .update({
            where: { id: matchedMatch.id },
            data: {
              status: 'COMPLETED',
              scheduledAt,
              matchTime,
            },
          })
          .catch(() => null);
        totalUpdatedMatches++;
      }

      affectedMatches.add(matchGameId);

      // 4. Match Team
      const cleanTeamInput = cleanStr(teamRaw);
      let matchedTeam = allTeams.find((t) => {
        const tn = cleanStr(t.name);
        const tag = cleanStr(t.tag || '');
        return tn === cleanTeamInput || tag === cleanTeamInput || tn.includes(cleanTeamInput) || cleanTeamInput.includes(tn);
      });

      if (!matchedTeam) {
        const autoTag = teamRaw.length <= 5 ? teamRaw.toUpperCase() : teamRaw.slice(0, 3).toUpperCase();
        matchedTeam = await prisma.team.create({
          data: {
            name: teamRaw.trim(),
            tag: autoTag,
            slug: cleanStr(teamRaw).replace(/\s+/g, '-'),
            gameId: defaultGame.id,
          },
        });
        allTeams.push(matchedTeam);
      }

      // 5. Match or Auto-Create Lightweight Player (Requirement 6)
      const cleanPlayerIgn = cleanStr(playerRaw);
      let matchedPlayer = allPlayers.find((p) => {
        const ign = cleanStr(p.ign);
        return ign === cleanPlayerIgn;
      });

      if (!matchedPlayer) {
        const pSlug = `${cleanPlayerIgn.replace(/\s+/g, '-')}-${Date.now().toString().slice(-4)}`;
        matchedPlayer = await prisma.player.create({
          data: {
            ign: playerRaw.trim(),
            slug: pSlug,
            gameId: defaultGame.id,
            currentTeamId: matchedTeam.id,
          },
        });
        allPlayers.push(matchedPlayer);
        totalCreatedPlayers++;
      }

      // Ensure player is added to tournament squad roster if not already present
      const existingTourneyTeam = matchedTourney.teams.find((tt) => tt.teamId === matchedTeam!.id);
      if (existingTourneyTeam) {
        const roster = Array.isArray(existingTourneyTeam.rosterJson)
          ? (existingTourneyTeam.rosterJson as any[])
          : [];
        const hasPlayer = roster.some((p) => {
          const ign = typeof p === 'string' ? p : p?.ign;
          return cleanStr(ign) === cleanPlayerIgn;
        });

        if (!hasPlayer) {
          const updatedRoster = [
            ...roster,
            {
              playerId: matchedPlayer.id,
              ign: playerRaw.trim(),
              role: row.role ? String(row.role).trim() : null,
              captain: false,
            },
          ];
          await prisma.tournamentTeam
            .update({
              where: { id: existingTourneyTeam.id },
              data: { rosterJson: updatedRoster },
            })
            .catch(() => null);
          existingTourneyTeam.rosterJson = updatedRoster;
        }
      }

      // 6. Cascade / Non-destructive Team Result Check (Requirement 3)
      const existingTeamResult = await prisma.matchTeamResult.findFirst({
        where: {
          matchGameId,
          teamId: matchedTeam.id,
        },
      });

      const teamRank = Number(row.team_rank || row.teamRank) || (existingTeamResult ? existingTeamResult.rank : 1);
      const isTeamWwcd =
        row.team_wwcd != null || row.teamWwcd != null
          ? row.team_wwcd === true || row.team_wwcd === 1 || String(row.team_wwcd).toLowerCase() === 'true'
          : teamRank === 1;

      const teamPlacePoints =
        row.team_place != null && String(row.team_place).trim() !== ''
          ? Number(row.team_place)
          : existingTeamResult
          ? existingTeamResult.placePoints
          : getPlacementPoints(teamRank, pointsMatrix);

      const teamElimsCount =
        row.team_elims != null && String(row.team_elims).trim() !== ''
          ? Number(row.team_elims)
          : existingTeamResult
          ? existingTeamResult.elimsPoints / killMultiplier
          : Number(row.elims || 0);

      const teamElimsPoints = teamElimsCount * killMultiplier;
      const teamTotalPoints =
        row.team_total != null && String(row.team_total).trim() !== ''
          ? Number(row.team_total)
          : computeTotalPoints({ placePoints: teamPlacePoints, elimsPoints: teamElimsPoints, bonusPoints: 0 });

      if (!existingTeamResult) {
        // Create new team result record if not previously entered
        await prisma.matchTeamResult.create({
          data: {
            matchGameId,
            teamId: matchedTeam.id,
            shortCode: matchedTeam.tag || matchedTeam.name.slice(0, 3).toUpperCase(),
            rank: teamRank,
            wwcd: isTeamWwcd,
            placePoints: teamPlacePoints,
            elimsPoints: teamElimsPoints,
            bonusPoints: 0,
            totalPoints: teamTotalPoints,
            survivalTime: Number(row.survivalTime) || 0,
            damage: Number(row.damage) || 0,
            healing: Number(row.healing) || 0,
            damageReceived: Number(row.damageReceived) || 0,
            headshots: Number(row.headshots) || 0,
            assists: Number(row.assists) || 0,
            knockouts: Number(row.knockouts) || 0,
            longestElim: Number(row.longestElim) || 0,
            vehicleElims: Number(row.vehicleElims) || 0,
            grenadeElims: Number(row.grenadeElims) || 0,
            smokesUsed: Number(row.smokesUsed) || 0,
            grenadesUsed: Number(row.grenadesUsed) || 0,
            molotovsUsed: Number(row.molotovsUsed) || 0,
            flashUsed: Number(row.flashUsed) || 0,
            utilitiesTotal: Number(row.utilities) || 0,
            airdrops: Number(row.airdrops) || 0,
            rescues: Number(row.rescues) || 0,
            distDrove: Number(row.distDrove) || 0,
            distWalk: Number(row.distWalk) || 0,
            totalDist: Number(row.total_dist || row.totalDist) || 0,
          },
        });
      } else if (row.team_rank != null || row.team_wwcd != null || row.team_place != null) {
        // Update team result gently without overwriting unrelated fields
        await prisma.matchTeamResult.update({
          where: { id: existingTeamResult.id },
          data: {
            rank: teamRank,
            wwcd: isTeamWwcd,
            placePoints: teamPlacePoints,
            elimsPoints: teamElimsPoints,
            totalPoints: teamTotalPoints,
          },
        });
      }

      // 7. Upsert Player Stats into MatchPlayerStat
      const playerElims = Number(row.elims || row.kills || 0);
      const smokesUsed = Number(row.smokesUsed || 0);
      const grenadesUsed = Number(row.grenadesUsed || 0);
      const molotovsUsed = Number(row.molotovsUsed || 0);
      const flashUsed = Number(row.flashUsed || 0);
      const calculatedUtilities = computeUtilitiesTotal({ smokesUsed, grenadesUsed, molotovsUsed, flashUsed });
      const utilitiesTotal = row.utilities != null ? Number(row.utilities) : calculatedUtilities;

      const distDrove = Number(row.distDrove || 0);
      const distWalk = Number(row.distWalk || 0);
      const totalDist =
        row.total_dist != null || row.totalDist != null
          ? Number(row.total_dist || row.totalDist)
          : distDrove + distWalk;

      const isMvp =
        row.isMvp === true ||
        row.isMvp === 1 ||
        String(row.isMvp).toLowerCase() === 'true' ||
        String(row.isMvp).toLowerCase() === 'yes';

      const playerStatPayload = {
        teamId: matchedTeam.id,
        shortCode: matchedTeam.tag || matchedTeam.name.slice(0, 3).toUpperCase(),
        role: row.role ? String(row.role).trim() : undefined,
        mp: 1,
        playerElims,
        teamRank,
        teamWwcd: isTeamWwcd,
        teamPlacePoints,
        teamElimsPoints,
        teamTotalPoints,
        damage: Number(row.damage) || 0,
        survivalTime: Number(row.survivalTime) || 0,
        healing: Number(row.healing) || 0,
        damageReceived: Number(row.damageReceived) || 0,
        headshots: Number(row.headshots) || 0,
        assists: Number(row.assists) || 0,
        knockouts: Number(row.knockouts) || 0,
        longestElim: Number(row.longestElim) || 0,
        vehicleElims: Number(row.vehicleElims) || 0,
        grenadeElims: Number(row.grenadeElims) || 0,
        smokesUsed,
        grenadesUsed,
        molotovsUsed,
        flashUsed,
        utilitiesTotal,
        airdrops: Number(row.airdrops) || 0,
        rescues: Number(row.rescues) || 0,
        distDrove,
        distWalk,
        totalDist,
        isMvp,
        playerPowerplay: Number(row.playerPowerplay || 0),
        kills: playerElims,
      };

      const existingPlayerStat = await prisma.matchPlayerStat.findFirst({
        where: {
          matchGameId,
          playerId: matchedPlayer.id,
        },
      });

      if (existingPlayerStat) {
        await prisma.matchPlayerStat.update({
          where: { id: existingPlayerStat.id },
          data: playerStatPayload,
        });
      } else {
        await prisma.matchPlayerStat.create({
          data: {
            matchGameId,
            playerId: matchedPlayer.id,
            ...playerStatPayload,
          },
        });
      }

      totalInsertedPlayerStats++;
    }

    try {
      revalidatePath('/admin/matches');
      revalidatePath('/admin/matches/matrix');
      revalidatePath('/tournaments');
      for (const tId of affectedTournaments) {
        const t = allTournaments.find((x) => x.id === tId);
        if (t?.slug) {
          revalidatePath(`/tournaments/${t.slug}`);
        }
      }
    } catch {
      // Ignored when invoked in background/script contexts
    }

    return {
      success: true,
      message: `Universal Player Ingestion Complete! Processed ${rows.length} rows, created ${totalCreatedPlayers} lightweight players, updated ${affectedMatches.size} match games, and saved ${totalInsertedPlayerStats} player performance stats.`,
      processedCount: rows.length,
      createdMatchesCount: totalCreatedMatches,
      updatedMatchesCount: totalUpdatedMatches,
      createdPlayersCount: totalCreatedPlayers,
      insertedPlayerStatsCount: totalInsertedPlayerStats,
      errors,
    };
  } catch (error: any) {
    console.error('[bulkUniversalPlayerMatchImportAction] Error:', error);
    return {
      success: false,
      message: error?.message || 'Failed to process player match import.',
      processedCount: 0,
      createdMatchesCount: 0,
      updatedMatchesCount: 0,
      createdPlayersCount: 0,
      insertedPlayerStatsCount: 0,
      errors: [error?.message || 'Internal error'],
    };
  }
}
