import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Copy, Pencil, Trash2, Plus } from 'lucide-react';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr, fDate } from '@/lib/admin-forms';
import { Combobox } from '@/components/admin/combobox';

export const dynamic = 'force-dynamic';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

const TYPES = ['JOINED', 'LEFT', 'LOANED', 'BENCHED'];

const STAFF_ROLES = ['Head Coach', 'Coach', 'Assistant Coach', 'Analyst', 'Manager', 'Content Creator'];

const TYPE_STYLES: Record<string, string> = {
  JOINED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  LEFT: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  LOANED: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  BENCHED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

async function saveTransfer(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  const playerId = fStr(formData, 'playerId');
  const fromTeamId = fStr(formData, 'fromTeamId') || null;
  const teamId = fStr(formData, 'teamId');
  const date = fDate(formData, 'date');
  if (!playerId || !teamId || !date) {
    redirect(id ? `/admin/transfers?edit=${id}&error=required` : '/admin/transfers?error=required');
  }

  const data = {
    playerId,
    fromTeamId,
    teamId,
    type: (fStr(formData, 'type') || 'JOINED') as
      | 'JOINED'
      | 'LEFT'
      | 'LOANED'
      | 'BENCHED',
    staffRole: fStr(formData, 'staffRole') || null,
    date,
    notes: fStr(formData, 'notes') || null,
  };

  if (id) {
    try {
      await prisma.transfer.update({ where: { id }, data });
    } catch {
      redirect(`/admin/transfers?edit=${id}&error=save-failed`);
    }
  } else {
    try {
      await prisma.transfer.create({ data });
    } catch {
      redirect('/admin/transfers?error=save-failed');
    }
  }

  // Sync the player's "current team" with this move — unless a later-dated
  // transfer already supersedes it (backfilled ledger entries stay consistent).
  const laterMove = await prisma.transfer.findFirst({
    where: { playerId, date: { gt: date }, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (!laterMove) {
    if (data.type === 'JOINED' || data.type === 'LOANED') {
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        select: { currentTeamId: true },
      });
      // Team→team move: if the player is still marked with the old team, detach first.
      if (data.fromTeamId && player?.currentTeamId === data.fromTeamId) {
        await prisma.player.update({
          where: { id: playerId },
          data: { currentTeamId: null },
        });
      }
      await prisma.player.update({
        where: { id: playerId },
        data: { currentTeamId: teamId },
      });
    } else if (data.type === 'LEFT') {
      // Only detach when the player is still marked with the team they left
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        select: { currentTeamId: true },
      });
      if (player?.currentTeamId === teamId) {
        await prisma.player.update({
          where: { id: playerId },
          data: { currentTeamId: null },
        });
      }
    }
    // BENCHED keeps the player on the roster — no change
  }

  revalidatePath('/admin/transfers');
  redirect('/admin/transfers');
}

async function deleteTransfer(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (id) {
    try {
      await prisma.transfer.delete({ where: { id } });
    } catch {
      redirect('/admin/transfers?error=delete-failed');
    }
  }
  revalidatePath('/admin/transfers');
  redirect('/admin/transfers');
}

