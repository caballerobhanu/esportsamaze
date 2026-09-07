import prisma from '@/lib/prisma';
import {
  computeTeamRankings,
  computePlayerRankings,
} from '@/lib/krafton-rankings';
import { loadTransferRules } from '@/lib/ranking-rules';
import type { RankingsResponse } from '@/components/krafton-rankings';

const LIMIT = 10;

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Server-side rankings calculation.
 * Computes official Krafton points directly from the database without any HTTP fetch.
 */
export async function getRankingsData(): Promise<RankingsResponse> {
  try {
    const [teamRows, playerRows, rules] = await Promise.all([
      prisma.teamRanking.findMany({
        orderBy: { endDate: 'desc' },
        include: {
          team: { select: { name: true, logoUrl: true, imageDarkUrl: true, slug: true } },
          tournament: { select: { name: true, rankingIncluded: true } },
        },
      }),
      prisma.playerRanking.findMany({
        orderBy: { endDate: 'desc' },
        include: {
          player: { select: { ign: true, slug: true } },
          team: { select: { name: true, slug: true } },
          tournament: { select: { name: true, rankingIncluded: true } },
        },
      }),
      loadTransferRules(),
    ]);

    const eligibleTeamRows = teamRows.filter(
      (r) => !r.tournamentId || r.tournament?.rankingIncluded !== false
    );
    const eligiblePlayerRows = playerRows.filter(
      (r) => !r.tournamentId || r.tournament?.rankingIncluded !== false
    );

    if (teamRows.length === 0 && playerRows.length === 0) {
      return { teams: [], players: [], logos: {} };
    }

    const logos: Record<
      string,
      { logoUrl: string | null; imageDarkUrl: string | null; slug?: string }
    > = {};
    for (const r of teamRows) {
      logos[r.team.name.toLowerCase()] = {
        logoUrl: r.team.logoUrl,
        imageDarkUrl: r.team.imageDarkUrl,
        slug: r.team.slug ?? undefined,
      };
    }

    const teamSlugByName = new Map<string, string>();
    for (const [name, meta] of Object.entries(logos)) {
      if (meta.slug) teamSlugByName.set(name, meta.slug);
    }

    const teams = computeTeamRankings(
      eligibleTeamRows.map((r) => ({
        tournament: r.tournament?.name ?? '',
        tier: r.tier,
        endDate: toDateOnly(r.endDate),
        team: r.team.name,
        rank: r.rank,
      })),
      new Date(),
      rules
    )
      .slice(0, LIMIT)
      .map((t) => ({
        ...t,
        slug: logos[t.name.toLowerCase()]?.slug,
      }));

    const players = computePlayerRankings(
      eligiblePlayerRows.map((r) => ({
        tournament: r.tournament?.name ?? '',
        tier: r.tier,
        endDate: toDateOnly(r.endDate),
        player: r.player.ign,
        team: r.team?.name ?? '',
        finishes: r.finishes,
        mvpTourney: r.mvpTourney > 0,
        mvpFinals: r.mvpFinals > 0,
        igl: r.igl > 0,
        survivor: r.survivor > 0,
        emerging: r.emerging > 0,
      })),
      new Date(),
      rules
    )
      .slice(0, LIMIT)
      .map((p) => {
        const row = playerRows.find(
          (r) => r.player.ign.toLowerCase() === p.name.toLowerCase()
        );
        return {
          ...p,
          slug: row?.player.slug ?? undefined,
          teamSlug: p.team ? teamSlugByName.get(p.team.toLowerCase()) : undefined,
        };
      });

    return { teams, players, logos };
  } catch (error) {
    console.error('Server rankings computation failed:', error);
    return { teams: [], players: [], logos: {} };
  }
}
