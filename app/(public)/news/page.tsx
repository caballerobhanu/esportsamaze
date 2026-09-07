import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Newspaper,
  Search,
  Star,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Trophy,
  Shield,
  Tags,
  Flame,
} from 'lucide-react';
import { ARTICLE_CATEGORIES, formatArticleDateShort, getCategoryMeta, timeAgo } from '@/lib/news';
import { getCategoryCounts, getMostRead, getTagCounts, listPublishedArticles } from '@/lib/news-queries';
import { baseUrl, itemListJsonLd, serializeJsonLd } from '@/lib/seo';
import { CoverImage } from '@/components/news/cover-image';
import { SectionHeading } from '@/components/home/section-heading';

export const revalidate = 60;

const PER_PAGE = 12;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; page?: string }>;
}): Promise<Metadata> {
  const { q, tag, page } = await searchParams;
  const base: Metadata = {
    title: 'Esports News, Articles & Tournament Recaps — eSportsAmaze',
    description:
      'Breaking esports news, roster transfers, tactical meta analysis, player interviews, and tournament recaps on eSportsAmaze.',
    alternates: { canonical: page && Number(page) > 1 ? `/news?page=${page}` : '/news' },
    openGraph: {
      title: 'Esports News & Editorial | eSportsAmaze',
      description: 'Breaking esports news, roster updates, tournament recaps, and statistical meta analysis.',
      type: 'website',
      url: baseUrl() + '/news',
    },
  };

  // Filtered/search views are thin duplicate content — keep them out of the index.
  if (q || tag) {
    return { ...base, robots: { index: false, follow: true } };
  }
  return base;
}

