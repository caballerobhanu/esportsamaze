/* Shared server data layer for the public tournament tab routes.
   One fetch + shared context per tournament; each tab route derives only
   what its panel consumes. All routes reading this module are ISR-cached
   (revalidate = 180) and must never touch cookies or searchParams. */

import type { Metadata } from 'next';
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
  ALL_TOURNAMENT_TAB_IDS,
  type StandingsConfig,
  type StandingsMatchLite,
  type StandingsTeamMeta,
  type StandingsStageSummary,
  type TournamentTabId,
} from '@/lib/standings-config';
import { countryCodeFor } from '@/lib/countries';
import { CURRENCY_SYMBOLS } from '@/lib/utils';
import type { StageGroup, TeamPerformanceRow, PlayerPerformanceRow } from '@/components/tournaments/estatic/panel-types';

/* ── The one big fetch (moved verbatim from the former single page) ── */

async function fetchTournament(rawSlug: string) {
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
        games: { include: { game: { select: { id: true, name: true, slug: true } } }, orderBy: { position: 'asc' } },
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
                  select: {
                    id: true,
                    matchGameId: true,
                    teamId: true,
                    shortCode: true,
                    mp: true,
                    rank: true,
                    wwcd: true,
                    placePoints: true,
                    elimsPoints: true,
                    bonusPoints: true,
                    totalPoints: true,
                    damage: true,
                    survivalTime: true,
                    healing: true,
                    damageReceived: true,
                    headshots: true,
                    assists: true,
                    knockouts: true,
                    longestElim: true,
                    vehicleElims: true,
                    grenadeElims: true,
                    utilitiesTotal: true,
                    rescues: true,
                    totalDist: true,
                    team: {
                      select: {
                        id: true,
                        name: true,
                        tag: true,
                        slug: true,
                        logoUrl: true,
                        imageDarkUrl: true,
                      },
                    },
                  },
                },
                playerStats: {
                  orderBy: { playerElims: 'desc' },
                  select: {
                    id: true,
                    matchGameId: true,
                    playerId: true,
                    teamId: true,
                    role: true,
                    shortCode: true,
                    playerElims: true,
                    playerPowerplay: true,
                    damage: true,
                    survivalTime: true,
                    healing: true,
                    damageReceived: true,
                    headshots: true,
                    assists: true,
                    knockouts: true,
                    longestElim: true,
                    grenadeElims: true,
                    rescues: true,
                    utilitiesTotal: true,
                    totalDist: true,
                    isMvp: true,
                    player: {
                      select: {
                        id: true,
                        ign: true,
                        slug: true,
                      },
                    },
                    team: {
                      select: {
                        id: true,
                        name: true,
                        tag: true,
                        slug: true,
                        logoUrl: true,
                        imageDarkUrl: true,
                      },
                    },
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

export type TournamentData = NonNullable<Awaited<ReturnType<typeof fetchTournament>>>;

/* ── Shared context every tab route renders (hero, nav, metadata) ── */

export interface TournamentContext {
  slug: string;
  tournament: TournamentData;
  standingsConfig: StandingsConfig;
  visibleTabs: TournamentTabId[];
  editions: { slug: string; name: string; season: string | null; startDate: Date; seriesValue: number | null }[];
  prevEdition: TournamentContext['editions'][number] | null;
  nextEdition: TournamentContext['editions'][number] | null;
  resolvedWinner: string | null;
  resolvedRunnerUp: string | null;
  organizerNames: string | null;
  venueLocation: string | null;
  prizePoolLabel: string;
  backdropWatermark: string | null;
  totalMatchesCount: number;
  totalTeamsCount: number;
}

export async function loadTournamentContext(rawSlug: string): Promise<TournamentContext | null> {
  const tournament = await fetchTournament(rawSlug);
  if (!tournament) return null;

  const standingsConfig = normalizeStandingsConfig(tournament.standingsConfig);
  const visibleTabs: TournamentTabId[] = standingsConfig.visibleTabs ?? [...ALL_TOURNAMENT_TAB_IDS];

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
  const resolvedWinner = (tournament.winner ?? resolved.winner ?? null) as string | null;

  /* ── enrich team rosters with player slugs ── */
  const rosterPlayerIds = Array.from(
    new Set(
      tournament.teams.flatMap((tt) => {
        const arr = Array.isArray(tt.rosterJson) ? (tt.rosterJson as any[]) : [];
        return arr.map((m) => m?.playerId).filter((id): id is string => typeof id === 'string' && id.length > 0);
      })
    )
  );
  const rosterPlayers =
    rosterPlayerIds.length > 0
      ? await prisma.player.findMany({
          where: { id: { in: rosterPlayerIds } },
          select: { id: true, slug: true },
        })
      : [];
  const rosterPlayerSlugMap = new Map<string, string>();
  for (const p of rosterPlayers) {
    if (p.slug) rosterPlayerSlugMap.set(p.id, p.slug);
  }
  for (const tt of tournament.teams) {
    if (Array.isArray(tt.rosterJson)) {
      tt.rosterJson = (tt.rosterJson as any[]).map((m) => {
        if (!m || typeof m !== 'object') return m;
        const slug = (m.playerId && rosterPlayerSlugMap.get(m.playerId)) || m.slug || null;
        return { ...m, slug };
      });
    }
  }
  const resolvedRunnerUp = (tournament.runnerUp ?? resolved.runnerUp ?? null) as string | null;

  // Hero strings — omitted (not fabricated) when data is missing
  const organizerNames =
    tournament.organizers.map((o) => o.organizer.name).join(', ') || null;
  const firstVenue = tournament.venues[0]?.venue;
  const venueLocation = firstVenue
    ? `${firstVenue.name}${firstVenue.city ? `, ${firstVenue.city}` : ''}`
    : null;
  const prizePoolLabel = tournament.prizePool
    ? `${CURRENCY_SYMBOLS[tournament.currency] ?? `${tournament.currency} `}${tournament.prizePool.toLocaleString('en-IN')}`
    : 'TBD';

  const fdRecord = tournament.formatDetails as { backdropText?: unknown } | null;
  const customBackdrop = typeof fdRecord?.backdropText === 'string' ? fdRecord.backdropText.trim() : undefined;
  const hideBackdrop = customBackdrop?.toUpperCase() === 'NONE';
  const backdropWatermark = hideBackdrop
    ? null
    : (customBackdrop || tournament.series?.trim() || tournament.slug).toUpperCase();

  return {
    slug: tournament.slug,
    tournament,
    standingsConfig,
    visibleTabs,
    editions,
    prevEdition,
    nextEdition,
    resolvedWinner,
    resolvedRunnerUp,
    organizerNames,
    venueLocation,
    prizePoolLabel,
    backdropWatermark,
    totalMatchesCount: tournament.matches.length,
    totalTeamsCount: tournament.teams.length,
  };
}

/** Hidden-tab guard for tab routes. */
export function tabIsVisible(ctx: TournamentContext, tab: TournamentTabId): boolean {
  return ctx.visibleTabs.includes(tab);
}

/**
 * Prerenders every existing tournament's route at build time and — this is
 * the part that enables ISR in Next 16 — makes any slug *not* in the list
 * (a tournament created after the build) render on demand and then cache.
 * Without this export, dynamic routes render per request and never cache.
 */
export async function generateTournamentStaticParams(): Promise<{ slug: string }[]> {
  try {
    const rows = await prisma.tournament.findMany({ select: { slug: true } });
    return rows.map((t) => ({ slug: t.slug }));
  } catch {
    return [];
  }
}

/** On the overview (base) route: if overview is hidden, send visitors to the first visible tab. */
export function firstVisibleTabPath(ctx: TournamentContext): string {
  const first = ctx.visibleTabs[0] || 'overview';
  return first === 'overview' ? `/tournaments/${ctx.slug}` : `/tournaments/${ctx.slug}/${first}`;
}

/* ── Metadata ── */

export async function tournamentMetadata(
  rawSlug: string,
  suffix?: string
): Promise<Metadata> {
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
      select: { name: true },
    });
    if (tournament) {
      const title = suffix
        ? `${tournament.name} — ${suffix} | eSportsAmaze`
        : `${tournament.name} — eSportsAmaze Standings, Matches & Stats`;
      return {
        title,
        description: `Official stage-wise standings, match scorecards, prize pool distribution, participating team rosters, and top fraggers for ${tournament.name}.`,
      };
    }
  } catch {
    /* fall through */
  }
  return { title: 'Tournament Details | eSportsAmaze' };
}

