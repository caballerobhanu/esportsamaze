/* Server-only news queries (Prisma). Pure constants/helpers live in lib/news.ts. */
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export function publishedVisibility(): Prisma.ArticleWhereInput {
  return {
    deletedAt: null,
    OR: [{ status: 'PUBLISHED' }, { status: 'SCHEDULED', publishedAt: { lte: new Date() } }],
  };
}

/** Flip SCHEDULED articles whose publish time has passed to PUBLISHED. Cheap; call on admin/dashboard render. */
export async function syncScheduledArticles(): Promise<number> {
  const res = await prisma.article.updateMany({
    where: { status: 'SCHEDULED', deletedAt: null, publishedAt: { lte: new Date() } },
    data: { status: 'PUBLISHED' },
  });
  return res.count;
}

/** Top viewed stories from the last `days` days (falls back to all-time if none). */
export async function getMostRead(days = 30, take = 5) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const recent = await prisma.article.findMany({
    where: { ...publishedVisibility(), publishedAt: { gte: since } },
    orderBy: [{ views: 'desc' }, { publishedAt: 'desc' }],
    take,
    select: articleCardSelect,
  });
  if (recent.length >= take) return recent;

  const allTime = await prisma.article.findMany({
    where: publishedVisibility(),
    orderBy: [{ views: 'desc' }, { publishedAt: 'desc' }],
    take,
    select: articleCardSelect,
  });
  const seen = new Set(recent.map((a) => a.id));
  return [...recent, ...allTime.filter((a) => !seen.has(a.id))].slice(0, take);
}

export const articleCardInclude = {
  tournament: { select: { id: true, name: true, shortName: true, series: true, season: true, slug: true } },
  team: { select: { id: true, name: true, tag: true, slug: true, logoUrl: true } },
} satisfies Prisma.ArticleInclude;

export type ArticleCardData = Prisma.ArticleGetPayload<{ include: typeof articleCardInclude }>;

/** One query feeds every homepage editorial block (lead, latest, picks, brief). */
export async function getFrontPageArticles(take = 24): Promise<ArticleCardData[]> {
  return prisma.article.findMany({
    where: publishedVisibility(),
    orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
    take,
    include: articleCardInclude,
  });
}

export const articleCardSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImage: true,
  category: true,
  tags: true,
  authorName: true,
  authorRole: true,
  featured: true,
  status: true,
  readTimeMinutes: true,
  views: true,
  publishedAt: true,
  updatedAt: true,
} satisfies Prisma.ArticleSelect;

/** Flat article card (no dossier relations) — used by related/most-read listings. */
export type ArticleCardSelectData = Prisma.ArticleGetPayload<{ select: typeof articleCardSelect }>;

export function buildPublicWhere(opts: { category?: string; tag?: string; q?: string }) {
  const { category, tag, q } = opts;
  return {
    ...publishedVisibility(),
    ...(category && category !== 'ALL' ? { category } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { excerpt: { contains: q, mode: 'insensitive' as const } },
            { authorName: { contains: q, mode: 'insensitive' as const } },
            { tags: { has: q } },
          ],
        }
      : {}),
  };
}

export async function listPublishedArticles(opts: {
  category?: string;
  tag?: string;
  q?: string;
  page?: number;
  perPage?: number;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(48, Math.max(1, opts.perPage ?? 9));
  const where = buildPublicWhere(opts);

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
      include: articleCardInclude,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.article.count({ where }),
  ]);

  return { articles, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getCategoryCounts() {
  const rows = await prisma.article.groupBy({
    by: ['category'],
    where: publishedVisibility(),
    _count: { id: true },
  });
  const map = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    map.set(r.category, r._count.id);
    total += r._count.id;
  }
  return { map, total };
}

export async function getTagCounts(limit = 24) {
  const articles = await prisma.article.findMany({
    where: publishedVisibility(),
    select: { tags: true },
  });
  const counts = new Map<string, number>();
  for (const a of articles) {
    for (const t of a.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

export async function getRelatedArticles(slug: string, category: string, take = 3) {
  const sameCategory = await prisma.article.findMany({
    where: { ...publishedVisibility(), slug: { not: slug }, category },
    orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
    take,
    select: articleCardSelect,
  });
  if (sameCategory.length >= take) return sameCategory;

  const excludeSlugs = new Set([slug, ...sameCategory.map((a) => a.slug)]);
  const filler = await prisma.article.findMany({
    where: { ...publishedVisibility(), slug: { notIn: [...excludeSlugs] } },
    orderBy: { publishedAt: 'desc' },
    take: take - sameCategory.length,
    select: articleCardSelect,
  });
  return [...sameCategory, ...filler];
}

export async function getAdjacentArticles(publishedAt: Date) {
  const [prev, next] = await Promise.all([
    prisma.article.findFirst({
      where: { ...publishedVisibility(), publishedAt: { lt: publishedAt } },
      orderBy: { publishedAt: 'desc' },
      select: { slug: true, title: true },
    }),
    prisma.article.findFirst({
      where: { ...publishedVisibility(), publishedAt: { gt: publishedAt } },
      orderBy: { publishedAt: 'asc' },
      select: { slug: true, title: true },
    }),
  ]);
  return { prev, next };
}
