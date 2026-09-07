import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { publishedVisibility } from '@/lib/news-queries';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

/** Card data for the client-side "Saved stories" page (published articles only). */
export async function GET(req: NextRequest) {
  const ip = await getClientIp();
  const rl = checkRateLimit('api:news:by-slugs', ip, { windowMs: 60_000, maxRequests: 60 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  const slugsParam = (new URL(req.url).searchParams.get('slugs') ?? '').slice(0, 2000);
  const slugs = slugsParam
    .split(',')
    .map((s) => s.trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, 30);

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
