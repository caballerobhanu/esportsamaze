import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Trash2, Plus } from 'lucide-react';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr, fDate } from '@/lib/admin-forms';

export const dynamic = 'force-dynamic';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5FC4]';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

const TYPES = ['JOINED', 'LEFT', 'LOANED', 'BENCHED'];

const TYPE_STYLES: Record<string, string> = {
  JOINED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  LEFT: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  LOANED: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  BENCHED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

async function saveTransfer(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const playerId = fStr(formData, 'playerId');
  const teamId = fStr(formData, 'teamId');
  const date = fDate(formData, 'date');
  if (!playerId || !teamId || !date) {
    redirect('/admin/transfers?error=required');
  }

  await prisma.transfer.create({
    data: {
      playerId,
      teamId,
      type: (fStr(formData, 'type') || 'JOINED') as
        | 'JOINED'
        | 'LEFT'
        | 'LOANED'
        | 'BENCHED',
      date,
      notes: fStr(formData, 'notes') || null,
    },
  });

  revalidatePath('/admin/transfers');
  redirect('/admin/transfers');
}

async function deleteTransfer(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (id) {
    await prisma.transfer.delete({ where: { id } }).catch(() => null);
  }
  revalidatePath('/admin/transfers');
  redirect('/admin/transfers');
}

export default async function AdminTransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const [players, teams, transfers] = await Promise.all([
    prisma.player.findMany({
      orderBy: { ign: 'asc' },
      select: {
        id: true,
        ign: true,
        currentTeam: { select: { name: true, tag: true } },
      },
    }),
    prisma.team.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, tag: true },
    }),
    prisma.transfer.findMany({
      orderBy: { date: 'desc' },
      take: 100,
      include: {
        player: { select: { ign: true, slug: true } },
        team: { select: { name: true, tag: true, slug: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-black uppercase tracking-tight">Transfers</h1>

      {error === 'required' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          Player, team and date are all required.
        </p>
      )}

      {/* Add form */}
      <details>
        <summary className="cursor-pointer select-none inline-flex items-center gap-2 rounded-lg bg-[#0A5FC4] hover:bg-[#0850a3] text-white text-xs font-bold uppercase tracking-wider px-3 py-2 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Record New Transfer
        </summary>

        <form
          action={saveTransfer}
          className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm p-5 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className={labelCls}>Player *</label>
              <select name="playerId" required className={inputCls}>
                <option value="">—</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>{p.ign}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Team *</label>
              <select name="teamId" required className={inputCls}>
                <option value="">—</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}{t.tag ? ` [${t.tag}]` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select name="type" defaultValue="JOINED" className={inputCls}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date *</label>
              <input type="date" name="date" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <input name="notes" placeholder="Contract details…" className={inputCls} />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#0A5FC4] hover:bg-[#0850a3] text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Save Transfer
          </button>
        </form>
      </details>

      {/* Ledger */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17]">
              <th className="py-2.5 px-3 text-left">Player</th>
              <th className="py-2.5 px-3 text-left">Team</th>
              <th className="py-2.5 px-3 text-center">Type</th>
              <th className="py-2.5 px-3 text-left hidden sm:table-cell">Date</th>
              <th className="py-2.5 px-3 text-left hidden md:table-cell">Notes</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {transfers.map((tr) => (
              <tr key={tr.id} className="hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors">
                <td className="py-2.5 px-3">
                  {tr.player.slug ? (
                    <Link href={`/players/${tr.player.slug}`} className="font-bold hover:text-[#0A5FC4] transition-colors">
                      {tr.player.ign}
                    </Link>
                  ) : (
                    <span className="font-bold">{tr.player.ign}</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-slate-500">{tr.team.name}</td>
                <td className="py-2.5 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${TYPE_STYLES[tr.type] ?? ''}`}>
                    {tr.type}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-500 hidden sm:table-cell">
                  {tr.date.toISOString().slice(0, 10)}
                </td>
                <td className="py-2.5 px-3 text-slate-400 text-xs hidden md:table-cell max-w-[280px] truncate">
                  {tr.notes ?? '—'}
                </td>
                <td className="py-2.5 px-3">
                  <span className="flex items-center justify-end">
                    <form action={deleteTransfer}>
                      <input type="hidden" name="id" value={tr.id} />
                      <button
                        type="submit"
                        className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                        aria-label={`Delete transfer of ${tr.player.ign}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </span>
                </td>
              </tr>
            ))}
            {transfers.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                  No transfers recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
