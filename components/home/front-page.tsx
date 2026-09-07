import Link from 'next/link';
import { getCategoryMeta, timeAgo } from '@/lib/news';
import type { ArticleCardData } from '@/lib/news-queries';
import { CoverImage } from '@/components/news/cover-image';

export interface LiveTournamentTeaser {
  name: string;
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
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ed-hair)] pb-3">
        <p className="ed-label">{dateline}</p>
        <p className="ed-label text-[var(--ed-blue)]">The Front Page · eSportsAmaze</p>
      </div>

      {noStories ? (
        <div className="mt-6 rounded-xl border border-dashed border-[var(--ed-hair)] p-8 text-center text-xs text-[var(--ed-stone)]">
          No stories published yet. Check back soon for esports coverage!
        </div>
      ) : (
        <div className="mt-7 grid gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Lead + secondaries */}
          <div className="min-w-0 lg:col-span-8">
            {lead && (
              <article>
                <Link href={`/news/${lead.slug}`} className="group block">
                  <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-[var(--ed-hair)] bg-[var(--ed-sand)]">
                    <CoverImage
                      src={lead.coverImage}
                      alt={lead.title}
                      sizes="(min-width: 1200px) 780px, 100vw"
                      priority
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="mt-5 max-w-3xl">
                    <p className="kicker text-[var(--ed-blue)]">
                      {getCategoryMeta(lead.category).label} · {timeAgo(lead.publishedAt || lead.updatedAt)} ·{' '}
                      {lead.readTimeMinutes} min read
                    </p>
                    <h2 className="mt-2 text-3xl font-extrabold leading-[1.12] tracking-tight transition-colors group-hover:text-[var(--ed-blue)] sm:text-4xl">
                      {lead.title}
                    </h2>
                    {lead.excerpt && (
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[var(--ed-stone)] sm:text-[15px]">
                        {lead.excerpt}
                      </p>
                    )}
                    <p className="mt-3 text-xs font-semibold text-[var(--ed-stone)]">
                      By <span className="text-[var(--ed-ink)]">{lead.authorName}</span>
                    </p>
                  </div>
                </Link>
              </article>
            )}

            {secondary.length > 0 && (
              <div className="mt-8 grid gap-7 border-t border-[var(--ed-hair)] pt-8 sm:grid-cols-2">
                {secondary.map((article) => (
                  <article key={article.id}>
                    <Link href={`/news/${article.slug}`} className="group flex h-full flex-col gap-3">
                      <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-[var(--ed-hair)] bg-[var(--ed-sand)]">
                        <CoverImage
                          src={article.coverImage}
                          alt={article.title}
                          sizes="(min-width: 1200px) 380px, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                      </div>
                      <p className="kicker">
                        {getCategoryMeta(article.category).label.split(' ')[0]} ·{' '}
                        {timeAgo(article.publishedAt || article.updatedAt)}
                      </p>
                      <h3 className="text-xl font-extrabold leading-snug tracking-tight transition-colors group-hover:text-[var(--ed-blue)]">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="line-clamp-2 text-xs leading-relaxed text-[var(--ed-stone)]">
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
          <aside className="min-w-0 lg:col-span-4 lg:border-l lg:border-[var(--ed-hair)] lg:pl-10">
            {latest.length > 0 && (
              <>
                <div className="flex items-center justify-between border-b border-[var(--ed-hair)] pb-3">
                  <h2 className="ed-label text-[var(--ed-ink)]">The Latest</h2>
                  <Link
                    href="/news"
                    className="text-[11px] font-bold uppercase tracking-wider text-[var(--ed-blue)] hover:underline"
                  >
                    See all
                  </Link>
                </div>
                <ol className="divide-y divide-[var(--ed-hair)]">
                  {latest.map((article, i) => (
                    <li key={article.id}>
                      <Link href={`/news/${article.slug}`} className="group flex gap-3.5 py-3.5">
                        <span
                          className="num pt-0.5 text-sm font-extrabold leading-none text-[var(--ed-magenta)]"
                          aria-hidden
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <h3 className="line-clamp-3 text-sm font-bold leading-snug transition-colors group-hover:text-[var(--ed-blue)]">
                            {article.title}
                          </h3>
                          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ed-stone)]">
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
              <div className="mt-2 ed-card p-4 sm:p-5">
                <p className="ed-label flex items-center gap-2">
                  <span className="animate-live inline-block h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden />
                  Live tournament
                </p>
                <Link
                  href={`/tournaments/${liveTournament.slug}`}
                  className="mt-2.5 block text-lg font-extrabold leading-snug tracking-tight transition-colors hover:text-[var(--ed-blue)]"
                >
                  {liveTournament.name}
                </Link>
                <p className="mt-1 text-xs font-medium text-[var(--ed-stone)]">{liveTournament.stageName}</p>
                <Link
                  href={`/tournaments/${liveTournament.slug}?tab=standings`}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--ed-blue)] hover:underline"
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
