import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Pencil, Trash2, Plus, MapPin } from 'lucide-react';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr, fOpt, fNum, uniqueSlug } from '@/lib/admin-forms';

export const dynamic = 'force-dynamic';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

async function saveVenue(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  const name = fStr(formData, 'name');
  if (!name) redirect('/admin/venues?error=name');

  const slug = await uniqueSlug(fStr(formData, 'slug') || name, async (s) => {
    const clash = await prisma.venue.findFirst({
      where: { slug: s, ...(id ? { NOT: { id } } : {}) },
      select: { id: true },
    });
    return Boolean(clash);
  });

  const data = {
    name,
    slug,
    city: fOpt(formData, 'city'),
    country: fOpt(formData, 'country'),
    capacity: fNum(formData, 'capacity'),
    mapUrl: fOpt(formData, 'mapUrl'),
  };

  if (id) {
    await prisma.venue.update({
      where: { id },
      data,
    });
  } else {
    await prisma.venue.create({
      data,
    });
  }

  revalidatePath('/admin/venues');
  redirect('/admin/venues');
}

async function deleteVenue(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (id) {
    await prisma.tournamentVenue.deleteMany({ where: { venueId: id } });
    await prisma.venue.delete({ where: { id } });
  }
  revalidatePath('/admin/venues');
  redirect('/admin/venues');
}

export default async function AdminVenuesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const { edit, error } = await searchParams;

  const venues = await prisma.venue.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { tournaments: true } } },
  });

  const editing = edit ? await prisma.venue.findUnique({ where: { id: edit } }) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-500" /> Stadiums &amp; Venues
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage physical LAN stadiums, arenas, and city locations for tournament stages.
          </p>
        </div>
        {editing && (
          <Link
            href="/admin/venues"
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            + New venue instead
          </Link>
        )}
      </div>

      {error === 'name' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          Venue name is required.
        </p>
      )}

      {/* Form */}
      <details open={Boolean(editing)}>
        <summary className="cursor-pointer select-none inline-flex items-center gap-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider px-3 py-2 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          {editing ? `Editing: ${editing.name}` : 'Add New Venue'}
        </summary>

        <form
          action={saveVenue}
          className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm p-5 space-y-4"
        >
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={labelCls}>Venue Name *</label>
              <input name="name" required defaultValue={editing?.name ?? ''} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Slug</label>
              <input name="slug" defaultValue={editing?.slug ?? ''} placeholder="auto" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input name="city" defaultValue={editing?.city ?? ''} placeholder="Chennai / Jaipur" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Country</label>
              <input name="country" defaultValue={editing?.country ?? 'India'} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Capacity (Audience)</label>
              <input type="number" name="capacity" defaultValue={editing?.capacity ?? ''} placeholder="10000" className={inputCls} />
            </div>
            <div className="sm:col-span-3">
              <label className={labelCls}>Maps / Directions Link</label>
              <input name="mapUrl" defaultValue={editing?.mapUrl ?? ''} placeholder="https://maps.google.com/…" className={inputCls} />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            {editing ? 'Update Venue' : 'Create Venue'}
          </button>
        </form>
      </details>

      {/* List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[540px]">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17]">
              <th className="py-2.5 px-3 text-left">Venue</th>
              <th className="py-2.5 px-3 text-left">Location</th>
              <th className="py-2.5 px-3 text-center">Capacity</th>
              <th className="py-2.5 px-3 text-center">Tournaments</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {venues.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors">
                <td className="py-2.5 px-3 font-bold">{v.name}</td>
                <td className="py-2.5 px-3 text-xs text-slate-400">
                  {v.city ? `${v.city}, ` : ''}{v.country || '—'}
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-xs">
                  {v.capacity ? v.capacity.toLocaleString() : '—'}
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-bold">{v._count.tournaments}</td>
                <td className="py-2.5 px-3 text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <Link
                      href={`/admin/venues?edit=${v.id}`}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-(--ed-blue) transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <form action={deleteVenue}>
                      <input type="hidden" name="id" value={v.id} />
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
            {venues.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                  No venues found. Add your first venue above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
