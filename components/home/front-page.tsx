import Link from 'next/link';
import { getCategoryMeta, timeAgo } from '@/lib/news';
import type { ArticleCardData } from '@/lib/news-queries';
import { CoverImage } from '@/components/news/cover-image';

/**
 * The magazine front page: one lead story beside a four-up grid of stories.
 */
export function FrontPage({
  lead,
  stories,
}: {
  lead: ArticleCardData | null;
  stories: ArticleCardData[];
}) {
  const dateline = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const noStories = !lead && stories.length === 0;

  return (
    <section aria-label="Top stories">
      {/* Dateline strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{dateline}</p>
        <p className="text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400">The Front Page · eSportsAmaze</p>
      </div>

      {noStories ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-8 text-center text-xs text-slate-500 dark:text-slate-400">
          No stories published yet. Check back soon for esports coverage!
        </div>
      ) : (
        <div className="mt-5 grid gap-8 sm:mt-7 lg:grid-cols-12 lg:gap-10">
          {/* Lead story */}
          <div className="min-w-0 lg:col-span-6">
            {lead && (
              <article>
                <Link href={`/news/${lead.slug}`} className="group block">
                  <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-900 shadow-xs">
                    <CoverImage
                      src={lead.coverImage}
                      alt={lead.title}
                      sizes="(min-width: 1024px) 620px, 100vw"
                      priority
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="mt-5 max-w-3xl">
                    <p className="text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400">
                      {getCategoryMeta(lead.category).label} · {timeAgo(lead.publishedAt || lead.updatedAt)} ·{' '}
                      {lead.readTimeMinutes} min read
                    </p>
                    <h2 className="mt-2 text-2xl font-black leading-[1.15] tracking-tight text-slate-950 transition-colors group-hover:text-[#0A5FC4] dark:text-white dark:group-hover:text-blue-300 sm:text-3xl lg:text-4xl">
                      {lead.title}
                    </h2>
                    {lead.excerpt && (
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-[15px]">
                        {lead.excerpt}
                      </p>
                    )}
                    <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      By <span className="text-slate-900 dark:text-white font-bold">{lead.authorName}</span>
                    </p>
                  </div>
                </Link>
              </article>
            )}
          </div>

          {/* Four-up story grid beside the lead */}
          {stories.length > 0 && (
            <div className="grid min-w-0 gap-6 sm:grid-cols-2 lg:col-span-6 lg:gap-5">
              {stories.map((article) => (
                <article key={article.id}>
                  <Link href={`/news/${article.slug}`} className="group flex h-full flex-col gap-3">
                    <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-900 shadow-xs">
                      <CoverImage
                        src={article.coverImage}
                        alt={article.title}
                        sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400">
                      {getCategoryMeta(article.category).label.split(' ')[0]} ·{' '}
                      {timeAgo(article.publishedAt || article.updatedAt)}
                    </p>
                    <h3 className="text-lg font-bold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-[#0A5FC4] dark:text-white dark:group-hover:text-blue-300 sm:text-xl">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        {article.excerpt}
                      </p>
                    )}
                  </Link>
                </article>
              ))}
            </div>
          )}

        </div>
      )}
    </section>
  );
}
