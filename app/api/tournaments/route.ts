import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

    return NextResponse.json({ success: true, source: 'database', count: tournaments.length, data: tournaments });
  } catch (error) {
    console.error('Prisma tournaments query failed:', error);
    return NextResponse.json(
      { success: false, error: 'Tournament data is temporarily unavailable.' },
      { status: 500 }
    );
  }
}
