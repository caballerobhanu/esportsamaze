import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { MOCK_TRANSFERS } from '@/lib/mock-data';

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
      include: {
        player: {
          include: {
            currentTeam: true,
          },
        },
        team: true,
      },
      orderBy: { date: 'desc' },
      take: 20,
    });

    if (transfers.length > 0) {
      return NextResponse.json({ success: true, source: 'database', count: transfers.length, data: transfers });
    }
  } catch (error) {
    console.warn('Prisma query failed, falling back to mock transfers:', error);
  }

  let filtered = MOCK_TRANSFERS;
  if (type) {
    filtered = filtered.filter((tr) => tr.type === type);
  }

  return NextResponse.json({ success: true, source: 'fallback', count: filtered.length, data: filtered });
}