/* ── Shared derived data ── */

export function buildTeamsMeta(ctx: TournamentContext): Record<string, StandingsTeamMeta> {
  const teamsMeta: Record<string, StandingsTeamMeta> = {};
  for (const tt of ctx.tournament.teams) {
    teamsMeta[tt.teamId] = {
      name: tt.team.name,
      slug: tt.team.slug,
      displayName: tt.displayName ?? tt.team.displayName,
      tag: tt.shortName ?? tt.team.tag,
      logoUrl: tt.logoUrl ?? tt.team.logoUrl,
      logoDarkUrl: tt.logoDarkUrl ?? tt.team.imageDarkUrl,
      countryCode: countryCodeFor(tt.country ?? tt.team.region),
    };
  }
  for (const m of ctx.tournament.matches) {
    for (const g of m.games) {
      for (const r of g.teamResults) {
        if (!teamsMeta[r.teamId] && r.team) {
          teamsMeta[r.teamId] = {
            name: r.team.name,
            slug: r.team.slug,
            tag: r.team.tag,
            logoUrl: r.team.logoUrl,
          };
        }
      }
    }
  }
  return teamsMeta;
}

/** playerId → slug for deep-linking player profiles from public panels. */
export function buildPlayerSlugById(ctx: TournamentContext): Record<string, string | null> {
  const playerSlugById: Record<string, string | null> = {};
  for (const m of ctx.tournament.matches) {
    for (const g of m.games) {
      for (const ps of g.playerStats) {
        if (ps.player && !(ps.playerId in playerSlugById)) {
          playerSlugById[ps.playerId] = ps.player.slug ?? null;
        }
      }
    }
  }
  for (const tt of ctx.tournament.teams) {
    if (Array.isArray(tt.rosterJson)) {
      for (const m of tt.rosterJson as any[]) {
        if (m?.playerId && !(m.playerId in playerSlugById) && m.slug) {
          playerSlugById[m.playerId] = m.slug;
        }
      }
    }
  }
  return playerSlugById;
}

