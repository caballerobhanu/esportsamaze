import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';

const DEFAULT_GAMES = [
  { id: 'bgmi', name: 'Battlegrounds Mobile India', slug: 'bgmi', genre: 'BATTLE_ROYALE', developer: 'Krafton' },
  { id: 'valorant', name: 'Valorant', slug: 'valorant', genre: 'TACTICAL_FPS', developer: 'Riot Games' },
  { id: 'cs2', name: 'Counter-Strike 2', slug: 'cs2', genre: 'TACTICAL_FPS', developer: 'Valve Corporation' },
  { id: 'mlbb', name: 'Mobile Legends: Bang Bang', slug: 'mlbb', genre: 'MOBA', developer: 'Moonton' },
  { id: 'pubgm', name: 'PUBG Mobile', slug: 'pubgm', genre: 'BATTLE_ROYALE', developer: 'Krafton / Level Infinite' },
  { id: 'hok', name: 'Honor of Kings', slug: 'hok', genre: 'MOBA', developer: 'TiMi Studio Group' },
  { id: 'freefire', name: 'Free Fire', slug: 'freefire', genre: 'BATTLE_ROYALE', developer: 'Garena' },
  { id: 'tekken', name: 'Tekken 8', slug: 'tekken', genre: 'FIGHTING', developer: 'Bandai Namco' },
  { id: 'eafc', name: 'EA Sports FC', slug: 'eafc', genre: 'SPORTS', developer: 'EA Sports' },
];

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const games = await prisma.game.findMany({
      include: {
        _count: {
          select: {
            tournaments: true,
            matches: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (games.length > 0) {
      return NextResponse.json({ success: true, source: 'database', count: games.length, data: games });
    }
  } catch (error) {
    console.warn('Prisma query failed, falling back to default games list:', error);
  }

  return NextResponse.json({ success: true, source: 'fallback', count: DEFAULT_GAMES.length, data: DEFAULT_GAMES });
}
