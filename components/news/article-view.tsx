import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronLeft,
  Clock,
  Eye,
  MessageSquare,
  Shield,
  Sparkles,
  Tags,
  User,
} from 'lucide-react';
import type { ArticleCardSelectData } from '@/lib/news-queries';
import { formatArticleDate, formatArticleDateShort, getCategoryMeta, isHtmlContent } from '@/lib/news';
import { slugify } from '@/lib/utils';
import { NewsShareButtons } from '@/components/news/news-share-buttons';
import { ReadingProgress } from '@/components/news/reading-progress';
import { TableOfContents } from '@/components/news/table-of-contents';
import { ViewPinger } from '@/components/news/view-pinger';
import { CommentsSection, type PublicComment } from '@/components/news/comments-section';
import { ArticleReactions } from '@/components/news/article-reactions';
import { BookmarkButton } from '@/components/news/bookmark-button';
import { serializeJsonLd } from '@/lib/seo';

/* Shape of the article with its tournament/team dossier relations attached. */
export interface ArticleViewData {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  category: string;
  tags: string[];
  authorName: string;
  authorRole: string | null;
  readTimeMinutes: number;
  publishedAt: Date;
  views: number;
  tournament: {
    name: string;
    slug: string;
    tier: string;
    series: string | null;
    prizePool: number | null;
    startDate: Date | null;
    endDate: Date | null;
  } | null;
  team: {
    name: string;
    tag: string | null;
    slug: string | null;
    logoUrl: string | null;
    region: string | null;
    players: Array<{ ign: string; role: string | null }>;
  } | null;
}

interface ArticleViewProps {
  article: ArticleViewData;
  relatedArticles: ArticleCardSelectData[];
  adjacent: { prev: { slug: string; title: string } | null; next: { slug: string; title: string } | null };
  /** Admin-only preview mode: skips view ping/JSON-LD and shows a banner. */
  isPreview?: boolean;
  mostRead?: ArticleCardSelectData[];
  jsonLd?: Record<string, unknown>;
  breadcrumbs?: Record<string, unknown>;
  comments?: PublicComment[];
  commentCount?: number;
}

/**
 * Legacy fallback for pre-WYSIWYG articles (markdown subset). New articles store
 * HTML directly from the Tiptap editor and skip this path entirely.
 */
