import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { getAdjacentArticles, getMostRead, getRelatedArticles } from '@/lib/news-queries';
import { ArticleView } from '@/components/news/article-view';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Draft Preview — eSportsAmaze Admin',
  robots: { index: false, follow: false },
};

/** Admin-only full preview of an article regardless of publish status (drafts, scheduled, future-dated). */
export default async function ArticlePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) redirect('/admin/login');
  const { id } = await params;

  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      tournament: {
        select: {
          name: true,
          slug: true,
          tier: true,
          series: true,
          prizePool: true,
          startDate: true,
          endDate: true,
        },
      },
      team: {
        select: {
          name: true,
          tag: true,
          slug: true,
          logoUrl: true,
          region: true,
          players: {
            where: { isPlayer: true, status: 'ACTIVE' },
            select: { ign: true, role: true },
            take: 4,
          },
        },
      },
      player: {
        select: {
          id: true,
          ign: true,
          firstName: true,
          lastName: true,
          role: true,
          avatarUrl: true,
          currentTeam: { select: { name: true, tag: true, logoUrl: true } },
        },
      },
    },
  });

  if (!article) notFound();

  const [relatedArticles, adjacent, mostRead, comments, commentCount] = await Promise.all([
    getRelatedArticles(article.slug, article.category, 3),
    getAdjacentArticles(article.publishedAt),
    getMostRead(30, 5),
    prisma.comment.findMany({
      where: { articleId: article.id, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, authorName: true, body: true, createdAt: true },
    }),
    prisma.comment.count({ where: { articleId: article.id, status: 'APPROVED' } }),
  ]);

  return (
    <ArticleView
      article={article}
      relatedArticles={relatedArticles}
      adjacent={adjacent}
      mostRead={mostRead}
      isPreview
      comments={comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))}
      commentCount={commentCount}
    />
  );
}
