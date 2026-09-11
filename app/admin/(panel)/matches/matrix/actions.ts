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
  parseWwcd,
  readKillMultiplier,
} from '@/lib/tournament-math';

export interface MatrixCellSavePayload {
  teamId: string;
  rank: number;
  wwcd?: boolean | number | string;
  placePoints?: number;
  /** Raw elimination count — the server multiplies by the kill multiplier exactly once. */
  elims?: number;
  /**
   * Final elimination points. Only used when `elims` is absent (older clients
   * already applied the multiplier); the server never re-multiplies this.
   */
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
  Type?: string;
  type?: string;
  MatchType?: string;
  matchType?: string;
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
  isVerified?: boolean | string;
  isOpenQualifier?: boolean | string;
  [key: string]: any;
}

function parseMatchType(val: any, fallback: string = 'Online'): 'Online' | 'LAN' | 'Offline' {
  if (!val) return fallback as any;
  const s = String(val).trim().toLowerCase();
  if (s.includes('onl')) return 'Online';
  if (s.includes('lan')) return 'LAN';
  if (s.includes('off')) return 'Offline';
  return (val.trim() || fallback) as any;
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

  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth() + 1; // 1-indexed
  let day = now.getUTCDate();

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
    const cleanStr = (s: any) =>
      String(s || '')
        .trim()
        .toLowerCase()
        .replace(/^\[|\]$/g, '')
        .replace(/[\-_]/g, ' ');

    const rawTourneyNames = Array.from(
      new Set(
        rows
          .map((r) =>
            String(r.Tournament || r.tournament || r.TournamentName || r.tournamentName || r.Event || r.event || '').trim()
          )
          .filter(Boolean)
      )
    );
    const rawTeamNames = Array.from(
      new Set(
        rows
          .map((r) => String(r.Team || r.team || r.TeamName || r.teamName || '').trim())
          .filter(Boolean)
      )
    );

    type TeamIdentity = { id: string; name: string; tag: string | null; slug: string | null };
    const [allTeams, defaultGame, allTournaments] = await Promise.all([
      rawTeamNames.length > 0
        ? prisma.team.findMany({
            where: {
              OR: [
                { name: { in: rawTeamNames, mode: 'insensitive' } },
                { tag: { in: rawTeamNames, mode: 'insensitive' } },
                { slug: { in: rawTeamNames.map((s) => s.toLowerCase().replace(/\s+/g, '-')), mode: 'insensitive' } },
                ...rawTeamNames.slice(0, 50).map((n) => ({ name: { contains: n, mode: 'insensitive' as const } })),
              ],
            },
            select: { id: true, name: true, tag: true, slug: true },
          })
        : ([] as TeamIdentity[]),
      prisma.game.findFirst({
        where: { slug: 'bgmi' },
        select: { id: true },
      }).then(async (bgmi) => bgmi || (await prisma.game.findFirst({ select: { id: true } }))),
      rawTourneyNames.length > 0
        ? prisma.tournament.findMany({
            where: {
              OR: [
                { name: { in: rawTourneyNames, mode: 'insensitive' } },
                { slug: { in: rawTourneyNames.map((s) => s.toLowerCase().replace(/\s+/g, '-')), mode: 'insensitive' } },
                ...rawTourneyNames.slice(0, 50).map((n) => ({ name: { contains: n, mode: 'insensitive' as const } })),
              ],
            },
            select: { id: true, name: true, slug: true, gameId: true, formatDetails: true },
          })
        : [],
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

    // Whole import runs as one transaction: a failure halfway through rolls
    // back every row instead of committing a partial scorecard.
    await prisma.$transaction(async (tx) => {
      const heavyByTournamentId = new Map<string, { stages: any[]; matches: any[] }>();
      const loadHeavy = async (tournamentId: string) => {
        if (!heavyByTournamentId.has(tournamentId)) {
          const full = await tx.tournament.findUnique({
            where: { id: tournamentId },
            include: {
              stages: true,
              matches: {
                include: {
                  games: { select: { id: true, sequence: true } },
                },
              },
            },
          });
          heavyByTournamentId.set(
            tournamentId,
            full ? { stages: full.stages ?? [], matches: full.matches ?? [] } : { stages: [], matches: [] }
          );
        }
        return heavyByTournamentId.get(tournamentId)!;
      };

      const pendingTeamResults: Array<{ matchGameId: string; teamId: string; payload: any }> = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;

        const tourneyRaw = row.Tournament || row.tournament || row.tourney || '';
        const teamRaw = row.team || row.Team || row.teamName || row.tag || '';

        if (!tourneyRaw || !teamRaw) {
          errors.push(`Row ${rowNum}: Missing tournament or team name.`);
          continue;
        }

        // Match tournament — exact name/slug wins; a fuzzy substring match is
        // only accepted when exactly one candidate fits, so pasting "BGIS"
        // can never silently write results into the wrong of two BGIS events.
        const cleanTourneyName = cleanStr(tourneyRaw);
        const exactTourneys = allTournaments.filter((t) => {
          const n = cleanStr(t.name);
          const sl = cleanStr(t.slug);
          return n === cleanTourneyName || sl === cleanTourneyName;
        });
        const fuzzyTourneys = exactTourneys.length > 0
          ? []
          : allTournaments.filter((t) => {
              const n = cleanStr(t.name);
              const sl = cleanStr(t.slug);
              return n.includes(cleanTourneyName) || cleanTourneyName.includes(n);
            });

        if (exactTourneys.length > 1 || (exactTourneys.length === 0 && fuzzyTourneys.length > 1)) {
          const names = [...exactTourneys, ...fuzzyTourneys].map((t) => t.name).join('", "');
          errors.push(
            `Row ${rowNum}: Tournament "${tourneyRaw}" is ambiguous — it matches multiple tournaments ("${names}"). Use the exact name of the intended event.`
          );
          continue;
        }

        const matchedTourney = exactTourneys[0] ?? fuzzyTourneys[0];
        if (!matchedTourney) {
          errors.push(`Row ${rowNum}: Tournament "${tourneyRaw}" not found in database.`);
          continue;
        }

        affectedTournaments.add(matchedTourney.id);
        const tourneyData = await loadHeavy(matchedTourney.id);

        // Point rules
        let pointsMatrix: Record<number, number> | undefined = undefined;
        let killMultiplier = 1;
        if (matchedTourney.formatDetails && typeof matchedTourney.formatDetails === 'object') {
          const fd = matchedTourney.formatDetails as any;
          pointsMatrix = fd.pointsMatrix || fd.placementPoints || undefined;
          killMultiplier = readKillMultiplier(fd);
        }

        // Match or Create Stage
        const stageRaw = (row.Stage || row.stage || 'Grand Finals').trim();
        let matchedStage = tourneyData.stages.find(
          (s) => cleanStr(s.name) === cleanStr(stageRaw) || cleanStr(s.name).includes(cleanStr(stageRaw))
        );

        if (!matchedStage) {
          const stageSeq = tourneyData.stages.length + 1;
          matchedStage = await tx.tournamentStage.create({
            data: {
              tournamentId: matchedTourney.id,
              name: stageRaw,
              sequence: stageSeq,
              formatType: 'Battle Royale Points Table',
              stageType: 'GROUPS_WISE',
            },
          });
          tourneyData.stages.push(matchedStage);
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

        // Normalize single group name (e.g. "C" -> "Group C", "Group B" -> "Group B")
        const formatGrp = (g?: string | null) => {
          if (!g || !g.trim()) return '';
          const clean = g.trim().replace(/^group\s*/i, '');
          return clean ? `Group ${clean}` : '';
        };

        const currentInputGroup = formatGrp(groupName);

        let matchedMatch = tourneyData.matches.find((m) => {
          // If overallMatchNumber is specified and matches, it's definitively the exact same tournament match!
          if (overallMatchNum != null && m.overallMatchNumber != null) {
            return (
              m.overallMatchNumber === overallMatchNum &&
              (m.stageId === matchedStage!.id || !m.stageId)
            );
          }
          // Otherwise match by stage and stage match number
          if (m.matchNumber === matchNum && (m.stageId === matchedStage!.id || !m.stageId)) {
            if (m.mapName && mapName && m.mapName.toLowerCase() !== mapName.toLowerCase()) {
              return false;
            }
            return true;
          }
          return false;
        });

        let matchGameId: string;

        if (!matchedMatch) {
          const initialGrp = currentInputGroup || groupName || undefined;
          const formatTitle = `Match ${matchNum} (${mapName}) · ${stageRaw}${
            overallMatchNum ? ` · Overall #${overallMatchNum}` : ''
          }${initialGrp ? ` (${initialGrp})` : ''}`;

          const rawType = row.Type || row.type || row.MatchType || row.matchType || row.Environment;
          const resolvedMatchType = parseMatchType(rawType, 'Online');

          const newMatch = await tx.match.create({
            data: {
              tournamentId: matchedTourney.id,
              gameId: matchedTourney.gameId || defaultGame.id,
              stageId: matchedStage.id,
              matchNumber: matchNum,
              overallMatchNumber: overallMatchNum,
              stageType: 'GROUPS_WISE',
              groupName: initialGrp,
              mapName,
              matchType: resolvedMatchType,
              format: formatTitle,
              status: 'COMPLETED',
              scheduledAt,
              matchTime,
            },
          });

          const newGame = await tx.matchGame.create({
            data: {
              matchId: newMatch.id,
              sequence: 1,
              mapName,
              duration: Number(row.survivalTime) || 1680,
            },
          });

          matchGameId = newGame.id;
          matchedMatch = {
            ...newMatch,
            games: [newGame],
          } as any;
          tourneyData.matches.push(matchedMatch);
        } else {
          // If this row brings an additional group into a multi-group match (e.g. Group B playing with Group C)
          if (currentInputGroup && matchedMatch.groupName) {
            const existingGroups = (matchedMatch.groupName || '')
              .split(/[\s,&/+\-]+|vs\.?/i)
              .map((g: string) => g.trim().replace(/^group\s*/i, ''))
              .filter(Boolean);
            const thisClean = currentInputGroup.replace(/^group\s*/i, '').trim();

            if (thisClean && !existingGroups.some((g: string) => g.toLowerCase() === thisClean.toLowerCase())) {
              const combinedGroups = [...existingGroups, thisClean].sort();
              const mergedGroupName =
                combinedGroups.length > 1
                  ? `Group ${combinedGroups.join(' vs Group ')}`
                  : `Group ${combinedGroups[0]}`;
              matchedMatch.groupName = mergedGroupName;
              const updatedFormat = `Match ${matchedMatch.matchNumber || matchNum} (${matchedMatch.mapName || mapName}) · ${stageRaw}${
                matchedMatch.overallMatchNumber ? ` · Overall #${matchedMatch.overallMatchNumber}` : ''
              } (${mergedGroupName})`;
              matchedMatch.format = updatedFormat;

              await tx.match.update({
                where: { id: matchedMatch.id },
                data: {
                  groupName: mergedGroupName,
                  format: updatedFormat,
                },
              });
            }
          }

          matchGameId = matchedMatch.games[0]?.id;
          if (!matchGameId) {
            const newGame = await tx.matchGame.create({
              data: {
                matchId: matchedMatch.id,
                sequence: 1,
                mapName,
                duration: Number(row.survivalTime) || 1680,
              },
            });
            matchGameId = newGame.id;
            matchedMatch.games.push(newGame as any);
          }

          const rawType = row.Type || row.type || row.MatchType || row.matchType || row.Environment;
          const matchTypeUpdate = rawType ? { matchType: parseMatchType(rawType, matchedMatch.matchType || 'Online') } : {};

          await tx.match.update({
            where: { id: matchedMatch.id },
            data: {
              status: 'COMPLETED',
              scheduledAt,
              matchTime,
              ...matchTypeUpdate,
            },
          });
        }

        affectedMatches.add(matchGameId);

        // Match Team: Exact matches first; if multiple fuzzy candidates match, report ambiguity error
        const cleanTeamInput = cleanStr(teamRaw);
        let matchedTeam =
          allTeams.find((t) => cleanStr(t.name) === cleanTeamInput) ||
          allTeams.find((t) => cleanStr(t.tag || '') === cleanTeamInput);

        if (!matchedTeam) {
          const inputTokens = cleanTeamInput.split(/[\s\-_\/]+/).filter(Boolean);
          const fuzzyCandidates = allTeams.filter((t) => {
            const tn = cleanStr(t.name);
            const tag = cleanStr(t.tag || '');
            // Token-based match for tags prevents short tags (like "QS") from matching inside words (like "naqsh")
            const tagMatch = Boolean(tag && tag.length >= 2 && inputTokens.includes(tag));
            return (
              tn.includes(cleanTeamInput) ||
              cleanTeamInput.includes(tn) ||
              tagMatch
            );
          });
          if (fuzzyCandidates.length > 1) {
            const candidateNames = fuzzyCandidates.map((c) => c.name).join('", "');
            errors.push(
              `Row ${rowNum}: Team "${teamRaw}" is ambiguous — matches multiple teams ("${candidateNames}"). Please use the exact team name or tag.`
            );
            continue;
          }
          if (fuzzyCandidates.length === 1) {
            matchedTeam = fuzzyCandidates[0];
          }
        }

        const isQualifier =
          row.isOpenQualifier === true ||
          String(row.isOpenQualifier).toLowerCase() === 'true' ||
          row.isVerified === false ||
          String(row.isVerified).toLowerCase() === 'false' ||
          String(row.isVerified).toLowerCase() === 'amateur';

        if (!matchedTeam) {
          const autoTag = teamRaw.length <= 5 ? teamRaw.toUpperCase() : teamRaw.slice(0, 3).toUpperCase();
          matchedTeam = await tx.team.create({
            data: {
              name: teamRaw.trim(),
              tag: autoTag,
              slug: cleanStr(teamRaw).replace(/\s+/g, '-'),
              gameId: defaultGame.id,
              isVerified: !isQualifier,
              status: isQualifier ? 'UNVERIFIED' : 'ACTIVE',
            },
          });
          allTeams.push(matchedTeam);
        }

        // Compute Points & Stats
        const rank = Number(row.rank) || 1;
        const isWwcd = parseWwcd(row.wwcd, rank);

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

        pendingTeamResults.push({
          matchGameId,
          teamId: matchedTeam.id,
          payload,
        });
      }

      // Execute batch team result upserts in concurrent chunks of 25
      const CHUNK_SIZE = 25;
      for (let c = 0; c < pendingTeamResults.length; c += CHUNK_SIZE) {
        const slice = pendingTeamResults.slice(c, c + CHUNK_SIZE);
        await Promise.all(
          slice.map((item) =>
            tx.matchTeamResult.upsert({
              where: {
                matchGameId_teamId: { matchGameId: item.matchGameId, teamId: item.teamId },
              },
              update: item.payload,
              create: {
                matchGameId: item.matchGameId,
                teamId: item.teamId,
                ...item.payload,
              },
            })
          )
        );
        totalInsertedResults += slice.length;
      }
    }, {
      maxWait: 15000,
      timeout: 60000,
    });

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
      killMultiplier = readKillMultiplier(fd);
    }

    let totalUpdatedMatches = 0;

    // One transaction for the whole save: a failure partway through rolls back
    // every cell instead of committing a half-written scorecard.
    await prisma.$transaction(async (tx) => {
      for (const matchItem of matchesData) {
        const { matchId, matchGameId, status = 'COMPLETED', results } = matchItem;
        if (!matchGameId || !Array.isArray(results)) continue;

        for (const res of results) {
          if (!res.teamId) continue;

          const rank = Number(res.rank || 1);
          const isWwcd = parseWwcd(res.wwcd, rank);
          const placePoints =
            res.placePoints != null ? Number(res.placePoints) : getPlacementPoints(rank, pointsMatrix);
          // `elims` is the raw kill count and is multiplied here exactly once.
          // `elimsPoints` from older clients is already final — never re-multiply it.
          const elimsPoints =
            res.elims != null ? Number(res.elims) * killMultiplier : Number(res.elimsPoints || 0);
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

          // One result row per (game, team) — DB-enforced, race-safe upsert.
          await tx.matchTeamResult.upsert({
            where: {
              matchGameId_teamId: { matchGameId, teamId: res.teamId },
            },
            update: payload,
            create: {
              matchGameId,
              teamId: res.teamId,
              ...payload,
            },
          });
        }

        if (results.length > 0) {
          await tx.match.update({
            where: { id: matchId },
            data: { status },
          }).catch(() => null);
        }

        totalUpdatedMatches++;
      }
    }, {
      maxWait: 15000,
      timeout: 60000,
    });

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
  Type?: string;
  type?: string;
  MatchType?: string;
  matchType?: string;
  isVerified?: boolean | string;
  isOpenQualifier?: boolean | string;
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
  if (!(await isAdmin())) {
    redirect('/admin/login');
  }

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

    // Light identity lists: tournament name/slug/config, team and player
    const rawTourneyNames = Array.from(
      new Set(
        rows
          .map((r) =>
            String(r.Tournament || r.tournament || r.TournamentName || r.tournamentName || r.Event || r.event || '').trim()
          )
          .filter(Boolean)
      )
    );
    const rawTeamNames = Array.from(
      new Set(
        rows
          .map((r) => String(r.Team || r.team || r.TeamName || r.teamName || '').trim())
          .filter(Boolean)
      )
    );
    const rawPlayerIgns = Array.from(
      new Set(
        rows
          .map((r) =>
            String(r.Player || r.player || r.IGN || r.ign || r.PlayerName || r.playerName || '').trim()
          )
          .filter(Boolean)
      )
    );

    type TeamIdentity = { id: string; name: string; tag: string | null; slug: string | null };
    type PlayerIdentity = { id: string; ign: string; currentTeamId?: string | null };

    const [allTournaments, allTeams, allPlayers] = await Promise.all([
      rawTourneyNames.length > 0
        ? prisma.tournament.findMany({
            where: {
              OR: [
                { name: { in: rawTourneyNames, mode: 'insensitive' } },
                { slug: { in: rawTourneyNames.map((s) => s.toLowerCase().replace(/\s+/g, '-')), mode: 'insensitive' } },
                ...rawTourneyNames.slice(0, 50).map((n) => ({ name: { contains: n, mode: 'insensitive' as const } })),
              ],
            },
            select: { id: true, name: true, slug: true, gameId: true, formatDetails: true },
          })
        : [],
      rawTeamNames.length > 0
        ? prisma.team.findMany({
            where: {
              OR: [
                { name: { in: rawTeamNames, mode: 'insensitive' } },
                { tag: { in: rawTeamNames, mode: 'insensitive' } },
                { slug: { in: rawTeamNames.map((s) => s.toLowerCase().replace(/\s+/g, '-')), mode: 'insensitive' } },
                ...rawTeamNames.slice(0, 50).map((n) => ({ name: { contains: n, mode: 'insensitive' as const } })),
              ],
            },
            select: { id: true, name: true, tag: true, slug: true },
          })
        : ([] as TeamIdentity[]),
      rawPlayerIgns.length > 0
        ? prisma.player.findMany({
            where: {
              OR: [
                { ign: { in: rawPlayerIgns, mode: 'insensitive' } },
                { slug: { in: rawPlayerIgns.map((s) => s.toLowerCase().replace(/\s+/g, '-')), mode: 'insensitive' } },
              ],
            },
            select: { id: true, ign: true, currentTeamId: true },
          })
        : ([] as PlayerIdentity[]),
    ]);

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

    // Whole import runs as one transaction: a failure halfway through rolls
    // back every row instead of committing a partial player dataset.
    await prisma.$transaction(
      async (tx) => {
        const teamResultsCache = new Map<string, any>();
        const preloadedGames = new Set<string>();
        const pendingTeamResults = new Map<string, { matchGameId: string; teamId: string; payload: any }>();
        const pendingPlayerStats: Array<{ matchGameId: string; playerId: string; payload: any }> = [];
        const heavyByTournamentId = new Map<string, { stages: any[]; teams: any[]; matches: any[] }>();
      const loadHeavy = async (tournamentId: string) => {
        if (!heavyByTournamentId.has(tournamentId)) {
          const full = await tx.tournament.findUnique({
            where: { id: tournamentId },
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
          heavyByTournamentId.set(
            tournamentId,
            full
              ? { stages: full.stages ?? [], teams: full.teams ?? [], matches: full.matches ?? [] }
              : { stages: [], teams: [], matches: [] }
          );
        }
        return heavyByTournamentId.get(tournamentId)!;
      };

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

        // 1. Match tournament — exact name/slug wins; a fuzzy substring match
        // is only accepted when exactly one candidate fits.
        const cleanTourneyName = cleanStr(tourneyRaw);
        const exactTourneys = allTournaments.filter((t) => {
          const n = cleanStr(t.name);
          const sl = cleanStr(t.slug);
          return n === cleanTourneyName || sl === cleanTourneyName;
        });
        const fuzzyTourneys = exactTourneys.length > 0
          ? []
          : allTournaments.filter((t) => {
              const n = cleanStr(t.name);
              const sl = cleanStr(t.slug);
              return n.includes(cleanTourneyName) || cleanTourneyName.includes(n);
            });

        if (exactTourneys.length > 1 || (exactTourneys.length === 0 && fuzzyTourneys.length > 1)) {
          const names = [...exactTourneys, ...fuzzyTourneys].map((t) => t.name).join('", "');
          errors.push(
            `Row ${rowNum}: Tournament "${tourneyRaw}" is ambiguous — it matches multiple tournaments ("${names}"). Use the exact name of the intended event.`
          );
          continue;
        }

        const matchedTourney = exactTourneys[0] ?? fuzzyTourneys[0];
        if (!matchedTourney) {
          errors.push(`Row ${rowNum}: Tournament "${tourneyRaw}" not found in database.`);
          continue;
        }

        affectedTournaments.add(matchedTourney.id);
        const tourneyData = await loadHeavy(matchedTourney.id);

        // Point rules
        let pointsMatrix: Record<number, number> | undefined = undefined;
        let killMultiplier = 1;
        if (matchedTourney.formatDetails && typeof matchedTourney.formatDetails === 'object') {
          const fd = matchedTourney.formatDetails as any;
          pointsMatrix = fd.pointsMatrix || fd.placementPoints || undefined;
          killMultiplier = readKillMultiplier(fd);
        }

        // 2. Match or Create Stage
        const stageRaw = (row.Stage || row.stage || 'Grand Finals').trim();
        let matchedStage = tourneyData.stages.find(
          (s) => cleanStr(s.name) === cleanStr(stageRaw) || cleanStr(s.name).includes(cleanStr(stageRaw))
        );

        if (!matchedStage) {
          const stageSeq = tourneyData.stages.length + 1;
          matchedStage = await tx.tournamentStage.create({
            data: {
              tournamentId: matchedTourney.id,
              name: stageRaw,
              sequence: stageSeq,
              formatType: 'Battle Royale Points Table',
              stageType: 'GROUPS_WISE',
            },
          });
          tourneyData.stages.push(matchedStage);
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

        // Normalize single group name (e.g. "C" -> "Group C", "Group B" -> "Group B")
        const formatGrp = (g?: string | null) => {
          if (!g || !g.trim()) return '';
          const clean = g.trim().replace(/^group\s*/i, '');
          return clean ? `Group ${clean}` : '';
        };

        const currentInputGroup = formatGrp(groupName);

        let matchedMatch = tourneyData.matches.find((m) => {
          // If overallMatchNumber is specified and matches, it's definitively the exact same tournament match!
          if (overallMatchNum != null && m.overallMatchNumber != null) {
            return (
              m.overallMatchNumber === overallMatchNum &&
              (m.stageId === matchedStage!.id || !m.stageId)
            );
          }
          // Otherwise match by stage and stage match number
          if (m.matchNumber === matchNum && (m.stageId === matchedStage!.id || !m.stageId)) {
            if (m.mapName && mapName && m.mapName.toLowerCase() !== mapName.toLowerCase()) {
              return false;
            }
            return true;
          }
          return false;
        });

        let matchGameId: string;

        if (!matchedMatch) {
          const initialGrp = currentInputGroup || groupName || undefined;
          const formatTitle = `Match ${matchNum} (${mapName}) · ${stageRaw}${
            overallMatchNum ? ` · Overall #${overallMatchNum}` : ''
          }${initialGrp ? ` (${initialGrp})` : ''}`;

          const rawType = row.Type || row.type || row.MatchType || row.matchType || row.Environment;
          const resolvedMatchType = parseMatchType(rawType, 'Online');

          const newMatch = await tx.match.create({
            data: {
              tournamentId: matchedTourney.id,
              gameId: matchedTourney.gameId || defaultGame.id,
              stageId: matchedStage.id,
              matchNumber: matchNum,
              overallMatchNumber: overallMatchNum,
              stageType: 'GROUPS_WISE',
              groupName: initialGrp,
              mapName,
              matchType: resolvedMatchType,
              format: formatTitle,
              status: 'COMPLETED',
              scheduledAt,
              matchTime,
            },
          });

          const newGame = await tx.matchGame.create({
            data: {
              matchId: newMatch.id,
              sequence: 1,
              mapName,
              duration: Number(row.survivalTime) || 1680,
            },
          });

          matchGameId = newGame.id;
          matchedMatch = {
            ...newMatch,
            games: [newGame],
          } as any;
          tourneyData.matches.push(matchedMatch);
          totalCreatedMatches++;
        } else {
          // If this row brings an additional group into a multi-group match (e.g. Group B playing with Group C)
          if (currentInputGroup && matchedMatch.groupName) {
            const existingGroups = (matchedMatch.groupName || '')
              .split(/[\s,&/+\-]+|vs\.?/i)
              .map((g: string) => g.trim().replace(/^group\s*/i, ''))
              .filter(Boolean);
            const thisClean = currentInputGroup.replace(/^group\s*/i, '').trim();

            if (thisClean && !existingGroups.some((g: string) => g.toLowerCase() === thisClean.toLowerCase())) {
              const combinedGroups = [...existingGroups, thisClean].sort();
              const mergedGroupName =
                combinedGroups.length > 1
                  ? `Group ${combinedGroups.join(' vs Group ')}`
                  : `Group ${combinedGroups[0]}`;
              matchedMatch.groupName = mergedGroupName;
              const updatedFormat = `Match ${matchedMatch.matchNumber || matchNum} (${matchedMatch.mapName || mapName}) · ${stageRaw}${
                matchedMatch.overallMatchNumber ? ` · Overall #${matchedMatch.overallMatchNumber}` : ''
              } (${mergedGroupName})`;
              matchedMatch.format = updatedFormat;

              await tx.match.update({
                where: { id: matchedMatch.id },
                data: {
                  groupName: mergedGroupName,
                  format: updatedFormat,
                },
              });
            }
          }

          matchGameId = matchedMatch.games[0]?.id;
          if (!matchGameId) {
            const newGame = await tx.matchGame.create({
              data: {
                matchId: matchedMatch.id,
                sequence: 1,
                mapName,
                duration: Number(row.survivalTime) || 1680,
              },
            });
            matchGameId = newGame.id;
            matchedMatch.games.push(newGame as any);
          }

          const rawType = row.Type || row.type || row.MatchType || row.matchType || row.Environment;
          const matchTypeUpdate = rawType ? { matchType: parseMatchType(rawType, matchedMatch.matchType || 'Online') } : {};

          await tx.match
            .update({
              where: { id: matchedMatch.id },
              data: {
                status: 'COMPLETED',
                scheduledAt,
                matchTime,
                ...matchTypeUpdate,
              },
            })
            .catch(() => null);
          totalUpdatedMatches++;
        }

        affectedMatches.add(matchGameId);

        if (!preloadedGames.has(matchGameId)) {
          preloadedGames.add(matchGameId);
          const existingTRs = await tx.matchTeamResult.findMany({
            where: { matchGameId },
            select: { id: true, matchGameId: true, teamId: true, rank: true, placePoints: true, elimsPoints: true },
          });
          for (const tr of existingTRs) {
            teamResultsCache.set(`${tr.matchGameId}_${tr.teamId}`, tr);
          }
        }

        // 4. Match Team: Exact first, then fuzzy with ambiguity check
        const cleanTeamInput = cleanStr(teamRaw);
        let matchedTeam =
          allTeams.find((t) => cleanStr(t.name) === cleanTeamInput) ||
          allTeams.find((t) => cleanStr(t.tag || '') === cleanTeamInput);

        if (!matchedTeam) {
          const inputTokens = cleanTeamInput.split(/[\s\-_\/]+/).filter(Boolean);
          const fuzzyCandidates = allTeams.filter((t) => {
            const tn = cleanStr(t.name);
            const tag = cleanStr(t.tag || '');
            const tagMatch = Boolean(tag && tag.length >= 2 && inputTokens.includes(tag));
            return (
              tn.includes(cleanTeamInput) ||
              cleanTeamInput.includes(tn) ||
              tagMatch
            );
          });
          if (fuzzyCandidates.length > 1) {
            const candidateNames = fuzzyCandidates.map((c) => c.name).join('", "');
            errors.push(
              `Row ${rowNum}: Team "${teamRaw}" is ambiguous — matches multiple teams ("${candidateNames}"). Use exact name or tag.`
            );
            continue;
          }
          if (fuzzyCandidates.length === 1) {
            matchedTeam = fuzzyCandidates[0];
          }
        }

        const isQualifier =
          row.isOpenQualifier === true ||
          String(row.isOpenQualifier).toLowerCase() === 'true' ||
          row.isVerified === false ||
          String(row.isVerified).toLowerCase() === 'false' ||
          String(row.isVerified).toLowerCase() === 'amateur';

        if (!matchedTeam) {
          const autoTag = teamRaw.length <= 5 ? teamRaw.toUpperCase() : teamRaw.slice(0, 3).toUpperCase();
          matchedTeam = await tx.team.create({
            data: {
              name: teamRaw.trim(),
              tag: autoTag,
              slug: cleanStr(teamRaw).replace(/\s+/g, '-'),
              gameId: defaultGame.id,
              isVerified: !isQualifier,
              status: isQualifier ? 'UNVERIFIED' : 'ACTIVE',
            },
          });
          allTeams.push(matchedTeam);
        }

        // 5. Match or Auto-Create Lightweight Player
        // When two players across different teams share the same IGN (e.g. "Shadow"),
        // prioritize matching the player belonging to this row's team or roster.
        const cleanPlayerIgn = cleanStr(playerRaw);

        // Strip team prefix if player IGN starts with the team tag or name
        const teamTagClean = cleanStr(matchedTeam.tag || '');
        const teamNameClean = cleanStr(matchedTeam.name || '');
        const stripTeamPrefix = (s: string) => {
          let res = s;
          if (teamTagClean && res.startsWith(teamTagClean + ' ')) res = res.slice(teamTagClean.length + 1).trim();
          if (teamNameClean && res.startsWith(teamNameClean + ' ')) res = res.slice(teamNameClean.length + 1).trim();
          return res;
        };
        const basePlayerIgn = stripTeamPrefix(cleanPlayerIgn);

        // Check if tournament team roster already has this player's id or unlinked status
        const existingTourneyTeam = tourneyData.teams.find((tt) => tt.teamId === matchedTeam!.id);
        let rosterPlayerId: string | undefined;
        let isExplicitlyUnlinkedInRoster = false;
        let matchedRosterEntry: any = null;
        if (existingTourneyTeam) {
          const roster = Array.isArray(existingTourneyTeam.rosterJson)
            ? (existingTourneyTeam.rosterJson as any[])
            : [];
          matchedRosterEntry = roster.find((p) => {
            const ign = typeof p === 'string' ? p : p?.ign;
            const cIgn = cleanStr(ign);
            return cIgn === cleanPlayerIgn || stripTeamPrefix(cIgn) === basePlayerIgn;
          });
          if (matchedRosterEntry && typeof matchedRosterEntry === 'object') {
            if (matchedRosterEntry.playerId) {
              rosterPlayerId = matchedRosterEntry.playerId;
            } else if (matchedRosterEntry.playerId === null) {
              isExplicitlyUnlinkedInRoster = true;
            }
          }
        }

        let matchedPlayer =
          (rosterPlayerId ? allPlayers.find((p) => p.id === rosterPlayerId) : undefined) ||
          allPlayers.find(
            (p) =>
              (cleanStr(p.ign) === cleanPlayerIgn || stripTeamPrefix(cleanStr(p.ign)) === basePlayerIgn) &&
              p.currentTeamId === matchedTeam.id
          );

        // Tournament-scoped single-team exclusivity:
        // A single athlete profile can NEVER compete for two different teams in the same tournament.
        const isPlayerCompetingForOtherTeamInTournament = (candidatePlayerId: string) => {
          // 1. Check rosters of other teams in this tournament
          const inOtherRoster = tourneyData.teams.some((tt) => {
            if (tt.teamId === matchedTeam.id) return false;
            const r = Array.isArray(tt.rosterJson) ? (tt.rosterJson as any[]) : [];
            return r.some((entry) => typeof entry === 'object' && entry && entry.playerId === candidatePlayerId);
          });
          if (inOtherRoster) return true;

          // 2. Check pending stats in this import batch
          const inBatch = pendingPlayerStats.some(
            (s) => s.playerId === candidatePlayerId && s.payload.teamId && s.payload.teamId !== matchedTeam.id
          );
          if (inBatch) return true;

          return false;
        };

        // Check if this exact IGN is claimed or already registered by another team in this event
        const isIgnClaimedByOtherTeamInTournament = tourneyData.teams.some((tt) => {
          if (tt.teamId === matchedTeam.id) return false;
          const r = Array.isArray(tt.rosterJson) ? (tt.rosterJson as any[]) : [];
          return r.some((entry) => {
            const entryIgn = typeof entry === 'string' ? entry : entry?.ign;
            const c = cleanStr(entryIgn);
            return c === cleanPlayerIgn || stripTeamPrefix(c) === basePlayerIgn;
          });
        });

        // If not matched on this team, check if an unassigned player with this exact IGN exists (only if not unlinked in roster)
        if (!matchedPlayer && !isExplicitlyUnlinkedInRoster) {
          const unassignedPlayer = allPlayers.find(
            (p) =>
              (cleanStr(p.ign) === cleanPlayerIgn || stripTeamPrefix(cleanStr(p.ign)) === basePlayerIgn) &&
              !p.currentTeamId
          );
          if (unassignedPlayer && !isPlayerCompetingForOtherTeamInTournament(unassignedPlayer.id)) {
            matchedPlayer = unassignedPlayer;
          }
        }

        const rawPlayerVerified =
          row.playerVerified ??
          row.PlayerVerified ??
          row.player_verified ??
          row.isVerified ??
          row.Verified ??
          row.verified ??
          row.athlete ??
          row.Athlete;

        const isExplicitlyUnverified =
          rawPlayerVerified === false ||
          rawPlayerVerified === 0 ||
          String(rawPlayerVerified).trim().toLowerCase() === 'false' ||
          String(rawPlayerVerified).trim().toLowerCase() === '0' ||
          String(rawPlayerVerified).trim().toLowerCase() === 'no' ||
          String(rawPlayerVerified).trim().toLowerCase() === 'unverified' ||
          String(rawPlayerVerified).trim().toLowerCase() === 'amateur';

        const isExplicitlyVerified =
          rawPlayerVerified === true ||
          rawPlayerVerified === 1 ||
          String(rawPlayerVerified).trim().toLowerCase() === 'true' ||
          String(rawPlayerVerified).trim().toLowerCase() === '1' ||
          String(rawPlayerVerified).trim().toLowerCase() === 'yes' ||
          String(rawPlayerVerified).trim().toLowerCase() === 'verified' ||
          String(rawPlayerVerified).trim().toLowerCase() === 'pro';

        const shouldVerifyPlayer =
          isExplicitlyUnverified
            ? false
            : isExplicitlyVerified
            ? true
            : isExplicitlyUnlinkedInRoster
            ? false
            : !isQualifier;

        // Check if an existing player has this exact IGN
        const playerOnOtherTeam = allPlayers.find(
          (p) => cleanStr(p.ign) === cleanPlayerIgn || stripTeamPrefix(cleanStr(p.ign)) === basePlayerIgn
        );

        // In Main Event mode (!isQualifier), if a verified player with this exact IGN exists on another team,
        // link to them ONLY IF not explicitly designated as unlinked or unverified,
        // AND ONLY IF they are NOT already registered or competing for another team in this event!
        if (
          !matchedPlayer &&
          !isQualifier &&
          !isExplicitlyUnlinkedInRoster &&
          !isExplicitlyUnverified &&
          playerOnOtherTeam &&
          !isIgnClaimedByOtherTeamInTournament &&
          !isPlayerCompetingForOtherTeamInTournament(playerOnOtherTeam.id)
        ) {
          matchedPlayer = playerOnOtherTeam;
        }

        // If still not matched, check only for minor 1-char typo within this specific team's roster (never cross-team)
        if (!matchedPlayer && existingTourneyTeam) {
          const roster = Array.isArray(existingTourneyTeam.rosterJson)
            ? (existingTourneyTeam.rosterJson as any[])
            : [];
          const candidate = roster.find((p) => {
            const ign = cleanStr(typeof p === 'string' ? p : p?.ign);
            if (!ign || Math.abs(ign.length - cleanPlayerIgn.length) > 1) return false;
            let diffs = 0;
            const maxL = Math.max(ign.length, cleanPlayerIgn.length);
            for (let k = 0; k < maxL; k++) {
              if (ign[k] !== cleanPlayerIgn[k]) diffs++;
              if (diffs > 1) return false;
            }
            return diffs <= 1;
          });
          if (candidate && typeof candidate === 'object' && candidate.playerId) {
            matchedPlayer = allPlayers.find((p) => p.id === candidate.playerId);
          }
        }

        const defaultPlayerRole = row.role && String(row.role).trim() ? String(row.role).trim() : 'Assaulter';

        if (!matchedPlayer) {
          const pSlug = `${cleanPlayerIgn.replace(/\s+/g, '-')}-${Date.now().toString().slice(-4)}`;
          matchedPlayer = await tx.player.create({
            data: {
              ign: playerRaw.trim(),
              slug: pSlug,
              role: defaultPlayerRole,
              gameId: defaultGame.id,
              currentTeamId: matchedTeam.id,
              isVerified: shouldVerifyPlayer,
              status: shouldVerifyPlayer ? 'ACTIVE' : 'UNVERIFIED',
            },
          });
          allPlayers.push({ id: matchedPlayer.id, ign: matchedPlayer.ign, currentTeamId: matchedTeam.id });
          totalCreatedPlayers++;
        }

        // Ensure player is added or linked in tournament squad roster
        if (existingTourneyTeam) {
          const roster = Array.isArray(existingTourneyTeam.rosterJson)
            ? (existingTourneyTeam.rosterJson as any[])
            : [];

          if (matchedRosterEntry && typeof matchedRosterEntry === 'object') {
            // Never overwrite an explicitly unlinked slot (playerId === null) with an external player
            if (matchedRosterEntry.playerId === undefined) {
              matchedRosterEntry.playerId = matchedPlayer.id;
              await tx.tournamentTeam
                .update({
                  where: { id: existingTourneyTeam.id },
                  data: { rosterJson: roster },
                })
                .catch(() => null);
            }
          } else if (!matchedRosterEntry) {
            const updatedRoster = [
              ...roster,
              {
                playerId: matchedPlayer.id,
                ign: playerRaw.trim(),
                role: row.role ? String(row.role).trim() : null,
                captain: false,
              },
            ];
            await tx.tournamentTeam
              .update({
                where: { id: existingTourneyTeam.id },
                data: { rosterJson: updatedRoster },
              })
              .catch(() => null);
            existingTourneyTeam.rosterJson = updatedRoster;
          }
        }

        // 6. Cascade / Non-destructive Team Result Check (Requirement 3)
        const teamResultKey = `${matchGameId}_${matchedTeam.id}`;
        let existingTeamResult = teamResultsCache.get(teamResultKey);

        const teamRank = Number(row.team_rank || row.teamRank) || (existingTeamResult ? existingTeamResult.rank : 1);
        const isTeamWwcd = parseWwcd(row.team_wwcd ?? row.teamWwcd ?? row.wwcd, teamRank);

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

        const teamPayload = {
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
          won: isTeamWwcd,
          score: teamTotalPoints,
        };

        // Cache so subsequent players of the same team can inherit values
        teamResultsCache.set(teamResultKey, {
          rank: teamRank,
          placePoints: teamPlacePoints,
          elimsPoints: teamElimsPoints,
        });

        pendingTeamResults.set(teamResultKey, {
          matchGameId,
          teamId: matchedTeam.id,
          payload: teamPayload,
        });

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
          role: row.role && String(row.role).trim() ? String(row.role).trim() : 'Assaulter',
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

        pendingPlayerStats.push({
          matchGameId,
          playerId: matchedPlayer.id,
          payload: playerStatPayload,
        });
      }

      // Execute batch team result upserts in concurrent chunks of 25
      const teamResultOps = Array.from(pendingTeamResults.values());
      const CHUNK_SIZE = 25;
      for (let c = 0; c < teamResultOps.length; c += CHUNK_SIZE) {
        const slice = teamResultOps.slice(c, c + CHUNK_SIZE);
        await Promise.all(
          slice.map((item) =>
            tx.matchTeamResult.upsert({
              where: {
                matchGameId_teamId: { matchGameId: item.matchGameId, teamId: item.teamId },
              },
              update: item.payload,
              create: {
                matchGameId: item.matchGameId,
                teamId: item.teamId,
                ...item.payload,
              },
            })
          )
        );
      }

      // Execute batch player stat upserts in concurrent chunks of 25
      for (let c = 0; c < pendingPlayerStats.length; c += CHUNK_SIZE) {
        const slice = pendingPlayerStats.slice(c, c + CHUNK_SIZE);
        await Promise.all(
          slice.map((item) =>
            tx.matchPlayerStat.upsert({
              where: {
                matchGameId_playerId: { matchGameId: item.matchGameId, playerId: item.playerId },
              },
              update: item.payload,
              create: {
                matchGameId: item.matchGameId,
                playerId: item.playerId,
                ...item.payload,
              },
            })
          )
        );
        totalInsertedPlayerStats += slice.length;
      }
    }, {
      maxWait: 20000,
      timeout: 120000,
    });

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
      revalidatePath('/tournaments');
      revalidatePath('/admin/matches');
      revalidatePath('/');
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

/**
 * Server action to fetch and parse match results from a Liquipedia URL.
 */
export async function fetchLiquipediaMatchAction(urlStr: string) {
  if (!(await isAdmin())) {
    redirect('/admin/login');
  }

  const { fetchLiquipediaMatchUrl } = await import('@/lib/liquipedia-parser');
  return fetchLiquipediaMatchUrl(urlStr);
}

