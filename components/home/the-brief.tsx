import Link from 'next/link';
import { getCategoryMeta, timeAgo } from '@/lib/news';
import type { ArticleCardData } from '@/lib/news-queries';
import { CoverImage } from '@/components/news/cover-image';
import { SectionHeading } from '@/components/home/section-heading';
import { TournamentShortName } from '@/components/ui/tournament-name';

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
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.slice(0, 6).map((article) => {
          const cat = getCategoryMeta(article.category);
          return (
            <Link
              key={article.id}
              href={`/news/${article.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-[#0A5FC4] hover:shadow-md dark:border-white/10 dark:bg-[#0b1220]"
            >
              <div className="space-y-3">
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-900 shadow-xs">
                  <CoverImage
                    src={article.coverImage}
                    alt={article.title}
                    sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <span className="text-[#0A5FC4] dark:text-blue-400 font-extrabold">{cat.label}</span>
                    <span>•</span>
                    <span>{timeAgo(article.publishedAt || article.updatedAt)}</span>
                  </div>
                  <h3 className="mt-1.5 line-clamp-2 text-sm sm:text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#0A5FC4] dark:text-white dark:group-hover:text-blue-300">
                    {article.title}
                  </h3>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-2.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="truncate max-w-[180px]">
                  {article.tournament ? (
                    <TournamentShortName
                      name={article.tournament.name}
                      shortName={article.tournament.shortName}
                      series={article.tournament.series}
                      season={article.tournament.season}
                    />
                  ) : (
                    article.team?.name ?? 'BGMI Circuit'
                  )}
                </span>
                <span className="text-[#0A5FC4] dark:text-blue-400 font-bold">{article.readTimeMinutes} min read</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
