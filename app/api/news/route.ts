import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { publishedVisibility } from '@/lib/news-queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 50);
    const featured = searchParams.get('featured');

    const whereClause: Prisma.ArticleWhereInput = {
      ...publishedVisibility(),
    };

    if (category && category !== 'ALL') {
      whereClause.category = category;
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
