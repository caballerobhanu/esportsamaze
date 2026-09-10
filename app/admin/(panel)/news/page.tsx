import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Pencil,
  Trash2,
  Plus,
  Newspaper,
  Star,
  ExternalLink,
  Eye,
  Clock,
  Search,
  FileEdit,
  CalendarClock,
  Send,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Trash,
  Copy,
} from 'lucide-react';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { isAdmin } from '@/lib/admin-auth';
import { syncScheduledArticles } from '@/lib/news-queries';
import { ARTICLE_CATEGORIES, ARTICLE_STATUSES } from '@/lib/news';
import {
  toggleFeaturedById,
  trashArticleById,
  restoreArticleById,
  purgeArticleById,
  bulkArticleAction,
  duplicateArticleById,
} from './actions';
import { BulkSelectAll } from '@/components/admin/bulk-select-all';
import { ActionIconButton } from '@/components/admin/action-icon-button';

export const dynamic = 'force-dynamic';

const PER_PAGE = 12;

const SORTS: Array<{ value: string; label: string; orderBy: Prisma.ArticleOrderByWithRelationInput[] }> = [
  { value: 'newest', label: 'Newest', orderBy: [{ publishedAt: 'desc' }] },
  { value: 'oldest', label: 'Oldest', orderBy: [{ publishedAt: 'asc' }] },
  { value: 'views', label: 'Most viewed', orderBy: [{ views: 'desc' }] },
  { value: 'title', label: 'Title A–Z', orderBy: [{ title: 'asc' }] },
];

function statusBadgeCls(status: string): string {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'SCHEDULED':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    case 'PENDING_REVIEW':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    case 'PRIVATE':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
    default:
      return 'bg-slate-500/10 text-slate-500 dark:text-slate-400';
  }
}

