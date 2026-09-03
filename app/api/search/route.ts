import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export interface SearchResultItem {
  id: string;
  type: 'team' | 'player' | 'tournament' | 'game';
  title: string;
  subtitle: string;
  href: string;
  imageUrl?: string | null;
  badge?: string | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '5', 10), 1), 20);

  if (!q || q.length < 2) {
    return NextResponse.json({
      success: true,
      query: q,
      total: 0,
      results: {
        teams: [],
        players: [],
        tournaments: [],
        games: [],
      },
    });
  }

  try {
    const [teams, players, tournaments, games] = await Promise.all([
      // 1. Search Teams
      prisma.team.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { tag: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          game: { select: { name: true, slug: true } },
        },
        take: limit,
      }),

      // 2. Search Players
      prisma.player.findMany({
        where: {
          OR: [
            { ign: { contains: q, mode: 'insensitive' } },
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          currentTeam: { select: { name: true, tag: true, logoUrl: true } },
          game: { select: { name: true } },
        },
        take: limit,
      }),

      // 3. Search Tournaments
      prisma.tournament.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
            { region: { contains: q, mode: 'insensitive' } },
            { organizers: { some: { organizer: { name: { contains: q, mode: 'insensitive' } } } } },
          ],
        },
        include: {
          game: { select: { name: true } },
        },
        take: limit,
      }),

      // 4. Search Games
      prisma.game.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
            { developer: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: limit,
      }),
    ]);

    const formattedTeams: SearchResultItem[] = teams.map((team) => ({
      id: team.id,
      type: 'team',
      title: team.name,
      subtitle: team.region ? `${team.region} Region` : 'Esports Team',
      href: `/teams/${team.slug || team.tag || team.id}`,
      imageUrl: team.logoUrl,
      badge: team.game?.name || team.status,
    }));

    const formattedPlayers: SearchResultItem[] = players.map((player) => ({
      id: player.id,
      type: 'player',
      title: player.ign,
      subtitle: [
        player.firstName && player.lastName ? `${player.firstName} ${player.lastName}` : null,
        player.currentTeam?.name ? `@ ${player.currentTeam.name}` : 'Free Agent',
      ]
        .filter(Boolean)
        .join(' • '),
      href: `/players/${player.slug || player.ign.toLowerCase()}`,
      imageUrl: player.avatarUrl || '/images/players/jonathan.png',
      badge: player.role || 'Pro Player',
    }));

    const formattedTournaments: SearchResultItem[] = tournaments.map((tourney) => ({
      id: tourney.id,
      type: 'tournament',
      title: tourney.name,
      subtitle: `${tourney.tier} • ${tourney.region || 'Global'}${
        tourney.prizePool ? ` • $${tourney.prizePool.toLocaleString()}` : ''
      }`,
      href: `/tournaments/${tourney.slug}`,
      imageUrl: tourney.imageUrl,
      badge: tourney.status,
    }));

    const formattedGames: SearchResultItem[] = games.map((game) => ({
      id: game.id,
      type: 'game',
      title: game.name,
      subtitle: `${game.genre.replace('_', ' ')} • ${game.developer || 'Publisher'}`,
      href: `/#tournaments`,
      imageUrl: game.logoUrl,
      badge: 'Game',
    }));

    const total =
      formattedTeams.length +
      formattedPlayers.length +
      formattedTournaments.length +
      formattedGames.length;

    return NextResponse.json({
      success: true,
      query: q,
      total,
      results: {
        teams: formattedTeams,
        players: formattedPlayers,
        tournaments: formattedTournaments,
        games: formattedGames,
      },
    });
  } catch (error) {
    console.error('Error during search API query:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute search query',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
