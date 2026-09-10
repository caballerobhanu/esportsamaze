import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { NewsEditor } from '@/components/admin/news-editor';

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

  const [article, tournaments, teams, players, revisions] = await Promise.all([
    prisma.article.findUnique({
      where: { id },
      include: {
        tournament: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        player: { select: { id: true, ign: true } },
      },
    }),
    prisma.tournament.findMany({ select: { id: true, name: true }, orderBy: { startDate: 'desc' }, take: 50 }),
    prisma.team.findMany({ select: { id: true, name: true, tag: true }, orderBy: { name: 'asc' } }),
    prisma.player.findMany({ select: { id: true, ign: true }, orderBy: { ign: 'asc' }, take: 100 }),
    prisma.articleRevision.findMany({
      where: { articleId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, title: true, content: true, wordCount: true, createdAt: true },
    }),
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
      tournamentOptions={tournaments.map((t) => ({ value: t.id, label: t.name }))}
      teamOptions={teams.map((t) => ({ value: t.id, label: `${t.name}${t.tag ? ` (${t.tag})` : ''}` }))}
      playerOptions={players.map((p) => ({ value: p.id, label: p.ign }))}
    />
  );
}
