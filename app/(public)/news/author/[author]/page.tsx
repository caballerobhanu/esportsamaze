import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import prisma from '@/lib/prisma';
import { publishedVisibility, articleCardInclude } from '@/lib/news-queries';
import { absoluteUrl } from '@/lib/seo';
import { slugify } from '@/lib/utils';
import { ArticleCard, ArchiveEmptyState } from '@/components/news/article-card';

export const revalidate = 60;
const PER_PAGE = 9;

/** Resolve a slugified author param back to the real authorName stored on articles. */
async function resolveAuthor(authorParam: string): Promise<{ name: string; role: string | null } | null> {
  const authors = await prisma.article.findMany({
    where: publishedVisibility(),
    select: { authorName: true, authorRole: true },
    distinct: ['authorName'],
  });
  const match = authors.find((a) => slugify(a.authorName) === authorParam.toLowerCase());
  if (!match) return null;
  return { name: match.authorName, role: match.authorRole };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ author: string }>;
}): Promise<Metadata> {
  const { author } = await params;
  const resolved = await resolveAuthor(author);
  if (!resolved) return { title: 'Author Not Found — eSportsAmaze' };

  const title = `${resolved.name} — Articles & Stories — eSportsAmaze`;
  return {
    title,
    description: `Every story by ${resolved.name} on eSportsAmaze — reports, analysis, and interviews.`,
    alternates: { canonical: `/news/author/${author}` },
    openGraph: { title, type: 'profile', url: absoluteUrl(`/news/author/${author}`) },
  };
}

export default async function NewsAuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ author: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { author } = await params;
  const { page: pageParam } = await searchParams;
  const resolved = await resolveAuthor(author);
  if (!resolved) notFound();

  const page = Math.max(1, Number(pageParam) || 1);
  const where = { ...publishedVisibility(), authorName: resolved.name };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
      include: articleCardInclude,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.article.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const pageHref = (p: number) => `/news/author/${author}${p > 1 ? `?page=${p}` : ''}`;

  return (
    <div className="min-h-screen bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors">
      {/* Masthead */}
      <section className="border-b border-[var(--ed-hair)] bg-[var(--ed-surface)] py-7 sm:py-12">
        <div className="mx-auto w-full max-w-[var(--page-max-width)] px-4 sm:px-6 lg:px-8">
          <nav className="ed-label flex items-center gap-2">
            <Link href="/" className="hover:text-[var(--ed-blue)]">Home</Link>
            <span>/</span>
            <Link href="/news" className="hover:text-[var(--ed-blue)]">News</Link>
            <span>/</span>
            <span className="text-[var(--ed-blue)]">{resolved.name}</span>
          </nav>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--ed-sand)] text-lg font-extrabold text-[var(--ed-ink)]">
              {resolved.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display flex items-center gap-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                <User className="h-7 w-7 text-[var(--ed-blue)]" />
                {resolved.name}
              </h1>
              <p className="ed-label mt-1">
                {resolved.role || 'Editorial Contributor'} · {total} {total === 1 ? 'story' : 'stories'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-[var(--page-max-width)] px-4 py-8 sm:px-6 lg:px-8">
        {articles.length === 0 ? (
          <ArchiveEmptyState
            heading="Nothing published yet"
            message={`No live stories by ${resolved.name} right now — check back soon.`}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-between border-t border-[var(--ed-hair)] pt-6">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="ed-chip px-3 py-2 hover:border-[var(--ed-blue)]">
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Previous</span>
              </Link>
            ) : (
              <span />
            )}
            <span className="ed-label">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={pageHref(page + 1)} className="ed-chip px-3 py-2 hover:border-[var(--ed-blue)]">
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