function groupMatchesByStage(ctx: TournamentContext): Map<string, TournamentData['matches']> {
  const map = new Map<string, TournamentData['matches']>();
  for (const m of ctx.tournament.matches) {
    const stageName = matchStageLabel(m);
    if (!map.has(stageName)) map.set(stageName, []);
    map.get(stageName)!.push(m);
  }
  return map;
}

export interface StageSummaries {
  stagesData: { stageName: string; matchesCount: number; completedMatchesCount: number }[];
  stagesOrder: string[];
  matchesByStage: Map<string, TournamentData['matches']>;
}

export function buildStageSummaries(ctx: TournamentContext): StageSummaries {
  const matchesByStage = groupMatchesByStage(ctx);
  const stagesData = Array.from(matchesByStage.entries()).map(([stageName, stageMatches]) => ({
    stageName,
    matchesCount: stageMatches.length,
    completedMatchesCount: stageMatches.filter((m) => m.status === 'COMPLETED').length,
  }));
  return { stagesData, stagesOrder: stagesData.map((s) => s.stageName), matchesByStage };
}

/* ── Overview tab ── */

export function buildOverviewData(ctx: TournamentContext) {
  const { matchesByStage } = buildStageSummaries(ctx);
  const allTeamResults = ctx.tournament.matches.flatMap((m) => m.games.flatMap((g) => g.teamResults));
  const allPlayerStats = ctx.tournament.matches.flatMap((m) => m.games.flatMap((g) => g.playerStats));
  const overallStandings = calculateTournamentStandings(allTeamResults);
  const overallFraggers = calculateTournamentFraggers(allPlayerStats);

  // Featured stage: explicit setting → stage with the latest match → finals → last
  const formatRules = (ctx.tournament.formatDetails ?? {}) as {
    featuredStage?: string;
    pointsMatrix?: Record<string, number>;
    killPointsPerElim?: number;
  };
  let latestStage: string | null = null;
  let latestTime = -1;
  for (const [stageName, stageMatches] of matchesByStage) {
    for (const m of stageMatches) {
      const t = m.scheduledAt.getTime();
      if (t > latestTime) {
        latestTime = t;
        latestStage = stageName;
      }
    }
  }
  const featuredStageName =
    Array.from(matchesByStage.keys()).find(
      (s) => s.toLowerCase() === formatRules.featuredStage?.toLowerCase()
    ) ??
    latestStage ??
    Array.from(matchesByStage.keys()).find((s) => s.toLowerCase().includes('final')) ??
    Array.from(matchesByStage.keys()).slice(-1)[0] ??
    'Grand Finals';
  const featuredStandings: AggregatedTeamStanding[] =
    (matchesByStage.get(featuredStageName)
      ? calculateTournamentStandings(
          matchesByStage.get(featuredStageName)!.flatMap((m) => m.games.flatMap((g) => g.teamResults))
        )
      : overallStandings);

  const latestCompletedMatch = ctx.tournament.matches
    .filter((m) => m.status === 'COMPLETED' && m.games.some((g) => g.teamResults.length > 0))
    .sort((a, b) => (b.overallMatchNumber ?? b.matchNumber ?? 0) - (a.overallMatchNumber ?? a.matchNumber ?? 0))[0];

  const overviewMatches = ctx.tournament.matches.map((m) => ({
    id: m.id,
    format: m.format,
    matchNumber: m.matchNumber,
    overallMatchNumber: m.overallMatchNumber,
    mapName: m.mapName,
    status: m.status,
    scheduledAt: m.scheduledAt,
    matchTime: m.matchTime,
    streamUrl: m.streamUrl,
    teamResults: m.id === latestCompletedMatch?.id
      ? m.games.flatMap((g) =>
          g.teamResults.map((r) => ({
            id: r.id,
            matchGameId: r.matchGameId,
            teamId: r.teamId,
            rank: r.rank,
            wwcd: r.wwcd,
            placePoints: r.placePoints,
            elimsPoints: r.elimsPoints,
            bonusPoints: r.bonusPoints,
            totalPoints: r.totalPoints,
            team: r.team,
          }))
        )
      : [],
    playerStats: [],
  }));

  return {
    featuredStageName,
    featuredStandings,
    overallFraggers,
    overviewMatches,
    teamsMeta: buildTeamsMeta(ctx),
    playerSlugById: buildPlayerSlugById(ctx),
  };
}

