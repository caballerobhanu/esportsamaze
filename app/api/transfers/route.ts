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

    return NextResponse.json({ success: true, source: 'database', count: transfers.length, data: transfers });
  } catch (error) {
    console.error('Prisma transfers query failed:', error);
    return NextResponse.json(
      { success: false, error: 'Transfer data is temporarily unavailable.' },
      { status: 500 }
    );
  }
}
