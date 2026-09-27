import { redirect } from 'next/navigation';
import { AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';

import { hasCapability } from '@/lib/admin-auth';
import { prismaUnfiltered } from '@/lib/prisma';
import { ConfirmSubmit } from '@/components/admin/confirm-submit';
import { purgeFromTrash, restoreFromTrash } from './actions';

export const dynamic = 'force-dynamic';

/** UTC minute, so a row's age is unambiguous across the owner's and the desk's timezones. */
function when(date: Date | null): string {
  return date ? `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC` : '—';
}

type TrashType = 'tournament' | 'match' | 'team' | 'player';

function TrashRow({
  type,
  id,
  label,
  sublabel,
  deletedAt,
}: {
  type: TrashType;
  id: string;
  label: string;
  sublabel?: string;
  deletedAt: Date | null;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0 dark:border-white/5">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{label}</p>
        <p className="text-[11px] font-semibold text-slate-400">
          {sublabel ? `${sublabel} · ` : ''}trashed {when(deletedAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <form action={restoreFromTrash}>
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className="cursor-pointer rounded-md border border-slate-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-colors hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10"
          >
            Restore
          </button>
        </form>
        <form action={purgeFromTrash}>
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="id" value={id} />
          <ConfirmSubmit
            message={`Permanently delete "${label}"?\n\nThis cannot be undone. Restore it instead if you are not certain.`}
            className="cursor-pointer rounded-md border border-rose-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-600 transition-colors hover:border-rose-400 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-950/30"
          >
            Purge
          </ConfirmSubmit>
        </form>
      </div>
    </li>
  );
}

function TrashSection({
  title,
  items,
}: {
  title: string;
  items: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1220]">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-white/5">
        <h2 className="text-sm font-black uppercase tracking-tight">{title}</h2>
      </div>
      <ul>{items}</ul>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <li className="px-4 py-8 text-center text-xs text-slate-400">{text}</li>;
}

export default async function AdminTrashPage({
  searchParams,
}: {
  searchParams: Promise<{ restored?: string; purged?: string; error?: string }>;
}) {
  if (!(await hasCapability('destructive'))) redirect('/admin');

  const params = await searchParams;

  const [tournaments, matches, teams, players] = await Promise.all([
    prismaUnfiltered.tournament.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      select: { id: true, name: true, slug: true, deletedAt: true },
    }),
    prismaUnfiltered.match.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      take: 300,
      select: {
        id: true,
        matchNumber: true,
        format: true,
        deletedAt: true,
        tournament: { select: { name: true } },
      },
    }),
    prismaUnfiltered.team.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      select: { id: true, name: true, tag: true, deletedAt: true },
    }),
    prismaUnfiltered.player.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      select: { id: true, ign: true, deletedAt: true },
    }),
  ]);

  const total = tournaments.length + matches.length + teams.length + players.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A5FC4]/10 text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
          <Trash2 className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Trash</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Deleted tournaments, matches, teams and players wait here — hidden from the public site
            and the normal admin lists. Restore one to put it back exactly as it was, or purge it
            for good. Only you can see this.
          </p>
        </div>
      </div>

      {params.error === 'purge-failed' && (
        <p className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-3.5 w-3.5" /> Purge failed — the row has links that block it.
        </p>
      )}
      {(params.restored || params.purged) && (
        <p className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" /> {params.restored ? 'Restored.' : 'Purged.'}
        </p>
      )}

      {total === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-xs text-slate-400 dark:border-white/10">
          Trash is empty.
        </p>
      ) : (
        <>
          <TrashSection
            title={`Tournaments (${tournaments.length})`}
            items={
              tournaments.length === 0 ? (
                <Empty text="No trashed tournaments." />
              ) : (
                tournaments.map((row) => (
                  <TrashRow
                    key={row.id}
                    type="tournament"
                    id={row.id}
                    label={row.name}
                    sublabel={`/${row.slug}`}
                    deletedAt={row.deletedAt}
                  />
                ))
              )
            }
          />

          <TrashSection
            title={`Matches (${matches.length})`}
            items={
              matches.length === 0 ? (
                <Empty text="No trashed matches." />
              ) : (
                matches.map((row) => (
                  <TrashRow
                    key={row.id}
                    type="match"
                    id={row.id}
                    label={`Match ${row.matchNumber}${row.format ? ` · ${row.format}` : ''}`}
                    sublabel={row.tournament?.name}
                    deletedAt={row.deletedAt}
                  />
                ))
              )
            }
          />

          <TrashSection
            title={`Teams (${teams.length})`}
            items={
              teams.length === 0 ? (
                <Empty text="No trashed teams." />
              ) : (
                teams.map((row) => (
                  <TrashRow
                    key={row.id}
                    type="team"
                    id={row.id}
                    label={row.name}
                    sublabel={row.tag ?? undefined}
                    deletedAt={row.deletedAt}
                  />
                ))
              )
            }
          />

          <TrashSection
            title={`Players (${players.length})`}
            items={
              players.length === 0 ? (
                <Empty text="No trashed players." />
              ) : (
                players.map((row) => (
                  <TrashRow
                    key={row.id}
                    type="player"
                    id={row.id}
                    label={row.ign}
                    deletedAt={row.deletedAt}
                  />
                ))
              )
            }
          />
        </>
      )}
    </div>
  );
}
