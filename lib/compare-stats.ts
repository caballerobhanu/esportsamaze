/* Cached data layer for the /compare page.
   The page reads searchParams so it must render dynamically, but its heavy
   queries are wrapped in unstable_cache: one warm read serves every visitor.
   Tagged 'compare-stats' — revalidateTournamentPages() purges it the moment
   a scorecard/tournament save lands, with a 15-minute TTL as the fallback.

   The picker default lists ("most compared") are tracked anonymously in the
   ComparePick table and recomputed at most once per day (revalidate: 86400). */

import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';

const TAGS = ['compare-stats'];
const REVALIDATE = 900;

export type ComparePickType = 'TEAM' | 'PLAYER';

/** Record the two sides of an explicit compare view. Never throws. */
export async function recordComparePicks(type: ComparePickType, entityIds: string[]): Promise<void> {
  try {
    await Promise.all(
      entityIds
        .filter(Boolean)
        .map((entityId) =>
          prisma.comparePick.upsert({
            where: { entityType_entityId: { entityType: type, entityId } },
            create: { entityType: type, entityId, picks: 1 },
            update: { picks: { increment: 1 } },
          })
        )
    );
  } catch {
    // Pick tracking is best-effort — never break the page over it.
  }
}

export interface CompareOption {
  value: string;
  label: string;
  subtitle?: string | null;
  imageUrl?: string | null;
}

async function popularTeamOptions(): Promise<CompareOption[]> {
  const top = await prisma.comparePick.findMany({
    where: { entityType: 'TEAM' },
    orderBy: { picks: 'desc' },
    take: 50,
  });
  let ids = top.map((t) => t.entityId);

  // Fallback before any picks exist: teams with the most matches on record.
  if (ids.length === 0) {
    const activity = await prisma.matchTeamResult.groupBy({
      by: ['teamId'],
      _count: { teamId: true },
      orderBy: { _count: { teamId: 'desc' } },
      take: 50,
    });
    ids = activity.map((a) => a.teamId);
  }
  if (ids.length === 0) return [];

  const teams = await prisma.team.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, slug: true, logoUrl: true, tag: true },
  });
  const byId = new Map(teams.map((t) => [t.id, t]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((t) => ({
      value: t!.slug || t!.id,
      label: t!.name,
      subtitle: t!.tag || null,
      imageUrl: t!.logoUrl || null,
    }));
}

async function popularPlayerOptions(): Promise<CompareOption[]> {
  const top = await prisma.comparePick.findMany({
    where: { entityType: 'PLAYER' },
    orderBy: { picks: 'desc' },
    take: 50,
  });
  let ids = top.map((p) => p.entityId);

  if (ids.length === 0) {
    const activity = await prisma.matchPlayerStat.groupBy({
      by: ['playerId'],
      _count: { playerId: true },
      orderBy: { _count: { playerId: 'desc' } },
      take: 50,
    });
    ids = activity.map((a) => a.playerId);
  }
  if (ids.length === 0) return [];

  const players = await prisma.player.findMany({
    where: { id: { in: ids } },
    select: { id: true, ign: true, slug: true, avatarUrl: true, currentTeam: { select: { name: true } } },
  });
  const byId = new Map(players.map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((p) => ({
      value: p!.slug || p!.id,
      label: p!.ign,
      subtitle: p!.currentTeam?.name || null,
      imageUrl: p!.avatarUrl || null,
    }));
}

/**
 * Default picker lists — the 50 most-compared teams/players. Computed at most
 * once per day; every other read is served from the cache. Falls back to
 * match-activity leaders until pick data accumulates.
 */
export const getPopularCompareOptions = (type: 'teams' | 'players') =>
  unstable_cache(
    type === 'teams' ? popularTeamOptions : popularPlayerOptions,
    [`compare-popular-${type}`],
    { tags: ['compare-popular'], revalidate: 86_400 }
  )();

/** Team profile for the header cards (no date fields — cache-serialization safe). */
export const getTeamCompareProfile = unstable_cache(
  async (idOrSlug: string) =>
    prisma.team.findFirst({
      where: { OR: [{ slug: idOrSlug }, { id: idOrSlug }] },
      include: {
        tournamentsWon: true,
        tournamentsRunnerUp: true,
        players: { where: { status: 'ACTIVE' }, select: { id: true, ign: true, slug: true, role: true, avatarUrl: true } },
      },
    }),
  ['compare-team-profile'],
  { tags: TAGS, revalidate: REVALIDATE }
);

/** Most recent 1,000 games for one team (deterministic order). */
export const getTeamCompareResults = unstable_cache(
  async (teamId: string) =>
    prisma.matchTeamResult.findMany({
      where: { teamId },
      select: { matchGameId: true, rank: true, wwcd: true, elimsPoints: true, damage: true, totalPoints: true },
      orderBy: { matchGame: { match: { scheduledAt: 'desc' } } },
      take: 1000,
    }),
  ['compare-team-results'],
  { tags: TAGS, revalidate: REVALIDATE }
);

/** Player profile for the header cards. */
export const getPlayerCompareProfile = unstable_cache(
  async (idOrSlug: string) =>
    prisma.player.findFirst({
      where: { OR: [{ slug: idOrSlug }, { ign: { equals: idOrSlug, mode: 'insensitive' } }, { id: idOrSlug }] },
      include: { currentTeam: true, game: true },
    }),
  ['compare-player-profile'],
  { tags: TAGS, revalidate: REVALIDATE }
);

/** Most recent 1,000 games for one player (deterministic order). */
export const getPlayerCompareResults = unstable_cache(
  async (playerId: string) =>
    prisma.matchPlayerStat.findMany({
      where: { playerId },
      select: { matchGameId: true, playerElims: true, damage: true },
      orderBy: { matchGame: { match: { scheduledAt: 'desc' } } },
      take: 1000,
    }),
  ['compare-player-results'],
  { tags: TAGS, revalidate: REVALIDATE }
);
