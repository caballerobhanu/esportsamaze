/* Shared server data layer for the player profile tab routes.
   Each tab loads only what it renders — the match history is the heavy one and
   every tab but Overview's sidebar path asks for it, because the hero stat band
   and the career-earnings fallback both need it. */

import prisma from '@/lib/prisma';
import { cache } from 'react';
import type { Metadata } from 'next';
import { absoluteUrl, canonical, SITE_NAME } from '@/lib/seo';
import {
  PLAYER_TAB_SEGMENT,
  playerTabDescription,
  playerTabTitle,
  type PlayerTabId,
} from '@/lib/seo-titles';
import { fetchBoardEntries, fetchEntityEntries, fetchEntityStanding } from '@/lib/krafton-data';
import { computeBoard, computeEntityRankMilestones, computeEntityRankTrend } from '@/lib/krafton-standings';
import { resolveEventTotals } from '@/lib/tournament-totals';
import {
  DETAIL_METRIC_SPECS,
  PLAYER_BASIC_KEYS,
  PLAYER_METRIC_COLUMNS,
  aggregateMetricsByEvent,
  mergeEventMetrics,
  type EventMetricIdentity,
  type EventMetricRow,
} from '@/lib/event-metrics';
import { getExchangeRatesForDate, resolveCurrencyUsdRate } from '@/lib/currency';
import { eliminations } from '@/lib/player-stats';

/** The profile identity query — also the source of the `PlayerProfile` type. */
async function fetchPlayerProfile(slug: string) {
  const decoded = decodeURIComponent(slug).trim();
  return prisma.player.findFirst({
    where: {
      OR: [{ slug }, { slug: decoded }, { ign: { equals: decoded, mode: 'insensitive' } }, { id: slug }],
    },
    include: { currentTeam: true, game: true },
  });
}

export type PlayerProfile = NonNullable<Awaited<ReturnType<typeof fetchPlayerProfile>>>;

/** Shared across every player tab route so titles stay in step. */
export async function playerMetadata(
  slug: string,
  tab: PlayerTabId = 'overview'
): Promise<Metadata> {
  try {
    const player = await fetchPlayerProfile(slug);
    if (!player) return { title: `Player Profile | ${SITE_NAME}` };

    const game = player.game?.shortName || player.game?.name || null;
    const team = player.currentTeam?.name || null;
    const segment = PLAYER_TAB_SEGMENT[tab];
    // Canonical always resolves to the stored slug, so look-alike URLs
    // (an IGN, a raw id) consolidate onto one address.
    const canonicalSlug = player.slug || slug;
    const path = segment ? `/players/${canonicalSlug}/${segment}` : `/players/${canonicalSlug}`;
    const title = playerTabTitle(tab, player.ign, game);
    const description = playerTabDescription(tab, player.ign, game, team);

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'profile',
        url: absoluteUrl(path),
        ...(player.avatarUrl ? { images: [player.avatarUrl] } : {}),
      },
      ...canonical(path),
    };
  } catch {
    return { title: `Player Profile | ${SITE_NAME}` };
  }
}

export interface PlayerContext {
  player: PlayerProfile;
  prevPlayer: { slug: string | null; ign: string } | null;
  nextPlayer: { slug: string | null; ign: string } | null;
}

/* Request-scoped memos: the [slug] layout renders the hero and the page renders
   the panel, so both ask for the same rows on one render. `cache` keeps the real
   objects (no serialization), so the Date fields the panels rely on survive. */
export const loadPlayerContext = cache(loadPlayerContextUncached);

async function loadPlayerContextUncached(slug: string): Promise<PlayerContext | null> {
  const player = await fetchPlayerProfile(slug);
  if (!player) return null;

  const [prevPlayer, nextPlayer] = await Promise.all([
    prisma.player
      .findFirst({ where: { id: { lt: player.id } }, orderBy: { id: 'desc' }, select: { slug: true, ign: true } })
      .catch(() => null),
    prisma.player
      .findFirst({ where: { id: { gt: player.id } }, orderBy: { id: 'asc' }, select: { slug: true, ign: true } })
      .catch(() => null),
  ]);

  return { player, prevPlayer, nextPlayer };
}

/**
 * Every recorded match for the player. Nullable telemetry comes through as null
 * so "not recorded" can never be read as a zero downstream.
 */
export const loadPlayerMatches = cache(loadPlayerMatchesUncached);

