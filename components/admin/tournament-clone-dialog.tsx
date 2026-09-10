'use client';

import React, { useState, useTransition } from 'react';
import { Copy, X, Layers, Users, Sparkles } from 'lucide-react';

interface TournamentCloneDialogProps {
  tournament: {
    id: string;
    name: string;
    stageCount?: number;
    squadCount?: number;
  };
  duplicateTournamentAction: (formData: FormData) => Promise<void>;
}

export function TournamentCloneDialog({
  tournament,
  duplicateTournamentAction,
}: TournamentCloneDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState(`${tournament.name} (Clone)`);
  const [includeStages, setIncludeStages] = useState(true);
  const [includeTeams, setIncludeTeams] = useState(true);
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    setNewName(`${tournament.name} (Clone)`);
    setIncludeStages(true);
    setIncludeTeams(true);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set('id', tournament.id);
    formData.set('name', newName.trim() || `${tournament.name} (Clone)`);
    formData.set('includeStages', String(includeStages));
    formData.set('includeTeams', String(includeTeams));

    startTransition(async () => {
      await duplicateTournamentAction(formData);
      setIsOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="p-1.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
        title="Clone Tournament Structure (Stages, Scoring, Rosters)"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    Clone Tournament Structure
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Source: <span className="font-semibold text-slate-600 dark:text-slate-300">{tournament.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  New Tournament Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Battlegrounds Series 2027"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
                />
              </div>

              <div className="space-y-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Included Configurations:
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeStages}
                    onChange={(e) => setIncludeStages(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-(--ed-blue) focus:ring-(--ed-blue)"
                  />
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Copy Stages &amp; Groups ({tournament.stageCount ?? 'All'})</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeTeams}
                    onChange={(e) => setIncludeTeams(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-(--ed-blue) focus:ring-(--ed-blue)"
                  />
                  <Users className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copy Participating Squads &amp; Rosters ({tournament.squadCount ?? 'All'})</span>
                </label>

                <div className="text-[10px] text-slate-400 pl-6 pt-1">
                  ✓ Points Matrix, Tiebreakers, Standings Config, and Organizers are automatically preserved.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !newName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-(--ed-blue) hover:brightness-110 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isPending ? 'Cloning…' : 'Clone Tournament'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