export default async function AdminNewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    category?: string;
    page?: string;
    sort?: string;
    trashed?: string;
    restoredArticle?: string;
    purged?: string;
    bulk?: string;
    duplicated?: string;
  }>;
}) {
  if (!(await isAdmin())) redirect('/admin/login');

  const {
    q: searchQ,
    status: filterStatus,
    category: filterCat,
    page: pageParam,
    sort: sortParam,
    trashed,
    restoredArticle,
    purged,
    bulk,
    duplicated,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const isTrashView = filterStatus === 'TRASHED';
  const sort = SORTS.find((s) => s.value === sortParam) ?? SORTS[0];

  // Flip scheduled articles whose publish time has passed (status hygiene).
  await syncScheduledArticles();

  const where = {
    ...(isTrashView ? { deletedAt: { not: null } } : { deletedAt: null }),
    ...(!isTrashView &&
    filterStatus &&
    ARTICLE_STATUSES.includes(filterStatus as (typeof ARTICLE_STATUSES)[number])
      ? { status: filterStatus }
      : {}),
    ...(filterCat && filterCat !== 'ALL' ? { category: filterCat } : {}),
    ...(searchQ
      ? {
          OR: [
            { title: { contains: searchQ, mode: 'insensitive' as const } },
            { authorName: { contains: searchQ, mode: 'insensitive' as const } },
            { excerpt: { contains: searchQ, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [articles, total, stats, trashCount] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: sort.orderBy,
      include: {
        tournament: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.article.count({ where }),
    prisma.article.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
      _sum: { views: true },
    }),
    prisma.article.count({ where: { deletedAt: { not: null } } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const stat = (s: string) => stats.find((r) => r.status === s)?._count.id ?? 0;
  const totalViews = stats.reduce((acc, r) => acc + (r._sum.views ?? 0), 0);

  const buildPageHref = (p: number) => {
    const sp = new URLSearchParams();
    if (searchQ) sp.set('q', searchQ);
    if (filterStatus) sp.set('status', filterStatus);
    if (filterCat) sp.set('category', filterCat);
    if (sort.value !== 'newest') sp.set('sort', sort.value);
    if (p > 1) sp.set('page', String(p));
    const qs = sp.toString();
    return `/admin/news${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-white/10">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            <Newspaper className="h-6 w-6 text-(--ed-blue)" />
            News & Articles Studio
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Write, schedule, and manage editorial stories — with built-in SEO controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/tags"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            Tags
          </Link>
          <Link
            href="/news"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <Eye className="h-3.5 w-3.5" />
            Public Hub
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </Link>
          <Link
            href="/admin/news/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-(--ed-blue) px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:opacity-95"
          >
            <Plus className="h-4 w-4" />
            New Article
          </Link>
        </div>
      </div>

      {(trashed === '1' ||
        restoredArticle === '1' ||
        purged === '1' ||
        bulk === '1' ||
        duplicated === '1') && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          {trashed === '1' && 'Article moved to trash.'}
          {restoredArticle === '1' && 'Article restored from trash.'}
          {purged === '1' && 'Article permanently deleted.'}
          {bulk === '1' && 'Bulk action applied.'}
          {duplicated === '1' && 'Article duplicated into a fresh draft copy.'}
        </div>
      )}

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Published', value: stat('PUBLISHED'), icon: Send, cls: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Scheduled', value: stat('SCHEDULED'), icon: CalendarClock, cls: 'text-amber-600 dark:text-amber-400' },
          { label: 'Drafts', value: stat('DRAFT'), icon: FileEdit, cls: 'text-slate-500' },
          { label: 'Total Views', value: totalViews.toLocaleString('en-IN'), icon: Eye, cls: 'text-(--ed-blue)' },
        ].map(({ label, value, icon: Icon, cls }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0b1220]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5">
              <Icon className={`h-4 w-4 ${cls}`} />
            </div>
            <div>
              <div className="text-lg font-black leading-tight tabular-nums text-slate-900 dark:text-white">{value}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar: search + status + category + sort */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#0b1220]">
        <form method="GET" className="flex min-w-[220px] flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={searchQ || ''}
              placeholder="Search by title or author…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-(--ed-blue) focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          {filterStatus && <input type="hidden" name="status" value={filterStatus} />}
          {filterCat && <input type="hidden" name="category" value={filterCat} />}
          <button type="submit" className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20">
            Search
          </button>
        </form>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <Link
            href={`/admin/news${searchQ ? `?q=${searchQ}` : ''}`}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-colors ${
              !filterStatus
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400'
            }`}
          >
            All
          </Link>
          {ARTICLE_STATUSES.map((s) => (
            <Link
              key={s}
              href={`/admin/news?status=${s}${searchQ ? `&q=${searchQ}` : ''}${filterCat ? `&category=${filterCat}` : ''}`}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-colors ${
                filterStatus === s
                  ? 'bg-(--ed-blue) text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400'
              }`}
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </Link>
          ))}
          <Link
            href={`/admin/news?status=TRASHED${searchQ ? `&q=${searchQ}` : ''}`}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-colors ${
              isTrashView
                ? 'bg-rose-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400'
            }`}
          >
            Trash {trashCount > 0 && <span className="ml-0.5">({trashCount})</span>}
          </Link>
          <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-white/10" />
          {!isTrashView &&
            ARTICLE_CATEGORIES.map((c) => (
              <Link
                key={c.value}
                href={`/admin/news?category=${c.value}${searchQ ? `&q=${searchQ}` : ''}${filterStatus ? `&status=${filterStatus}` : ''}`}
                className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-colors ${
                  filterCat === c.value
                    ? 'bg-(--ed-blue) text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400'
                }`}
              >
                {c.label.split(' ')[0]}
              </Link>
            ))}
          <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-white/10" />
          {SORTS.map((s) => (
            <Link
              key={s.value}
              href={`/admin/news?sort=${s.value}${searchQ ? `&q=${searchQ}` : ''}${filterStatus ? `&status=${filterStatus}` : ''}${filterCat ? `&category=${filterCat}` : ''}`}
              className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-colors ${
                sort.value === s.value
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400'
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Articles list (one wrapping form powers bulk actions; row buttons override via formAction) */}
      <form action={bulkArticleAction}>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          {articles.length === 0 ? (
            <div className="p-12 text-center">
              <Newspaper className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
              <h3 className="mt-3 text-sm font-black uppercase tracking-wide text-slate-500">
                {isTrashView ? 'Trash is empty' : 'No articles found'}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
                {isTrashView
                  ? 'Trashed stories will appear here until they are restored or permanently deleted.'
                  : 'Create your first story or adjust the filters above.'}
              </p>
              {!isTrashView && (
                <Link
                  href="/admin/news/new"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-(--ed-blue) px-4 py-2 text-xs font-black uppercase tracking-wider text-white"
                >
                  <Plus className="h-3.5 w-3.5" /> New Article
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Bulk action bar */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
                <BulkSelectAll />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Select all
                </span>
                {!isTrashView ? (
                  <>
                    <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-white/10" />
                    {[
                      { action: 'PUBLISH', label: 'Publish' },
                      { action: 'UNPUBLISH', label: 'Unpublish' },
                      { action: 'FEATURE', label: 'Feature' },
                      { action: 'TRASH', label: 'Trash' },
                    ].map(({ action, label }) => (
                      <button
                        key={action}
                        type="submit"
                        name="bulkAction"
                        value={action}
                        className="cursor-pointer rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
                      >
                        {label}
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-white/10" />
                    <button
                      type="submit"
                      name="bulkAction"
                      value="DELETE"
                      className="cursor-pointer rounded-lg bg-rose-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-600 transition-colors hover:bg-rose-200 dark:bg-rose-950/40 dark:text-rose-400"
                    >
                      Delete forever
                    </button>
                  </>
                )}
              </div>

              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {articles.map((art) => {
                  const cat = ARTICLE_CATEGORIES.find((c) => c.value === art.category);
                  // eslint-disable-next-line react-hooks/purity -- server component; visibility depends on the current clock per request
                  const publiclyVisible =
                    art.status === 'PUBLISHED' ||
                    (art.status === 'SCHEDULED' && art.publishedAt.getTime() <= Date.now());

                  return (
                    <div
                      key={art.id}
                      className="flex flex-col gap-4 p-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-white/[0.02]"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <input
                          type="checkbox"
                          name="ids"
                          value={art.id}
                          aria-label={`Select ${art.title}`}
                          className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-(--ed-blue) focus:ring-(--ed-blue)"
                        />
                        <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5">
                          {art.coverImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={art.coverImage} alt={art.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                              <Newspaper className="h-5 w-5" />
                            </div>
                          )}
                          {art.featured && (
                            <span
                              className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded bg-amber-400 text-slate-950 shadow-xs"
                              title="Featured Story"
                            >
                              <Star className="h-2.5 w-2.5 fill-current" />
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${cat?.color ?? 'bg-slate-500/10 text-slate-500'}`}>
                              {cat?.label ?? art.category}
                            </span>
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusBadgeCls(art.status)}`}>
                              {art.status}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Clock className="h-2.5 w-2.5" />
                              {art.readTimeMinutes} min
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Eye className="h-2.5 w-2.5" />
                              {art.views.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <h3 className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">{art.title}</h3>

                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-semibold text-slate-400">
                            <span>By {art.authorName}</span>
                            <span>•</span>
                            <span>{new Date(art.publishedAt).toLocaleDateString()}</span>
                            {art.tournament && (
                              <>
                                <span>•</span>
                                <span className="font-bold text-(--ed-blue)">{art.tournament.name}</span>
                              </>
                            )}
                            {art.team && (
                              <>
                                <span>•</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{art.team.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1.5 sm:self-center">
                        {isTrashView ? (
                          <>
                            <ActionIconButton
                              action={restoreArticleById}
                              arg={art.id}
                              title="Restore from trash"
                              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </ActionIconButton>
                            <ActionIconButton
                              action={purgeArticleById}
                              arg={art.id}
                              title="Delete forever"
                              confirmMessage={`Permanently delete “${art.title}”? This cannot be undone.`}
                              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </ActionIconButton>
                          </>
                        ) : (
                          <>
                            <ActionIconButton
                              action={toggleFeaturedById}
                              arg={art.id}
                              title={art.featured ? 'Unfeature story' : 'Mark as featured story'}
                              className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors ${
                                art.featured
                                  ? 'border-amber-300 bg-amber-100 text-amber-600 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400'
                                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-amber-50 hover:text-amber-500 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
                              }`}
                            >
                              <Star className={`h-3.5 w-3.5 ${art.featured ? 'fill-current' : ''}`} />
                            </ActionIconButton>

                            <Link
                              href={publiclyVisible ? `/news/${art.slug}` : `/admin/news/${art.id}/preview`}
                              target="_blank"
                              title={publiclyVisible ? 'Preview Public Page' : 'Admin Preview (not yet public)'}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                            <Link
                              href={`/admin/news/${art.id}`}
                              title="Edit Article"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-(--ed-blue) hover:bg-blue-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                            <ActionIconButton
                              action={duplicateArticleById}
                              arg={art.id}
                              title="Duplicate to Draft"
                              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-(--ed-blue) dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </ActionIconButton>
                            <ActionIconButton
                              action={trashArticleById}
                              arg={art.id}
                              title="Move to Trash"
                              confirmMessage={`Move “${art.title}” to trash? It disappears from the public site until restored.`}
                              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </ActionIconButton>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </form>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400">
            Showing {articles.length} of {total} articles
          </p>
          <div className="flex items-center gap-1.5">
            {page > 1 && (
              <Link
                href={buildPageHref(page - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
            )}
            <span className="px-2 text-xs font-bold text-slate-500">
              Page {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={buildPageHref(page + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
