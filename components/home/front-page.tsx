import Link from 'next/link';
import { getCategoryMeta, timeAgo } from '@/lib/news';
import type { ArticleCardData } from '@/lib/news-queries';
import { CoverImage } from '@/components/news/cover-image';
import { TournamentShortName } from '@/components/ui/tournament-name';

export interface LiveTournamentTeaser {
  name: string;
  shortName?: string | null;
  series?: string | null;
  season?: string | null;
  slug: string;
  stageName: string;
}

/**
 * The magazine front page: one lead story with two secondaries on the left,
 * a numbered "Latest" wire plus the live-tournament card in the right rail.
 */
export function FrontPage({
  lead,
  secondary,
  latest,
  liveTournament,
}: {
  lead: ArticleCardData | null;
  secondary: ArticleCardData[];
  latest: ArticleCardData[];
  liveTournament: LiveTournamentTeaser | null;
}) {
  const dateline = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const noStories = !lead && latest.length === 0;

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
          {/* Lead + secondaries */}
          <div className="min-w-0 lg:col-span-8">
            {lead && (
              <article>
                <Link href={`/news/${lead.slug}`} className="group block">
                  <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-900 shadow-xs">
                    <CoverImage
                      src={lead.coverImage}
                      alt={lead.title}
                      sizes="(min-width: 1200px) 780px, 100vw"
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

            {secondary.length > 0 && (
              <div className="mt-6 grid gap-7 border-t border-slate-200 dark:border-white/10 pt-6 sm:mt-8 sm:grid-cols-2 sm:pt-8">
                {secondary.map((article) => (
                  <article key={article.id}>
                    <Link href={`/news/${article.slug}`} className="group flex h-full flex-col gap-3">
                      <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-900 shadow-xs">
                        <CoverImage
                          src={article.coverImage}
                          alt={article.title}
                          sizes="(min-width: 1200px) 380px, (min-width: 640px) 50vw, 100vw"
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

          {/* The Latest wire */}
          <aside className="min-w-0 lg:col-span-4 lg:border-l lg:border-slate-200 lg:pl-10 dark:lg:border-white/10">
            {latest.length > 0 && (
              <>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">The Latest</h2>
                  <Link
                    href="/news"
                    className="text-[11px] font-black uppercase tracking-wider text-[#0A5FC4] hover:underline dark:text-blue-400"
                  >
                    See all
                  </Link>
                </div>
                <ol className="divide-y divide-slate-100 dark:divide-white/5">
                  {latest.map((article, i) => (
                    <li key={article.id}>
                      <Link href={`/news/${article.slug}`} className="group flex gap-3.5 py-3.5">
                        <span
                          className="num pt-0.5 text-sm font-black leading-none text-[#0A5FC4] dark:text-blue-400"
                          aria-hidden
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <h3 className="line-clamp-3 text-sm font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#0A5FC4] dark:text-slate-200 dark:group-hover:text-blue-300">
                            {article.title}
                          </h3>
                          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            {timeAgo(article.publishedAt || article.updatedAt)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {liveTournament && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#0b1220]">
                <p className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" aria-hidden />
                  Live tournament
                </p>
                <Link
                  href={`/tournaments/${liveTournament.slug}`}
                  className="mt-3 block text-lg font-black leading-snug tracking-tight text-slate-950 transition-colors hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-300"
                >
                  <TournamentShortName
                    name={liveTournament.name}
                    shortName={liveTournament.shortName}
                    series={liveTournament.series}
                    season={liveTournament.season}
                  />
                </Link>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{liveTournament.stageName}</p>
                <Link
                  href={`/tournaments/${liveTournament.slug}/standings`}
                  className="mt-3.5 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-[#0A5FC4] hover:underline dark:text-blue-400"
                >
                  Follow standings →
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
