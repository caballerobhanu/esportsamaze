import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Pencil, Trash2, Plus, Sparkles } from 'lucide-react';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr, fOpt, uniqueSlug } from '@/lib/admin-forms';
import { saveUploadedFile } from '@/lib/upload';

export const dynamic = 'force-dynamic';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5FC4]';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

async function saveSponsor(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  const name = fStr(formData, 'name');
  if (!name) redirect('/admin/sponsors?error=name');

  const slug = await uniqueSlug(fStr(formData, 'slug') || name, async (s) => {
    const clash = await prisma.sponsor.findFirst({
      where: { slug: s, ...(id ? { NOT: { id } } : {}) },
      select: { id: true },
    });
    return Boolean(clash);
  });

  const logoUpload = await saveUploadedFile(formData.get('logoFile'), 'sponsor-logo');

  const data = {
    name,
    slug,
    website: fOpt(formData, 'website'),
    category: fOpt(formData, 'category') || 'ASSOCIATE',
  };

  if (id) {
    const existing = await prisma.sponsor.findUnique({
      where: { id },
      select: { logoUrl: true },
    });
    await prisma.sponsor.update({
      where: { id },
      data: {
        ...data,
        logoUrl: logoUpload ?? fOpt(formData, 'logoUrl') ?? existing?.logoUrl ?? null,
      },
    });
  } else {
    await prisma.sponsor.create({
      data: {
        ...data,
        logoUrl: logoUpload ?? fOpt(formData, 'logoUrl'),
      },
    });
  }

  revalidatePath('/admin/sponsors');
  redirect('/admin/sponsors');
}

async function deleteSponsor(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (id) {
    await prisma.tournamentSponsor.deleteMany({ where: { sponsorId: id } });
    await prisma.sponsor.delete({ where: { id } }).catch(() => null);
  }
  revalidatePath('/admin/sponsors');
  redirect('/admin/sponsors');
}

export default async function AdminSponsorsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const { edit, error } = await searchParams;

  const sponsors = await prisma.sponsor.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { tournaments: true } } },
  });

  const editing = edit ? await prisma.sponsor.findUnique({ where: { id: edit } }) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> Sponsors &amp; Partners
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage brands, device partners, and commercial sponsors.
          </p>
        </div>
        {editing && (
          <Link
            href="/admin/sponsors"
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            + New sponsor instead
          </Link>
        )}
      </div>

      {error === 'name' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          Sponsor name is required.
        </p>
      )}

      {/* Form */}
      <details open={Boolean(editing)}>
        <summary className="cursor-pointer select-none inline-flex items-center gap-2 rounded-lg bg-[#0A5FC4] hover:bg-[#0850a3] text-white text-xs font-bold uppercase tracking-wider px-3 py-2 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          {editing ? `Editing: ${editing.name}` : 'Add New Sponsor'}
        </summary>

        <form
          action={saveSponsor}
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
              <label className={labelCls}>Category</label>
              <select name="category" defaultValue={editing?.category ?? 'ASSOCIATE'} className={inputCls}>
                <option value="TITLE_SPONSOR">TITLE_SPONSOR</option>
                <option value="POWERED_BY">POWERED_BY</option>
                <option value="DEVICE_PARTNER">DEVICE_PARTNER</option>
                <option value="TICKETING_PARTNER">TICKETING_PARTNER</option>
                <option value="ENERGY_PARTNER">ENERGY_PARTNER</option>
                <option value="BROADCAST_PARTNER">BROADCAST_PARTNER</option>
                <option value="ASSOCIATE">ASSOCIATE</option>
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
            {editing ? 'Update Sponsor' : 'Create Sponsor'}
          </button>
        </form>
      </details>

      {/* List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[540px]">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17]">
              <th className="py-2.5 px-3 text-left">Sponsor</th>
              <th className="py-2.5 px-3 text-left">Category</th>
              <th className="py-2.5 px-3 text-center">Tournaments</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {sponsors.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors">
                <td className="py-2.5 px-3 font-bold">
                  {s.name}
                  {s.website && (
                    <a
                      href={s.website}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 text-xs font-normal text-blue-500 hover:underline"
                    >
                      ↗
                    </a>
                  )}
                </td>
                <td className="py-2.5 px-3 text-xs text-slate-400">{s.category}</td>
                <td className="py-2.5 px-3 text-center font-mono font-bold">{s._count.tournaments}</td>
                <td className="py-2.5 px-3 text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <Link
                      href={`/admin/sponsors?edit=${s.id}`}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#0A5FC4] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <form action={deleteSponsor}>
                      <input type="hidden" name="id" value={s.id} />
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
            {sponsors.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                  No sponsors found. Add your first sponsor above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
