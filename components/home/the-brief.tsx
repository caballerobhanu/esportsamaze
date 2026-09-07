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
    <section aria-labelledby="the-brief-heading" className="space-y-4">
      <SectionHeading
        id="the-brief-heading"
        kicker="News & notes from the circuit"
        title="The Brief"
        href="/news"
        linkLabel="All news"
      />
      <div className="grid gap-x-8 md:grid-cols-2">
        {articles.map((article) => {
          const cat = getCategoryMeta(article.category);
          return (
            <Link
              key={article.id}
              href={`/news/${article.slug}`}
              className="group flex items-start gap-4 border-b border-[var(--ed-hair)] py-4"
            >
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-[var(--ed-hair)] bg-[var(--ed-sand)] sm:h-[72px] sm:w-28">
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
                    · {timeAgo(article.publishedAt || article.updatedAt)}
                  </span>
                </p>
                <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug transition-colors group-hover:text-[var(--ed-blue)]">
                  {article.title}
                </h3>
                {(article.tournament || article.team) && (
                  <p className="mt-1.5 truncate text-[11px] font-semibold text-[var(--ed-stone)]">
                    {article.tournament?.name ?? article.team?.name}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
