import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import prisma from '@/lib/prisma';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
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
  TournamentTeamsPanel,
  TournamentPrizePanel,
  TournamentFormatPanel,
  TournamentFraggersPanel,
} from '@/components/tournaments/tournament-info-panels';

export const dynamic = 'force-dynamic';

async function getTournamentData(slug: string) {
  try {
    return await prisma.tournament.findUnique({
      where: { slug },
      include: {
        game: true,
        organizers: { include: { organizer: true } },
        sponsors: { include: { sponsor: true } },
        venues: { include: { venue: true } },
        stages: { orderBy: { sequence: 'asc' } },
        teams: {
          orderBy: { seed: 'asc' },
          include: {
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
          orderBy: { scheduledAt: 'asc' },
          include: {
            stage: { select: { name: true } },
            games: {
              orderBy: { sequence: 'asc' },
              include: {
                teamResults: {
                  orderBy: { rank: 'asc' },
                  include: {
                    team: { select: { id: true, name: true, tag: true, logoUrl: true, imageDarkUrl: true } },
                  },
                },
                playerStats: {
                  orderBy: { playerElims: 'desc' },
                  include: {
                    player: { select: { id: true, ign: true } },
                    team: { select: { id: true, name: true, tag: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
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
    const tournament = await prisma.tournament.findUnique({
      where: { slug },
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
      <Navbar />

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
              <TournamentMatchesPanel stageGroups={stageGroups} />
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
            <TournamentTeamsPanel teams={tournament.teams} logoMode={standingsConfig.logoMode} />
          )}

          {activeTab === 'prizepool' && (
            <TournamentPrizePanel
              prizeStages={prizeStages}
              currency={tournament.currency}
              qualifications={qualificationsList}
            />
          )}

          {activeTab === 'fraggers' && <TournamentFraggersPanel fraggers={overallFraggers} />}
        </main>
      </div>

      <Footer />
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
