import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Check,
  ExternalLink,
  EyeOff,
  MessagesSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { setCommentStatus, deleteComment } from './actions';
import { ConfirmSubmitButton } from '@/components/admin/media-actions';

export const dynamic = 'force-dynamic';

const PER_PAGE = 20;

const STATUS_TABS = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

function statusBadgeCls(status: string): string {
  switch (status) {
    case 'APPROVED':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'REJECTED':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
    default:
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  }
}

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; updated?: string; deleted?: string }>;
}) {
  if (!(await isAdmin())) redirect('/admin/login');
  const { status: statusParam, page: pageParam, updated, deleted } = await searchParams;
  const status = (STATUS_TABS.find((s) => s === statusParam) ?? 'PENDING') as StatusTab;
  const page = Math.max(1, Number(pageParam) || 1);

  const where = status === 'ALL' ? {} : { status };
  const [comments, total, counts] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { article: { select: { id: true, title: true, slug: true } } },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.comment.count({ where }),
    prisma.comment.groupBy({ by: ['status'], _count: { id: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const count = (s: string) => counts.find((c) => c.status === s)?._count.id ?? 0;

  const tabHref = (s: StatusTab, p = 1) => {
    const qs = new URLSearchParams();
    if (s !== 'PENDING') qs.set('status', s);
    if (p > 1) qs.set('page', String(p));
    const str = qs.toString();
    return `/admin/comments${str ? `?${str}` : ''}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5 dark:border-white/10">
        <h1 className="flex items-center gap-2.5 text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
          <MessagesSquare className="h-6 w-6 text-(--ed-blue)" />
          Comment Moderation
        </h1>
        <p className="mt-1 text-xs font-semibold text-slate-400">
          Approve, reject, or remove reader comments. Approved comments appear on the public article.
        </p>
      </div>

      {(updated === '1' || deleted === '1') && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          {updated === '1' ? 'Comment updated.' : 'Comment deleted.'}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {STATUS_TABS.map((s) => (
          <Link
            key={s}
            href={tabHref(s)}
            className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
              status === s
                ? s === 'PENDING'
                  ? 'bg-amber-500 text-white'
                  : 'bg-(--ed-blue) text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10'
            }`}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
            <span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[9px] dark:bg-black/30">
              {s === 'ALL' ? count('PENDING') + count('APPROVED') + count('REJECTED') : count(s)}
            </span>
          </Link>
        ))}
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
        {comments.length === 0 ? (
          <div className="p-12 text-center">
            <MessagesSquare className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
            <h3 className="mt-3 text-sm font-black uppercase tracking-wide text-slate-500">Queue is clear</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
              {status === 'PENDING'
                ? 'No comments waiting for review.'
                : 'No comments match this filter yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {comments.map((c) => (
              <div key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">{c.authorName}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusBadgeCls(c.status)}`}>
                      {c.status}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                    {c.body}
                  </p>
                  {c.article && (
                    <Link
                      href={`/news/${c.article.slug}`}
                      target="_blank"
                      className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-(--ed-blue) hover:underline"
                    >
                      on “{c.article.title}” <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5 sm:self-center">
                  {c.status !== 'APPROVED' && (
                    <form action={setCommentStatus} className="inline">
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="status" value="APPROVED" />
                      <input type="hidden" name="returnStatus" value={status} />
                      <button
                        type="submit"
                        title="Approve comment"
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  )}
                  {c.status !== 'REJECTED' && (
                    <form action={setCommentStatus} className="inline">
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="status" value="REJECTED" />
                      <input type="hidden" name="returnStatus" value={status} />
                      <button
                        type="submit"
                        title="Reject comment (hidden from public)"
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  )}
                  {c.status !== 'PENDING' && (
                    <form action={setCommentStatus} className="inline">
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="status" value="PENDING" />
                      <input type="hidden" name="returnStatus" value={status} />
                      <button
                        type="submit"
                        title="Back to pending queue"
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  )}
                  <form action={deleteComment} className="inline">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="returnStatus" value={status} />
                    <ConfirmSubmitButton
                      message="Delete this comment permanently?"
                      title="Delete comment"
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400">
            Showing {comments.length} of {total} comments
          </p>
          <div className="flex items-center gap-1.5">
            {page > 1 && (
              <Link
                href={tabHref(status, page - 1)}
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
                href={tabHref(status, page + 1)}
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
