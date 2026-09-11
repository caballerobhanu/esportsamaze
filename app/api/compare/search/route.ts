import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isSameOrigin, crossSiteForbiddenResponse } from '@/lib/anti-scrape';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

// Search-as-you-type backend for the compare page pickers. Returns the top
// 20 matches for a query; the client component debounces and aborts stale
// requests, so this stays cheap even under heavy typing.

export async function GET(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return crossSiteForbiddenResponse();
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

  if (q.length < 2) {
    return NextResponse.json({ options: [] });
  }

  try {
    if (type === 'teams') {
      const teams = await prisma.team.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { tag: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
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
      where: { ign: { contains: q, mode: 'insensitive' } },
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
