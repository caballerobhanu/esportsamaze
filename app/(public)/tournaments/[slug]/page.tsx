import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import prisma from '@/lib/prisma';
import {
  calculateTournamentStandings,
  calculateTournamentFraggers,
  type AggregatedTeamStanding,
} from '@/lib/tournament-math';
import {
  normalizeStandingsConfig,
  matchStageLabel,
  matchDayKey,
  matchRelativeDayKey,
  resolvePrizeRecipients,
  type StandingsMatchLite,
  type StandingsTeamMeta,
  type StandingsStageSummary,
} from '@/lib/standings-config';
import { countryCodeFor } from '@/lib/countries';
import { TournamentAppHeader } from '@/components/tournaments/tournament-app-header';
import { TournamentAppNav } from '@/components/tournaments/tournament-app-nav';
import { TournamentOverviewPanel } from '@/components/tournaments/tournament-overview-panel';
import { TournamentStandingsPanel } from '@/components/tournaments/tournament-standings-panel';
import {
  TournamentMatchesPanel,
  type StageGroup,
} from '@/components/tournaments/tournament-matches-panel';
import {
  TournamentPrizePanel,
  TournamentFormatPanel,
} from '@/components/tournaments/tournament-info-panels';
import { TournamentTeamsPanel } from '@/components/tournaments/tournament-teams-panel';
import {
  TournamentStatisticsPanel,
  type PlayerPerformanceRow,
  type TeamPerformanceRow,
} from '@/components/tournaments/tournament-statistics-panel';

export const dynamic = 'force-dynamic';

