import prisma from './prisma';
import { compareTeamStandings, compareFraggerStandings } from './tournament-math';

export interface TeamStandingEntry {
  teamId: string;
  teamName: string;
  teamSlug: string | null;
  tag: string | null;
  logoUrl: string | null;
  rank: number;
  matchesPlayed: number;
  wwcd: number;
  placementPoints: number;
  eliminationPoints: number;
  bonusPoints: number;
  totalPoints: number;
  totalDamage: number;
  longestElim: number;
  headshots: number;
  grenadeElims: number;
  utilitiesTotal: number;
  rescues: number;
  matchHistory: {
    matchNumber: number;
    mapName: string;
    groupName: string | null;
    rank: number;
    wwcd: boolean;
    placePoints: number;
    elimsPoints: number;
    totalPoints: number;
    damage: number;
  }[];
}

/**
 * Computes cumulative tournament standings from stored MatchTeamResult rows,
 * including per-match history for each team.
 */
export async function computeTournamentStandings(
  tournamentId: string,
  stageId?: string
): Promise<TeamStandingEntry[]> {
  const where = {
    matchGame: {
      match: {
        tournamentId,
        ...(stageId ? { stageId } : {}),
        status: 'COMPLETED' as const,
      },
    },
  };

  const teamResults = await prisma.matchTeamResult.findMany({
    where,
    include: {
      team: { select: { id: true, name: true, slug: true, tag: true, logoUrl: true } },
      matchGame: {
        select: {
          match: { select: { matchNumber: true, mapName: true, groupName: true } },
        },
      },
    },
    orderBy: { matchGame: { match: { matchNumber: 'asc' } } },
  });

  const teamMap = new Map<string, {
    teamId: string;
    teamName: string;
    teamSlug: string | null;
    tag: string | null;
    logoUrl: string | null;
    matchesPlayed: number;
    wwcd: number;
    placementPoints: number;
    eliminationPoints: number;
    bonusPoints: number;
    totalPoints: number;
    totalDamage: number;
    longestElim: number;
    headshots: number;
    grenadeElims: number;
    utilitiesTotal: number;
    rescues: number;
    matchHistory: TeamStandingEntry['matchHistory'];
  }>();

  for (const r of teamResults) {
    const key = r.teamId;
    const existing = teamMap.get(key) ?? {
      teamId: r.teamId,
      teamName: r.team?.name ?? 'Unknown',
      teamSlug: r.team?.slug ?? null,
      tag: r.team?.tag ?? null,
      logoUrl: r.team?.logoUrl ?? null,
      matchesPlayed: 0,
      wwcd: 0,
      placementPoints: 0,
      eliminationPoints: 0,
      bonusPoints: 0,
      totalPoints: 0,
      totalDamage: 0,
      longestElim: 0,
      headshots: 0,
      grenadeElims: 0,
      utilitiesTotal: 0,
      rescues: 0,
      matchHistory: [],
    };

    existing.matchesPlayed += 1;
    if (r.wwcd || r.rank === 1) existing.wwcd += 1;
    existing.placementPoints += Number(r.placePoints || 0);
    existing.eliminationPoints += Number(r.elimsPoints || 0);
    existing.bonusPoints += Number(r.bonusPoints || 0);
    existing.totalPoints += Number(r.totalPoints || 0);
    existing.totalDamage += Number(r.damage || 0);
    existing.headshots += Number(r.headshots || 0);
    existing.longestElim = Math.max(existing.longestElim, Number(r.longestElim || 0));
    existing.grenadeElims += Number(r.grenadeElims || 0);
    existing.utilitiesTotal += Number(r.utilitiesTotal || 0);
    existing.rescues += Number(r.rescues || 0);

    existing.matchHistory.push({
      matchNumber: r.matchGame.match.matchNumber ?? 0,
      mapName: r.matchGame.match.mapName ?? 'Unknown',
      groupName: r.matchGame.match.groupName ?? null,
      rank: r.rank,
      wwcd: r.wwcd || r.rank === 1,
      placePoints: Number(r.placePoints || 0),
      elimsPoints: Number(r.elimsPoints || 0),
      totalPoints: Number(r.totalPoints || 0),
      damage: Number(r.damage || 0),
    });

    teamMap.set(key, existing);
  }

  const list = Array.from(teamMap.values());

  // Tie-break order shared with lib/tournament-math.ts (see compareTeamStandings)
  list.sort((a, b) =>
    compareTeamStandings(
      { ...a, lastMatchRank: a.matchHistory[a.matchHistory.length - 1]?.rank },
      { ...b, lastMatchRank: b.matchHistory[b.matchHistory.length - 1]?.rank }
    )
  );

  return list.map((item, index) => ({ ...item, rank: index + 1 }));
}

export interface PlayerFraggerEntry {
  playerId: string;
  ign: string;
  playerSlug: string | null;
  avatarUrl: string | null;
  role: string | null;
  teamName: string;
  teamTag: string | null;
  rank: number;
  matchesPlayed: number;
  elims: number;
  damage: number;
  headshots: number;
  assists: number;
  knockouts: number;
  longestElim: number;
  mvps: number;
  powerplayElims: number;
}

/**
 * Computes cumulative player fragger stats from stored MatchPlayerStat rows.
 */
export async function computeTournamentFraggers(
  tournamentId: string,
  stageId?: string
): Promise<PlayerFraggerEntry[]> {
  const where = {
    matchGame: {
      match: {
        tournamentId,
        ...(stageId ? { stageId } : {}),
        status: 'COMPLETED' as const,
      },
    },
  };

  const playerStats = await prisma.matchPlayerStat.findMany({
    where,
    include: {
      player: { select: { id: true, ign: true, slug: true, avatarUrl: true } },
      team: { select: { id: true, name: true, tag: true } },
    },
    orderBy: { matchGame: { match: { matchNumber: 'asc' } } },
  });

  const playerMap = new Map<string, {
    playerId: string;
    ign: string;
    playerSlug: string | null;
    avatarUrl: string | null;
    role: string | null;
    teamName: string;
    teamTag: string | null;
    matchesPlayed: number;
    elims: number;
    damage: number;
    headshots: number;
    assists: number;
    knockouts: number;
    longestElim: number;
    mvps: number;
    powerplayElims: number;
  }>();

  for (const s of playerStats) {
    const key = s.playerId;
    const existing = playerMap.get(key) ?? {
      playerId: s.playerId,
      ign: s.player?.ign ?? 'Unknown',
      playerSlug: s.player?.slug ?? null,
      avatarUrl: s.player?.avatarUrl ?? null,
      role: s.role ?? null,
      teamName: s.team?.name ?? '',
      teamTag: s.team?.tag ?? null,
      matchesPlayed: 0,
      elims: 0,
      damage: 0,
      headshots: 0,
      assists: 0,
      knockouts: 0,
      longestElim: 0,
      mvps: 0,
      powerplayElims: 0,
    };

    existing.matchesPlayed += 1;
    existing.elims += Number(s.playerElims || 0);
    existing.damage += Number(s.damage || 0);
    existing.headshots += Number(s.headshots || 0);
    existing.assists += Number(s.assists || 0);
    existing.knockouts += Number(s.knockouts || 0);
    existing.longestElim = Math.max(existing.longestElim, Number(s.longestElim || 0));
    if (s.isMvp) existing.mvps += 1;
    existing.powerplayElims += Number(s.playerPowerplay || 0);

    playerMap.set(key, existing);
  }

  const list = Array.from(playerMap.values());

  list.sort((a, b) => compareFraggerStandings(a, b));

  return list.map((item, index) => ({ ...item, rank: index + 1 }));
}
