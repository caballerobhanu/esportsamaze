import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Copy, Trash2 } from 'lucide-react';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { saveKraftonEvent, duplicateKraftonEvent, deleteKraftonEvent } from '../actions';
import { KraftonEntriesManager } from '@/components/admin/krafton-entries-manager';

export const dynamic = 'force-dynamic';

export default async function KraftonEventEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  if (!(await isAdmin())) redirect('/admin/login');
  const { id } = await params;
  const { saved } = await searchParams;

  const [event, tournaments] = await Promise.all([
    prisma.kraftonEvent.findUnique({
      where: { id },
      include: { entries: { orderBy: [{ board: 'asc' }, { rank: 'asc' }] } },
    }),
    prisma.tournament.findMany({ select: { id: true, name: true }, orderBy: { startDate: 'desc' }, take: 200 }),
  ]);
  if (!event) notFound();

  const teamRowsRaw = event.entries.filter((e) => e.board === 'TEAM');
  const playerRowsRaw = event.entries.filter((e) => e.board === 'PLAYER');

  // Site-page meta (logo/name) for linked rows so the admin shows what's linked
  const linkedTeamIds = [...new Set(teamRowsRaw.map((e) => e.entityId).filter(Boolean))] as string[];
  const linkedPlayerIds = [...new Set(playerRowsRaw.map((e) => e.entityId).filter(Boolean))] as string[];
  const [linkedTeams, linkedPlayers] = await Promise.all([
    linkedTeamIds.length
      ? prisma.team.findMany({
          where: { id: { in: linkedTeamIds } },
          select: { id: true, name: true, displayName: true, logoUrl: true, tag: true },
        })
      : Promise.resolve([]),
    linkedPlayerIds.length
      ? prisma.player.findMany({
          where: { id: { in: linkedPlayerIds } },
          select: {
            id: true,
            ign: true,
            avatarUrl: true,
            currentTeam: { select: { tag: true, name: true } },
          },
        })
      : Promise.resolve([]),
  ]);
  const teamMeta = new Map(linkedTeams.map((t) => [t.id, t]));
  const playerMeta = new Map(linkedPlayers.map((p) => [p.id, p]));

  const withLinkedMeta = <T extends { entityId: string | null; entityName: string; teamName?: string | null }>(row: T) => {
    if (!row.entityId) return { ...row, linkedLogoUrl: null, linkedName: row.entityName };
    const team = teamMeta.get(row.entityId);
    if (team) {
      const tag = team.tag ? ` [${team.tag}]` : '';
      return { ...row, linkedLogoUrl: team.logoUrl, linkedName: `${team.displayName || team.name}${tag}` };
    }
    const player = playerMeta.get(row.entityId);
    if (player) {
      const teamTag = player.currentTeam?.tag || player.currentTeam?.name || row.teamName;
      const displayName = teamTag ? `${player.ign} (${teamTag})` : player.ign;
      return { ...row, linkedLogoUrl: player.avatarUrl, linkedName: displayName };
    }
    return { ...row, linkedLogoUrl: null, linkedName: row.entityName };
  };
  const teamRows = teamRowsRaw.map(withLinkedMeta);
  const playerRows = playerRowsRaw.map(withLinkedMeta);
  const endDateStr = event.endDate.toISOString().slice(0, 10);

  const inputCls =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900';
  const labelCls = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/krafton" className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            ← KRAFTON Rankings
          </Link>
          <h1 className="mt-1 text-xl font-black uppercase tracking-tight">{event.name}</h1>
        </div>
        <span className="flex items-center gap-1.5">
          <form action={duplicateKraftonEvent} className="inline">
            <input type="hidden" name="id" value={event.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-(--ed-blue) hover:text-(--ed-blue) dark:border-slate-700 dark:text-slate-200"
            >
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
          </form>
          <form action={deleteKraftonEvent} className="inline">
            <input type="hidden" name="id" value={event.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-rose-400 hover:text-rose-600 dark:border-slate-700 dark:text-slate-200"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </form>
        </span>
      </div>

      {saved === '1' && (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          Saved.
        </p>
      )}
      {saved === 'copy' && (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          Duplicated — you are now editing the copy.
        </p>
      )}

      {/* Event fields */}
      <details open>
        <summary className="inline-flex cursor-pointer select-none items-center rounded-lg bg-(--ed-blue) px-3 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:brightness-110">
          Event Details
        </summary>
        <form
          action={saveKraftonEvent}
          className="mt-3 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b101c]"
        >
          <input type="hidden" name="id" value={event.id} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Event Name *</label>
              <input name="name" required defaultValue={event.name} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Short Name</label>
              <input
                name="shortName"
                defaultValue={event.shortName ?? ''}
                placeholder="BGIS"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>End Date * (decay anchor)</label>
              <input name="endDate" type="date" required defaultValue={endDateStr} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tier</label>
              <select name="tier" defaultValue={event.tier} className={inputCls}>
                <option value="Publisher">Publisher</option>
                <option value="Tier 1">Tier 1</option>
                <option value="Tier 2">Tier 2</option>
                <option value="Tier 3">Tier 3</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Link Tournament (optional)</label>
              <select name="tournamentId" defaultValue={event.tournamentId ?? ''} className={inputCls}>
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
            Save Event Details
          </button>
        </form>
      </details>

      {/* Entries — teams */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Team Placements ({teamRows.length})
          </h2>
        </div>
        <KraftonEntriesManager
          eventId={event.id}
          board="TEAM"
          rows={teamRows}
          tournaments={tournaments}
          defaultTournamentId={event.tournamentId}
        />
      </section>

      {/* Entries — players */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Player Eliminations &amp; Awards ({playerRows.length})
          </h2>
        </div>
        <KraftonEntriesManager
          eventId={event.id}
          board="PLAYER"
          rows={playerRows}
          tournaments={tournaments}
          defaultTournamentId={event.tournamentId}
        />
      </section>
    </div>
  );
}