async function getTournamentData(rawSlug: string) {
  try {
    const decoded = decodeURIComponent(rawSlug).trim();
    const normalized = decoded.toLowerCase().replace(/\s+/g, '-');

    const tournament = await prisma.tournament.findFirst({
      where: {
        OR: [
          { slug: rawSlug },
          { slug: decoded },
          { slug: normalized },
          { slug: { equals: normalized, mode: 'insensitive' } },
          { name: { equals: decoded, mode: 'insensitive' } },
        ],
      },
      include: {
        game: true,
        organizers: { include: { organizer: true } },
        sponsors: { include: { sponsor: true } },
        venues: { include: { venue: true } },
        stages: { orderBy: { sequence: 'asc' } },
        teams: {
          orderBy: [{ finalRank: 'asc' }, { seed: 'asc' }],
          include: {
            seedTournament: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            team: {
              select: {
                id: true,
                name: true,
                displayName: true,
                tag: true,
                slug: true,
                logoUrl: true,
                imageDarkUrl: true,
                region: true,
              },
            },
          },
        },
        matches: {
          orderBy: [{ scheduledAt: 'asc' }, { matchNumber: 'asc' }],
          include: {
            stage: { select: { name: true } },
            games: {
              orderBy: { sequence: 'asc' },
              include: {
                teamResults: {
                  orderBy: { rank: 'asc' },
                  include: {
                    team: { select: { id: true, name: true, tag: true, slug: true, logoUrl: true, imageDarkUrl: true } },
                  },
                },
                playerStats: {
                  orderBy: { playerElims: 'desc' },
                  include: {
                    player: { select: { id: true, ign: true, slug: true } },
                    team: { select: { id: true, name: true, tag: true, slug: true, logoUrl: true, imageDarkUrl: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    return tournament;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const decoded = decodeURIComponent(slug).trim();
    const normalized = decoded.toLowerCase().replace(/\s+/g, '-');
    const tournament = await prisma.tournament.findFirst({
      where: {
        OR: [
          { slug },
          { slug: decoded },
          { slug: normalized },
          { slug: { equals: normalized, mode: 'insensitive' } },
          { name: { equals: decoded, mode: 'insensitive' } },
        ],
      },
      select: { name: true, prizePool: true, currency: true },
    });
    if (tournament) {
      return {
        title: `${tournament.name} — Esports Amaze Standings, Matches & Stats`,
        description: `Official stage-wise standings, match scorecards, prize pool distribution, participating team rosters, and top fraggers for ${tournament.name}.`,
      };
    }
  } catch {
    /* fall through */
  }
  return { title: 'Tournament Details | Esports Amaze' };
}

export default async function TournamentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; matchId?: string }>;
}) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const activeTab = tab || 'overview';

  const tournament = await getTournamentData(slug);
  if (!tournament) notFound();

  /* ── stage grouping + standings computation ── */
  const matchesByStage = new Map<string, typeof tournament.matches>();
  for (const m of tournament.matches) {
    const stageName = matchStageLabel(m);
    if (!matchesByStage.has(stageName)) matchesByStage.set(stageName, []);
    matchesByStage.get(stageName)!.push(m);
  }

  const resultsByMatch = new Map(
    tournament.matches.map((m) => [m.id, m.games.flatMap((g) => g.teamResults)])
  );

  const stagesData: {
    stageName: string;
    matchesCount: number;
    completedMatchesCount: number;
    standings: AggregatedTeamStanding[];
  }[] = Array.from(matchesByStage.entries()).map(([stageName, stageMatches]) => {
    const stageTeamResults = stageMatches.flatMap((m) => resultsByMatch.get(m.id)!);
    return {
      stageName,
      matchesCount: stageMatches.length,
      completedMatchesCount: stageMatches.filter((m) => m.status === 'COMPLETED').length,
      standings: calculateTournamentStandings(stageTeamResults),
    };
  });

  const allTeamResults = tournament.matches.flatMap((m) => resultsByMatch.get(m.id)!);
  const allPlayerStats = tournament.matches.flatMap((m) => m.games.flatMap((g) => g.playerStats));
  const overallStandings = calculateTournamentStandings(allTeamResults);
  const overallFraggers = calculateTournamentFraggers(allPlayerStats);

  const stageGroups: StageGroup[] = Array.from(matchesByStage.entries()).map(([stageName, stageMatches]) => ({
    stageName,
    matches: stageMatches.map((m) => ({
      id: m.id,
      format: m.format,
      matchNumber: m.matchNumber,
      overallMatchNumber: m.overallMatchNumber,
      mapName: m.mapName,
      status: m.status,
      scheduledAt: m.scheduledAt,
      matchTime: m.matchTime,
      streamUrl: m.streamUrl,
      teamResults: resultsByMatch.get(m.id)!,
      playerStats: m.games.flatMap((g) => g.playerStats),
    })),
  }));

  const stageFirstDays = new Map<string, string>();
  for (const [stageName, stageMatches] of matchesByStage) {
    const min = stageMatches.reduce(
      (acc, m) => (m.scheduledAt.getTime() < acc.getTime() ? m.scheduledAt : acc),
      stageMatches[0].scheduledAt
    );
    stageFirstDays.set(stageName, matchDayKey(min));
  }

  /* ── standings payloads: per-match metadata + team meta for the client panel ── */
  const standingsMatches: StandingsMatchLite[] = tournament.matches.map((m) => ({
    id: m.id,
    stageName: matchStageLabel(m),
    matchNumber: m.matchNumber ?? null,
    overallMatchNumber: m.overallMatchNumber ?? null,
    day: matchRelativeDayKey(m.scheduledAt, stageFirstDays.get(matchStageLabel(m))!),
    mapName: m.mapName ?? null,
    groupName: m.groupName ?? null,
    scheduledAt: m.scheduledAt.toISOString(),
    status: m.status,
    results: resultsByMatch.get(m.id)!,
  }));

  const stageSummaries: StandingsStageSummary[] = stagesData.map(
    ({ stageName, matchesCount, completedMatchesCount }) => ({
      stageName,
      matchesCount,
      completedMatchesCount,
    })
  );

  const teamsMeta: Record<string, StandingsTeamMeta> = {};
  for (const tt of tournament.teams) {
    teamsMeta[tt.teamId] = {
      name: tt.team.name,
      displayName: tt.displayName ?? tt.team.displayName,
      tag: tt.shortName ?? tt.team.tag,
      logoUrl: tt.logoUrl ?? tt.team.logoUrl,
      logoDarkUrl: tt.logoDarkUrl ?? tt.team.imageDarkUrl,
      countryCode: countryCodeFor(tt.country ?? tt.team.region),
    };
  }
  for (const m of standingsMatches) {
    for (const r of m.results) {
      if (!teamsMeta[r.teamId] && r.team) {
        teamsMeta[r.teamId] = {
          name: r.team.name,
          tag: r.team.tag,
          logoUrl: r.team.logoUrl,
        };
      }
    }
  }

  /* ── enriched teams: stage and group participation for teams tab ── */
  const stagesOrder: string[] = stagesData.map((s) => s.stageName);
  const stageGroupsMap: Record<string, string[]> = {};
  for (const s of stagesData) {
    const stageMatches = matchesByStage.get(s.stageName) || [];
    const grps = Array.from(new Set(stageMatches.map((m) => m.groupName).filter(Boolean) as string[]));
    stageGroupsMap[s.stageName] = grps;
  }

  const teamStageParticipation = new Map<string, Set<string>>();
  const teamGroupParticipation = new Map<string, Map<string, Set<string>>>();
  const teamTotalPoints = new Map<string, number>();

  for (const m of tournament.matches) {
    const stLabel = matchStageLabel(m);
    const grp = m.groupName;
    for (const g of m.games) {
      for (const tr of g.teamResults) {
        if (!teamStageParticipation.has(tr.teamId)) {
          teamStageParticipation.set(tr.teamId, new Set());
        }
        teamStageParticipation.get(tr.teamId)!.add(stLabel);

        if (grp) {
          if (!teamGroupParticipation.has(tr.teamId)) {
            teamGroupParticipation.set(tr.teamId, new Map());
          }
          const mGroups = teamGroupParticipation.get(tr.teamId)!;
          if (!mGroups.has(stLabel)) {
            mGroups.set(stLabel, new Set());
          }
          mGroups.get(stLabel)!.add(grp);
        }

        teamTotalPoints.set(tr.teamId, (teamTotalPoints.get(tr.teamId) || 0) + (tr.totalPoints || 0));
      }
    }
  }

  const enrichedTeams = tournament.teams.map((tt) => {
    const stagesSet = teamStageParticipation.get(tt.teamId) || new Set();
    const stagesList = stagesOrder.filter((st) => stagesSet.has(st));
    const groupsMap = teamGroupParticipation.get(tt.teamId);
    const groupsByStage: Record<string, string[]> = {};
    if (groupsMap) {
      for (const [st, grpSet] of groupsMap.entries()) {
        groupsByStage[st] = Array.from(grpSet);
      }
    }

    let deepestStageIdx = -1;
    for (let i = stagesOrder.length - 1; i >= 0; i--) {
      if (stagesSet.has(stagesOrder[i])) {
        deepestStageIdx = i;
        break;
      }
    }

    return {
      ...tt,
      stagesParticipated: stagesList,
      groupsByStage,
      deepestStageSequence: deepestStageIdx,
      totalPointsAcrossTournament: teamTotalPoints.get(tt.teamId) || 0,
    };
  });

  /* ── player match stats & score matrix data ── */
  const matchesHeaderList = tournament.matches.map((m) => ({
    id: m.id,
    matchNumber: m.matchNumber ?? 1,
    overallMatchNumber: m.overallMatchNumber ?? null,
    mapName: m.mapName || 'Erangel',
    stageName: matchStageLabel(m),
    groupName: m.groupName || null,
    status: m.status,
  }));

  // ── Overall Tournament Days (Day 1 to Day N sequentially across all matches) ──
  const distinctMatchDates = Array.from(
    new Set(tournament.matches.map((m) => matchDayKey(m.scheduledAt)))
  ).sort();

  const dateToOverallDay = new Map<string, string>();
  distinctMatchDates.forEach((dateKey, idx) => {
    dateToOverallDay.set(dateKey, String(idx + 1));
  });

  const uniqueDaysList = Array.from({ length: distinctMatchDates.length }, (_, i) => String(i + 1));

  const playerMap = new Map<string, PlayerPerformanceRow>();

  for (const m of tournament.matches) {
    const stageName = matchStageLabel(m);
    const mapName = m.mapName?.trim() || 'Erangel';
    const matchDay = dateToOverallDay.get(matchDayKey(m.scheduledAt)) || '1';

    for (const g of m.games) {
      for (const ps of g.playerStats) {
        if (!ps.player) continue;
        const pId = ps.playerId;
        if (!playerMap.has(pId)) {
          const tTeam = tournament.teams.find((tt) => tt.teamId === ps.teamId);
          const pSlug = ps.player?.slug || null;
          const tSlug = tTeam?.team?.slug || ps.team?.slug || null;
          playerMap.set(pId, {
            playerId: pId,
            playerSlug: pSlug,
            ign: ps.player.ign,
            teamId: ps.teamId,
            teamSlug: tSlug,
            teamName: tTeam?.displayName || ps.team?.name || tTeam?.team?.name || 'Unknown Team',
            teamTag: tTeam?.shortName || ps.shortCode || ps.team?.tag || null,
            teamLogo: tTeam?.logoUrl || ps.team?.logoUrl || null,
            teamLogoDark: tTeam?.logoDarkUrl || ps.team?.imageDarkUrl || null,
            role: ps.role || null,
            matchesPlayed: 0,
            totalElims: 0,
            totalPowerplay: 0,
            totalDamage: 0,
            totalHeadshots: 0,
            totalAssists: 0,
            totalKnockouts: 0,
            totalSurvivalTime: 0,
            totalHealing: 0,
            totalDamageReceived: 0,
            totalUtilities: 0,
            totalDist: 0,
            totalMvps: 0,
            avgElims: 0,
            maxElims: 0,
            zeroElimsMatches: 0,
            fivePlusElimsMatches: 0,
            matchStats: {},
          });
        }

        const pRow = playerMap.get(pId)!;
        pRow.matchesPlayed += 1;
        pRow.totalElims += ps.playerElims || 0;
        pRow.totalPowerplay += ps.playerPowerplay || 0;
        pRow.totalDamage += ps.damage || 0;
        pRow.totalHeadshots += ps.headshots || 0;
        pRow.totalAssists += ps.assists || 0;
        pRow.totalKnockouts += ps.knockouts || 0;
        pRow.totalSurvivalTime += ps.survivalTime || 0;
        pRow.totalHealing += ps.healing || 0;
        pRow.totalDamageReceived += ps.damageReceived || 0;
        pRow.totalUtilities += ps.utilitiesTotal || 0;
        pRow.totalDist += ps.totalDist || 0;
        if (ps.isMvp) pRow.totalMvps += 1;

        const elimsCount = ps.playerElims || 0;
        pRow.maxElims = Math.max(pRow.maxElims || 0, elimsCount);
        if (elimsCount === 0) pRow.zeroElimsMatches = (pRow.zeroElimsMatches || 0) + 1;
        if (elimsCount >= 5) pRow.fivePlusElimsMatches = (pRow.fivePlusElimsMatches || 0) + 1;

        pRow.matchStats[m.id] = {
          matchId: m.id,
          mapName,
          stageName,
          groupName: m.groupName || null,
          day: matchDay,
          playerElims: ps.playerElims || 0,
          playerPowerplay: ps.playerPowerplay || 0,
          damage: ps.damage || 0,
          headshots: ps.headshots || 0,
          assists: ps.assists || 0,
          knockouts: ps.knockouts || 0,
          survivalTime: ps.survivalTime || 0,
          healing: ps.healing || 0,
          damageReceived: ps.damageReceived || 0,
          utilities: ps.utilitiesTotal || 0,
          totalDist: ps.totalDist || 0,
          isMvp: ps.isMvp,
        };
      }
    }
  }

  const playerRowsList: PlayerPerformanceRow[] = Array.from(playerMap.values()).map((p) => ({
    ...p,
    avgElims: Number((p.totalElims / (p.matchesPlayed || 1)).toFixed(2)),
    maxElims: p.maxElims || 0,
    zeroElimsMatches: p.zeroElimsMatches || 0,
    fivePlusElimsMatches: p.fivePlusElimsMatches || 0,
  }));

  // Unique Maps List
  const mapsSet = new Set<string>();
  for (const m of tournament.matches) {
    if (m.mapName?.trim()) mapsSet.add(m.mapName.trim());
  }
  const uniqueMapsList = Array.from(mapsSet);

  // Compute team performance rows across stages and maps
  const teamPerformanceMap = new Map<string, TeamPerformanceRow>();

  for (const tt of tournament.teams) {
    teamPerformanceMap.set(tt.teamId, {
      teamId: tt.teamId,
      teamSlug: tt.team?.slug || null,
      teamName: tt.displayName || tt.team?.name || 'Unknown Squad',
      teamTag: tt.shortName || tt.team?.tag || null,
      teamLogo: tt.logoUrl || tt.team?.logoUrl || null,
      teamLogoDark: tt.logoDarkUrl || tt.team?.imageDarkUrl || null,
      matchesPlayed: 0,
      wwcdCount: 0,
      winRate: 0,
      top5Count: 0,
      midCount: 0,
      bottomCount: 0,
      totalPlacePoints: 0,
      avgPlacePoints: 0,
      maxPlacePoints: 0,
      totalElimsPoints: 0,
      avgElims: 0,
      maxElims: 0,
      totalPoints: 0,
      avgTotalPoints: 0,
      maxTotalPoints: 0,
      matches: [],
      mapStats: {},
      stageStats: {},
    });
  }

  for (const m of tournament.matches) {
    const stageName = matchStageLabel(m);
    const mapName = m.mapName?.trim() || 'Erangel';
    const matchDay = dateToOverallDay.get(matchDayKey(m.scheduledAt)) || '1';

    for (const g of m.games) {
      for (const tr of g.teamResults) {
        if (!teamPerformanceMap.has(tr.teamId)) {
          teamPerformanceMap.set(tr.teamId, {
            teamId: tr.teamId,
            teamSlug: tr.team?.slug || null,
            teamName: tr.team?.name || 'Unknown Squad',
            teamTag: tr.team?.tag || null,
            teamLogo: tr.team?.logoUrl || null,
            teamLogoDark: tr.team?.imageDarkUrl || null,
            matchesPlayed: 0,
            wwcdCount: 0,
            winRate: 0,
            top5Count: 0,
            midCount: 0,
            bottomCount: 0,
            totalPlacePoints: 0,
            avgPlacePoints: 0,
            maxPlacePoints: 0,
            totalElimsPoints: 0,
            avgElims: 0,
            maxElims: 0,
            totalPoints: 0,
            avgTotalPoints: 0,
            maxTotalPoints: 0,
            matches: [],
            mapStats: {},
            stageStats: {},
          });
        }

        const isWwcd = Boolean(tr.wwcd || tr.rank === 1);
        const tRow = teamPerformanceMap.get(tr.teamId)!;
        tRow.matchesPlayed += 1;
        if (isWwcd) tRow.wwcdCount += 1;
        if (tr.rank >= 1 && tr.rank <= 5) tRow.top5Count += 1;
        if (tr.rank >= 6 && tr.rank <= 10) tRow.midCount += 1;
        if (tr.rank >= 11) tRow.bottomCount += 1;
        tRow.totalPlacePoints += tr.placePoints || 0;
        tRow.totalElimsPoints += tr.elimsPoints || 0;
        tRow.totalPoints += tr.totalPoints || 0;
        tRow.maxElims = Math.max(tRow.maxElims || 0, tr.elimsPoints || 0);
        tRow.maxPlacePoints = Math.max(tRow.maxPlacePoints || 0, tr.placePoints || 0);
        tRow.maxTotalPoints = Math.max(tRow.maxTotalPoints || 0, tr.totalPoints || 0);

        tRow.matches?.push({
          matchId: m.id,
          stageName,
          mapName,
          day: matchDay,
          groupName: m.groupName || null,
          rank: tr.rank,
          wwcd: isWwcd,
          placePoints: tr.placePoints || 0,
          elimsPoints: tr.elimsPoints || 0,
          totalPoints: tr.totalPoints || 0,
        });

        // Map stats
        if (!tRow.mapStats[mapName]) {
          tRow.mapStats[mapName] = {
            mapName,
            matchesPlayed: 0,
            wwcdCount: 0,
            elims: 0,
            placePoints: 0,
            totalPoints: 0,
          };
        }
        const ms = tRow.mapStats[mapName];
        ms.matchesPlayed += 1;
        if (isWwcd) ms.wwcdCount += 1;
        ms.elims += tr.elimsPoints || 0;
        ms.placePoints += tr.placePoints || 0;
        ms.totalPoints += tr.totalPoints || 0;

        // Stage stats
        if (!tRow.stageStats[stageName]) {
          tRow.stageStats[stageName] = {
            stageName,
            matchesPlayed: 0,
            wwcdCount: 0,
            elims: 0,
            placePoints: 0,
            totalPoints: 0,
            maps: {},
          };
        }
        const ss = tRow.stageStats[stageName];
        ss.matchesPlayed += 1;
        if (isWwcd) ss.wwcdCount += 1;
        ss.elims += tr.elimsPoints || 0;
        ss.placePoints += tr.placePoints || 0;
        ss.totalPoints += tr.totalPoints || 0;

        if (!ss.maps[mapName]) {
          ss.maps[mapName] = {
            matchesPlayed: 0,
            wwcdCount: 0,
            elims: 0,
            totalPoints: 0,
          };
        }
        const ssm = ss.maps[mapName];
        ssm.matchesPlayed += 1;
        if (isWwcd) ssm.wwcdCount += 1;
        ssm.elims += tr.elimsPoints || 0;
        ssm.totalPoints += tr.totalPoints || 0;
      }
    }
  }

  // Finalize averages for team rows
  const teamPerformanceRows: TeamPerformanceRow[] = Array.from(teamPerformanceMap.values())
    .filter((t) => t.matchesPlayed > 0)
    .map((t) => {
      const mp = t.matchesPlayed || 1;
      return {
        ...t,
        winRate: Number(((t.wwcdCount / mp) * 100).toFixed(1)),
        avgElims: Number((t.totalElimsPoints / mp).toFixed(2)),
        avgPlacePoints: Number((t.totalPlacePoints / mp).toFixed(2)),
        avgTotalPoints: Number((t.totalPoints / mp).toFixed(2)),
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints || b.wwcdCount - a.wwcdCount);

  const standingsConfig = normalizeStandingsConfig(tournament.standingsConfig);

  /* ── series editions: prev / next navigation ── */
  const editions = tournament.series
    ? await prisma.tournament.findMany({
        where: { series: { equals: tournament.series, mode: 'insensitive' } },
        select: { slug: true, name: true, season: true, startDate: true, seriesValue: true },
        orderBy: [{ startDate: 'asc' }, { seriesValue: 'asc' }],
      })
    : [];
  const editionIndex = editions.findIndex((e) => e.slug === tournament.slug);
  const prevEdition = editionIndex > 0 ? editions[editionIndex - 1] : null;
  const nextEdition = editionIndex >= 0 && editionIndex < editions.length - 1 ? editions[editionIndex + 1] : null;

  /* ── champion / runner-up: manual scalars first, then prize-distribution recipients ── */
  const rawPd = tournament.prizeDistribution as
    | { stages?: Array<{ ranks?: Array<{ recipientType?: string; playerId?: string }> }> }
    | Array<{ recipientType?: string; playerId?: string }>
    | null;
  const pdRanks = Array.isArray(rawPd)
    ? rawPd
    : Array.isArray(rawPd?.stages)
      ? rawPd.stages.flatMap((s) => s.ranks ?? [])
      : [];
  const prizePlayerIds = [
    ...new Set(
      pdRanks.filter((r) => r?.recipientType === 'PLAYER' && r?.playerId).map((r) => r.playerId as string)
    ),
  ];
  const prizePlayers =
    prizePlayerIds.length > 0
      ? await prisma.player.findMany({ where: { id: { in: prizePlayerIds } }, select: { id: true, ign: true } })
      : [];
  const resolved = resolvePrizeRecipients(
    tournament.prizeDistribution,
    new Map(tournament.teams.map((tt) => [tt.teamId, tt.team])),
    new Map(prizePlayers.map((p) => [p.id, p]))
  );
  const resolvedWinner = tournament.winner ?? resolved.winner;
  const resolvedRunnerUp = tournament.runnerUp ?? resolved.runnerUp;

  /* ── featured stage: explicit setting → most recent match → finals → last ── */
  const formatRules = (tournament.formatDetails ?? {}) as {
    featuredStage?: string;
    pointsMatrix?: Record<string, number>;
    killPointsPerElim?: number;
  };
  const featuredStageName =
    stagesData.find((s) => s.stageName.toLowerCase() === formatRules.featuredStage?.toLowerCase())?.stageName ??
    stageWithLatestMatch(stageGroups) ??
    stagesData.find((s) => s.stageName.toLowerCase().includes('final'))?.stageName ??
    stagesData[stagesData.length - 1]?.stageName ??
    'Grand Finals';
  const featuredStandings = stagesData.find((s) => s.stageName === featuredStageName)?.standings ?? overallStandings;

  /* ── prize parsing (multi-stage or flat) ── */
  const rawPrizeDist = tournament.prizeDistribution as
    | { stages?: Array<{ stageName: string; allocatedPrize?: number; ranks?: unknown[] }> }
    | Array<Record<string, unknown>>
    | null;
  const prizeStages = Array.isArray(rawPrizeDist) || rawPrizeDist?.stages == null
    ? [
        {
          stageName: 'Grand Finals',
          allocatedPrize: tournament.prizePool ?? 0,
          ranks: (Array.isArray(rawPrizeDist) ? rawPrizeDist : []) as TournamentPrizeRank[],
        },
      ]
    : (rawPrizeDist.stages ?? []).map((s) => ({
        stageName: s.stageName,
        allocatedPrize: s.allocatedPrize,
        ranks: (s.ranks ?? []) as TournamentPrizeRank[],
      }));

  const qualificationsList = Array.isArray(tournament.qualifications)
    ? (tournament.qualifications as Array<{ place: string; events: Array<string | { name: string }>; description?: string }>)
    : [];

  return (
    <div className="flex flex-1 flex-col">

      {/* Flat editorial canvas — centered 1200px column */}
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-4 sm:px-6">
        <TournamentAppHeader
          tournament={tournament}
          matchesCount={tournament.matches.length}
          teamsCount={tournament.teams.length}
          editions={editions}
          prevEdition={prevEdition}
          nextEdition={nextEdition}
          resolvedWinner={resolvedWinner}
          resolvedRunnerUp={resolvedRunnerUp}
        />
        <TournamentAppNav slug={slug} activeTab={activeTab} />

        <main className="flex-1 py-8 pb-24 md:pb-16">
          {activeTab === 'overview' && (
            <TournamentOverviewPanel
              tournament={tournament}
              featuredStageName={featuredStageName}
              featuredStandings={featuredStandings}
              overallFraggers={overallFraggers}
              matches={stageGroups.flatMap((g) => g.matches)}
              teamsCount={tournament.teams.length}
              resolvedWinner={resolvedWinner}
              resolvedRunnerUp={resolvedRunnerUp}
            />
          )}

          {activeTab === 'standings' && (
            <TournamentStandingsPanel
              stages={stageSummaries}
              matches={standingsMatches}
              teams={teamsMeta}
              config={standingsConfig}
              overallTopFragger={
                overallFraggers[0]
                  ? { ign: overallFraggers[0].ign, teamName: overallFraggers[0].teamName, kills: overallFraggers[0].elims }
                  : null
              }
            />
          )}

          {activeTab === 'matches' && (
            <Suspense fallback={<MatchesFallback />}>
              <TournamentMatchesPanel
                stageGroups={stageGroups}
                matchColumns={standingsConfig.matchColumns}
              />
            </Suspense>
          )}

          {activeTab === 'format' && (
            <TournamentFormatPanel
              stages={tournament.stages}
              pointsMatrix={formatRules.pointsMatrix}
              killPoints={formatRules.killPointsPerElim || 1}
              gameMode={tournament.gameMode}
              eventType={tournament.eventType}
              device={tournament.device}
            />
          )}

          {activeTab === 'teams' && (
            <TournamentTeamsPanel
              teams={enrichedTeams}
              logoMode={standingsConfig.logoMode}
              showCountryFlag={
                standingsConfig.teamsConfig?.showCountryFlag ??
                (standingsConfig.logoMode === 'BOTH' || standingsConfig.logoMode === 'COUNTRY')
              }
            />
          )}

          {activeTab === 'prizepool' && (
            <TournamentPrizePanel
              prizeStages={prizeStages}
              currency={tournament.currency}
              qualifications={qualificationsList}
            />
          )}

          {(activeTab === 'statistics' || activeTab === 'fraggers') && (
            <TournamentStatisticsPanel
              playerRows={playerRowsList}
              teamRows={teamPerformanceRows}
              stages={stagesOrder}
              mapsList={uniqueMapsList}
              daysList={uniqueDaysList}
              stageGroups={stageGroupsMap}
              logoMode={standingsConfig.logoMode}
              defaultView={standingsConfig.statisticsConfig?.defaultView}
              adminPlayerColumns={standingsConfig.statisticsConfig?.playerColumns}
              customPlayerColumns={standingsConfig.statisticsConfig?.customPlayerColumns}
            />
          )}
        </main>
      </div>

    </div>
  );
}

type TournamentPrizeRank = {
  rank: string;
  percentage?: number;
  prize: number;
  rewardType?: string;
  customReward?: string;
  recipientType?: string;
  teamName?: string;
  playerName?: string;
};

function stageWithLatestMatch(groups: StageGroup[]): string | null {
  let latestTime = -1;
  let latestStage: string | null = null;
  for (const g of groups) {
    for (const m of g.matches) {
      const t = new Date(m.scheduledAt).getTime() || 0;
      if (t > latestTime) {
        latestTime = t;
        latestStage = g.stageName;
      }
    }
  }
  return latestStage;
}

function MatchesFallback() {
  return (
    <div className="ed-card flex h-40 items-center justify-center">
      <p className="ed-label">Loading matches…</p>
    </div>
  );
}
