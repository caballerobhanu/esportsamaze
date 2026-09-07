import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';

const getCachedTournaments = unstable_cache(
  async (gameSlug: string | null, tier: string | null) => {
    const where: Record<string, unknown> = {};
    if (gameSlug && gameSlug !== 'all') {
      where.game = { slug: gameSlug };
    }
    if (tier) {
      where.tier = tier;
    }

    return prisma.tournament.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        tier: true,
        imageUrl: true,
        imageDarkUrl: true,
        game: {
          select: {
            name: true,
            logoUrl: true,
          },
        },
        stages: {
          select: {
            sequence: true,
            name: true,
          },
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: { startDate: 'asc' },
    });
  },
  ['tournaments-list-cache'],
  { tags: ['tournaments-list'], revalidate: 300 }
);

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const gameSlug = searchParams.get('game');
  const tier = searchParams.get('tier');

  try {
    const tournaments = await getCachedTournaments(gameSlug, tier);

    return NextResponse.json(
      { success: true, source: 'database-cached', count: tournaments.length, data: tournaments },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Prisma tournaments query failed:', error);
    return NextResponse.json(
      { success: false, error: 'Tournament data is temporarily unavailable.' },
      { status: 500 }
    );
  }
}
