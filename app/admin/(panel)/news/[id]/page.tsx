import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { NewsEditor } from '@/components/admin/news-editor';
import { listCategoryValues } from '@/lib/news-queries';

export const dynamic = 'force-dynamic';

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; restored?: string }>;
}) {
  if (!(await isAdmin())) redirect('/admin/login');
  const { id } = await params;
  const { error, saved, restored } = await searchParams;

  const [article, revisions, categoryOptions] = await Promise.all([
    prisma.article.findUnique({
      where: { id },
      include: {
        tournament: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        player: { select: { id: true, ign: true } },
      },
    }),
    prisma.articleRevision.findMany({
      where: { articleId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, title: true, content: true, wordCount: true, createdAt: true },
    }),
    listCategoryValues(),
  ]);

  if (!article) notFound();

  return (
    <NewsEditor
      article={{
        id: article.id,
        slug: article.slug,
        title: article.title,
        subHeadline: article.subHeadline,
        excerpt: article.excerpt,
        keyTakeaways: article.keyTakeaways,
        content: article.content,
        coverImage: article.coverImage,
        coverImageAlt: article.coverImageAlt,
        coverImageCaption: article.coverImageCaption,
        coverImageCredit: article.coverImageCredit,
        ogImage: article.ogImage,
        category: article.category,
        categories: article.categories,
        tags: article.tags,
        authorName: article.authorName,
        authorRole: article.authorRole,
        status: article.status,
        featured: article.featured,
        allowComments: article.allowComments,
        faqs: Array.isArray(article.faqs) ? (article.faqs as any) : null,
        publishedAt: article.publishedAt.toISOString(),
        tournamentId: article.tournamentId,
        teamId: article.teamId,
        playerId: article.playerId,
        metaTitle: article.metaTitle,
        metaDescription: article.metaDescription,
        focusKeyword: article.focusKeyword,
        secondaryKeywords: article.secondaryKeywords,
        views: article.views,
      }}
      revisions={revisions.map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        wordCount: r.wordCount,
        createdAt: r.createdAt.toISOString(),
      }))}
      error={error}
      saved={saved === '1'}
      restored={restored === '1'}
      tournamentOptions={article.tournament ? [{ value: article.tournament.id, label: article.tournament.name }] : []}
      teamOptions={article.team ? [{ value: article.team.id, label: article.team.name }] : []}
      playerOptions={article.player ? [{ value: article.player.id, label: article.player.ign }] : []}
      linkedSearchUrl="/api/admin/search"
      categoryOptions={categoryOptions}
    />
  );
}
