import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isSameOrigin, crossSiteForbiddenResponse } from '@/lib/anti-scrape';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { isAdmin } from '@/lib/admin-auth';
import { getMaintenanceSettings } from '@/lib/site-settings';
import { DEFAULT_GAME_SLUG } from '@/lib/games';
import { getGameBySlug } from '@/lib/game-queries';

// Search-as-you-type backend for the compare page pickers. Returns the top
// 20 matches for a query; the client component debounces and aborts stale
// requests, so this stays cheap even under heavy typing.

export async function GET(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return crossSiteForbiddenResponse();
  }

  // If maintenance mode is active, do not leak player/team data
  const maintenance = await getMaintenanceSettings();
  if (maintenance.enabled && !(await isAdmin())) {
    return NextResponse.json({ options: [] });
  }

  const ip = await getClientIp();
  const limit = checkRateLimit('compare-search', ip, { windowMs: 60_000, maxRequests: 60 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many searches, slow down.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.resetMs / 1000)) } }
    );
  }

  const { searchParams } = req.nextUrl;
  const q = (searchParams.get('q') || '').trim();
  const type = searchParams.get('type') === 'players' ? 'players' : 'teams';
  const requestedGame = (searchParams.get('game') || '').trim();

  if (q.length < 2) {
    return NextResponse.json({ options: [] });
  }

  // A comparison may only pair entities from one game family, so the picker is
  // scoped to the requested game's family. Entities with no game fall back to the
  // default game, so they are offered only when that family is the one asked for.
  let gameScope: Record<string, unknown> = {};
  if (requestedGame) {
    const [game, defaultGame] = await Promise.all([
      getGameBySlug(requestedGame),
      getGameBySlug(DEFAULT_GAME_SLUG),
    ]);
    if (game?.familyId) {
      // `familyId` is the relation key (a cuid), so it comes from the game row —
      // not from `familyOf`, which returns the family's *slug*.
      gameScope =
        game.familyId === defaultGame?.familyId
          ? { OR: [{ game: { familyId: game.familyId } }, { gameId: null }] }
          : { game: { familyId: game.familyId } };
    }
  }

  try {
    if (type === 'teams') {
      const teams = await prisma.team.findMany({
        where: {
          AND: [
            gameScope,
            {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { tag: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q, mode: 'insensitive' } },
              ],
            },
          ],
        },
        select: { id: true, name: true, slug: true, logoUrl: true, tag: true },
        orderBy: { name: 'asc' },
        take: 20,
      });
      return NextResponse.json(
        {
          options: teams.map((t) => ({
            value: t.slug || t.id,
            label: t.name,
            subtitle: t.tag || null,
            imageUrl: t.logoUrl || null,
          })),
        },
        { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
      );
    }

    const players = await prisma.player.findMany({
      where: {
        AND: [gameScope, { ign: { contains: q, mode: 'insensitive' } }],
      },
      select: { id: true, ign: true, slug: true, avatarUrl: true, currentTeam: { select: { name: true } } },
      orderBy: { ign: 'asc' },
      take: 20,
    });
    return NextResponse.json(
      {
        options: players.map((p) => ({
          value: p.slug || p.id,
          label: p.ign,
          subtitle: p.currentTeam?.name || null,
          imageUrl: p.avatarUrl || null,
        })),
      },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
    );
  } catch {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
