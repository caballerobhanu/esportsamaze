import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Merge, Pencil, Tags, Trash2 } from 'lucide-react';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { renameTag, mergeTag, deleteTag } from './actions';
import { ConfirmSubmitButton } from '@/components/admin/media-actions';

export const dynamic = 'force-dynamic';

interface TagStat {
  tag: string;
  count: number;
}

async function getTagStats(): Promise<TagStat[]> {
  const articles = await prisma.article.findMany({
    where: { deletedAt: null },
    select: { tags: true },
  });
  const counts = new Map<string, number>();
  for (const a of articles) {
    for (const t of a.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }));
}

export default async function AdminTagsPage({
  searchParams,
}: {
  searchParams: Promise<{ renamed?: string; merged?: string; deleted?: string; error?: string }>;
}) {
  if (!(await isAdmin())) redirect('/admin/login');
  const { renamed, merged, deleted, error } = await searchParams;

  const tags = await getTagStats();
  const tagNames = tags.map((t) => t.tag);

  const inputCls =
    'rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-900 focus:border-(--ed-blue) focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5 dark:border-white/10">
        <h1 className="flex items-center gap-2.5 text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
          <Tags className="h-6 w-6 text-(--ed-blue)" />
          Tag Manager
        </h1>
        <p className="mt-1 text-xs font-semibold text-slate-400">
          {tags.length} tags across all stories — rename, merge duplicates, or remove tags everywhere at once.
        </p>
      </div>

      {(renamed === '1' || merged === '1' || deleted === '1') && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          {renamed === '1' && 'Tag renamed.'}
          {merged === '1' && 'Tags merged.'}
          {deleted === '1' && 'Tag removed from all articles.'}
        </div>
      )}
      {error === 'exists' && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs font-bold text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" /> That tag name is already in use — merge instead of renaming.
        </div>
      )}
      {error === 'invalid' && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs font-bold text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" /> Please provide a valid (different) tag name.
        </div>
      )}

      {tags.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-white/10 dark:bg-[#0b1220]">
          <Tags className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-3 text-sm font-black uppercase tracking-wide text-slate-500">No tags yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
            Tags are added from the article editor&apos;s taxonomy panel.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {tags.map(({ tag, count }) => (
              <div key={tag} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="ed-chip px-2.5 py-1 text-[11px]">#{tag}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
                    {count} article{count === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Rename */}
                  <form action={renameTag} className="flex items-center gap-1.5">
                    <input type="hidden" name="from" value={tag} />
                    <input type="text" name="to" placeholder="New name…" className={inputCls + ' w-32'} />
                    <button
                      type="submit"
                      title={`Rename #${tag}`}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
                    >
                      <Pencil className="h-3 w-3" /> Rename
                    </button>
                  </form>

                  {/* Merge */}
                  <form action={mergeTag} className="flex items-center gap-1.5">
                    <input type="hidden" name="from" value={tag} />
                    <select name="to" defaultValue="" className={inputCls + ' w-36'} title={`Merge #${tag} into another tag`}>
                      <option value="" disabled>
                        Merge into…
                      </option>
                      {tagNames
                        .filter((t) => t !== tag)
                        .map((t) => (
                          <option key={t} value={t}>
                            #{t}
                          </option>
                        ))}
                    </select>
                    <button
                      type="submit"
                      title={`Merge #${tag} into the selected tag`}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
                    >
                      <Merge className="h-3 w-3" /> Merge
                    </button>
                  </form>

                  {/* Delete */}
                  <form action={deleteTag} className="inline">
                    <input type="hidden" name="from" value={tag} />
                    <ConfirmSubmitButton
                      message={`Remove #${tag} from ${count} article${count === 1 ? '' : 's'}?`}
                      title={`Delete #${tag} everywhere`}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-600 hover:bg-rose-100 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link href="/admin/news" className="inline-block text-xs font-bold text-(--ed-blue) hover:underline">
        ← Back to News Studio
      </Link>
    </div>
  );
}
