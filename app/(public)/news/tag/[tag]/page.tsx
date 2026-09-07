import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight, Tags } from 'lucide-react';
import { listPublishedArticles } from '@/lib/news-queries';
import { absoluteUrl } from '@/lib/seo';
import { ArticleCard, ArchiveEmptyState } from '@/components/news/article-card';

export const revalidate = 60;
const PER_PAGE = 9;

/** Indexable archive for one tag (replaces the noindexed /news?tag= view for links). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const decoded = safeDecode(tag);
  const title = `${decoded} — Tagged Stories — eSportsAmaze`;
  return {
    title,
    description: `All eSportsAmaze coverage tagged “${decoded}” — recaps, analysis, and editorials in one place.`,
    alternates: { canonical: `/news/tag/${encodeURIComponent(decoded)}` },
    openGraph: { title, type: 'website', url: absoluteUrl(`/news/tag/${encodeURIComponent(decoded)}`) },
  };
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function NewsTagPage({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { tag: rawTag } = await params;
  const { page: pageParam } = await searchParams;
  const tag = safeDecode(rawTag).trim();
  if (!tag) notFound();

  const page = Math.max(1, Number(pageParam) || 1);
  const { articles, total, totalPages } = await listPublishedArticles({ tag, page, perPage: PER_PAGE });

  // Unknown tags (no stories at all) 404 instead of creating empty indexable pages.
  if (total === 0 && page === 1) notFound();

  const pageHref = (p: number) => `/news/tag/${encodeURIComponent(tag)}${p > 1 ? `?page=${p}` : ''}`;

  return (
    <div className="min-h-screen bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors">
      {/* Masthead */}
      <section className="border-b border-[var(--ed-hair)] bg-[var(--ed-surface)] py-9 sm:py-12">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
          <nav className="ed-label flex items-center gap-2">
            <Link href="/" className="hover:text-[var(--ed-blue)]">Home</Link>
            <span>/</span>
            <Link href="/news" className="hover:text-[var(--ed-blue)]">News</Link>
            <span>/</span>
            <span className="text-[var(--ed-blue)]">#{tag}</span>
          </nav>
          <h1 className="font-display mt-2 flex items-center gap-2.5 text-3xl font-extrabold tracking-tight sm:text-4xl">
            <Tags className="h-7 w-7 text-[var(--ed-blue)]" />
            {tag}
          </h1>
          <p className="ed-label mt-2">
            {total} {total === 1 ? 'story' : 'stories'} tagged “{tag}”.
          </p>
        </div>
      </section>

      <main className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6">
        {articles.length === 0 ? (
          <ArchiveEmptyState
            heading="Nothing here yet"
            message={`No stories tagged “${tag}” on this page — check back soon.`}
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