async function loadPlayerMatchesUncached(playerId: string) {
  return prisma.matchPlayerStat
    .findMany({
      where: { playerId },
      orderBy: { matchGame: { match: { scheduledAt: 'desc' } } },
      select: {
        id: true,
        kills: true,
        playerElims: true,
        // Every detail metric the player card can show, so its coverage is known
        // per metric: a value the scorecards recorded is never taken from the
        // reported ladder, and one they did not is never invented from a zero.
        damage: true,
        assists: true,
        survivalTime: true,
        knockouts: true,
        grenadeElims: true,
        utilitiesTotal: true,
        matchGameId: true,
        teamId: true,
        // The squad actually fielded in this game, so a stat row can name its
        // team even when the player has no TournamentTeam row for that event.
        team: { select: { name: true, slug: true } },
        matchGame: {
          select: {
            mapName: true,
            match: {
              select: {
                scheduledAt: true,
                mapName: true,
                matchType: true,
                stageType: true,
                stage: { select: { name: true } },
                tournament: {
                  select: {
                    id: true,
                    name: true,
                    shortName: true,
                    series: true,
                    season: true,
                    slug: true,
                    tier: true,
                    startDate: true,
                    currency: true,
                    usdRate: true,
                    prizeDistribution: true,
                  },
                },
              },
            },
          },
        },
      },
    })
    .catch(() => []);
}

export type PlayerMatchRow = Awaited<ReturnType<typeof loadPlayerMatches>>[number];

