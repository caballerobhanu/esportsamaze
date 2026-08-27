import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Pencil, Trash2, Plus, Building2 } from 'lucide-react';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr, fOpt, uniqueSlug } from '@/lib/admin-forms';
import { saveUploadedFile } from '@/lib/upload';

export const dynamic = 'force-dynamic';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5FC4]';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

async function saveOrganizer(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  const name = fStr(formData, 'name');
  if (!name) redirect('/admin/organizers?error=name');

  const slug = await uniqueSlug(fStr(formData, 'slug') || name, async (s) => {
    const clash = await prisma.organizer.findFirst({
      where: { slug: s, ...(id ? { NOT: { id } } : {}) },
      select: { id: true },
    });
    return Boolean(clash);
  });

  const logoUpload = await saveUploadedFile(formData.get('logoFile'), 'organizer-logo');

  const data = {
    name,
    slug,
    website: fOpt(formData, 'website'),
    type: fStr(formData, 'type') || 'PRIMARY',
  };

  if (id) {
    const existing = await prisma.organizer.findUnique({
      where: { id },
      select: { logoUrl: true },
    });
    await prisma.organizer.update({
      where: { id },
      data: {
        ...data,
        logoUrl: logoUpload ?? fOpt(formData, 'logoUrl') ?? existing?.logoUrl ?? null,
      },
    });
  } else {
    await prisma.organizer.create({
      data: {
        ...data,
        logoUrl: logoUpload ?? fOpt(formData, 'logoUrl'),
      },
    });
  }

  revalidatePath('/admin/organizers');
  redirect('/admin/organizers');
}

async function deleteOrganizer(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (id) {
    await prisma.tournamentOrganizer.deleteMany({ where: { organizerId: id } });
    await prisma.organizer.delete({ where: { id } }).catch(() => null);
  }
  revalidatePath('/admin/organizers');
  redirect('/admin/organizers');
}

export default async function AdminOrganizersPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const { edit, error } = await searchParams;

  const organizers = await prisma.organizer.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { tournaments: true } } },
  });

  const editing = edit ? await prisma.organizer.findUnique({ where: { id: edit } }) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0A5FC4]" /> Organizers
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage tournament organizers &amp; broadcasters for database filters.
          </p>
        </div>
        {editing && (
          <Link
            href="/admin/organizers"
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            + New organizer instead
          </Link>
        )}
      </div>

      {error === 'name' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          Organizer name is required.
        </p>
      )}

      {/* Form */}
      <details open={Boolean(editing)}>
        <summary className="cursor-pointer select-none inline-flex items-center gap-2 rounded-lg bg-[#0A5FC4] hover:bg-[#0850a3] text-white text-xs font-bold uppercase tracking-wider px-3 py-2 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          {editing ? `Editing: ${editing.name}` : 'Add New Organizer'}
        </summary>

        <form
          action={saveOrganizer}
          className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm p-5 space-y-4"
        >
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Name *</label>
              <input name="name" required defaultValue={editing?.name ?? ''} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Slug</label>
              <input name="slug" defaultValue={editing?.slug ?? ''} placeholder="auto" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select name="type" defaultValue={editing?.type ?? 'PRIMARY'} className={inputCls}>
                <option value="PRIMARY">PRIMARY</option>
                <option value="CO_ORGANIZER">CO_ORGANIZER</option>
                <option value="BROADCASTER">BROADCASTER</option>
                <option value="COMMUNITY">COMMUNITY</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input name="website" defaultValue={editing?.website ?? ''} placeholder="https://…" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Logo URL</label>
              <input name="logoUrl" defaultValue={editing?.logoUrl ?? ''} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>…or Upload Logo</label>
              <input
                type="file"
                name="logoFile"
                accept="image/*"
                className="w-full text-xs text-slate-500 file:mr-2 file:px-2.5 file:py-1.5 file:rounded-md file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:text-xs file:font-bold file:cursor-pointer"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#0A5FC4] hover:bg-[#0850a3] text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            {editing ? 'Update Organizer' : 'Create Organizer'}
          </button>
        </form>
      </details>

      {/* List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[540px]">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17]">
              <th className="py-2.5 px-3 text-left">Organizer</th>
              <th className="py-2.5 px-3 text-left">Type</th>
              <th className="py-2.5 px-3 text-center">Tournaments</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {organizers.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors">
                <td className="py-2.5 px-3 font-bold">
                  {o.name}
                  {o.website && (
                    <a
                      href={o.website}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 text-xs font-normal text-blue-500 hover:underline"
                    >
                      ↗
                    </a>
                  )}
                </td>
                <td className="py-2.5 px-3 text-xs text-slate-400">{o.type}</td>
                <td className="py-2.5 px-3 text-center font-mono font-bold">{o._count.tournaments}</td>
                <td className="py-2.5 px-3 text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <Link
                      href={`/admin/organizers?edit=${o.id}`}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#0A5FC4] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <form action={deleteOrganizer}>
                      <input type="hidden" name="id" value={o.id} />
                      <button
                        type="submit"
                        className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </span>
                </td>
              </tr>
            ))}
            {organizers.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                  No organizers found. Add your first organizer above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
