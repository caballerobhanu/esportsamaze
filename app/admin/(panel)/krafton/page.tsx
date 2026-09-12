import Link from 'next/link';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import {
  deleteKraftonEvent,
  deleteKraftonTransfer,
  duplicateKraftonEvent,
  saveKraftonEvent,
  saveKraftonTransfer,
} from './actions';
const labelCls = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500';
import { SearchableSelect } from '@/components/ui/searchable-select';

export const dynamic = 'force-dynamic';

export default async function KraftonAdminPage() {
  if (!(await isAdmin())) redirect('/admin/login');

  const [events, transfers] = await Promise.all([
    prisma.kraftonEvent.findMany({
      orderBy: { endDate: 'desc' },
      include: { _count: { select: { entries: true } } },
    }),
    prisma.kraftonTransfer.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight">KRAFTON Rankings</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Standalone ranking events — enter placements, points and decay are computed live.
          </p>
        </div>
      </div>

      {/* New event form */}
      <details open={events.length === 0}>
        <summary className="inline-flex cursor-pointer select-none items-center gap-2 rounded-lg bg-(--ed-blue) px-3 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:brightness-110">
          <Plus className="h-3.5 w-3.5" /> New Ranking Event
        </summary>
        <form
          action={saveKraftonEvent}
          className="mt-3 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b101c]"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Event Name *
              </label>
              <input
                name="name"
                required
                placeholder="BGIS 2026"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                End Date *
              </label>
              <input
                name="endDate"
                type="date"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Tier
              </label>
              <select
                name="tier"
                defaultValue="Tier 1"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="Publisher">Publisher</option>
                <option value="Tier 1">Tier 1</option>
                <option value="Tier 2">Tier 2</option>
                <option value="Tier 3">Tier 3</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-(--ed-blue) px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:brightness-110"
          >
            Create Event &amp; Add Entries
          </button>
        </form>
      </details>

      {/* Point Transfers */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-tight">Point Transfers</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Org rebrands &amp; roster acquisitions — points earned before the cutoff move from one
            team to the other. Both teams must be linked to site pages first (edit their entries and
            use “Site Page Link”).
          </p>
        </div>

        <details open={transfers.length === 0}>
          <summary className="inline-flex cursor-pointer select-none items-center gap-2 rounded-lg bg-(--ed-blue) px-3 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:brightness-110">
            New Point Transfer
          </summary>
          <form
            action={saveKraftonTransfer}
            className="mt-3 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b101c]"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className={labelCls}>From Team (loses points) *</label>
                <SearchableSelect
                  name="fromTeamId"
                  placeholder="Search team…"
                  searchPlaceholder="Type to search…"
                  options={[]}
                  searchUrl="/api/admin/search?type=team"
                />
              </div>
              <div>
                <label className={labelCls}>To Team (gains points) *</label>
                <SearchableSelect
                  name="toTeamId"
                  placeholder="Search team…"
                  searchPlaceholder="Type to search…"
                  options={[]}
                  searchUrl="/api/admin/search?type=team"
                />
              </div>
              <div>
                <label className={labelCls}>Cutoff Date * (events before this move)</label>
                <input type="date" name="cutoff" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900" />
              </div>
              <div>
                <label className={labelCls}>Mode</label>
                <select name="mode" defaultValue="add" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900">
                  <option value="add">Add to receiving team</option>
                  <option value="wipe">Wipe receiver&apos;s earlier points</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Fixed Amount (optional)</label>
                <input type="number" name="amount" min="1" placeholder="Full balance" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900" />
              </div>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-(--ed-blue) px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:brightness-110"
            >
              Save Transfer
            </button>
          </form>
        </details>

        {transfers.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b101c]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800/80 dark:bg-[#080d17]">
                  <th className="px-3 py-2.5 text-left">From</th>
                  <th className="px-3 py-2.5 text-left">To</th>
                  <th className="px-3 py-2.5 text-left">Cutoff</th>
                  <th className="px-3 py-2.5 text-left">Mode</th>
                  <th className="px-3 py-2.5 text-center">Amount</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {transfers.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2.5 font-bold">{t.fromName}</td>
                    <td className="px-3 py-2.5 font-bold">{t.toName}</td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {t.cutoff.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {t.mode}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-slate-500">{t.amount ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <form action={deleteKraftonTransfer} className="inline">
                        <input type="hidden" name="id" value={t.id} />
                        <button
                          type="submit"
                          aria-label={`Delete transfer ${t.fromName} → ${t.toName}`}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Events table */}      {/* Events table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b101c]">
        <table className="min-w-[640px] w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800/80 dark:bg-[#080d17]">
              <th className="px-3 py-2.5 text-left">Event</th>
              <th className="px-3 py-2.5 text-left">End Date</th>
              <th className="px-3 py-2.5 text-left">Tier</th>
              <th className="px-3 py-2.5 text-center">Entries</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {events.map((e) => (
              <tr key={e.id} className="transition-colors hover:bg-slate-50 dark:bg-transparent dark:hover:bg-[#121929]">
                <td className="px-3 py-2.5">
                  <Link href={`/admin/krafton/${e.id}`} className="font-bold hover:text-(--ed-blue)">
                    {e.name}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-slate-500">
                  {e.endDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </td>
                <td className="px-3 py-2.5 text-slate-500">{e.tier}</td>
                <td className="px-3 py-2.5 text-center font-mono">{e._count.entries}</td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/admin/krafton/${e.id}`}
                      className="text-xs font-bold text-(--ed-blue) hover:underline"
                    >
                      Edit
                    </Link>
                    <form
                      action={duplicateKraftonEvent}
                      className="inline"
                    >
                      <input type="hidden" name="id" value={e.id} />
                      <button
                        type="submit"
                        aria-label={`Duplicate ${e.name}`}
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-(--ed-blue) dark:hover:bg-slate-800"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </form>
                    <form action={deleteKraftonEvent} className="inline">
                      <input type="hidden" name="id" value={e.id} />
                      <button
                        type="submit"
                        aria-label={`Delete ${e.name}`}
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </span>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-xs text-slate-400">
                  No ranking events yet — create the first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
