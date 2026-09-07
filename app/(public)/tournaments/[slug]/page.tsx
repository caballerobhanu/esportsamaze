import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Crown,
  Trophy,
  Users,
  Layers,
  Swords,
} from 'lucide-react';
import prisma from '@/lib/prisma';
import {
  calculateTournamentStandings,
  calculateTournamentFraggers,
  readKillMultiplier,
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
import { formatDate } from '@/lib/utils';
import { EstaticTabNav } from '@/components/tournaments/estatic/estatic-tab-nav';
import { ThemeLogo } from '@/components/tournaments/estatic/theme-logo';
import { EstaticOverviewPanel } from '@/components/tournaments/estatic/estatic-overview-panel';
import { EstaticStandingsPanel } from '@/components/tournaments/estatic/estatic-standings-panel';
import {
  EstaticMatchesPanel,
} from '@/components/tournaments/estatic/estatic-matches-panel';
import type { StageGroup } from '@/components/tournaments/tournament-matches-panel';
import { EstaticProgressionPanel } from '@/components/tournaments/estatic/estatic-progression-panel';
import { EstaticFormatPanel } from '@/components/tournaments/estatic/estatic-format-panel';
import { EstaticTeamsPanel } from '@/components/tournaments/estatic/estatic-teams-panel';
import { EstaticPrizePanel } from '@/components/tournaments/estatic/estatic-prize-panel';
import { EstaticStatisticsPanel } from '@/components/tournaments/estatic/estatic-statistics-panel';
import type {
  PlayerPerformanceRow,
  TeamPerformanceRow,
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
        title: `${tournament.name} — eSportsAmaze Standings, Matches & Stats`,
        description: `Official stage-wise standings, match scorecards, prize pool distribution, participating team rosters, and top fraggers for ${tournament.name}.`,
      };
    }
  } catch {
    /* fall through */
  }
  return { title: 'Tournament Details | eSportsAmaze' };
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

  const stageGroups: StageGroup[] = Array.from(matchesByStage.entries())
    .map(([stageName, stageMatches]) => ({
      stageName,
      maxScheduledAt: Math.max(...stageMatches.map((m) => m.scheduledAt.getTime())),
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
    }))
    .sort((a, b) => b.maxScheduledAt - a.maxScheduledAt)
    .map(({ stageName, matches }) => ({ stageName, matches }));

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

  // Key stats for Estatic Hero
  const organizerNames = tournament.organizers.map((o) => o.organizer.name).join(', ') || 'Krafton & Nodwin';
  const venueLocation = tournament.venues[0]?.venue
    ? `${tournament.venues[0].venue.name}${tournament.venues[0].venue.city ? `, ${tournament.venues[0].venue.city}` : ''}`
    : 'India LAN Arena';
  const totalMatchesCount = tournament.matches.length;
  const totalTeamsCount = tournament.teams.length;

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white">
      {/* ============ HERO MASTHEAD (Estatic Design Language) ============ */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1220]">
        {/* Dynamic radial glow and watermark */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_-10%,rgba(10,95,196,.16),transparent_45%),linear-gradient(115deg,transparent_42%,rgba(10,95,196,.05)_42%,rgba(10,95,196,.05)_43%,transparent_43%)] dark:bg-[radial-gradient(circle_at_80%_-10%,rgba(37,99,235,.24),transparent_45%),linear-gradient(115deg,transparent_42%,rgba(255,255,255,.03)_42%,rgba(255,255,255,.03)_43%,transparent_43%)]" />
        <div className="pointer-events-none absolute -bottom-8 right-0 select-none text-[15vw] font-black uppercase leading-none tracking-tighter text-slate-900/[0.04] dark:text-white/[0.03]">
          {tournament.slug.toUpperCase()}
        </div>

        <div className="relative mx-auto max-w-[1200px] px-4 pb-0 pt-4 sm:px-6 sm:pt-5">
          {/* Breadcrumb + Editions Pager */}
          <div className="mb-5 flex items-center justify-between gap-3 sm:mb-8 sm:gap-4">
            <div className="flex min-w-0 items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-slate-400 dark:text-slate-500">
              <Link href="/" className="shrink-0 hover:text-[#0A5FC4]">Home</Link>
              <span className="shrink-0">/</span>
              <Link href="/tournaments" className="shrink-0 hover:text-[#0A5FC4]">Tournaments</Link>
              <span className="shrink-0">/</span>
              <span className="truncate text-[#0A5FC4] dark:text-blue-300" title={tournament.name}>{tournament.name}</span>
            </div>

            <div className="flex shrink-0 gap-2">
              {prevEdition && (
                <Link
                  href={`/tournaments/${prevEdition.slug}?tab=${activeTab}`}
                  className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10"
                  title={`Previous Edition: ${prevEdition.name}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              )}
              {nextEdition && (
                <Link
                  href={`/tournaments/${nextEdition.slug}?tab=${activeTab}`}
                  className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10"
                  title={`Next Edition: ${nextEdition.name}`}
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Masthead grid: Emblem + Title */}
          <div className="grid items-center gap-5 pb-8 sm:gap-8 sm:pb-12 lg:grid-cols-[auto_1fr]">
            {/* Signature Emblem Box */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-2 rotate-2 rounded-[2.2rem] bg-[#0A5FC4]/10 dark:bg-[#0A5FC4]/20 sm:-inset-3 sm:rounded-[2.8rem]" />
                <div className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-[2rem] border-4 border-white bg-gradient-to-br from-blue-100 via-slate-100 to-blue-200 shadow-[0_25px_70px_-20px_rgba(10,95,196,.5)] dark:border-[#182338] dark:from-blue-950 dark:via-slate-900 dark:to-[#0A5FC4]/30 sm:h-48 sm:w-48 sm:rounded-[2.5rem] sm:border-8 lg:h-52 lg:w-52 xl:h-60 xl:w-60">
                  {tournament.imageUrl || tournament.imageDarkUrl ? (
                    <ThemeLogo
                      lightSrc={tournament.imageUrl}
                      darkSrc={tournament.imageDarkUrl}
                      alt={tournament.name}
                      className="object-contain p-4"
                      priority
                    />
                  ) : tournament.game?.logoUrl ? (
                    <ThemeLogo
                      lightSrc={tournament.game.logoUrl}
                      alt={tournament.name}
                      className="object-contain p-6"
                      priority
                    />
                  ) : (
                    <div className="text-5xl font-black text-[#0A5FC4]/40">
                      {tournament.name.slice(0, 4).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-white dark:border-[#182338]">
                    <ShieldCheck className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            </div>

            {/* Title & Metadata */}
            <div className="text-center lg:text-left">
              <div className="mb-3 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> {tournament.status || 'Active Event'}
                </span>
                <span className="rounded-full bg-[#0A5FC4]/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-300">
                  {tournament.game?.name || 'Battle Royale'}
                </span>
                {tournament.tier && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-300">
                    <Crown className="h-3.5 w-3.5" /> {tournament.tier.toLowerCase().includes('tier') ? tournament.tier : `Tier ${tournament.tier}`}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-black uppercase leading-[1.08] tracking-[-.04em] text-slate-950 dark:text-white sm:text-4xl sm:leading-tight sm:tracking-[-.05em] lg:text-5xl">
                {tournament.name}
              </h1>

              <p className="mt-3 text-[13px] font-medium text-slate-500 dark:text-slate-400 sm:text-sm">
                Organized by <strong className="text-slate-900 dark:text-white">{organizerNames}</strong>
                <span className="mx-2 text-slate-300 dark:text-slate-700">•</span>
                <span>{venueLocation}</span>
                <span className="mx-2 text-slate-300 dark:text-slate-700">•</span>
                <span>{formatDate(tournament.startDate)} – {formatDate(tournament.endDate)}</span>
              </p>

              {/* Season / Edition Switcher */}
              {editions && editions.length > 1 && (
                <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs">
                  {prevEdition && (
                    <Link
                      href={`/tournaments/${prevEdition.slug}?tab=${activeTab}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 font-bold text-slate-700 shadow-xs hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white transition-all group"
                      title={prevEdition.name}
                    >
                      <ChevronLeft className="h-3.5 w-3.5 text-[#0A5FC4] transition-transform group-hover:-translate-x-0.5" />
                      <span className="text-slate-400 font-medium">Previous:</span>
                      <span>{prevEdition.season || prevEdition.name}</span>
                    </Link>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A5FC4] px-3.5 py-1.5 font-black uppercase tracking-wider text-white shadow-sm shadow-blue-500/25">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    <span>Current: {tournament.season || tournament.series || 'Active Season'}</span>
                  </span>
                  {nextEdition && (
                    <Link
                      href={`/tournaments/${nextEdition.slug}?tab=${activeTab}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 font-bold text-slate-700 shadow-xs hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white transition-all group"
                      title={nextEdition.name}
                    >
                      <span className="text-slate-400 font-medium">Next:</span>
                      <span>{nextEdition.season || nextEdition.name}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-[#0A5FC4] transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  )}
                </div>
              )}

              {(resolvedWinner || resolvedRunnerUp) && (
                <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-bold">
                  {resolvedWinner && (
                    <span className="inline-flex items-center gap-1.5 text-amber-500">
                      <Crown className="h-4 w-4" /> Champion: <strong className="text-slate-950 dark:text-white">{resolvedWinner}</strong>
                    </span>
                  )}
                  {resolvedRunnerUp && (
                    <span className="inline-flex items-center gap-1.5 text-slate-400">
                      <Trophy className="h-4 w-4" /> Runner-up: <strong className="text-slate-950 dark:text-white">{resolvedRunnerUp}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Signature Stat Band */}
          <div className="grid grid-cols-2 divide-slate-200 border-t border-slate-200 dark:divide-white/10 dark:border-white/10 md:grid-cols-4 md:divide-x">
            {[
              {
                label: 'Prize Pool',
                value: tournament.prizePool ? `${tournament.currency === 'USD' ? '$' : '₹'}${tournament.prizePool.toLocaleString('en-IN')}` : 'TBD',
                icon: Trophy,
              },
              {
                label: 'Competing Teams',
                value: `${totalTeamsCount} Teams`,
                icon: Users,
              },
              {
                label: 'Tournament Stages',
                value: `${tournament.stages.length} Stages`,
                icon: Layers,
              },
              {
                label: 'Matches Scheduled',
                value: `${totalMatchesCount} Matches`,
                icon: Swords,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex min-w-0 flex-col items-center gap-1 px-2 py-4 sm:gap-1.5 sm:py-5">
                <Icon className="h-4 w-4 text-[#0A5FC4] dark:text-blue-300" />
                <span className="text-lg font-black tracking-tight sm:text-xl md:text-2xl xl:text-3xl">{value}</span>
                <span className="text-[9px] font-extrabold uppercase tracking-[.18em] text-slate-400 sm:text-[10px]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ESTATIC BODY & TABS ============ */}
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-4 sm:px-6 py-6 sm:py-8">
        <EstaticTabNav slug={slug} activeTab={activeTab} />

        <main className="flex-1 pt-6 sm:pt-8 pb-24 md:pb-16">
          {activeTab === 'overview' && (
            <EstaticOverviewPanel
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
            <EstaticStandingsPanel
              stages={stageSummaries}
              matches={standingsMatches}
              teams={teamsMeta}
              config={standingsConfig}
            />
          )}

          {activeTab === 'matches' && (
            <EstaticMatchesPanel
              stageGroups={stageGroups}
              matchColumns={standingsConfig.matchColumns}
            />
          )}

          {activeTab === 'progression' && (
            <EstaticProgressionPanel
              tournament={tournament}
              stages={tournament.stages}
              teams={enrichedTeams}
              matches={tournament.matches}
              teamPerformanceRows={teamPerformanceRows}
              standingsConfig={standingsConfig}
            />
          )}

          {activeTab === 'format' && (
            <EstaticFormatPanel
              stages={tournament.stages}
              pointsMatrix={formatRules.pointsMatrix}
              killPoints={readKillMultiplier(tournament.formatDetails)}
              gameMode={tournament.gameMode}
              eventType={tournament.eventType}
              device={tournament.device}
            />
          )}

          {activeTab === 'teams' && (
            <EstaticTeamsPanel
              teams={enrichedTeams}
              logoMode={standingsConfig.logoMode}
              showCountryFlag={
                standingsConfig.teamsConfig?.showCountryFlag ??
                (standingsConfig.logoMode === 'BOTH' || standingsConfig.logoMode === 'COUNTRY')
              }
            />
          )}

          {activeTab === 'prizepool' && (
            <EstaticPrizePanel
              totalPrizePool={tournament.prizePool}
              prizeStages={prizeStages}
              currency={tournament.currency}
              qualifications={qualificationsList}
              teams={tournament.teams}
            />
          )}

          {(activeTab === 'statistics' || activeTab === 'fraggers') && (
            <EstaticStatisticsPanel
              playerRows={playerRowsList}
              teamRows={teamPerformanceRows}
              stages={stagesOrder}
              mapsList={uniqueMapsList}
              daysList={uniqueDaysList}
              stageGroups={stageGroupsMap}
              logoMode={standingsConfig.logoMode}
              defaultView={standingsConfig.statisticsConfig?.defaultView}
              defaultTeamPointsMode={standingsConfig.statisticsConfig?.defaultTeamPointsMode}
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
