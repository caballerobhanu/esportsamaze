'use client';

import * as React from 'react';
import { ArrowRight, ArrowRightLeft, History, X } from 'lucide-react';
import type { TransferRule } from '@/lib/krafton-standings';

export function KraftonTransferLedgerDialog({ transfers }: { transfers: TransferRule[] }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs backdrop-blur-md transition-all hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-blue-400 dark:hover:text-blue-300"
      >
        <ArrowRightLeft className="h-3.5 w-3.5 text-[#0A5FC4] dark:text-blue-400" />
        <span>Transfer Ledger ({transfers.length})</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setOpen(false)}
          />

          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5 dark:border-white/10">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0A5FC4]/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
                  <History className="h-3 w-3" />
                  Official Audit Log
                </div>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
                  Point Transfer Ledger
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Official historical record of roster acquisitions, org rebrands, and transferred KRAFTON ranking points.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="mt-6 space-y-4">
              {transfers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-white/10">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    No point transfers on record.
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Official roster acquisition point transfers will appear here once registered.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.02]">
                  {[...transfers]
                    .sort((a, b) => new Date(b.cutoff).getTime() - new Date(a.cutoff).getTime())
                    .map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-3 p-3.5 sm:px-4 sm:py-3.5 transition-colors hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                      <div className="flex items-center gap-2 text-sm font-black min-w-0">
                        <span className="text-slate-900 dark:text-white truncate">{t.fromName}</span>
                        <ArrowRight className="h-4 w-4 text-[#0A5FC4] dark:text-blue-400 shrink-0" />
                        <span className="text-[#0A5FC4] dark:text-blue-300 truncate">{t.toName}</span>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {new Date(t.cutoff).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
