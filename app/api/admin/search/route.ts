import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

// Admin entity search for form pickers (news editor links, etc.).
// Session-gated: returns 401 without a valid admin session.

const TYPES = ['player', 'team', 'tournament'] as const;

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = await getClientIp();
  const limit = checkRateLimit('admin-search', ip, { windowMs: 60_000, maxRequests: 120 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many searches, slow down.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.resetMs / 1000)) } }
    );
  }

  const { searchParams } = req.nextUrl;
  const q = (searchParams.get('q') || '').trim();
  const type = searchParams.get('type') || '';
  const gameId = searchParams.get('gameId') || '';
  // Tournaments of one game can be listed without a query (the match editor's
  // game→tournament cascade); everything else needs a 2-char query.
  if (!TYPES.includes(type as (typeof TYPES)[number]) || (q.length < 2 && !(type === 'tournament' && gameId))) {
    return NextResponse.json({ options: [] });
  }

  try {
    if (type === 'player') {
      const players = await prisma.player.findMany({
        where: { ign: { contains: q, mode: 'insensitive' } },
        select: { id: true, ign: true, currentTeam: { select: { tag: true, name: true } } },
        orderBy: { ign: 'asc' },
        take: 20,
      });
      return NextResponse.json({
        options: players.map((p) => ({
          value: p.id,
          label: p.ign,
          subtitle: p.currentTeam?.tag || p.currentTeam?.name || null,
        })),
      });
    }

    if (type === 'team') {
      const teams = await prisma.team.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { tag: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, tag: true },
        orderBy: { name: 'asc' },
        take: 20,
      });
      return NextResponse.json({
        options: teams.map((t) => ({ value: t.id, label: t.name, subtitle: t.tag || null })),
      });
    }

    const tournaments = await prisma.tournament.findMany({
      where: {
        ...(gameId ? { gameId } : {}),
        ...(q.length >= 2 ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        name: true,
        season: true,
        gameId: true,
        prizeDistribution: true,
        stages: { orderBy: { sequence: 'asc' }, select: { id: true, name: true } },
      },
      orderBy: { startDate: 'desc' },
      take: gameId ? 100 : 20,
    });
    // Extra fields (gameId/stages/stageNames) feed the match editor's cascade
    // selects. stageNames is extracted server-side so the heavy prize JSON
    // never crosses the wire.
    return NextResponse.json({
      options: tournaments.map((t) => {
        const pd = t.prizeDistribution as { stages?: Array<{ stageName?: unknown }> } | null;
        const stageNames = Array.isArray(pd?.stages)
          ? pd.stages
              .map((s) => (typeof s?.stageName === 'string' ? s.stageName.trim() : ''))
              .filter(Boolean)
          : [];
        return {
          value: t.id,
          label: t.name,
          subtitle: t.season || null,
          gameId: t.gameId,
          stages: t.stages,
          stageNames,
        };
      }),
    });
  } catch {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
