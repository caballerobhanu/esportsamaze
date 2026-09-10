import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { publishedVisibility } from '@/lib/news-queries';
import { ARTICLE_CATEGORIES } from '@/lib/news';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { isSameOrigin, crossSiteForbiddenResponse } from '@/lib/anti-scrape';

const VALID_CATEGORIES = new Set<string>(ARTICLE_CATEGORIES.map((c) => c.value));

export async function GET(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return crossSiteForbiddenResponse();
  }

  const ip = await getClientIp();
  const rl = checkRateLimit('api:news', ip, { windowMs: 60_000, maxRequests: 120 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const categoryRaw = searchParams.get('category')?.trim().toUpperCase();
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 50);
    const featured = searchParams.get('featured');

    const whereClause: Prisma.ArticleWhereInput = {
      ...publishedVisibility(),
    };

    if (categoryRaw && categoryRaw !== 'ALL' && VALID_CATEGORIES.has(categoryRaw)) {
      whereClause.category = categoryRaw;
    }

    if (featured === 'true') {
      whereClause.featured = true;
    }

    const articles = await prisma.article.findMany({
      where: whereClause,
      orderBy: [
        { featured: 'desc' },
        { publishedAt: 'desc' },
      ],
      take: limit,
      include: {
        tournament: { select: { id: true, name: true, slug: true } },
        team: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json({ articles });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}
