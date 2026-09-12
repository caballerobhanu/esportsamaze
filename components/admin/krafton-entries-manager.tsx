'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Link2, Trash2, Unlink } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  autoLinkKraftonEntries,
  deleteKraftonEntry,
  importKraftonEntries,
  importKraftonEntriesFromTournament,
  linkKraftonEntry,
  moveKraftonEntry,
} from '@/app/admin/(panel)/krafton/[id]/actions';

export interface KraftonEntryRow {
  id: string;
  entityName: string;
  entityId: string | null;
  teamName: string | null;
  teamId: string | null;
  rank: number;
  finishes: number;
  mvp: number;
  finalsMvp: number;
  igl: number;
  survivor: number;
  emerging: number;
  linkedLogoUrl?: string | null;
  linkedName?: string | null;
}

const cell = 'px-3 py-2 align-middle';
const mono = 'font-mono text-xs';

export function KraftonEntriesManager({
  eventId,
  board,
  rows,
  tournaments,
}: {
  eventId: string;
  board: 'TEAM' | 'PLAYER';
  rows: KraftonEntryRow[];
  tournaments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const isTeams = board === 'TEAM';
  const [paste, setPaste] = React.useState('');
  const [importTourneyId, setImportTourneyId] = React.useState('');
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; linked?: number; unmatched?: string[] }>, okMsg?: string) => {
    startTransition(async () => {
      const res = await fn();
      if ('error' in res && res.error) setMessage(res.error);
      else {
        setMessage(okMsg ?? null);
        router.refresh();
      }
    });
  };

  const importPaste = () => {
    if (!paste.trim()) {
      setMessage('Paste some rows first.');
      return;
    }
    startTransition(async () => {
      const res = await importKraftonEntries(eventId, board, paste);
      if (res.error) setMessage(res.error);
      else {
        setMessage(`Imported ${res.imported} rows.`);
        setPaste('');
        router.refresh();
      }
    });
  };

  const importFromTournament = () => {
    if (!importTourneyId) {
      setMessage('Pick a tournament first.');
      return;
    }
    startTransition(async () => {
      const res = await importKraftonEntriesFromTournament(eventId, importTourneyId);
      if (res.error) setMessage(res.error);
      else {
        setMessage(`Imported ${res.teams} teams and ${res.players} players from the tournament.`);
        router.refresh();
      }
    });
  };

  const autoLink = () => {
    startTransition(async () => {
      const res = await autoLinkKraftonEntries(eventId, board);
      if (res.error) setMessage(res.error);
      else {
        setMessage(`Auto-linked ${res.linked} rows.` + (res.unmatched.length ? ` Unmatched: ${res.unmatched.join(', ')}` : ''));
        router.refresh();
      }
    });
  };

  const move = (entryId: string, direction: 'up' | 'down') => {
    startTransition(async () => {
      const res = await moveKraftonEntry(entryId, direction);
      if (res.ok) router.refresh();
    });
  };

  const remove = (entryId: string) => {
    startTransition(async () => {
      const res = await deleteKraftonEntry(entryId);
      if (res.ok) router.refresh();
    });
  };

  const link = (entryId: string, entityId: string) => {
    startTransition(async () => {
      await linkKraftonEntry(entryId, entityId);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {/* Import from site tournament */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-white/[0.02]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Import from site tournament (placements + finishes, auto-linked)
            </label>
            <SearchableSelect
              value={importTourneyId}
              onChange={setImportTourneyId}
              placeholder="Search tournaments…"
              searchPlaceholder="Type to search…"
              options={tournaments.map((t) => ({ value: t.id, label: t.name }))}
              searchUrl="/api/admin/search?type=tournament"
            />
          </div>
          <button
            type="button"
            onClick={importFromTournament}
            disabled={pending || !importTourneyId}
            className="shrink-0 rounded-lg bg-(--ed-blue) px-4 py-2.5 text-xs font-bold text-white transition-colors hover:brightness-110 disabled:opacity-40"
          >
            Import placements
          </button>
          <div className="shrink-0">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">or</span>
            <button
              type="button"
              onClick={autoLink}
              disabled={pending}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-(--ed-blue) hover:text-(--ed-blue) disabled:opacity-40 dark:border-slate-600 dark:text-slate-200"
            >
              <Link2 className="h-3.5 w-3.5" /> Auto-link by name
            </button>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-slate-400">
          Imports the tournament&apos;s team placements and top player finishes as {isTeams ? 'team' : 'player'} rows,
          pre-linked to their site pages.
        </p>
        {message && <p className="mt-2 text-xs font-bold text-rose-500">{message}</p>}
      </div>

      {/* Paste box */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-white/[0.02]">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Paste {isTeams ? 'team' : 'player'} rows (Excel / TSV)
          </label>
          <button
            type="button"
            onClick={importPaste}
            disabled={pending}
            className="rounded-lg bg-(--ed-blue) px-3 py-1.5 text-xs font-bold text-white transition-colors hover:brightness-110 disabled:opacity-50"
          >
            {pending ? 'Working…' : `Import — replaces current ${isTeams ? 'team' : 'player'} rows`}
          </button>
        </div>
        <textarea
          rows={5}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={
            isTeams
              ? 'Team SouL\t1\nTeam Apex Gaming\t2\n…'
              : 'IGN\tTeam\tFinishes\tMVP\tFinalsMVP\tIGL\tSurvivor\tEmerging\nJonathan\tGodLike\t30\t1\t0\t1\t0\t0\n…'
          }
          className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        />
        {isTeams ? (
          <p className="mt-1.5 text-[10px] text-slate-400">Columns: Name, Rank. Extra columns ignored.</p>
        ) : (
          <p className="mt-1.5 text-[10px] text-slate-400">
            Columns: IGN, Team, Finishes, MVP, Finals MVP, IGL, Survivor, Emerging.
          </p>
        )}
      </div>

      {/* Rows table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-white/5">
              <th className="px-2 py-2 text-center">Order</th>
              <th className="px-3 py-2 text-left">{isTeams ? 'Team' : 'IGN'}</th>
              {isTeams ? (
                <th className="px-3 py-2 text-center">Rank</th>
              ) : (
                <>
                  <th className="px-3 py-2 text-left">Team (this event)</th>
                  <th className="px-3 py-2 text-center">Finishes</th>
                  <th className="px-3 py-2 text-center">MVP</th>
                  <th className="px-3 py-2 text-center">FMVP</th>
                  <th className="px-3 py-2 text-center">IGL</th>
                  <th className="px-3 py-2 text-center">Surv</th>
                  <th className="px-3 py-2 text-center">Emerg</th>
                </>
              )}
              <th className="px-3 py-2 text-left">Site Page Link</th>
              <th className="px-2 py-2 text-right">Remove</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {rows.map((r, i) => (
              <tr key={r.id} className={pending ? 'opacity-50' : ''}>
                <td className={cell + ' font-bold text-slate-900 dark:text-white'}>{r.entityName}</td>
                {isTeams ? (
                  <td className={cell + ' text-center ' + mono}>{r.rank}</td>
                ) : (
                  <>
                    <td className={cell + ' text-slate-600 dark:text-slate-300'}>{r.teamName || '—'}</td>
                    <td className={cell + ' text-center ' + mono}>{r.finishes}</td>
                    <td className={cell + ' text-center ' + mono}>{r.mvp || ''}</td>
                    <td className={cell + ' text-center ' + mono}>{r.finalsMvp || ''}</td>
                    <td className={cell + ' text-center ' + mono}>{r.igl || ''}</td>
                    <td className={cell + ' text-center ' + mono}>{r.survivor || ''}</td>
                    <td className={cell + ' text-center ' + mono}>{r.emerging || ''}</td>
                  </>
                )}
                <td className={cell}>
                  <LinkCell entryId={r.id} board={board} linkedId={r.entityId} linkedLogoUrl={r.linkedLogoUrl} linkedName={r.linkedName ?? r.entityName} onLink={(id) => link(r.id, id)} />
                </td>
                <td className={cell + ' text-right'}>
                  <span className="inline-flex items-center gap-2">
                    <span className="flex flex-col gap-0">
                      <button
                        type="button"
                        onClick={() => move(r.id, 'up')}
                        disabled={i === 0}
                        aria-label={`Move ${r.entityName} up`}
                        className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-(--ed-blue) disabled:opacity-25 dark:hover:bg-slate-800"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(r.id, 'down')}
                        disabled={i === rows.length - 1}
                        aria-label={`Move ${r.entityName} down`}
                        className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-(--ed-blue) disabled:opacity-25 dark:hover:bg-slate-800"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(r.id)}
                      disabled={pending}
                      aria-label={`Remove ${r.entityName}`}
                      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={isTeams ? 5 : 10} className="px-3 py-6 text-center text-xs text-slate-400">
                  No rows yet — import from a tournament or paste above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Per-row site-page link: type-to-search, selecting links instantly. */
function LinkCell({
  entryId,
  board,
  linkedId,
  linkedLogoUrl,
  linkedName,
  onLink,
}: {
  entryId: string;
  board: 'TEAM' | 'PLAYER';
  linkedId: string | null;
  linkedLogoUrl?: string | null;
  linkedName: string;
  onLink: (entityId: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  if (pending) return <span className="text-xs text-slate-400">…</span>;

  if (linkedId) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
        {linkedLogoUrl ? (
          <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded border border-slate-100 bg-slate-50 dark:border-white/10 dark:bg-[#141e33]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={linkedLogoUrl} alt="" className="h-full w-full object-contain p-0.5" />
          </span>
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded border border-slate-100 bg-slate-50 text-[9px] font-black text-slate-400 dark:border-white/10 dark:bg-[#141e33]">
            {linkedName.slice(0, 2).toUpperCase()}
          </span>
        )}
        <span className="max-w-[140px] truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{linkedName}</span>
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await linkKraftonEntry(entryId, '');
              router.refresh();
            })
          }
          aria-label="Remove link"
          className="rounded p-0.5 text-slate-400 transition-colors hover:text-rose-500"
        >
          <Unlink className="h-3 w-3" />
        </button>
      </span>
    );
  }

  return (
    <div className="w-44">
      <SearchableSelect
        value=""
        placeholder="+ Link page…"
        searchPlaceholder="Type to search…"
        options={[]}
        searchUrl={`/api/admin/search?type=${board === 'TEAM' ? 'team' : 'player'}`}
        onChange={(value) => {
          if (value) onLink(value);
        }}
      />
    </div>
  );
}
