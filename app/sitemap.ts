import type { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const staticRoutes = ['', '/teams', '/tournaments', '/rankings', '/about', '/disclaimer', '/privacy-policy'].map(
    (p) => ({
      url: `${base}${p}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: p === '' ? 1 : 0.7,
    })
  );

  try {
    const [tournaments, teams, players] = await Promise.all([
      prisma.tournament.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.team.findMany({ where: { slug: { not: null } }, select: { slug: true, updatedAt: true } }),
      prisma.player.findMany({ where: { slug: { not: null } }, select: { slug: true, updatedAt: true } }),
    ]);

    return [
      ...staticRoutes,
      ...tournaments.map((t) => ({
        url: `${base}/tournaments/${t.slug}`,
        lastModified: t.updatedAt,
        changeFrequency: 'hourly' as const,
        priority: 0.9,
      })),
      ...teams.map((t) => ({
        url: `${base}/teams/${t.slug}`,
        lastModified: t.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.6,
      })),
      ...players.map((p) => ({
        url: `${base}/players/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