function renderLegacyMarkdown(content: string): string {
  let html = content
    .replace(/\r\n/g, '\n')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  html = html.replace(/^&gt; /gm, '> ');

  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');

  const blocks = html.split(/\n\n+/);
  return blocks
    .map((b) => {
      const trimmed = b.trim();
      if (!trimmed) return '';
      if (/^<(h2|h3|blockquote)/.test(trimmed)) return trimmed;
      if (/^<li/.test(trimmed)) return `<ul>${trimmed}</ul>`;
      return `<p>${trimmed}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

/** The full reading view of an article, shared by the public page and the admin draft preview. */
export function ArticleView({
  article,
  relatedArticles,
  adjacent,
  isPreview = false,
  mostRead,
  jsonLd,
  breadcrumbs,
  comments,
  commentCount,
}: ArticleViewProps) {
  const categoryMeta = getCategoryMeta(article.category);
  const isHtml = isHtmlContent(article.content);

  return (
    <div className="min-h-screen bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors">
      {!isPreview && jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      )}
      {!isPreview && breadcrumbs && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs) }} />
      )}
      {!isPreview && <ReadingProgress />}
      {!isPreview && <ViewPinger slug={article.slug} />}

      {isPreview && (
        <div className="border-b border-amber-500/30 bg-amber-500/15 px-4 py-2.5 text-center text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
          Preview — this article is not publicly visible yet
        </div>
      )}

      {/* Breadcrumb bar */}
      <div className="border-b border-[var(--ed-hair)] bg-[var(--ed-surface)]">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <nav className="ed-label flex min-w-0 items-center gap-2">
            <Link href="/" className="shrink-0 hover:text-[var(--ed-blue)]">Home</Link>
            <span>/</span>
            <Link href="/news" className="shrink-0 hover:text-[var(--ed-blue)]">News</Link>
            <span>/</span>
            <Link
              href={`/news/category/${article.category.toLowerCase()}`}
              className="truncate text-[var(--ed-blue)] hover:underline"
            >
              {categoryMeta.label}
            </Link>
          </nav>

          <Link
            href="/news"
            className="ed-label inline-flex shrink-0 items-center gap-1 hover:text-[var(--ed-blue)]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to News
          </Link>
        </div>
      </div>

      {/* Article layout: content + right rail (TOC) */}
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-10 px-4 py-8 sm:px-6 sm:py-12 xl:grid-cols-[minmax(0,1fr)_260px]">
        <article className="mx-auto w-full max-w-4xl xl:mx-0">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/news/category/${article.category.toLowerCase()}`}
              className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${categoryMeta.color}`}
            >
              {categoryMeta.label}
            </Link>
            <span className="ed-label flex items-center gap-1 text-[11px]">
              <Calendar className="h-3.5 w-3.5" />
              {formatArticleDate(article.publishedAt)}
            </span>
            <span className="ed-label flex items-center gap-1 text-[11px]">
              <Clock className="h-3.5 w-3.5" />
              {article.readTimeMinutes} min read
            </span>
            <span className="ed-label flex items-center gap-1 text-[11px]">
              <Eye className="h-3.5 w-3.5" />
              {article.views.toLocaleString('en-IN')} views
            </span>
            {(commentCount ?? 0) > 0 && (
              <span className="ed-label flex items-center gap-1 text-[11px]">
                <MessageSquare className="h-3.5 w-3.5" />
                {commentCount} comment{(commentCount ?? 0) === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <h1 className="font-display mt-4 text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl sm:leading-tight lg:text-[2.75rem]">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="mt-4 border-l-2 border-[var(--ed-blue)] pl-4 text-base font-medium leading-relaxed text-[var(--ed-stone)] sm:text-lg">
              {article.excerpt}
            </p>
          )}

          {/* Author + share */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-[var(--ed-hair)] py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ed-sand)] text-sm font-extrabold text-[var(--ed-ink)]">
                {article.authorName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <Link
                  href={`/news/author/${slugify(article.authorName)}`}
                  className="flex items-center gap-1.5 text-xs font-extrabold hover:text-[var(--ed-blue)]"
                  title={`All stories by ${article.authorName}`}
                >
                  <User className="h-3 w-3 text-[var(--ed-stone)]" />
                  {article.authorName}
                </Link>
                <div className="ed-label text-[11px]">{article.authorRole || 'Editorial Contributor'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NewsShareButtons title={article.title} slug={article.slug} />
              <BookmarkButton slug={article.slug} title={article.title} />
            </div>
          </div>

          {/* Cover */}
          {article.coverImage && (
            <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--ed-hair)] bg-[#0f1216]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.coverImage}
                alt={article.title}
                className="max-h-[500px] w-full object-cover"
              />
            </div>
          )}

          {/* Body */}
          <div
            className={`mt-8 sm:mt-10 ${isHtml ? 'article-body' : 'article-legacy'}`}
            dangerouslySetInnerHTML={{
              __html: isHtml ? article.content : renderLegacyMarkdown(article.content),
            }}
          />

          {/* Reactions (live articles only — the API 404s for drafts) */}
          {!isPreview && <ArticleReactions slug={article.slug} />}

          {/* Contextual dossier widgets */}
          {(article.tournament || article.team) && (
            <div className="ed-card mt-12 space-y-4 p-6">
              <div className="ed-label flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--ed-blue)]" />
                Event & Competitor Dossier
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {article.tournament && (
                  <div className="flex flex-col justify-between rounded-xl border border-[var(--ed-hair)] bg-[var(--ed-sand)]/50 p-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="ed-chip px-2 py-0.5 text-[9px] font-extrabold uppercase">
                          {article.tournament.tier} Event
                        </span>
                        {article.tournament.prizePool && (
                          <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                            ₹{article.tournament.prizePool.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      <h4 className="mt-2 text-sm font-extrabold">{article.tournament.name}</h4>
                    </div>
                    <Link
                      href={`/tournaments/${article.tournament.slug}`}
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[var(--ed-blue)] hover:underline"
                    >
                      View Standings & Matches <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}

                {article.team && (
                  <div className="flex flex-col justify-between rounded-xl border border-[var(--ed-hair)] bg-[var(--ed-sand)]/50 p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        {article.team.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={article.team.logoUrl}
                            alt={article.team.name}
                            className="h-6 w-6 rounded object-contain"
                          />
                        ) : (
                          <Shield className="h-5 w-5 text-[var(--ed-stone)]" />
                        )}
                        <div>
                          <h4 className="text-sm font-extrabold">{article.team.name}</h4>
                          {article.team.region && (
                            <span className="ed-label text-[10px]">{article.team.region}</span>
                          )}
                        </div>
                      </div>

                      {article.team.players.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {article.team.players.map((p) => (
                            <span key={p.ign} className="ed-chip px-1.5 py-0.5 text-[10px]">
                              {p.ign}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {article.team.slug && (
                      <Link
                        href={`/teams/${article.team.slug}`}
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        View Squad Profile <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-1.5 border-t border-[var(--ed-hair)] pt-6">
              <span className="ed-label mr-1 flex items-center gap-1.5">
                <Tags className="h-3.5 w-3.5" />
                Tags:
              </span>
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/news/tag/${encodeURIComponent(tag)}`}
                  className="ed-chip hover:border-[var(--ed-blue)] hover:text-[var(--ed-blue)]"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Prev / Next navigation */}
          {(adjacent.prev || adjacent.next) && (
            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {adjacent.prev ? (
                <Link
                  href={`/news/${adjacent.prev.slug}`}
                  className="ed-card group p-4 transition-colors hover:border-[var(--ed-blue)]"
                >
                  <span className="ed-label flex items-center gap-1 text-[10px]">
                    <ArrowLeft className="h-3 w-3" /> Older story
                  </span>
                  <span className="mt-1.5 block text-sm font-bold group-hover:text-[var(--ed-blue)]">
                    {adjacent.prev.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {adjacent.next ? (
                <Link
                  href={`/news/${adjacent.next.slug}`}
                  className="ed-card group p-4 text-right transition-colors hover:border-[var(--ed-blue)]"
                >
                  <span className="ed-label flex items-center justify-end gap-1 text-[10px]">
                    Newer story <ArrowRight className="h-3 w-3" />
                  </span>
                  <span className="mt-1.5 block text-sm font-bold group-hover:text-[var(--ed-blue)]">
                    {adjacent.next.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}

          {/* Related stories */}
          {relatedArticles.length > 0 && (
            <div className="mt-14 border-t border-[var(--ed-hair)] pt-10">
              <h3 className="font-display mb-6 text-xl font-extrabold tracking-tight">
                More Stories You Might Like
              </h3>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {relatedArticles.map((rel) => {
                  const relCat = getCategoryMeta(rel.category);
                  return (
                    <Link
                      key={rel.id}
                      href={`/news/${rel.slug}`}
                      className="ed-card group flex flex-col justify-between p-4 transition-colors hover:border-[var(--ed-blue)]"
                    >
                      <div>
                        {rel.coverImage && (
                          <div className="mb-3 aspect-video w-full overflow-hidden rounded-lg bg-[#0f1216]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={rel.coverImage}
                              alt={rel.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        )}
                        <span className={`rounded px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${relCat.color}`}>
                          {relCat.label.split(' ')[0]}
                        </span>
                        <h4 className="font-display mt-2 line-clamp-2 text-sm font-extrabold transition-colors group-hover:text-[var(--ed-blue)]">
                          {rel.title}
                        </h4>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-[var(--ed-hair)] pt-3 text-[11px] font-bold text-[var(--ed-stone)]">
                        <span>{formatArticleDateShort(rel.publishedAt)}</span>
                        <span>{rel.readTimeMinutes}m read</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Discussion */}
          <CommentsSection
            slug={article.slug}
            initialComments={comments ?? []}
            approvedCount={commentCount ?? comments?.length ?? 0}
          />
        </article>

        {/* Right rail: TOC + Most Read (xl+) */}
        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-4">
            <TableOfContents containerSelector={isHtml ? '.article-body' : '.article-legacy'} />
            {mostRead && mostRead.length > 0 && (
              <div className="ed-card p-4">
                <div className="ed-label mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--ed-blue)]" />
                  Most read this month
                </div>
                <ol className="space-y-2.5">
                  {mostRead.map((a, i) => (
                    <li key={a.id}>
                      <Link href={`/news/${a.slug}`} className="group flex items-start gap-2.5">
                        <span className="font-display text-base font-black leading-none text-[var(--ed-hair)] transition-colors group-hover:text-[var(--ed-blue)]">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="line-clamp-2 text-xs font-bold leading-snug transition-colors group-hover:text-[var(--ed-blue)]">
                          {a.title}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <Link href="/news" className="ed-chip w-full justify-center px-3 py-2 hover:border-[var(--ed-blue)]">
              <ChevronLeft className="h-3.5 w-3.5" />
              All news
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
