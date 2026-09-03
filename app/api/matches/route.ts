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
    if (status) {
      where.status = status;
    }

    const matches = await prisma.match.findMany({
      where,
      include: {
        game: true,
        tournament: true,
        stage: true,
        games: {
          include: {
            teamResults: {
              include: { team: true },
            },
            playerStats: {
              include: { player: true },
            },
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ success: true, source: 'database', count: matches.length, data: matches });
  } catch (error) {
    console.error('Prisma matches query failed:', error);
    return NextResponse.json(
      { success: false, error: 'Match data is temporarily unavailable.' },
      { status: 500 }
    );
  }
}
