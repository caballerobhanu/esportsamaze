import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { MOCK_TOURNAMENTS } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameSlug = searchParams.get('game');
  const tier = searchParams.get('tier');

  try {
    const where: Record<string, unknown> = {};
    if (gameSlug && gameSlug !== 'all') {
      where.game = { slug: gameSlug };
    }
    if (tier) {
      where.tier = tier;
    }

    const tournaments = await prisma.tournament.findMany({
      where,
      include: {
        game: true,
        organizers: { include: { organizer: true } },
        sponsors: { include: { sponsor: true } },
        venues: { include: { venue: true } },
        stages: {
          include: {
            groups: true,
          },
        },
        teams: {
          include: {
            team: true,
          },
        },
        matches: {
          include: {
            games: {
              include: {
                teamResults: true,
                playerStats: true,
              },
            },
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    if (tournaments.length > 0) {
      return NextResponse.json({ success: true, source: 'database', count: tournaments.length, data: tournaments });
    }
  } catch (error) {
    console.warn('Prisma query failed, falling back to mock tournaments:', error);
  }

  let filtered = MOCK_TOURNAMENTS;
  if (gameSlug && gameSlug !== 'all') {
    filtered = filtered.filter((t) => t.gameId === gameSlug);
  }
  if (tier) {
    filtered = filtered.filter((t) => t.tier === tier);
  }

  return NextResponse.json({ success: true, source: 'fallback', count: filtered.length, data: filtered });
}
