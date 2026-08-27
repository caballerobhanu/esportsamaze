import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { MOCK_LIVE_MATCHES } from '@/lib/mock-data';

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

    if (matches.length > 0) {
      return NextResponse.json({ success: true, source: 'database', count: matches.length, data: matches });
    }
  } catch (error) {
    console.warn('Prisma query failed, falling back to mock matches:', error);
  }

  let filtered = MOCK_LIVE_MATCHES;
  if (gameSlug && gameSlug !== 'all') {
    filtered = filtered.filter((m) => m.gameId === gameSlug);
  }
  if (status) {
    filtered = filtered.filter((m) => m.status === status);
  }

  return NextResponse.json({ success: true, source: 'fallback', count: filtered.length, data: filtered });
}