/* ── Standings tab ── */

export function buildStandingsData(ctx: TournamentContext) {
  const { stagesData, matchesByStage } = buildStageSummaries(ctx);

  const stageFirstDays = new Map<string, string>();
  for (const [stageName, stageMatches] of matchesByStage) {
    const min = stageMatches.reduce(
      (acc, m) => (m.scheduledAt.getTime() < acc.getTime() ? m.scheduledAt : acc),
      stageMatches[0].scheduledAt
    );
    stageFirstDays.set(stageName, matchDayKey(min));
  }

  const stageSummaries: StandingsStageSummary[] = stagesData;

  const standingsMatches: StandingsMatchLite[] = ctx.tournament.matches.map((m) => {
    return {
      id: m.id,
      stageName: matchStageLabel(m),
      matchNumber: m.matchNumber ?? null,
      overallMatchNumber: m.overallMatchNumber ?? null,
      day: matchRelativeDayKey(m.scheduledAt, stageFirstDays.get(matchStageLabel(m))!),
      mapName: m.mapName ?? null,
      groupName: m.groupName ?? null,
      scheduledAt: m.scheduledAt.toISOString(),
      status: m.status,
      results: m.games.flatMap((g) =>
        g.teamResults.map((r) => ({
          teamId: r.teamId,
          rank: r.rank,
          wwcd: r.wwcd,
          placePoints: r.placePoints,
          elimsPoints: r.elimsPoints,
          bonusPoints: r.bonusPoints || 0,
          totalPoints: r.totalPoints,
          damage: r.damage || 0,
          headshots: r.headshots || 0,
          assists: r.assists || 0,
        }))
      ),
    };
  });

  return {
    stageSummaries,
    standingsMatches,
    teamsMeta: buildTeamsMeta(ctx),
  };
}

/* ── Matches tab ── */

