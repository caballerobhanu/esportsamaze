import Link from 'next/link';
import { Clock, Copy, Plus, Trash2, Calendar } from 'lucide-react';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import {
  deleteKraftonEvent,
  duplicateKraftonEvent,
  saveKraftonEvent,
} from './actions';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { KraftonTransfersManager, type SerializedKraftonTransfer } from '@/components/admin/krafton-transfers-manager';
const labelCls = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500';

export const dynamic = 'force-dynamic';

export default async function KraftonAdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  if (!(await isAdmin())) redirect('/admin/login');
  const { filter = 'all' } = (await searchParams) || {};

  const [allEvents, transfers, tournaments] = await Promise.all([
    prisma.kraftonEvent.findMany({
      orderBy: { endDate: 'desc' },
      include: { _count: { select: { entries: true } } },
    }),
    prisma.kraftonTransfer.findMany({ orderBy: [{ cutoff: 'asc' }, { createdAt: 'asc' }] }),
    prisma.tournament.findMany({ select: { id: true, name: true }, orderBy: { startDate: 'desc' }, take: 200 }),
  ]);

  const serializedTransfers: SerializedKraftonTransfer[] = transfers.map((t) => {
    const d = new Date(t.cutoff);
    const iso = d.toISOString();
    return {
      id: t.id,
      fromTeamId: t.fromTeamId,
      fromName: t.fromName,
      toTeamId: t.toTeamId,
      toName: t.toName,
      cutoffIso: iso,
      cutoffDate: iso.slice(0, 10),
      cutoffTime: iso.slice(11, 16),
      preference: d.getUTCSeconds() > 0 ? d.getUTCSeconds() : 1,
      mode: (t.mode as 'add' | 'own_only' | 'wipe') || 'add',
      amount: t.amount,
    };
  });

  const now = Date.now();
  const upcomingEvents = allEvents.filter((e) => e.endDate.getTime() > now);
  const concludedEvents = allEvents.filter((e) => e.endDate.getTime() <= now);

  const events = filter === 'upcoming' ? upcomingEvents : filter === 'concluded' ? concludedEvents : allEvents;

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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                Short Name
              </label>
              <input
                name="shortName"
                placeholder="BGIS"
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
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Link Tournament (optional)
              </label>
              <select
                name="tournamentId"
                defaultValue=""
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="">— none —</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
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
            Org rebrands, roster acquisitions &amp; slot transfers — points earned before the cutoff move from one
            team to the other. Both teams must be linked to site pages first. For same-day or chained transfers,
            use Time and Execution Order (#1 runs before #2), or choose Own Events Only mode.
          </p>
        </div>

        <KraftonTransfersManager transfers={serializedTransfers} />
      </div>

      {/* Events table */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-[#0b101c]">
            <Link
              href="/admin/krafton"
              className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                filter === 'all'
                  ? 'bg-(--ed-blue) text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All Events ({allEvents.length})
            </Link>
            <Link
              href="/admin/krafton?filter=concluded"
              className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                filter === 'concluded'
                  ? 'bg-(--ed-blue) text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Concluded ({concludedEvents.length})
            </Link>
            <Link
              href="/admin/krafton?filter=upcoming"
              className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                filter === 'upcoming'
                  ? 'bg-(--ed-blue) text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Upcoming ({upcomingEvents.length})
            </Link>
          </div>
        </div>

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
              {events.map((e) => {
                const isUpcoming = e.endDate.getTime() > now;
                const daysUntil = Math.max(1, Math.ceil((e.endDate.getTime() - now) / 86_400_000));

                return (
                  <tr key={e.id} className="transition-colors hover:bg-slate-50 dark:bg-transparent dark:hover:bg-[#121929]">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/krafton/${e.id}`} className="font-bold hover:text-(--ed-blue)">
                          {e.name}
                        </Link>
                        {isUpcoming && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            <Clock className="h-2.5 w-2.5" /> in {daysUntil}d
                          </span>
                        )}
                      </div>
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
              );
            })}
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
  </div>
  );
}
