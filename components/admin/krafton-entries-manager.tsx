'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Check, Link2, Pencil, Plus, Trash2, Unlink, X } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  autoLinkKraftonEntries,
  deleteKraftonEntry,
  importKraftonEntries,
  importKraftonEntriesFromTournament,
  linkKraftonEntry,
  moveKraftonEntry,
  saveSingleKraftonEntry,
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
const inputCls = 'rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900';

export function KraftonEntriesManager({
  eventId,
  board,
  rows,
  tournaments,
  defaultTournamentId,
}: {
  eventId: string;
  board: 'TEAM' | 'PLAYER';
  rows: KraftonEntryRow[];
  tournaments: { id: string; name: string }[];
  defaultTournamentId?: string | null;
}) {
  const router = useRouter();
  const isTeams = board === 'TEAM';
  const [paste, setPaste] = React.useState('');
  const [importTourneyId, setImportTourneyId] = React.useState(defaultTournamentId || '');
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<string | null>(null);

  // Local copy of rows — keeps the list order stable when linking/unlinking
  const [localRows, setLocalRows] = React.useState<KraftonEntryRow[]>(rows);
  // Sync when the parent re-renders with a genuinely new set of rows (add/delete/move)
  const rowsRef = React.useRef(rows);
  if (rows !== rowsRef.current) {
    rowsRef.current = rows;
    setLocalRows(rows);
  }

  // Single entry add form state
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [addName, setAddName] = React.useState('');
  const [addTeamName, setAddTeamName] = React.useState('');
  const [addRank, setAddRank] = React.useState(String(rows.length + 1));
  const [addFinishes, setAddFinishes] = React.useState('0');
  const [addMvp, setAddMvp] = React.useState('0');
  const [addFinalsMvp, setAddFinalsMvp] = React.useState('0');
  const [addIgl, setAddIgl] = React.useState('0');
  const [addSurvivor, setAddSurvivor] = React.useState('0');
  const [addEmerging, setAddEmerging] = React.useState('0');

  // Inline row edit state
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<Partial<KraftonEntryRow>>({});

  const startEdit = (row: KraftonEntryRow) => {
    setEditingId(row.id);
    setEditForm({ ...row });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = (rowId: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', rowId);
      fd.set('eventId', eventId);
      fd.set('board', board);
      fd.set('entityName', editForm.entityName || '');
      fd.set('entityId', editForm.entityId || '');
      fd.set('teamName', editForm.teamName || '');
      fd.set('rank', String(editForm.rank || 0));
      fd.set('finishes', String(editForm.finishes || 0));
      fd.set('mvp', String(editForm.mvp || 0));
      fd.set('finalsMvp', String(editForm.finalsMvp || 0));
      fd.set('igl', String(editForm.igl || 0));
      fd.set('survivor', String(editForm.survivor || 0));
      fd.set('emerging', String(editForm.emerging || 0));

      const res = await saveSingleKraftonEntry(fd);
      if (res.error) setMessage(res.error);
      else {
        setEditingId(null);
        setEditForm({});
        router.refresh();
      }
    });
  };

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      setMessage('Name is required.');
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set('eventId', eventId);
      fd.set('board', board);
      fd.set('entityName', addName.trim());
      fd.set('teamName', addTeamName.trim());
      fd.set('rank', addRank);
      fd.set('finishes', addFinishes);
      fd.set('mvp', addMvp);
      fd.set('finalsMvp', addFinalsMvp);
      fd.set('igl', addIgl);
      fd.set('survivor', addSurvivor);
      fd.set('emerging', addEmerging);

      const res = await saveSingleKraftonEntry(fd);
      if (res.error) setMessage(res.error);
      else {
        setMessage(`Added ${addName}.`);
        setAddName('');
        setAddTeamName('');
        setAddRank(String(rows.length + 2));
        setAddFinishes('0');
        setAddMvp('0');
        setAddFinalsMvp('0');
        setAddIgl('0');
        setAddSurvivor('0');
        setAddEmerging('0');
        setShowAddForm(false);
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
        setMessage(
          `Imported ${res.teams} teams and ${res.players} players from the tournament (filtered to Grand Finals stage: ${res.stageName ?? 'Finals'}).`
        );
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

  const link = (entryId: string, entityId: string, optimisticLabel?: string, optimisticImage?: string | null) => {
    // Optimistically patch local state — no router.refresh() so list order stays completely stable
    setLocalRows((prev) =>
      prev.map((r) =>
        r.id === entryId
          ? {
              ...r,
              entityId: entityId || null,
              linkedName: entityId ? (optimisticLabel ?? null) : null,
              linkedLogoUrl: entityId ? (optimisticImage ?? null) : null,
            }
          : r
      )
    );
    // Fire server action in background — no refresh needed, action already persists the change
    linkKraftonEntry(entryId, entityId).catch(() => {
      // On error revert by re-applying original from server
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {/* Action toolstrip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-white/[0.02]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-(--ed-blue) px-3 py-2 text-xs font-bold text-white transition-colors hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{showAddForm ? 'Cancel Add' : `Add Single ${isTeams ? 'Team' : 'Player'}`}</span>
          </button>
          <button
            type="button"
            onClick={autoLink}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-(--ed-blue) hover:text-(--ed-blue) disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Link2 className="h-3.5 w-3.5" /> Auto-link by Name
          </button>
        </div>

        {/* Import from site tournament */}
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="w-full sm:w-64">
            <SearchableSelect
              value={importTourneyId}
              onChange={setImportTourneyId}
              placeholder="Import from Tournament…"
              searchPlaceholder="Type to search…"
              options={tournaments.map((t) => ({ value: t.id, label: t.name }))}
              searchUrl="/api/admin/search?type=tournament"
            />
          </div>
          <button
            type="button"
            onClick={importFromTournament}
            disabled={pending || !importTourneyId}
            className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-black disabled:opacity-40 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            Import GF Results
          </button>
        </div>
      </div>

      {message && (
        <p className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
          {message}
        </p>
      )}

      {/* Single entry manual form */}
      {showAddForm && (
        <form
          onSubmit={handleAddSingle}
          className="space-y-3 rounded-xl border border-(--ed-blue)/30 bg-(--ed-blue)/5 p-4 dark:border-blue-500/30 dark:bg-blue-950/20"
        >
          <h3 className="text-xs font-black uppercase tracking-wider text-(--ed-blue) dark:text-blue-400">
            Add New {isTeams ? 'Team Placement' : 'Player Eliminations & Awards'}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                {isTeams ? 'Team Name *' : 'Player IGN *'}
              </label>
              <input
                type="text"
                required
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder={isTeams ? 'e.g. Team SouL' : 'e.g. Jonathan'}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            {!isTeams && (
              <div className="col-span-2">
                <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Team (This Event)</label>
                <input
                  type="text"
                  value={addTeamName}
                  onChange={(e) => setAddTeamName(e.target.value)}
                  placeholder="e.g. GodLike Esports"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">{isTeams ? 'Rank #' : 'Rank #'}</label>
              <input
                type="number"
                min="1"
                value={addRank}
                onChange={(e) => setAddRank(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            {!isTeams && (
              <>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Elims</label>
                  <input
                    type="number"
                    min="0"
                    value={addFinishes}
                    onChange={(e) => setAddFinishes(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">MVP (+20)</label>
                  <input
                    type="number"
                    min="0"
                    value={addMvp}
                    onChange={(e) => setAddMvp(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">FMVP (+10)</label>
                  <input
                    type="number"
                    min="0"
                    value={addFinalsMvp}
                    onChange={(e) => setAddFinalsMvp(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">IGL (+10)</label>
                  <input
                    type="number"
                    min="0"
                    value={addIgl}
                    onChange={(e) => setAddIgl(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Surv (+10)</label>
                  <input
                    type="number"
                    min="0"
                    value={addSurvivor}
                    onChange={(e) => setAddSurvivor(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Emerg (+5)</label>
                  <input
                    type="number"
                    min="0"
                    value={addEmerging}
                    onChange={(e) => setAddEmerging(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-(--ed-blue) px-4 py-1.5 text-xs font-bold text-white hover:brightness-110"
            >
              Save Entry
            </button>
          </div>
        </form>
      )}

      {/* Paste box (collapsible) */}
      <details className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-white/[0.02]">
        <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
          Bulk Paste {isTeams ? 'Team' : 'Player'} Rows (Excel / TSV)
        </summary>
        <div className="mt-3 space-y-2">
          <textarea
            rows={4}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={
              isTeams
                ? 'Team SouL\t1\nTeam Apex Gaming\t2\n…'
                : 'IGN\tTeam\tElims\tMVP\tFinalsMVP\tIGL\tSurvivor\tEmerging\nJonathan\tGodLike\t30\t1\t0\t1\t0\t0\n…'
            }
            className="w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-400">
              {isTeams ? 'Format: Name <TAB> Rank' : 'Format: IGN <TAB> Team <TAB> Elims <TAB> MVP <TAB> FMVP <TAB> IGL <TAB> Surv <TAB> Emerg'}
            </p>
            <button
              type="button"
              onClick={importPaste}
              disabled={pending}
              className="rounded-lg bg-(--ed-blue) px-3 py-1.5 text-xs font-bold text-white transition-colors hover:brightness-110 disabled:opacity-50"
            >
              {pending ? 'Working…' : `Import — replaces current rows`}
            </button>
          </div>
        </div>
      </details>

      {/* Rows table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0b101c]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-white/5">
              <th className="px-2 py-2.5 text-center">Order</th>
              <th className="px-3 py-2.5 text-left">{isTeams ? 'Team Name' : 'IGN'}</th>
              {isTeams ? (
                <th className="px-3 py-2.5 text-center">Rank</th>
              ) : (
                <>
                  <th className="px-3 py-2.5 text-left">Team (This Event)</th>
                  <th className="px-3 py-2.5 text-center">Elims</th>
                  <th className="px-3 py-2.5 text-center">MVP</th>
                  <th className="px-3 py-2.5 text-center">FMVP</th>
                  <th className="px-3 py-2.5 text-center">IGL</th>
                  <th className="px-3 py-2.5 text-center">Surv</th>
                  <th className="px-3 py-2.5 text-center">Emerg</th>
                </>
              )}
              <th className="px-3 py-2.5 text-left">Site Page Link</th>
              <th className="px-2 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {localRows.map((r, i) => {
              const isEditing = editingId === r.id;

              return (
                <tr key={r.id} className={`${pending ? 'opacity-50' : ''} ${isEditing ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}`}>
                  {/* Order control */}
                  <td className="px-2 py-2 text-center align-middle">
                    <span className="flex flex-col items-center justify-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => move(r.id, 'up')}
                        disabled={i === 0 || pending}
                        aria-label={`Move ${r.entityName} up`}
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-(--ed-blue) disabled:opacity-20 dark:hover:bg-slate-800"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(r.id, 'down')}
                        disabled={i === rows.length - 1 || pending}
                        aria-label={`Move ${r.entityName} down`}
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-(--ed-blue) disabled:opacity-20 dark:hover:bg-slate-800"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </span>
                  </td>

                  {/* Entity Name */}
                  <td className={cell + ' font-bold text-slate-900 dark:text-white'}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.entityName ?? ''}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, entityName: e.target.value }))}
                        className={inputCls + ' w-36'}
                      />
                    ) : (
                      r.entityName
                    )}
                  </td>

                  {/* Rank or Player fields */}
                  {isTeams ? (
                    <td className={cell + ' text-center ' + mono}>
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          value={editForm.rank ?? 1}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, rank: parseInt(e.target.value, 10) || 1 }))}
                          className={inputCls + ' w-16 text-center font-mono'}
                        />
                      ) : (
                        `#${r.rank}`
                      )}
                    </td>
                  ) : (
                    <>
                      <td className={cell + ' text-slate-600 dark:text-slate-300'}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.teamName ?? ''}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, teamName: e.target.value }))}
                            className={inputCls + ' w-32'}
                          />
                        ) : (
                          r.teamName || '—'
                        )}
                      </td>
                      <td className={cell + ' text-center ' + mono}>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editForm.finishes ?? 0}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, finishes: parseInt(e.target.value, 10) || 0 }))}
                            className={inputCls + ' w-14 text-center font-mono'}
                          />
                        ) : (
                          r.finishes
                        )}
                      </td>
                      <td className={cell + ' text-center ' + mono}>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editForm.mvp ?? 0}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, mvp: parseInt(e.target.value, 10) || 0 }))}
                            className={inputCls + ' w-12 text-center font-mono'}
                          />
                        ) : (
                          r.mvp || '—'
                        )}
                      </td>
                      <td className={cell + ' text-center ' + mono}>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editForm.finalsMvp ?? 0}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, finalsMvp: parseInt(e.target.value, 10) || 0 }))}
                            className={inputCls + ' w-12 text-center font-mono'}
                          />
                        ) : (
                          r.finalsMvp || '—'
                        )}
                      </td>
                      <td className={cell + ' text-center ' + mono}>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editForm.igl ?? 0}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, igl: parseInt(e.target.value, 10) || 0 }))}
                            className={inputCls + ' w-12 text-center font-mono'}
                          />
                        ) : (
                          r.igl || '—'
                        )}
                      </td>
                      <td className={cell + ' text-center ' + mono}>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editForm.survivor ?? 0}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, survivor: parseInt(e.target.value, 10) || 0 }))}
                            className={inputCls + ' w-12 text-center font-mono'}
                          />
                        ) : (
                          r.survivor || '—'
                        )}
                      </td>
                      <td className={cell + ' text-center ' + mono}>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editForm.emerging ?? 0}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, emerging: parseInt(e.target.value, 10) || 0 }))}
                            className={inputCls + ' w-12 text-center font-mono'}
                          />
                        ) : (
                          r.emerging || '—'
                        )}
                      </td>
                    </>
                  )}

                  {/* Site page link with quick switch/unlink */}
                  <td className={cell}>
                    <LinkCell
                      board={board}
                      linkedId={r.entityId}
                      linkedLogoUrl={r.linkedLogoUrl}
                      linkedName={r.linkedName ?? r.entityName}
                      onLink={(id, label, imageUrl) => link(r.id, id, label, imageUrl)}
                      onUnlink={() => link(r.id, '')}
                    />
                  </td>

                  {/* Actions: Edit / Save / Cancel / Remove */}
                  <td className={cell + ' text-right'}>
                    <span className="inline-flex items-center gap-1.5">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => saveEdit(r.id)}
                            disabled={pending}
                            aria-label="Save row"
                            className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            aria-label="Cancel editing"
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(r)}
                          aria-label={`Edit ${r.entityName}`}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-(--ed-blue) dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        disabled={pending}
                        aria-label={`Remove ${r.entityName}`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
            {localRows.length === 0 && (
              <tr>
                <td colSpan={isTeams ? 5 : 11} className="px-3 py-6 text-center text-xs text-slate-400">
                  No rows yet — add an entry above, import from a tournament, or paste rows.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Per-row site-page link: dropdown rendered directly with selected pick and 1-click unlink. */
function LinkCell({
  board,
  linkedId,
  linkedLogoUrl,
  linkedName,
  onLink,
  onUnlink,
}: {
  board: 'TEAM' | 'PLAYER';
  linkedId: string | null;
  linkedLogoUrl?: string | null;
  linkedName: string;
  onLink: (entityId: string, label: string, imageUrl?: string | null) => void;
  onUnlink: () => void;
}) {
  // Keep a local cache of all options seen (initial + search results) so we can
  // pull the label/imageUrl when the user picks a new value
  const [knownOptions, setKnownOptions] = React.useState<{ value: string; label: string; imageUrl?: string | null }[]>(() =>
    linkedId ? [{ value: linkedId, label: linkedName, imageUrl: linkedLogoUrl }] : []
  );

  // Keep knownOptions in sync when props change (e.g. after optimistic update from parent)
  React.useEffect(() => {
    if (linkedId) {
      setKnownOptions((prev) => {
        const exists = prev.some((o) => o.value === linkedId);
        const updated = exists
          ? prev.map((o) => (o.value === linkedId ? { ...o, label: linkedName, imageUrl: linkedLogoUrl } : o))
          : [...prev, { value: linkedId, label: linkedName, imageUrl: linkedLogoUrl }];
        return updated;
      });
    }
  }, [linkedId, linkedName, linkedLogoUrl]);

  const options = React.useMemo(() => {
    if (!linkedId) return [];
    return [{ value: linkedId, label: linkedName, imageUrl: linkedLogoUrl ?? undefined }];
  }, [linkedId, linkedName, linkedLogoUrl]);

  return (
    <div className="flex items-center gap-1.5 min-w-[200px] max-w-[260px]">
      <div className="flex-1 min-w-0">
        <SearchableSelect
          value={linkedId ?? ''}
          placeholder={board === 'TEAM' ? '+ Link team…' : '+ Link player…'}
          searchPlaceholder={board === 'TEAM' ? 'Search teams…' : 'Search players…'}
          options={options}
          size="sm"
          showInitialsFallback
          searchUrl={`/api/admin/search?type=${board === 'TEAM' ? 'team' : 'player'}`}
          onRemoteOptions={(opts) => setKnownOptions((prev) => {
            const merged = [...prev];
            for (const o of opts) {
              if (!merged.some((m) => m.value === o.value)) merged.push(o);
            }
            return merged;
          })}
          onChange={(value) => {
            if (value && value !== linkedId) {
              const opt = knownOptions.find((o) => o.value === value);
              onLink(value, opt?.label ?? value, opt?.imageUrl ?? null);
            }
          }}
        />
      </div>
      {linkedId && (
        <button
          type="button"
          onClick={onUnlink}
          title="Unlink site page"
          aria-label="Unlink site page"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 transition-colors shrink-0"
        >
          <Unlink className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
