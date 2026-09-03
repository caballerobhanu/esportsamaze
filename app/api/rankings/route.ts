import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  computeTeamRankings,
  computePlayerRankings,
} from '@/lib/krafton-rankings';
import { loadTransferRules } from '@/lib/ranking-rules';

const LIMIT = 10;

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
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

    // Events excluded from KRAFTON rankings never contribute points
    // (rows without a tournament link are manual entries → included)
    const eligibleTeamRows = teamRows.filter((r) => !r.tournamentId || r.tournament?.rankingIncluded !== false);
    const eligiblePlayerRows = playerRows.filter((r) => !r.tournamentId || r.tournament?.rankingIncluded !== false);

    if (teamRows.length === 0 && playerRows.length === 0) {
      return NextResponse.json({
        success: true,
        source: 'database',
        data: { teams: [], players: [], logos: {} },
      });
    }

    // Logo + slug lookup per team name (used by both tables)
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

    // attach team slugs to players for sub-name links
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

    return NextResponse.json({
      success: true,
      source: 'database',
      data: { teams, players, logos },
    });
  } catch (error) {
    console.error('Prisma rankings query failed:', error);
    return NextResponse.json(
      { success: false, error: 'Rankings are temporarily unavailable.' },
      { status: 500 }
    );
  }
}