export default async function AdminTransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; edit?: string; copy?: string }>;
}) {
  const { error, edit, copy } = await searchParams;

  // edit = modify in place; copy = pre-fill a new record from an existing one
  const sourceId = edit ?? copy;
  const source = sourceId
    ? await prisma.transfer.findUnique({ where: { id: sourceId } })
    : null;
  const isEditing = Boolean(edit && source);

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
        fromTeam: { select: { name: true, tag: true, slug: true } },
      },
    }),
  ]);

  const playerOptions = players.map((p) => ({
    value: p.id,
    label: p.ign + (p.currentTeam ? ` — ${p.currentTeam.name}` : ' — Free Agent'),
    keywords: p.currentTeam ? `${p.currentTeam.name} ${p.currentTeam.tag ?? ''}` : '',
  }));
  const teamOptions = teams.map((t) => ({
    value: t.id,
    label: t.name + (t.tag ? ` [${t.tag}]` : ''),
    keywords: `${t.name} ${t.tag ?? ''}`,
  }));
  const staffRoleOptions = STAFF_ROLES.map((r) => ({ value: r, label: r }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black uppercase tracking-tight">Transfers</h1>
        {source && (
          <Link
            href="/admin/transfers"
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            + New transfer instead
          </Link>
        )}
      </div>

      {error === 'required' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          Player, team and date are all required.
        </p>
      )}
      {error === 'save-failed' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          The transfer could not be saved — the selected player or team no longer exists.
        </p>
      )}
      {error === 'delete-failed' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          The transfer could not be deleted — it was already removed or is still referenced.
        </p>
      )}

      {/* Add / Edit / Duplicate form */}
      <details open={Boolean(source)}>
        <summary className="cursor-pointer select-none inline-flex items-center gap-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider px-3 py-2 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          {source
            ? isEditing
              ? `Editing transfer of ${players.find((p) => p.id === source.playerId)?.ign ?? '…'}`
              : `Duplicating transfer of ${players.find((p) => p.id === source.playerId)?.ign ?? '…'} — saves as new`
            : 'Record New Transfer'}
        </summary>

        <form
          action={saveTransfer}
          key={source?.id ?? 'new'}
          className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm p-5 space-y-4"
        >
          {/* id present only when editing — duplicates submit without it and create a new row */}
          {isEditing && source && <input type="hidden" name="id" value={source.id} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className={labelCls}>Player *</label>
              <Combobox
                name="playerId"
                options={playerOptions}
                defaultValue={source?.playerId ?? ''}
                placeholder="Type a player IGN…"
                ariaLabel="Player"
              />
            </div>
            <div>
              <label className={labelCls}>From Team</label>
              <Combobox
                name="fromTeamId"
                options={teamOptions}
                defaultValue={source?.fromTeamId ?? ''}
                placeholder="Previous team (optional)…"
                emptyOptionLabel="— Unspecified —"
                ariaLabel="From Team"
              />
            </div>
            <div>
              <label className={labelCls}>Team *</label>
              <Combobox
                name="teamId"
                options={teamOptions}
                defaultValue={source?.teamId ?? ''}
                placeholder="Type a team name or tag…"
                ariaLabel="Team"
              />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select name="type" defaultValue={source?.type ?? 'JOINED'} className={inputCls}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Staff Role</label>
              <Combobox
                name="staffRole"
                options={staffRoleOptions}
                defaultValue={source?.staffRole ?? ''}
                emptyOptionLabel="— Player move —"
                freeText
                placeholder="Coach, Analyst…"
                ariaLabel="Staff Role"
              />
            </div>
            <div>
              <label className={labelCls}>Date *</label>
              <input
                type="date"
                name="date"
                required
                defaultValue={source ? source.date.toISOString().slice(0, 10) : ''}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <input name="notes" defaultValue={source?.notes ?? ''} placeholder="Contract details…" className={inputCls} />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            {isEditing ? 'Update Transfer' : source ? 'Save as New Transfer' : 'Save Transfer'}
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
                    <Link href={`/players/${tr.player.slug}`} className="font-bold hover:text-(--ed-blue) transition-colors">
                      {tr.player.ign}
                    </Link>
                  ) : (
                    <span className="font-bold">{tr.player.ign}</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-slate-500">
                  {tr.fromTeam ? (
                    <>
                      <span>{tr.fromTeam.name}</span>
                      <span className="text-slate-400 mx-1">→</span>
                      <span className="font-semibold text-(--ed-ink)">{tr.team.name}</span>
                    </>
                  ) : (
                    tr.team.name
                  )}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${TYPE_STYLES[tr.type] ?? ''}`}>
                    {tr.type}
                  </span>
                  {tr.staffRole && (
                    <span className="ml-1.5 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-black uppercase text-indigo-500">
                      {tr.staffRole}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-slate-500 hidden sm:table-cell">
                  {tr.date.toISOString().slice(0, 10)}
                </td>
                <td className="py-2.5 px-3 text-slate-400 text-xs hidden md:table-cell max-w-[280px] truncate">
                  {tr.notes ?? '—'}
                </td>
                <td className="py-2.5 px-3">
                  <span className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/admin/transfers?edit=${tr.id}`}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-(--ed-blue) transition-colors"
                      aria-label={`Edit transfer of ${tr.player.ign}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href={`/admin/transfers?copy=${tr.id}`}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-(--ed-blue) transition-colors"
                      aria-label={`Duplicate transfer of ${tr.player.ign}`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Link>
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
