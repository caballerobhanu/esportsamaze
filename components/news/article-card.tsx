import Link from 'next/link';
import { Calendar, ChevronRight, Newspaper, Shield, Trophy } from 'lucide-react';
import type { ArticleCardData } from '@/lib/news-queries';
import { formatArticleDateShort } from '@/lib/news';

/** Card used by tag/author/category archives. */
export function ArticleCard({ article }: { article: ArticleCardData }) {
  return (
    <article className="ed-card group flex flex-col justify-between transition-colors hover:border-[var(--ed-blue)]">
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
  );
}

/** Empty-archive panel shared by tag/author pages. */
export function ArchiveEmptyState({ heading, message }: { heading: string; message: string }) {
  return (
    <div className="ed-card p-12 text-center">
      <Newspaper className="mx-auto h-12 w-12 text-[var(--ed-hair)]" />
      <h2 className="font-display mt-4 text-base font-extrabold uppercase tracking-wide">{heading}</h2>
      <p className="mx-auto mt-1 max-w-sm text-xs text-[var(--ed-stone)]">{message}</p>
      <Link href="/news" className="ed-btn mt-5 px-4 py-2 text-xs">
        Browse all news
      </Link>
    </div>
  );
}
