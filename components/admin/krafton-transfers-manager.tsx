'use client';

import * as React from 'react';
import { ArrowRight, Clock, Pencil, Plus, Trash2, X, ArrowUpDown, AlertCircle, Loader2 } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { saveKraftonTransfer, deleteKraftonTransfer } from '@/app/admin/(panel)/krafton/actions';

export interface SerializedKraftonTransfer {
  id: string;
  fromTeamId: string;
  fromName: string;
  toTeamId: string;
  toName: string;
  cutoffIso: string;
  cutoffDate: string; // YYYY-MM-DD
  cutoffTime: string; // HH:mm
  preference: number;
  mode: 'add' | 'own_only' | 'wipe';
  amount: number | null;
}

interface KraftonTransfersManagerProps {
  transfers: SerializedKraftonTransfer[];
}

export function KraftonTransfersManager({ transfers }: KraftonTransfersManagerProps) {
  const [isOpenNew, setIsOpenNew] = React.useState(transfers.length === 0);
  const [editingTransfer, setEditingTransfer] = React.useState<SerializedKraftonTransfer | null>(null);
  const [deletingTransfer, setDeletingTransfer] = React.useState<SerializedKraftonTransfer | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteKraftonTransfer(id);
    } catch (err: any) {
      if (err?.digest?.startsWith?.('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT') {
        throw err;
      }
      console.error('Failed to delete transfer:', err);
    } finally {
      setIsDeleting(false);
      setDeletingTransfer(null);
      setEditingTransfer(null);
    }
  };

  const labelCls = 'mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400';

  return (
    <div className="space-y-4">
      {/* Top action button to expand creation form */}
      <div>
        <button
          type="button"
          onClick={() => setIsOpenNew((prev) => !prev)}
          className="inline-flex cursor-pointer select-none items-center gap-2 rounded-lg bg-(--ed-blue) px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white transition-all hover:brightness-110 shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          {isOpenNew ? 'Hide Transfer Form' : 'New Point Transfer'}
        </button>
      </div>

      {/* Creation form */}
      {isOpenNew && (
        <form
          action={saveKraftonTransfer}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b101c] space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create Point Transfer</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure team roster buyout, rebrand, or slot transfer with date, time, and sequence ordering.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label className={labelCls}>From Team (loses points) *</label>
              <SearchableSelect
                name="fromTeamId"
                placeholder="Search team…"
                searchPlaceholder="Type team name…"
                options={[]}
                searchUrl="/api/admin/search?type=team"
              />
            </div>

            <div className="lg:col-span-2">
              <label className={labelCls}>To Team (gains points) *</label>
              <SearchableSelect
                name="toTeamId"
                placeholder="Search team…"
                searchPlaceholder="Type team name…"
                options={[]}
                searchUrl="/api/admin/search?type=team"
              />
            </div>

            <div>
              <label className={labelCls}>Cutoff Date *</label>
              <input
                type="date"
                name="cutoffDate"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
              />
            </div>

            <div>
              <label className={labelCls}>Time (HH:mm)</label>
              <input
                type="time"
                name="cutoffTime"
                defaultValue="00:00"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
              />
            </div>

            <div>
              <label className={labelCls}>Order / Pref (1-59)</label>
              <input
                type="number"
                name="preference"
                min="1"
                max="59"
                defaultValue="1"
                title="Execution order on same date/time (#1 executes before #2)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
              />
            </div>

            <div className="lg:col-span-2">
              <label className={labelCls}>Transfer Mode / Scope</label>
              <select
                name="mode"
                defaultValue="add"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="add">All Points (transfer all pre-cutoff points)</option>
                <option value="own_only">Own Events Only (leave acquired points behind)</option>
                <option value="wipe">Wipe Target Points (wipe receiver&apos;s earlier points)</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <label className={labelCls}>Fixed Amount (optional)</label>
              <input
                type="number"
                name="amount"
                min="1"
                placeholder="Full balance (leaves empty for actual pre-cutoff points)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">
              Tip: For chained transfers on the same day (e.g. B → C, then A → B), use Time or Preference (#1 runs first).
            </span>
            <button
              type="submit"
              className="rounded-lg bg-(--ed-blue) px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:brightness-110 shadow-xs"
            >
              Save Transfer
            </button>
          </div>
        </form>
      )}

      {/* Transfers Table */}
      {transfers.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b101c]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800/80 dark:bg-[#080d17]">
                <th className="px-3.5 py-3 text-left">From (Source)</th>
                <th className="px-3.5 py-3 text-left">To (Destination)</th>
                <th className="px-3.5 py-3 text-left">Cutoff &amp; Time</th>
                <th className="px-3.5 py-3 text-center">Execution Order</th>
                <th className="px-3.5 py-3 text-left">Mode</th>
                <th className="px-3.5 py-3 text-center">Amount</th>
                <th className="px-3.5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {transfers.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                  <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white">
                    {t.fromName}
                  </td>
                  <td className="px-3.5 py-2.5 font-bold text-(--ed-blue) dark:text-blue-400">
                    <span className="flex items-center gap-1.5">
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                      {t.toName}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>{t.cutoffDate}</span>
                      <span className="font-mono text-slate-400">{t.cutoffTime}</span>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 text-center">
                    <span
                      title="Priority sequence for same-day transfers"
                      className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-700 dark:bg-white/10 dark:text-slate-200"
                    >
                      <ArrowUpDown className="h-2.5 w-2.5 text-slate-400" />
                      #{t.preference}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5">
                    {t.mode === 'own_only' ? (
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                        Own Only
                      </span>
                    ) : t.mode === 'wipe' ? (
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
                        Wipe Target
                      </span>
                    ) : (
                      <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300">
                        All Points
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 text-center font-mono text-xs text-slate-600 dark:text-slate-400">
                    {t.amount ? `${t.amount} pts` : <span className="text-slate-400 italic">Full</span>}
                  </td>
                  <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingTransfer(t)}
                        title="Edit transfer"
                        aria-label={`Edit transfer ${t.fromName} → ${t.toName}`}
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingTransfer(t)}
                        aria-label={`Delete transfer ${t.fromName} → ${t.toName}`}
                        title="Delete transfer"
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Transfer Modal Dialog */}
      {editingTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setEditingTransfer(null)}
          />

          <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0b101c]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-(--ed-blue)/10 p-2 text-(--ed-blue) dark:text-blue-400">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Point Transfer</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Modify transfer cutoff, execution order, or transfer scope.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTransfer(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={saveKraftonTransfer} className="mt-4 space-y-4">
              <input type="hidden" name="id" value={editingTransfer.id} />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>From Team (loses points) *</label>
                  <SearchableSelect
                    name="fromTeamId"
                    defaultValue={editingTransfer.fromTeamId}
                    options={[{ value: editingTransfer.fromTeamId, label: editingTransfer.fromName }]}
                    placeholder="Search team…"
                    searchPlaceholder="Type team name…"
                    searchUrl="/api/admin/search?type=team"
                  />
                </div>

                <div>
                  <label className={labelCls}>To Team (gains points) *</label>
                  <SearchableSelect
                    name="toTeamId"
                    defaultValue={editingTransfer.toTeamId}
                    options={[{ value: editingTransfer.toTeamId, label: editingTransfer.toName }]}
                    placeholder="Search team…"
                    searchPlaceholder="Type team name…"
                    searchUrl="/api/admin/search?type=team"
                  />
                </div>

                <div>
                  <label className={labelCls}>Cutoff Date *</label>
                  <input
                    type="date"
                    name="cutoffDate"
                    required
                    defaultValue={editingTransfer.cutoffDate}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className={labelCls}>Time (HH:mm)</label>
                  <input
                    type="time"
                    name="cutoffTime"
                    defaultValue={editingTransfer.cutoffTime}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className={labelCls}>Execution Order / Pref</label>
                  <input
                    type="number"
                    name="preference"
                    min="1"
                    max="59"
                    defaultValue={editingTransfer.preference}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className={labelCls}>Transfer Mode</label>
                  <select
                    name="mode"
                    defaultValue={editingTransfer.mode}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="add">All Points (include prior transfers)</option>
                    <option value="own_only">Own Events Only (exclude prior transfers)</option>
                    <option value="wipe">Wipe Target Points (wipe receiver first)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelCls}>Fixed Amount (optional)</label>
                  <input
                    type="number"
                    name="amount"
                    min="1"
                    defaultValue={editingTransfer.amount ?? ''}
                    placeholder="Full balance"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingTransfer(editingTransfer)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Transfer
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTransfer(null)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-(--ed-blue) px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:brightness-110 shadow-xs"
                  >
                    Update Transfer
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Dialog */}
      {deletingTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => !isDeleting && setDeletingTransfer(null)}
          />

          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0b101c]">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="rounded-full bg-rose-100 p-2.5 dark:bg-rose-950/50">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Point Transfer</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-300">
              <p>
                Are you sure you want to delete the transfer from{' '}
                <strong className="text-slate-900 dark:text-white">{deletingTransfer.fromName}</strong> to{' '}
                <strong className="text-(--ed-blue) dark:text-blue-400">{deletingTransfer.toName}</strong>?
              </p>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                Points previously moved to {deletingTransfer.toName} will be returned to {deletingTransfer.fromName} immediately.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingTransfer(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDelete(deletingTransfer.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-rose-700 disabled:opacity-50 shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Transfer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
