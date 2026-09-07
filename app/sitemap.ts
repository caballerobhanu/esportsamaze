import type { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';
import { ARTICLE_CATEGORIES } from '@/lib/news';
import { baseUrl } from '@/lib/seo';

import { publishedVisibility } from '@/lib/news-queries';

export const revalidate = 3600; // Cache sitemap for 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const staticRoutes = [
    '',
    '/teams',
    '/tournaments',
    '/rankings',
    '/compare',
    '/news',
    '/about',
    '/contact',
    '/disclaimer',
    '/privacy-policy',
    '/terms',
  ].map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: p === '' ? 1 : p === '/news' ? 0.8 : 0.7,
  }));

  try {
    const [tournaments, teams, players, articles] = await Promise.all([
      prisma.tournament.findMany({
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      }),
      prisma.team.findMany({
        where: { slug: { not: null } },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      }),
      prisma.player.findMany({
        where: { slug: { not: null } },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      }),
      prisma.article.findMany({
        where: publishedVisibility(),
        select: { slug: true, updatedAt: true, tags: true },
        orderBy: { publishedAt: 'desc' },
        take: 5000,
      }),
    ]);

    // Index the 20 most-used tags as dedicated archive pages.
    const tagCounts = new Map<string, number>();
    for (const a of articles) {
      for (const t of a.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag]) => tag);

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
      // Indexable news category pages
      ...ARTICLE_CATEGORIES.map((c) => ({
        url: `${base}/news/category/${c.value.toLowerCase()}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.6,
      })),
      // Indexable tag archive pages
      ...topTags.map((tag) => ({
        url: `${base}/news/tag/${encodeURIComponent(tag)}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.5,
      })),
      // Articles
      ...articles.map((a) => ({
        url: `${base}/news/${a.slug}`,
        lastModified: a.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
