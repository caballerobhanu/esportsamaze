import Link from 'next/link';
import { Star } from 'lucide-react';
import { getCategoryMeta, timeAgo } from '@/lib/news';
import type { ArticleCardData } from '@/lib/news-queries';
import { CoverImage } from '@/components/news/cover-image';
import { SectionHeading } from '@/components/home/section-heading';

/**
 * The premium visual moment: large photographic cards with an overlay
 * headline, three-up on desktop and a swipe rail on small screens.
 */
export function EditorsPicks({ articles }: { articles: ArticleCardData[] }) {
  if (articles.length === 0) return null;

  return (
    <section aria-labelledby="editors-picks-heading" className="space-y-5">
      <SectionHeading
        id="editors-picks-heading"
        kicker="Hand-picked by the desk"
        title="Editor's Picks"
        href="/news"
      />
      <div className="rail -mx-4 px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/news/${article.slug}`}
            className="group relative block aspect-[4/3] w-full min-w-[82%] overflow-hidden rounded-xl border border-[var(--ed-hair)] bg-[var(--ed-sand)] sm:min-w-[58%] lg:aspect-[3/4] lg:min-w-0"
          >
            <CoverImage
              src={article.coverImage}
              alt={article.title}
              sizes="(min-width: 1024px) 380px, 82vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"
              aria-hidden
            />
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
              <Star className="h-2.5 w-2.5 fill-current" aria-hidden />
              Pick
            </span>
            <div className="absolute inset-x-0 bottom-0 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                {getCategoryMeta(article.category).label}
              </p>
              <h3 className="mt-1.5 text-lg font-extrabold leading-snug text-white sm:text-xl">
                {article.title}
              </h3>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                {timeAgo(article.publishedAt || article.updatedAt)} · {article.readTimeMinutes} min read
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
