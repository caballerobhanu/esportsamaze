import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameSlug = searchParams.get('game');
  const status = searchParams.get('status');

  try {
    const where: Record<string, unknown> = {};
    if (gameSlug && gameSlug !== 'all') {
      where.game = { slug: gameSlug };
    }
    const validStatuses = ['SCHEDULED', 'LIVE', 'COMPLETED', 'POSTPONED'];
    if (status) {
      const normalizedStatus = status.trim().toUpperCase();
      if (validStatuses.includes(normalizedStatus)) {
        where.status = normalizedStatus;
      }
    }

    const matches = await prisma.match.findMany({
      where,
      select: {
        id: true,
        matchNumber: true,
        overallMatchNumber: true,
        format: true,
        mapName: true,
        scheduledAt: true,
        status: true,
        streamUrl: true,
        vods: true,
        game: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        tournament: {
          select: {
            id: true,
            name: true,
            slug: true,
            tier: true,
            status: true,
            imageUrl: true,
            imageDarkUrl: true,
            startDate: true,
            endDate: true,
          },
        },
        stage: {
          select: { id: true, name: true, stageType: true, sequence: true },
        },
        games: {
          select: {
            id: true,
            sequence: true,
            mapName: true,
            duration: true,
            teamResults: {
              select: {
                id: true,
                rank: true,
                wwcd: true,
                totalPoints: true,
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
              select: {
                id: true,
                kills: true,
                damage: true,
                player: {
                  select: {
                    id: true,
                    ign: true,
                    slug: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 20,
    });

    return NextResponse.json(
      { success: true, source: 'database', count: matches.length, data: matches },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Prisma matches query failed:', error);
    return NextResponse.json(
      { success: false, error: 'Match data is temporarily unavailable.' },
      { status: 500 }
    );
  }
}
