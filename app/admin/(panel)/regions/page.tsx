import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Globe2, Plus, Trash2 } from 'lucide-react';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr, uniqueSlug } from '@/lib/admin-forms';

export const dynamic = 'force-dynamic';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

async function saveRegion(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  const name = fStr(formData, 'name').trim();
  if (!name) redirect('/admin/regions?error=name');

  const position = Math.max(0, Math.trunc(Number(fStr(formData, 'position')) || 0));

  const slug = await uniqueSlug(fStr(formData, 'slug') || name, async (candidate) => {
    const clash = await prisma.region.findFirst({
      where: { slug: candidate, ...(id ? { NOT: { id } } : {}) },
      select: { id: true },
    });
    return Boolean(clash);
  });

  if (id) {
    await prisma.region.update({ where: { id }, data: { name, slug, position } });
  } else {
    await prisma.region.create({ data: { name, slug, position } });
  }

  revalidatePath('/admin/regions');
  revalidatePath('/admin/tournaments');
  redirect('/admin/regions?saved=1');
}

async function deleteRegion(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (id) {
    await prisma.region.delete({ where: { id } }).catch(() => undefined);
  }
  revalidatePath('/admin/regions');
  revalidatePath('/admin/tournaments');
  redirect('/admin/regions');
}

export default async function AdminRegionsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; saved?: string; error?: string }>;
}) {
  if (!(await isAdmin())) redirect('/admin/login');
  const { edit, saved, error } = await searchParams;

  const regions = await prisma.region.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  });
  const editing = edit ? (regions.find((region) => region.id === edit) ?? null) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            <Globe2 className="h-6 w-6 text-(--ed-blue)" />
            Regions
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            The regional groupings a publisher uses — EMEA, SEA, CSA, or India on its own. A
            tournament place can name one of these instead of a country, and typing a new name while
            editing a tournament adds it here.
          </p>
        </div>
        {editing && (
          <Link
            href="/admin/regions"
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            + New region instead
          </Link>
        )}
      </div>

      {error === 'name' && (
        <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          A region name is required.
        </p>
      )}
      {saved === '1' && (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          Region saved.
        </p>
      )}

      {/* Form */}
      <details open={Boolean(editing)}>
        <summary className="inline-flex cursor-pointer select-none items-center gap-2 rounded-lg bg-(--ed-blue) px-3 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:brightness-110">
          <Plus className="h-3.5 w-3.5" />
          {editing ? `Editing: ${editing.name}` : 'Add New Region'}
        </summary>

        <form
          action={saveRegion}
          className="mt-3 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b101c]"
        >
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Name *</label>
              <input name="name" required defaultValue={editing?.name ?? ''} className={inputCls} placeholder="e.g. EMEA" />
            </div>
            <div>
              <label className={labelCls}>Order</label>
              <input
                name="position"
                type="number"
                min={0}
                defaultValue={editing?.position ?? 0}
                className={inputCls}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelCls}>Slug</label>
              <input name="slug" defaultValue={editing?.slug ?? ''} placeholder="auto" className={inputCls} />
            </div>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-(--ed-blue) px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:brightness-110"
          >
            {editing ? 'Update Region' : 'Create Region'}
          </button>
        </form>
      </details>

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b101c]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800/80 dark:bg-[#080d17]">
              <th className="px-3 py-2.5 text-left">Region</th>
              <th className="px-3 py-2.5 text-left">Slug</th>
              <th className="px-3 py-2.5 text-center">Order</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {regions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-xs font-semibold text-slate-400">
                  No regions yet. Add EMEA, SEA, CSA — whatever your events group by.
                </td>
              </tr>
            )}
            {regions.map((region) => (
              <tr key={region.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-[#121929]">
                <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white">{region.name}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {region.slug}
                </td>
                <td className="px-3 py-2.5 text-center font-mono text-xs text-slate-500">{region.position}</td>
                <td className="px-3 py-2.5 text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <Link
                      href={`/admin/regions?edit=${region.id}`}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:text-(--ed-blue)"
                      title="Edit"
                    >
                      Edit
                    </Link>
                    <form action={deleteRegion} className="inline">
                      <input type="hidden" name="id" value={region.id} />
                      <button
                        type="submit"
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:text-rose-600"
                        title="Delete region"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