export default async function NewsHubPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; page?: string }>;
}) {
  const { q: searchQuery, tag: filterTag, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const isFiltered = Boolean(searchQuery || filterTag);

  const [{ articles, total, totalPages }, categoryCounts, tags, mostRead] = await Promise.all([
    listPublishedArticles({ q: searchQuery, tag: filterTag, page, perPage: PER_PAGE }),
    getCategoryCounts(),
    getTagCounts(14),
    !isFiltered ? getMostRead(30, 5) : Promise.resolve([]),
  ]);

  // Lead story only on the unfiltered first page
  const featuredArticle =
    !isFiltered && page === 1 ? articles.find((a) => a.featured) ?? articles[0] : null;
  const wireArticles = featuredArticle
    ? articles.filter((a) => a.id !== featuredArticle.id)
    : articles;

  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    if (searchQuery) sp.set('q', searchQuery);
    if (filterTag) sp.set('tag', filterTag);
    if (p > 1) sp.set('page', String(p));
    const qs = sp.toString();
    return `/news${qs ? `?${qs}` : ''}`;
  };

  const listTitle = filterTag
    ? `Tagged “${filterTag}”`
    : searchQuery
      ? `Results for “${searchQuery}”`
      : 'The Wire';

  return (
    <div className="min-h-screen bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors">
      {/* ================= HERO MASTHEAD ================= */}
      <section className="border-b border-[var(--ed-hair)] bg-[var(--ed-surface)] py-9 sm:py-12">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="kicker inline-flex items-center gap-2 text-[var(--ed-blue)]">
                <Sparkles className="h-3 w-3" aria-hidden />
                Editorial & Intelligence
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Esports News & Reports
              </h1>
              <p className="mt-2 max-w-xl text-sm font-medium text-[var(--ed-stone)]">
                In-depth tournament coverage, tactical meta telemetry, transfer scoops, and exclusive
                player interviews.
              </p>
            </div>

            {/* Search */}
            <form method="GET" action="/news" className="w-full md:w-80">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ed-stone)]" />
                <input
                  type="text"
                  name="q"
                  defaultValue={searchQuery || ''}
                  placeholder="Search articles, teams, topics…"
                  className="ed-input py-2.5 pl-9 text-xs"
                />
                {filterTag && <input type="hidden" name="tag" value={filterTag} />}
              </div>
            </form>
          </div>

          {/* Category pills → real category pages */}
          <div className="no-scrollbar mt-7 flex items-center gap-1.5 overflow-x-auto border-t border-[var(--ed-hair)] pb-1 pt-4">
            <Link
              href="/news"
              className={`ed-chip whitespace-nowrap px-3.5 py-1.5 transition-colors ${
                !isFiltered
                  ? 'border-[var(--ed-blue)] bg-[var(--ed-blue)] text-white'
                  : 'hover:border-[var(--ed-blue)]'
              }`}
            >
              All News
              <span className={`rounded-full px-1.5 text-[10px] ${!isFiltered ? 'bg-white/20' : 'bg-[var(--ed-sand)]'}`}>
                {categoryCounts.total}
              </span>
            </Link>

            {ARTICLE_CATEGORIES.map((cat) => {
              const count = categoryCounts.map.get(cat.value) ?? 0;
              return (
                <Link
                  key={cat.value}
                  href={`/news/category/${cat.value.toLowerCase()}`}
                  className="ed-chip whitespace-nowrap px-3.5 py-1.5 transition-colors hover:border-[var(--ed-blue)]"
                >
                  <span>{cat.label.split(' ')[0]}</span>
                  {count > 0 && <span className="rounded-full bg-[var(--ed-sand)] px-1.5 text-[10px]">{count}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= MAIN CONTENT ================= */}
      <main className="mx-auto w-full max-w-[1200px] space-y-10 px-4 py-10 sm:px-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd(articles.slice(0, 12))) }}
        />

        {/* LEAD STORY */}
        {featuredArticle && (
          <article className="ed-card group">
            <Link href={`/news/${featuredArticle.slug}`} className="grid grid-cols-1 lg:grid-cols-12">
              <div className="relative h-64 overflow-hidden bg-[var(--ed-sand)] sm:h-80 lg:col-span-7 lg:h-full">
                <CoverImage
                  src={featuredArticle.coverImage}
                  alt={featuredArticle.title}
                  sizes="(min-width: 1024px) 660px, 100vw"
                  priority
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent lg:hidden" />
              </div>

              <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-5 lg:p-9">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-950">
                      <Star className="h-3 w-3 fill-current" aria-hidden />
                      Featured
                    </span>
                    <span className="ed-chip px-2.5 py-0.5 text-[10px]">
                      {getCategoryMeta(featuredArticle.category).label}
                    </span>
                  </div>

                  <h2 className="mt-4 text-2xl font-extrabold leading-snug tracking-tight transition-colors group-hover:text-[var(--ed-blue)] sm:text-3xl">
                    {featuredArticle.title}
                  </h2>

                  {featuredArticle.excerpt && (
                    <p className="mt-3 line-clamp-3 text-xs font-medium leading-relaxed text-[var(--ed-stone)] sm:text-sm">
                      {featuredArticle.excerpt}
                    </p>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-[var(--ed-hair)] pt-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--ed-stone)]">
                    <span>{featuredArticle.authorName}</span>
                    <span>•</span>
                    <span>{formatArticleDateShort(featuredArticle.publishedAt)}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[var(--ed-blue)] transition-transform group-hover:translate-x-0.5">
                    Read Article
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </div>
              </div>
            </Link>
          </article>
        )}

        {/* THE WIRE — dense editorial list */}
        <div>
          <SectionHeading
            id="wire-heading"
            kicker={`Every story, newest first · ${total} ${total === 1 ? 'article' : 'articles'}`}
            title={listTitle}
          />

          {articles.length === 0 ? (
            <div className="ed-card mt-6 p-12 text-center">
              <Newspaper className="mx-auto h-12 w-12 text-[var(--ed-hair)]" aria-hidden />
              <h3 className="mt-4 text-xl font-extrabold tracking-tight">No articles found</h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-[var(--ed-stone)]">
                {searchQuery
                  ? `No stories matched “${searchQuery}”. Try different keywords or browse all categories.`
                  : filterTag
                    ? `No stories tagged “${filterTag}” yet.`
                    : 'No stories published here yet.'}
              </p>
              <Link href="/news" className="ed-btn mt-5 px-4 py-2 text-xs">
                Clear Filters
              </Link>
            </div>
          ) : (
            <div className="mt-2 grid gap-x-8 md:grid-cols-2">
              {wireArticles.map((article) => {
                const cat = getCategoryMeta(article.category);
                return (
                  <Link
                    key={article.id}
                    href={`/news/${article.slug}`}
                    className="group flex items-start gap-4 border-b border-[var(--ed-hair)] py-4"
                  >
                    <div className="relative h-[72px] w-28 shrink-0 overflow-hidden rounded-lg border border-[var(--ed-hair)] bg-[var(--ed-sand)]">
                      <CoverImage
                        src={article.coverImage}
                        alt={article.title}
                        sizes="120px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${cat.color.split(' ')[0]}`}>
                        {cat.label.split(' ')[0]}
                        <span className="font-semibold text-[var(--ed-stone)]">
                          {' '}
                          · {timeAgo(article.publishedAt)} · {article.readTimeMinutes}m
                        </span>
                      </p>
                      <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug transition-colors group-hover:text-[var(--ed-blue)]">
                        {article.title}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold text-[var(--ed-stone)]">
                        <span className="max-w-[140px] truncate">{article.authorName}</span>
                        {article.tournament && (
                          <span className="inline-flex items-center gap-1 text-[var(--ed-blue)]">
                            <Trophy className="h-2.5 w-2.5" aria-hidden />
                            <span className="max-w-[120px] truncate">{article.tournament.name}</span>
                          </span>
                        )}
                        {article.team && (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <Shield className="h-2.5 w-2.5" aria-hidden />
                            <span className="max-w-[110px] truncate">{article.team.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-between border-t border-[var(--ed-hair)] pt-6">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="ed-chip px-3 py-2 hover:border-[var(--ed-blue)]">
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
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
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}
        </div>

        {/* MOST READ — top viewed stories of the month */}
        {mostRead.length > 0 && (
          <div className="ed-card p-5 sm:p-6">
            <div className="ed-label mb-4 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-[var(--ed-blue)]" aria-hidden />
              Most read this month
            </div>
            <ol className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
              {mostRead.map((a, i) => (
                <li key={a.id}>
                  <Link href={`/news/${a.slug}`} className="group flex items-start gap-3">
                    <span className="font-display text-xl font-black leading-none text-[var(--ed-hair)] transition-colors group-hover:text-[var(--ed-blue)]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>
                      <span className="line-clamp-2 block text-sm font-bold leading-snug transition-colors group-hover:text-[var(--ed-blue)]">
                        {a.title}
                      </span>
                      <span className="ed-label mt-1 block text-[10px]">
                        {a.views.toLocaleString('en-IN')} views · {a.readTimeMinutes} min read
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* TAG CLOUD */}
        {tags.length > 0 && (
          <div className="ed-card p-5 sm:p-6">
            <div className="ed-label mb-3 flex items-center gap-1.5">
              <Tags className="h-3.5 w-3.5 text-[var(--ed-blue)]" aria-hidden />
              Browse by topic
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(({ tag, count }) => (
                <Link
                  key={tag}
                  href={`/news/tag/${encodeURIComponent(tag)}`}
                  className="ed-chip hover:border-[var(--ed-blue)] hover:text-[var(--ed-blue)]"
                >
                  #{tag}
                  <span className="text-[10px] text-[var(--ed-stone)]">{count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
