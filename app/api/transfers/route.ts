import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    const where: Record<string, unknown> = {};
    if (type) {
      where.type = type;
    }

    const transfers = await prisma.transfer.findMany({
      where,
      select: {
        id: true,
        date: true,
        type: true,
        notes: true,
        player: {
          select: {
            id: true,
            ign: true,
            slug: true,
            avatarUrl: true,
            currentTeam: {
              select: {
                id: true,
                name: true,
                tag: true,
                slug: true,
                logoUrl: true,
              },
            },
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            tag: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 20,
    });

    return NextResponse.json(
      { success: true, source: 'database', count: transfers.length, data: transfers },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Prisma transfers query failed:', error);
    return NextResponse.json(
      { success: false, error: 'Transfer data is temporarily unavailable.' },
      { status: 500 }
    );
  }
}
