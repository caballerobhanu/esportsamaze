import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { publishedVisibility } from '@/lib/news-queries';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { isSameOrigin, crossSiteForbiddenResponse } from '@/lib/anti-scrape';

export const dynamic = 'force-dynamic';

export interface SearchResultItem {
  id: string;
  type: 'team' | 'player' | 'tournament' | 'game' | 'article';
  title: string;
  subtitle: string;
  href: string;
  imageUrl?: string | null;
  badge?: string | null;
}

export async function GET(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return crossSiteForbiddenResponse();
  }

  const ip = await getClientIp();
  const rl = checkRateLimit('api:search', ip, { windowMs: 60_000, maxRequests: 60 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many search requests. Please slow down.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rl.resetMs / 1000)),
        },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim().slice(0, 100);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '5', 10) || 5, 1), 20);

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
        articles: [],
      },
    });
  }

  try {
    const [teams, players, tournaments, games, articles] = await Promise.all([
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
        select: {
          id: true,
          name: true,
          region: true,
          slug: true,
          tag: true,
          logoUrl: true,
          status: true,
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
        select: {
          id: true,
          ign: true,
          firstName: true,
          lastName: true,
          slug: true,
          avatarUrl: true,
          role: true,
          currentTeam: { select: { name: true, tag: true, logoUrl: true } },
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
        select: {
          id: true,
          name: true,
          tier: true,
          region: true,
          prizePool: true,
          slug: true,
          imageUrl: true,
          status: true,
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
        select: {
          id: true,
          name: true,
          genre: true,
          developer: true,
          logoUrl: true,
        },
        take: limit,
      }),

      // 5. Search Articles (published only — title, excerpt, tags, author)
      prisma.article.findMany({
        where: {
          AND: [
            publishedVisibility(),
            {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { excerpt: { contains: q, mode: 'insensitive' } },
                { tags: { has: q } },
                { authorName: { contains: q, mode: 'insensitive' } },
              ],
            },
          ],
        },
        orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
        take: limit,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          coverImage: true,
          category: true,
          publishedAt: true,
        },
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
      imageUrl: player.avatarUrl,
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

    const formattedArticles: SearchResultItem[] = articles.map((article) => ({
      id: article.id,
      type: 'article',
      title: article.title,
      subtitle: article.excerpt || 'Esports news & editorial',
      href: `/news/${article.slug}`,
      imageUrl: article.coverImage,
      badge: article.category.charAt(0) + article.category.slice(1).toLowerCase(),
    }));

    const total =
      formattedTeams.length +
      formattedPlayers.length +
      formattedTournaments.length +
      formattedGames.length +
      formattedArticles.length;

    return NextResponse.json(
      {
        success: true,
        query: q,
        total,
        results: {
          teams: formattedTeams,
          players: formattedPlayers,
          tournaments: formattedTournaments,
          games: formattedGames,
          articles: formattedArticles,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Error during search API query:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute search query',
        ...(process.env.NODE_ENV === 'development'
          ? { details: error instanceof Error ? error.message : String(error) }
          : {}),
      },
      { status: 500 }
    );
  }
}