/** Event appearances: entered rosters plus reported (match-free) totals. */
export async function loadPlayerCareer(playerId: string) {
  const [squadParticipations, reportedRows] = await Promise.all([
    prisma.tournamentTeam.findMany({
      where: { rosterJson: { array_contains: [{ playerId }] } },
      orderBy: { tournament: { startDate: 'desc' } },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            shortName: true,
            slug: true,
            startDate: true,
            currency: true,
            usdRate: true,
            prizeDistribution: true,
          },
        },
        team: { select: { id: true, name: true, tag: true, slug: true } },
      },
    }),
    prisma.tournamentPlayerTotals.findMany({
      where: { playerId },
      include: {
        tournament: {
          select: { id: true, name: true, shortName: true, series: true, season: true, slug: true, startDate: true },
        },
        team: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  const eventTotals = resolveEventTotals(
    reportedRows.map((row) => ({
      tournamentId: row.tournamentId,
      scope: row.scope,
      stageId: row.stageId,
      label: row.label,
      metrics: {
        matches: row.matches,
        playerElims: row.playerElims,
        damage: row.damage,
        headshots: row.headshots,
        assists: row.assists,
        knockouts: row.knockouts,
        survivalTime: row.survivalTime,
        healing: row.healing,
        airdrops: row.airdrops,
        rescues: row.rescues,
      },
    })),
  );

  return {
    squadParticipations,
    reportedRows,
    eventTotals,
    rosterEventIds: new Set(squadParticipations.map((tt) => tt.tournamentId)),
  };
}

export type PlayerCareer = Awaited<ReturnType<typeof loadPlayerCareer>>;
export type PlayerSquadParticipation = PlayerCareer['squadParticipations'][number];
export type PlayerReportedRow = PlayerCareer['reportedRows'][number];

/**
 * The player's detailed metrics per event, resolved per metric.
 *
 * An event whose scorecards recorded a metric contributes that metric; an event
 * that only has it as a reported day / stage / event slice contributes the
 * slice total; an event with neither is simply absent. Match counts and
 * eliminations are left to the performance card wherever scorecards exist, so
 * they are never shown twice from a source that could disagree.
 */
export function buildPlayerEventMetrics(matches: PlayerMatchRow[], career: PlayerCareer): EventMetricRow[] {
  const matchAggregates = aggregateMetricsByEvent(
    matches,
    (row) => row.matchGame.match.tournament?.id ?? null,
    DETAIL_METRIC_SPECS,
  );

  const identities = new Map<string, EventMetricIdentity>();
  const teamCounts = new Map<string, Map<string, { count: number; slug: string | null }>>();

  const rememberTournament = (
    tournament: {
      id: string;
      name: string;
      shortName: string | null;
      series: string | null;
      season: string | null;
      slug: string;
      startDate: Date | null;
    },
  ) => {
    if (identities.has(tournament.id)) return;
    identities.set(tournament.id, {
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      tournamentShortName: tournament.shortName,
      tournamentSeries: tournament.series,
      tournamentSeason: tournament.season,
      tournamentSlug: tournament.slug,
      startDateMs: tournament.startDate ? tournament.startDate.getTime() : null,
    });
  };

  for (const row of matches) {
    const tournament = row.matchGame.match.tournament;
    if (!tournament) continue;
    rememberTournament(tournament);
    if (row.team?.name) {
      const counts = teamCounts.get(tournament.id) ?? new Map();
      const existing = counts.get(row.team.name);
      counts.set(row.team.name, {
        count: (existing?.count ?? 0) + 1,
        slug: existing?.slug ?? row.team.slug,
      });
      teamCounts.set(tournament.id, counts);
    }
  }

  for (const row of career.reportedRows) {
    rememberTournament(row.tournament);
    const identity = identities.get(row.tournament.id);
    if (identity && !identity.teamName && row.team?.name) {
      identity.teamName = row.team.name;
      identity.teamSlug = row.team.slug;
    }
  }

  // A mid-event move would otherwise show whichever squad happened to come first.
  for (const [tournamentId, counts] of teamCounts) {
    const identity = identities.get(tournamentId);
    const best = [...counts.entries()].sort((a, b) => b[1].count - a[1].count)[0];
    if (identity && best) {
      identity.teamName = best[0];
      identity.teamSlug = best[1].slug;
    }
  }

  return mergeEventMetrics({
    matchAggregates,
    ladder: career.eventTotals,
    identityFor: (tournamentId) => identities.get(tournamentId) ?? null,
    basicKeys: PLAYER_BASIC_KEYS,
    columns: PLAYER_METRIC_COLUMNS,
  });
}

/** Current KRAFTON standing — cheap enough to sit in the hero. */
export const loadPlayerStanding = cache(loadPlayerStandingUncached);

async function loadPlayerStandingUncached(playerId: string) {
  try {
    return await fetchEntityStanding('PLAYER', playerId);
  } catch {
    return null;
  }
}

/**
 * KRAFTON ranking depth: the board at every historical snapshot, so this is the
 * heaviest loader — only the Honours tab asks for it.
 */
export async function loadPlayerKraftonDepth(player: PlayerProfile) {
  const entries = await fetchEntityEntries('PLAYER', player.id).catch(() => []);
  const key = entries[0]?.entityId ?? entries[0]?.entityName?.toLowerCase() ?? null;
  if (!key) {
    return { entries, contributions: [], milestones: null, trend: [], me: null };
  }

  const allEntries = await fetchBoardEntries('PLAYER').catch(() => []);
  // Transfers only apply to the team board, so the player board is computed
  // without them — exactly as the standing in the hero does.
  const board = computeBoard(allEntries, []);
  const me = board.find((entry) => entry.key === key) ?? null;

  return {
    entries,
    me,
    contributions: me?.contributions ?? [],
    milestones: computeEntityRankMilestones(key, 'PLAYER', allEntries, []),
    trend: computeEntityRankTrend(key, 'PLAYER', allEntries, []),
  };
}

export type PlayerKraftonDepth = Awaited<ReturnType<typeof loadPlayerKraftonDepth>>;

/** Rate lookup is keyed by the event's start date — historical rates for past events, live for future/undated. */
function rateKeyFor(startDate: Date | string | null) {
  if (!startDate) return 'live';
  const date = startDate instanceof Date ? startDate : new Date(startDate);
  return Number.isNaN(date.getTime()) ? 'live' : date.toISOString().slice(0, 10);
}

/**
 * Converts prize amounts to USD at each event's own start-date rate, memoised
 * per date. A past event must never be re-converted at today's rate, or every
 * historical figure on the profile would silently drift.
 */
export async function usdConverter() {
  const ratesByDate = new Map<string, Record<string, number>>();
  return async (amount: number, currency: string | null | undefined, startDate: Date | string | null) => {
    const key = rateKeyFor(startDate ?? null);
    if (!ratesByDate.has(key)) ratesByDate.set(key, await getExchangeRatesForDate(key === 'live' ? null : key));
    return amount * resolveCurrencyUsdRate(currency || 'USD', ratesByDate.get(key));
  };
}

/** Ids of events that have computed match data — computed beats reported. */
export function matchEventIds(matches: PlayerMatchRow[]): Set<string> {
  return new Set(
    matches.map((row) => row.matchGame.match.tournament?.id).filter((id): id is string => Boolean(id)),
  );
}

export interface PlayerHeroProps {
  player: PlayerProfile;
  standing: { rank: number } | null;
  stats: { label: string; value: string; accent?: boolean }[];
  prevPlayer: PlayerContext['prevPlayer'];
  nextPlayer: PlayerContext['nextPlayer'];
}

/**
 * The masthead numbers every tab shares. Kept here so the four routes cannot
 * disagree on the stat band.
 */
export function buildHeroProps(
  context: PlayerContext,
  matches: PlayerMatchRow[],
  standing: { rank: number } | null,
): PlayerHeroProps {
  const games = matches.length;
  const totalKills = matches.reduce((sum, row) => sum + eliminations(row), 0);
  const avgKills = games ? totalKills / games : null;
  const recent = matches.slice(0, 20);
  const recentKills = recent.reduce((sum, row) => sum + eliminations(row), 0);
  const recentAvg = recent.length ? recentKills / recent.length : null;

  return {
    player: context.player,
    standing,
    stats: [
      { label: 'Global Rank', value: standing ? `#${standing.rank}` : '—', accent: true },
      { label: 'Total Kills', value: games ? totalKills.toLocaleString('en-IN') : '—' },
      { label: 'Avg Kills / Match', value: avgKills !== null ? avgKills.toFixed(1) : '—' },
      { label: 'Last 20 Avg', value: recentAvg !== null ? recentAvg.toFixed(1) : '—' },
    ],
    prevPlayer: context.prevPlayer,
    nextPlayer: context.nextPlayer,
  };
}