export function buildMatchesData(ctx: TournamentContext): StageGroup[] {
  const { matchesByStage } = buildStageSummaries(ctx);

  return Array.from(matchesByStage.entries()).map(([stageName, stageMatches]) => ({
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
      teamResults: m.games.flatMap((g) =>
        g.teamResults.map((r) => ({
          id: r.id,
          matchGameId: r.matchGameId,
          teamId: r.teamId,
          rank: r.rank,
          wwcd: r.wwcd,
          placePoints: r.placePoints,
          elimsPoints: r.elimsPoints,
          bonusPoints: r.bonusPoints,
          totalPoints: r.totalPoints,
          team: r.team,
        }))
      ),
      playerStats: [],
    })),
  }));
}

/* ── Progression tab ── */

export function buildProgressionData(ctx: TournamentContext) {
  const { matchesByStage, stagesOrder } = buildStageSummaries(ctx);

  const progressionMatches = ctx.tournament.matches.map((m) => ({
    id: m.id,
    stage: m.stage ? { name: m.stage.name } : null,
    groupName: m.groupName ?? null,
    games: [
      {
        teamResults: m.games.flatMap((g) =>
          g.teamResults.map((r) => ({
            teamId: r.teamId,
            rank: r.rank,
            wwcd: r.wwcd,
            placePoints: r.placePoints,
            elimsPoints: r.elimsPoints,
            totalPoints: r.totalPoints,
          }))
        ),
      },
    ],
  }));

  const { enrichedTeams, teamPerformanceRows } = buildTeamsAndPerformance(ctx, matchesByStage, stagesOrder);

  return {
    progressionMatches,
    enrichedTeams,
    teamPerformanceRows,
  };
}

/* ── Format tab ── */

export function buildFormatData(ctx: TournamentContext) {
  const formatRules = (ctx.tournament.formatDetails ?? {}) as {
    featuredStage?: string;
    pointsMatrix?: Record<string, number>;
    killPointsPerElim?: number;
  };
  const { enrichedTeams } = buildTeamsAndPerformance(ctx, groupMatchesByStage(ctx), []);

  // Slim matches with group/stage info — everything the format panel and
  // schedule calendar consume (group discovery, matchdays, stage mapping).
  const slimMatches = ctx.tournament.matches.map((m) => ({
    id: m.id,
    format: m.format,
    matchNumber: m.matchNumber,
    overallMatchNumber: m.overallMatchNumber,
    mapName: m.mapName,
    status: m.status,
    scheduledAt: m.scheduledAt,
    matchTime: m.matchTime,
    groupName: m.groupName ?? null,
    stage: m.stage ? { name: m.stage.name } : null,
    stageName: matchStageLabel(m),
    games: [
      {
        teamResults: m.games.flatMap((g) =>
          g.teamResults.map((r) => ({
            teamId: r.teamId,
            rank: r.rank,
            wwcd: r.wwcd,
            placePoints: r.placePoints,
            elimsPoints: r.elimsPoints,
            totalPoints: r.totalPoints,
          }))
        ),
      },
    ],
  }));

  return {
    slimMatches,
    enrichedTeams,
    pointsMatrix: formatRules.pointsMatrix,
    killPoints: readKillMultiplier(ctx.tournament.formatDetails),
  };
}

/* ── Teams tab ── */

export function buildTeamsData(ctx: TournamentContext) {
  const { enrichedTeams } = buildTeamsAndPerformance(ctx, groupMatchesByStage(ctx), []);
  return { enrichedTeams };
}

/* ── Prize pool tab ── */

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

export function buildPrizeData(ctx: TournamentContext) {
  const rawPrizeDist = ctx.tournament.prizeDistribution as
    | { stages?: Array<{ stageName: string; allocatedPrize?: number; ranks?: unknown[] }> }
    | Array<Record<string, unknown>>
    | null;
  const prizeStages = Array.isArray(rawPrizeDist) || rawPrizeDist?.stages == null
    ? [
        {
          stageName: 'Grand Finals',
          allocatedPrize: ctx.tournament.prizePool ?? 0,
          ranks: (Array.isArray(rawPrizeDist) ? rawPrizeDist : []) as TournamentPrizeRank[],
        },
      ]
    : (rawPrizeDist.stages ?? []).map((s) => ({
        stageName: s.stageName,
        allocatedPrize: s.allocatedPrize,
        ranks: (s.ranks ?? []) as TournamentPrizeRank[],
      }));

  const qualificationsList = Array.isArray(ctx.tournament.qualifications)
    ? (ctx.tournament.qualifications as Array<{ place: string; events: Array<string | { name: string }>; description?: string }>)
    : [];

  return { prizeStages, qualificationsList };
}

