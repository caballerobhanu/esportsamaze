import Link from 'next/link';
import { getCategoryMeta, timeAgo } from '@/lib/news';
import type { ArticleCardData } from '@/lib/news-queries';
import { CoverImage } from '@/components/news/cover-image';
import { SectionHeading } from '@/components/home/section-heading';

/**
 * Dense magazine news list: small thumb + category kicker + headline,
 * two columns on desktop — many stories, minimal screen space.
 */
export function TheBrief({ articles }: { articles: ArticleCardData[] }) {
  if (articles.length === 0) return null;

  return (
    <section aria-labelledby="the-brief-heading" className="space-y-5">
      <SectionHeading
        id="the-brief-heading"
        kicker="Esports Reporting"
        title="Latest News & Analysis"
        href="/news"
        linkLabel="All news"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.slice(0, 6).map((article) => {
          const cat = getCategoryMeta(article.category);
          return (
            <Link
              key={article.id}
              href={`/news/${article.slug}`}
              className="ed-card group flex flex-col justify-between p-4 transition-all hover:border-[var(--ed-blue)]/80"
            >
              <div className="space-y-3">
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-[var(--ed-hair)] bg-[var(--ed-sand)]">
                  <CoverImage
                    src={article.coverImage}
                    alt={article.title}
                    sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--ed-stone)]">
                    <span className="text-[var(--ed-blue)] font-bold">{cat.label}</span>
                    <span>•</span>
                    <span>{timeAgo(article.publishedAt || article.updatedAt)}</span>
                  </div>
                  <h3 className="mt-1.5 line-clamp-2 text-sm sm:text-base font-bold leading-snug text-[var(--ed-ink)] transition-colors group-hover:text-[var(--ed-blue)]">
                    {article.title}
                  </h3>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-[var(--ed-hair)]/60 pt-2.5 text-[11px] font-medium text-[var(--ed-stone)]">
                <span className="truncate max-w-[180px]">
                  {article.tournament?.name ?? article.team?.name ?? 'BGMI Circuit'}
                </span>
                <span>{article.readTimeMinutes} min read</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
