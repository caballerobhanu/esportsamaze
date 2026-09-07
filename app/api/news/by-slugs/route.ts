import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { publishedVisibility } from '@/lib/news-queries';

export const dynamic = 'force-dynamic';

/** Card data for the client-side "Saved stories" page (published articles only). */
export async function GET(req: NextRequest) {
  const slugsParam = new URL(req.url).searchParams.get('slugs') ?? '';
  const slugs = slugsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);

  if (slugs.length === 0) {
    return NextResponse.json({ articles: [] });
  }

  const articles = await prisma.article.findMany({
    where: { slug: { in: slugs }, ...publishedVisibility() },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      category: true,
      readTimeMinutes: true,
      publishedAt: true,
    },
  });

  // Preserve the visitor's saved order.
  const bySlug = new Map(articles.map((a) => [a.slug, a]));
  const ordered = slugs.map((s) => bySlug.get(s)).filter(Boolean);

  return NextResponse.json({ articles: ordered });
}
