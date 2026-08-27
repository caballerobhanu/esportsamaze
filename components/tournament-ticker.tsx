'use client';

import * as React from 'react';
import { 
  Trophy, 
  ChevronRight, 
  ChevronLeft, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Award,
  Layers
} from 'lucide-react';
import { CRICINFO_TOURNAMENTS, TournamentWithMatches, BRMatchSummary } from '@/lib/bgmi-data';
import { cn } from '@/lib/utils';

export function TournamentTicker({
  selectedTournamentId,
  onSelectTournament,
  selectedMatchId,
  onSelectMatch,
}: {
  selectedTournamentId: string;
  onSelectTournament: (tourneyId: string) => void;
  selectedMatchId: string;
  onSelectMatch: (matchId: string) => void;
}) {
  const activeTournament = React.useMemo(() => {
    return CRICINFO_TOURNAMENTS.find((t) => t.id === selectedTournamentId) || CRICINFO_TOURNAMENTS[0];
  }, [selectedTournamentId]);

  return (
    <div className="w-full bg-[#f1f5f9] dark:bg-[#080d1a] border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 space-y-3">
        
        {/* Row 1: Tournament Selector Pills (Cricinfo Style) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1 flex-shrink-0">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Events:
          </span>

          {CRICINFO_TOURNAMENTS.map((t) => {
            const isSelected = t.id === activeTournament.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  onSelectTournament(t.id);
                  if (t.matches.length > 0) {
                    onSelectMatch(t.matches[0].id);
                  }
                }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all duration-150 flex items-center gap-2 border flex-shrink-0',
                  isSelected
                    ? 'bg-[#0A5FC4] dark:bg-[#0d2a58] text-white border-[#0A5FC4] dark:border-[#1c4d94] shadow-sm'
                    : 'bg-white dark:bg-[#0e1626] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                )}
              >
                <span>{t.shortCode}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 text-[9px] font-bold rounded-full uppercase',
                    t.phase === 'CURRENT'
                      ? 'bg-rose-500 text-white'
                      : t.phase === 'STARTING'
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  )}
                >
                  {t.statusLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 2: Set of 6 Matches for Selected Tournament (Cricinfo Match Card Strip) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 dark:text-white">
                {activeTournament.title}
              </span>
              <span>•</span>
              <span>{activeTournament.stageName}</span>
            </span>
            <span className="font-mono text-slate-500">
              {activeTournament.matches.length} Matches in Stage
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {activeTournament.matches.map((m) => {
              const isMatchSelected = m.id === selectedMatchId;
              const isCompleted = m.status === 'COMPLETED';

              return (
                <div
                  key={m.id}
                  onClick={() => onSelectMatch(m.id)}
                  className={cn(
                    'p-2.5 rounded-lg border text-left cursor-pointer transition-all duration-150 flex flex-col justify-between gap-2 shadow-xs',
                    isMatchSelected
                      ? 'border-[#0A5FC4] dark:border-amber-500 bg-white dark:bg-[#121c30] ring-1 ring-[#0A5FC4] dark:ring-amber-500'
                      : 'border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0c1220] hover:border-slate-300 dark:hover:border-slate-700'
                  )}
                >
                  {/* Top: Match number and Map */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-1 text-[11px]">
                    <span className="font-mono font-black text-slate-800 dark:text-slate-200">
                      Match {m.matchNumber}
                    </span>
                    <span className="font-extrabold px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {m.mapName}
                    </span>
                  </div>

                  {/* Body: Completed vs Upcoming info */}
                  {isCompleted && m.winner ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Winner:</span>
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          🍗 {m.winner.teamTag}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 flex justify-between">
                        <span>Finishes: <strong className="text-slate-900 dark:text-white">{m.winner.finishes}</strong></span>
                        <span>Pts: <strong className="text-amber-500">{m.winner.totalPts}</strong></span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        MVP: <strong className="text-slate-700 dark:text-slate-300">{m.winner.mvpPlayer}</strong> ({m.winner.mvpKills}K)
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 py-1">
                      <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Scheduled
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {m.scheduledTime}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Map Deployment
                      </div>
                    </div>
                  )}

                  {/* Footer status pill */}
                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[9px] font-bold uppercase">
                    {isCompleted ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Result Out
                      </span>
                    ) : (
                      <span className="text-slate-400">Upcoming</span>
                    )}
                    <span className="text-[#0A5FC4] dark:text-amber-400 font-extrabold hover:underline">
                      Summary →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
