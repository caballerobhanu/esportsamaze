import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { categoryCrumbs, categorySlug, computeWordCount, getCategoryMeta, isVisibleArticle } from '@/lib/news';
import { getAdjacentArticles, getMostRead, getRelatedArticles } from '@/lib/news-queries';
import { absoluteUrl, breadcrumbJsonLd, faqPageJsonLd, newsArticleJsonLd } from '@/lib/seo';
import { ArticleView } from '@/components/news/article-view';

export const revalidate = 60;

export async function generateStaticParams() {
  const articles = await prisma.article.findMany({
    where: { status: 'PUBLISHED', deletedAt: null },
    select: { slug: true },
    orderBy: { publishedAt: 'desc' },
    take: 100,
  });
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug },
    select: {
      title: true,
      excerpt: true,
      coverImage: true,
      ogImage: true,
      metaTitle: true,
      metaDescription: true,
      publishedAt: true,
      authorName: true,
      status: true,
    },
  });

  if (!article || !isVisibleArticle(article)) {
    return { title: 'Article Not Found — eSportsAmaze', robots: { index: false, follow: false } };
  }

  const title = article.metaTitle || `${article.title} — eSportsAmaze`;
  const description =
    article.metaDescription || article.excerpt || `Read the latest coverage: ${article.title}`;
  const image = article.ogImage || article.coverImage;

  return {
    title,
    description,
    alternates: { canonical: `/news/${slug}` },
    openGraph: {
      title: article.metaTitle || article.title,
      description,
      type: 'article',
      publishedTime: article.publishedAt.toISOString(),
      authors: [article.authorName],
      url: absoluteUrl(`/news/${slug}`),
      // When no explicit image exists, omit `images` so the generated
      // opengraph-image route supplies the social card automatically.
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.metaTitle || article.title,
      description,
      images: image ? [image] : [],
    },
  };
}

const articleInclude = {
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
        where: { isPlayer: true, status: 'ACTIVE' as const },
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
};

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const article = await prisma.article.findUnique({
    where: { slug },
    include: articleInclude,
  });

  if (!article || !isVisibleArticle(article)) {
    notFound();
  }

  const [relatedArticles, adjacent, mostRead, comments, commentCount] = await Promise.all([
    getRelatedArticles(article.slug, article.category, 3).catch(() => []),
    getAdjacentArticles(article.publishedAt).catch(() => ({ prev: null, next: null })),
    getMostRead(30, 5).catch(() => []),
    prisma.comment.findMany({
      where: { articleId: article.id, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, authorName: true, body: true, createdAt: true },
    }).catch(() => []),
    prisma.comment.count({ where: { articleId: article.id, status: 'APPROVED' } }).catch(() => 0),
  ]);

  const categoryMeta = getCategoryMeta(article.category);
  const wordCount = computeWordCount(article.content);
  const faqs = (article.faqs as any) ?? [];

  const jsonLd = newsArticleJsonLd({
    slug: article.slug,
    title: article.title,
    subHeadline: article.subHeadline,
    excerpt: article.excerpt,
    metaDescription: article.metaDescription,
    coverImage: article.coverImage,
    coverImageAlt: article.coverImageAlt,
    ogImage: article.ogImage,
    category: categoryMeta.label,
    tags: article.tags,
    secondaryKeywords: article.secondaryKeywords,
    authorName: article.authorName,
    authorRole: article.authorRole,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    readTimeMinutes: article.readTimeMinutes,
    wordCount,
  });
  const breadcrumbItems: Array<{ name: string; path: string }> = [
    { name: 'Home', path: '/' },
    { name: 'News', path: '/news' },
  ];
  const crumbs = categoryCrumbs(article.category);
  if (crumbs.length > 1) {
    crumbs.forEach((crumb) => {
      breadcrumbItems.push({
        name: crumb.name,
        path: `/news/category/${crumb.slug}`,
      });
    });
  } else {
    breadcrumbItems.push({
      name: categoryMeta.label,
      path: `/news/category/${categorySlug(article.category)}`,
    });
  }
  breadcrumbItems.push({ name: article.title, path: `/news/${article.slug}` });
  const breadcrumbs = breadcrumbJsonLd(breadcrumbItems);
  const faqJsonLd = faqs.length > 0 ? faqPageJsonLd(faqs) : null;

  return (
    <ArticleView
      article={article}
      relatedArticles={relatedArticles}
      adjacent={adjacent}
      mostRead={mostRead}
      jsonLd={jsonLd}
      faqJsonLd={faqJsonLd}
      breadcrumbs={breadcrumbs}
      comments={comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))}
      commentCount={commentCount}
    />
  );
}
