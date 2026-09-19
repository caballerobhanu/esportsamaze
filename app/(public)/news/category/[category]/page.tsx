import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, ChevronLeft, ChevronRight, Newspaper, Shield, Trophy } from 'lucide-react';
import { ARTICLE_CATEGORIES, formatArticleDateShort } from '@/lib/news';
import { listPublishedArticles } from '@/lib/news-queries';
import { absoluteUrl } from '@/lib/seo';

export const revalidate = 60;
const PER_PAGE = 9;

export async function generateStaticParams() {
  return ARTICLE_CATEGORIES.map((c) => ({ category: c.value.toLowerCase() }));
}

function resolveCategory(categoryParam: string) {
  return ARTICLE_CATEGORIES.find((c) => c.value.toLowerCase() === categoryParam.toLowerCase());
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = resolveCategory(category);
  if (!cat) return { title: 'Category Not Found — eSportsAmaze' };

  const title = `${cat.label} News & Stories — eSportsAmaze`;
  return {
    title,
    description: `The latest ${cat.label.toLowerCase()} coverage on eSportsAmaze — recaps, reports, and editorial deep-dives.`,
    alternates: { canonical: `/news/category/${cat.value.toLowerCase()}` },
    openGraph: { title, type: 'website', url: absoluteUrl(`/news/category/${cat.value.toLowerCase()}`) },
  };
}

export default async function NewsCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { category } = await params;
  const { page: pageParam } = await searchParams;
  const cat = resolveCategory(category);
  if (!cat) notFound();

  const page = Math.max(1, Number(pageParam) || 1);
  const { articles, total, totalPages } = await listPublishedArticles({
    category: cat.value,
    page,
    perPage: PER_PAGE,
  });

  const pageHref = (p: number) =>
    `/news/category/${cat.value.toLowerCase()}${p > 1 ? `?page=${p}` : ''}`;

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
            <span className="text-[var(--ed-blue)]">{cat.label}</span>
          </nav>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {cat.label} <span className="text-[var(--ed-blue)]">News</span>
          </h1>
          <p className="ed-label mt-2">{total} {total === 1 ? 'story' : 'stories'} — fresh takes, recaps, and reports.</p>
        </div>
      </section>

      <main className="mx-auto w-full max-w-[var(--page-max-width)] px-4 py-8 sm:px-6 lg:px-8">
        {/* Sibling category pills */}
        <div className="no-scrollbar mb-8 flex items-center gap-1.5 overflow-x-auto pb-1">
          {ARTICLE_CATEGORIES.map((c) => (
            <Link
              key={c.value}
              href={`/news/category/${c.value.toLowerCase()}`}
              className={`ed-chip whitespace-nowrap px-3.5 py-1.5 transition-colors ${
                c.value === cat.value
                  ? 'border-[var(--ed-blue)] bg-[var(--ed-blue)] text-white'
                  : 'hover:border-[var(--ed-blue)]'
              }`}
            >
              {c.label.split(' ')[0]}
            </Link>
          ))}
        </div>

        {articles.length === 0 ? (
          <div className="ed-card p-12 text-center">
            <Newspaper className="mx-auto h-12 w-12 text-[var(--ed-hair)]" />
            <h2 className="font-display mt-4 text-base font-extrabold uppercase tracking-wide">Nothing here yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-xs text-[var(--ed-stone)]">
              No {cat.label.toLowerCase()} stories published so far — check back soon.
            </p>
            <Link href="/news" className="ed-btn mt-5 px-4 py-2 text-xs">
              Browse all news
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <article
                key={article.id}
                className="ed-card group flex flex-col justify-between transition-colors hover:border-[var(--ed-blue)]"
              >
                <div>
                  <Link href={`/news/${article.slug}`} className="relative block aspect-video overflow-hidden bg-[#0f1216]">
                    {article.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={article.coverImage}
                        alt={article.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-600">
                        <Newspaper className="h-8 w-8" />
                      </div>
                    )}
                  </Link>

                  <div className="p-5">
                    <div className="ed-label flex items-center gap-2 text-[11px]">
                      <Calendar className="h-3 w-3" />
                      <span>{formatArticleDateShort(article.publishedAt)}</span>
                      <span>•</span>
                      <span>{article.readTimeMinutes}m read</span>
                    </div>
                    <h2 className="font-display mt-2.5 text-base font-extrabold tracking-tight transition-colors group-hover:text-[var(--ed-blue)]">
                      <Link href={`/news/${article.slug}`}>{article.title}</Link>
                    </h2>
                    {article.excerpt && (
                      <p className="mt-2 line-clamp-2 text-xs font-medium leading-relaxed text-[var(--ed-stone)]">
                        {article.excerpt}
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-5 pb-5">
                  {(article.tournament || article.team) && (
                    <div className="mb-3 flex flex-wrap items-center gap-1.5 border-b border-[var(--ed-hair)] pb-3">
                      {article.tournament && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold text-[var(--ed-blue)]">
                          <Trophy className="h-2.5 w-2.5" />
                          <span className="max-w-[140px] truncate">{article.tournament.name}</span>
                        </span>
                      )}
                      {article.team && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                          <Shield className="h-2.5 w-2.5" />
                          <span className="max-w-[120px] truncate">{article.team.name}</span>
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--ed-stone)]">
                    <span className="max-w-[160px] truncate">By {article.authorName}</span>
                    <Link
                      href={`/news/${article.slug}`}
                      className="inline-flex items-center gap-1 font-extrabold uppercase tracking-wider text-[var(--ed-blue)]"
                    >
                      Read <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </article>
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