/* ── Statistics tab ── */

const DEFAULT_STAT_METRICS = ['elims', 'avgElims', 'damage', 'headshots', 'assists'];

export function buildStatisticsData(ctx: TournamentContext) {
  const { matchesByStage, stagesOrder } = buildStageSummaries(ctx);

  const statsCfg = ctx.standingsConfig.statisticsConfig;
  const activeMetrics = new Set<string>();
  if (statsCfg?.playerColumns && Array.isArray(statsCfg.playerColumns) && statsCfg.playerColumns.length > 0) {
    for (const col of statsCfg.playerColumns) activeMetrics.add(col);
  } else {
    // No config: show exactly the metrics the statistics panel's fallback
    // columns render, so no column ever displays fabricated zeros.
    for (const col of DEFAULT_STAT_METRICS) activeMetrics.add(col);
  }
  if (statsCfg?.customPlayerColumns && Array.isArray(statsCfg.customPlayerColumns)) {
    for (const col of statsCfg.customPlayerColumns) {
      if (col.metric) activeMetrics.add(col.metric);
    }
  }

  const allowDamage = activeMetrics.has('damage');
  const allowDamageReceived = activeMetrics.has('damageReceived');
  const allowHealing = activeMetrics.has('healing');
  const allowUtilities = activeMetrics.has('utilities');
  const allowTotalDist = activeMetrics.has('totalDist');
  const allowHeadshots = activeMetrics.has('headshots');
  const allowAssists = activeMetrics.has('assists');
  const allowKnockouts = activeMetrics.has('knockouts');
  const allowSurvival = activeMetrics.has('survivalTime');

  /* ── overall tournament days ── */
  const distinctMatchDates = Array.from(
    new Set(ctx.tournament.matches.map((m) => matchDayKey(m.scheduledAt)))
  ).sort();
  const dateToOverallDay = new Map<string, string>();
  distinctMatchDates.forEach((dateKey, idx) => {
    dateToOverallDay.set(dateKey, String(idx + 1));
  });
  const uniqueDaysList = Array.from({ length: distinctMatchDates.length }, (_, i) => String(i + 1));

  /* ── player aggregation (config-gated) ── */
  const playerMap = new Map<string, PlayerPerformanceRow>();

  for (const m of ctx.tournament.matches) {
    const stageName = matchStageLabel(m);
    const mapName = m.mapName?.trim() || 'Erangel';
    const matchDay = dateToOverallDay.get(matchDayKey(m.scheduledAt)) || '1';

    for (const g of m.games) {
      for (const ps of g.playerStats) {
        if (!ps.player) continue;
        const pId = ps.playerId;
        if (!playerMap.has(pId)) {
          const tTeam = ctx.tournament.teams.find((tt) => tt.teamId === ps.teamId);
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
        if (allowDamage) pRow.totalDamage += ps.damage || 0;
        if (allowHeadshots) pRow.totalHeadshots += ps.headshots || 0;
        if (allowAssists) pRow.totalAssists += ps.assists || 0;
        if (allowKnockouts) pRow.totalKnockouts += ps.knockouts || 0;
        if (allowSurvival) pRow.totalSurvivalTime += ps.survivalTime || 0;
        if (allowHealing) pRow.totalHealing += ps.healing || 0;
        if (allowDamageReceived) pRow.totalDamageReceived += ps.damageReceived || 0;
        if (allowUtilities) pRow.totalUtilities += ps.utilitiesTotal || 0;
        if (allowTotalDist) pRow.totalDist += ps.totalDist || 0;
        if (ps.isMvp) pRow.totalMvps += 1;

        const elimsCount = ps.playerElims || 0;
        pRow.maxElims = Math.max(pRow.maxElims || 0, elimsCount);
        if (elimsCount === 0) pRow.zeroElimsMatches = (pRow.zeroElimsMatches || 0) + 1;
        if (elimsCount >= 5) pRow.fivePlusElimsMatches = (pRow.fivePlusElimsMatches || 0) + 1;

        const mStat: PlayerPerformanceRow['matchStats'][string] = {
          stageName,
          playerElims: ps.playerElims || 0,
        };
        if (mapName) mStat.mapName = mapName;
        if (matchDay) mStat.day = matchDay;
        if (ps.playerPowerplay) mStat.playerPowerplay = ps.playerPowerplay;
        if (ps.isMvp) mStat.isMvp = true;
        if (allowDamage && ps.damage) mStat.damage = ps.damage;
        if (allowHeadshots && ps.headshots) mStat.headshots = ps.headshots;
        if (allowAssists && ps.assists) mStat.assists = ps.assists;
        if (allowKnockouts && ps.knockouts) mStat.knockouts = ps.knockouts;
        if (allowSurvival && ps.survivalTime) mStat.survivalTime = ps.survivalTime;
        if (allowHealing && ps.healing) mStat.healing = ps.healing;
        if (allowDamageReceived && ps.damageReceived) mStat.damageReceived = ps.damageReceived;
        if (allowUtilities && ps.utilitiesTotal) mStat.utilities = ps.utilitiesTotal;
        if (allowTotalDist && ps.totalDist) mStat.totalDist = ps.totalDist;

        pRow.matchStats[m.id] = mStat;
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

  // Unique maps list
  const mapsSet = new Set<string>();
  for (const m of ctx.tournament.matches) {
    if (m.mapName?.trim()) mapsSet.add(m.mapName.trim());
  }
  const uniqueMapsList = Array.from(mapsSet);

  /* ── team aggregation ── */
  const { teamPerformanceRows } = buildTeamsAndPerformance(ctx, matchesByStage, stagesOrder, dateToOverallDay);

  // Stage → groups map for the statistics filters
  const stageGroupsMap: Record<string, string[]> = {};
  for (const s of matchesByStage.keys()) {
    const stageMatches = matchesByStage.get(s) || [];
    const grps = Array.from(new Set(stageMatches.map((m) => m.groupName).filter(Boolean) as string[]));
    stageGroupsMap[s] = grps;
  }

  return {
    playerRowsList,
    teamPerformanceRows,
    stagesOrder,
    uniqueMapsList,
    uniqueDaysList,
    stageGroupsMap,
  };
}

/* ── Enriched teams + per-team performance (progression / teams / statistics) ── */

function buildTeamsAndPerformance(
  ctx: TournamentContext,
  matchesByStage: Map<string, TournamentData['matches']>,
  stagesOrder: string[],
  dateToOverallDay?: Map<string, string>
) {
  const teamStageParticipation = new Map<string, Set<string>>();
  const teamGroupParticipation = new Map<string, Map<string, Set<string>>>();
  const teamTotalPoints = new Map<string, number>();

  for (const m of ctx.tournament.matches) {
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

  const order = stagesOrder.length > 0 ? stagesOrder : Array.from(matchesByStage.keys());
  const enrichedTeams = ctx.tournament.teams.map((tt) => {
    const stagesSet = teamStageParticipation.get(tt.teamId) || new Set();
    const stagesList = order.filter((st) => stagesSet.has(st));
    const groupsMap = teamGroupParticipation.get(tt.teamId);
    const groupsByStage: Record<string, string[]> = {};
    if (groupsMap) {
      for (const [st, grpSet] of groupsMap.entries()) {
        groupsByStage[st] = Array.from(grpSet);
      }
    }

    let deepestStageIdx = -1;
    for (let i = order.length - 1; i >= 0; i--) {
      if (stagesSet.has(order[i])) {
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

  /* ── per-team performance rows ── */
  const teamPerformanceMap = new Map<string, TeamPerformanceRow>();

  for (const tt of ctx.tournament.teams) {
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

  for (const m of ctx.tournament.matches) {
    const stageName = matchStageLabel(m);
    const mapName = m.mapName?.trim() || 'Erangel';
    const matchDay =
      dateToOverallDay?.get(matchDayKey(m.scheduledAt)) || '1';

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
          bonusPoints: tr.bonusPoints || 0,
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

  return { enrichedTeams, teamPerformanceRows };
}
